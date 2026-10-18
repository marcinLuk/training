import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { Plan } from '../plans/plan'
import { IDLE_EXPIRY_MS } from './engine'
import { playRestEnd } from './sound'
import { ACTION_GUARD_MS, useWorkout } from './useWorkout'
import { releaseWakeLock } from './wakeLock'
import { WORKOUT_KEY } from './workoutStore'

vi.mock('./sound', () => ({ playRestEnd: vi.fn(), unlockAudio: vi.fn() }))

const T0 = new Date('2026-10-18T10:00:00Z').getTime()

const PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [
    { id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
    { id: 'e2', name: 'Przysiady', sets: 2, reps: 12, restSeconds: 60 },
  ],
}

type Api = ReturnType<typeof useWorkout>

let hosts: VueWrapper[]
let visibility: DocumentVisibilityState
let request: ReturnType<typeof vi.fn>
let sentinels: Array<{ released: boolean; release: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }>

/** A fresh app instance: a host component that runs `useWorkout` like App does. */
function mountWorkout(): Api {
  let api: Api | undefined
  const host = defineComponent({
    setup() {
      api = useWorkout()
      return () => null
    },
  })
  hosts.push(mount(host))
  return api!
}

function unmountAll(): void {
  hosts.forEach((host) => host.unmount())
  hosts = []
}

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

/** Moves the clock past the guard window, then taps. */
function afterGuard(action: () => unknown): void {
  advance(ACTION_GUARD_MS)
  action()
}

function stored(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(WORKOUT_KEY)!) as Record<string, unknown>
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function becomeVisible(): void {
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  localStorage.clear()
  hosts = []
  visibility = 'visible'
  sentinels = []
  request = vi.fn(() => {
    const sentinel = { released: false, release: vi.fn(() => Promise.resolve()), addEventListener: vi.fn() }
    sentinels.push(sentinel)
    return Promise.resolve(sentinel)
  })
  vi.stubGlobal('navigator', { wakeLock: { request } })
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  vi.mocked(playRestEnd).mockClear()
})

afterEach(() => {
  unmountAll()
  releaseWakeLock()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the tap guard after a restore', () => {
  it('ignores a tap right after a restore and counts it after ACTION_GUARD_MS', () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()

    advance(5 * 60_000)
    const second = mountWorkout()
    const before = second.view.value
    second.finishSet()
    expect(second.view.value).toEqual(before)
    expect(second.view.value).toMatchObject({ mode: 'set', exerciseName: 'Wiosłowanie', setsLeft: 2 })
    advance(ACTION_GUARD_MS - 1)
    second.finishSet()
    expect(second.view.value).toEqual(before)
    advance(1)
    second.finishSet()
    expect(second.view.value?.mode).toBe('rest')
  })
})

describe('saving on every change', () => {
  it('writes the state after start, "Gotowe" and "Gotowy, zaczynam"', () => {
    const api = mountWorkout()
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    api.start(PLAN)
    expect(stored()).toMatchObject({ mode: 'set', cursor: 0, planId: 'plan-1' })

    afterGuard(api.finishSet)
    expect(stored()).toMatchObject({ mode: 'rest', cursor: 1, rest: { durationMs: 60_000 } })

    afterGuard(api.endRest)
    expect(stored()).toMatchObject({ mode: 'set', cursor: 1, rest: null })
  })

  it('writes the set view when a rest runs out on its own', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.finishSet)
    advance(61_000)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(stored()).toMatchObject({ mode: 'set', rest: null })
  })

  it('keeps the workout going in memory when the write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const api = mountWorkout()
    expect(() => api.start(PLAN)).not.toThrow()
    afterGuard(api.finishSet)
    expect(api.view.value?.mode).toBe('rest')
  })
})

describe('a fresh app instance over a stored workout', () => {
  it('shows the same set mid-set', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    afterGuard(first.endRest)
    const before = first.view.value
    unmountAll()

    advance(5 * 60_000)
    const second = mountWorkout()
    expect(second.view.value).toEqual(before)
    expect(second.view.value).toMatchObject({ mode: 'set', exerciseName: 'Wiosłowanie', setsLeft: 1 })
  })

  it('shows the timestamp-based remaining rest mid-rest, with the clock moved and no ticks', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    const startedAt = Date.now()
    unmountAll()

    advance(20_000)
    const second = mountWorkout()
    expect(second.view.value?.mode).toBe('rest')
    expect(second.view.value?.restRemainingMs).toBe(60_000 - (Date.now() - startedAt))
    expect(second.restDurationMs.value).toBe(60_000)
  })

  it('does not count a restart: the remaining time at 40 s equals the one from one instance', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    advance(40_000)
    const remainingNow = 60_000 - (40_000 + 0)
    unmountAll()
    const second = mountWorkout()
    expect(second.view.value?.restRemainingMs).toBe(remainingNow)
  })

  it('shows the set view, silently, for a rest that ended while away', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    unmountAll()

    advance(5 * 60_000)
    const second = mountWorkout()
    expect(second.view.value).toMatchObject({ mode: 'set', exerciseName: 'Wiosłowanie', setsLeft: 1 })
    advance(60_000)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(playRestEnd).not.toHaveBeenCalled()
  })

  it('plays the sound once when a restored rest ends while the page is visible', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    unmountAll()

    advance(20_000)
    mountWorkout()
    advance(41_000)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(playRestEnd).toHaveBeenCalledTimes(1)
  })

  it('does not count restoring as a user action: lastActivityAt and the stored text stay', () => {
    const first = mountWorkout()
    first.start(PLAN)
    afterGuard(first.finishSet)
    unmountAll()
    const raw = localStorage.getItem(WORKOUT_KEY)
    const lastActivityAt = stored().lastActivityAt

    advance(30 * 60_000)
    mountWorkout()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
    expect(stored().lastActivityAt).toBe(lastActivityAt)
  })

  it('opens the end screen for a stored finished workout and removes the key when the user leaves', () => {
    const first = mountWorkout()
    first.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(first.finishSet)
      afterGuard(first.endRest)
    }
    afterGuard(first.finishSet)
    expect(first.view.value?.mode).toBe('finished')
    unmountAll()

    const second = mountWorkout()
    expect(second.view.value?.mode).toBe('finished')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
    advance(ACTION_GUARD_MS)
    expect(second.leave()).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(second.view.value).toBeNull()
  })

  it('opens the plan list with no notice when the stored data is unreadable', () => {
    localStorage.setItem(WORKOUT_KEY, '{broken')
    const api = mountWorkout()
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(false)
  })
})

describe('expiry', () => {
  it('removes a workout older than 2 h at app start and reports it', () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()

    advance(IDLE_EXPIRY_MS + 1)
    const second = mountWorkout()
    expect(second.view.value).toBeNull()
    expect(second.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('keeps a workout that is exactly 2 h old', () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()

    advance(IDLE_EXPIRY_MS)
    const second = mountWorkout()
    expect(second.view.value?.mode).toBe('set')
    expect(second.expired.value).toBe(false)
  })

  it('removes an old finished workout without a notice', () => {
    const first = mountWorkout()
    first.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(first.finishSet)
      afterGuard(first.endRest)
    }
    afterGuard(first.finishSet)
    unmountAll()

    advance(IDLE_EXPIRY_MS + 1)
    const second = mountWorkout()
    expect(second.view.value).toBeNull()
    expect(second.expired.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('removes a workout that expires while the app sits open, when the page becomes visible', () => {
    const api = mountWorkout()
    api.start(PLAN)
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    advance(IDLE_EXPIRY_MS + 1)
    becomeVisible()
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('expires a tap on "Gotowe" after 2 h + 1 ms on a visible set view, and marks nothing', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    advance(IDLE_EXPIRY_MS + 1)
    api.finishSet()
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('counts a tap on "Gotowe" at exactly 2 h', () => {
    const api = mountWorkout()
    api.start(PLAN)
    advance(IDLE_EXPIRY_MS)
    api.finishSet()
    expect(api.expired.value).toBe(false)
    expect(api.view.value?.mode).toBe('rest')
  })

  it('expires a tap on "Gotowy, zaczynam" after 2 h + 1 ms, and marks nothing', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.finishSet)
    // Move the clock only: the rest ran out and the idle limit passed, with no tick and no event.
    advance(IDLE_EXPIRY_MS + 1)
    api.endRest()
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('expires by itself on a visible set view when the idle timeout fires', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    vi.advanceTimersByTime(IDLE_EXPIRY_MS + 1)
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('moves the idle deadline with each tap', () => {
    const api = mountWorkout()
    api.start(PLAN)
    vi.advanceTimersByTime(IDLE_EXPIRY_MS - 1_000)
    api.finishSet()
    vi.advanceTimersByTime(IDLE_EXPIRY_MS - 1_000)
    expect(api.expired.value).toBe(false)
    expect(api.view.value).not.toBeNull()
  })

  it('expires a restored workout by itself, counted from the last tap and not from the reload', async () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()

    advance(60 * 60_000)
    const second = mountWorkout()
    await settle()
    vi.advanceTimersByTime(60 * 60_000 - 1_000)
    expect(second.view.value?.mode).toBe('set')
    expect(second.expired.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()

    vi.advanceTimersByTime(1_001)
    expect(second.view.value).toBeNull()
    expect(second.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(sentinels.at(-1)!.release).toHaveBeenCalledTimes(1)
  })

  it('"Zakończ trening" on an expired workout ends it as expired and opens no confirm step', () => {
    const api = mountWorkout()
    api.start(PLAN)
    // Move the clock only: no timer runs, no event fires.
    advance(IDLE_EXPIRY_MS + 1)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(false)
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('"Zakończ trening" at exactly 2 h still opens the confirm step', () => {
    const api = mountWorkout()
    api.start(PLAN)
    advance(IDLE_EXPIRY_MS)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(true)
    expect(api.expired.value).toBe(false)
    expect(api.view.value).not.toBeNull()
  })

  it('does not expire a workout on the end screen when the page becomes visible', () => {
    const api = mountWorkout()
    api.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(api.finishSet)
      afterGuard(api.endRest)
    }
    afterGuard(api.finishSet)
    advance(IDLE_EXPIRY_MS + 1)
    becomeVisible()
    expect(api.view.value?.mode).toBe('finished')
    expect(api.expired.value).toBe(false)
  })

  it('clears the notice when a new workout starts', () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()
    advance(IDLE_EXPIRY_MS + 1)
    const second = mountWorkout()
    expect(second.expired.value).toBe(true)
    advance(ACTION_GUARD_MS)
    second.start(PLAN)
    expect(second.expired.value).toBe(false)
  })

  it('clears the notice on dismiss', () => {
    const first = mountWorkout()
    first.start(PLAN)
    unmountAll()
    advance(IDLE_EXPIRY_MS + 1)
    const second = mountWorkout()
    second.dismissExpired()
    expect(second.expired.value).toBe(false)
  })
})

describe('Start after leaving a screen', () => {
  function finishedWorkout(): Api {
    const api = mountWorkout()
    api.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(api.finishSet)
      afterGuard(api.endRest)
    }
    afterGuard(api.finishSet)
    return api
  }

  it('ignores Start 150 ms after leaving the end screen and accepts it 700 ms after', () => {
    const api = finishedWorkout()
    advance(1_000)
    expect(api.leave()).toBe(true)
    advance(150)
    expect(api.start(PLAN)).toBe(false)
    expect(api.view.value).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    advance(550)
    expect(api.start(PLAN)).toBe(true)
    expect(api.view.value?.mode).toBe('set')
  })
})

describe('Wake Lock', () => {
  it('is requested when a workout starts', async () => {
    const api = mountWorkout()
    expect(request).not.toHaveBeenCalled()
    api.start(PLAN)
    await settle()
    expect(request).toHaveBeenCalledWith('screen')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('is requested when a stored workout is restored', async () => {
    const first = mountWorkout()
    first.start(PLAN)
    await settle()
    unmountAll()
    request.mockClear()

    mountWorkout()
    await settle()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('is not requested for a stored finished workout', async () => {
    const first = mountWorkout()
    first.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(first.finishSet)
      afterGuard(first.endRest)
    }
    afterGuard(first.finishSet)
    await settle()
    unmountAll()
    request.mockClear()

    mountWorkout()
    await settle()
    expect(request).not.toHaveBeenCalled()
  })

  it('is requested again when the page becomes visible, after the browser released it', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    const listener = sentinels[0]!.addEventListener.mock.calls[0]![1] as () => void
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    listener()
    becomeVisible()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('is not requested again on a visible page while a lock is still held', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    becomeVisible()
    await settle()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('is released when the last set ends the workout', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(api.finishSet)
      afterGuard(api.endRest)
    }
    await settle()
    expect(sentinels[0]!.release).not.toHaveBeenCalled()
    afterGuard(api.finishSet)
    expect(api.view.value?.mode).toBe('finished')
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('is released at an early end', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    afterGuard(api.askEnd)
    afterGuard(api.confirmEnd)
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('is released when the app unmounts', async () => {
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    unmountAll()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('does not break the workout when the API is missing', () => {
    vi.stubGlobal('navigator', {})
    const api = mountWorkout()
    expect(() => api.start(PLAN)).not.toThrow()
    afterGuard(api.finishSet)
    expect(api.view.value?.mode).toBe('rest')
  })

  it('does not break the workout when the request is rejected', async () => {
    request.mockImplementation(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    const api = mountWorkout()
    api.start(PLAN)
    await settle()
    afterGuard(api.finishSet)
    expect(api.view.value?.mode).toBe('rest')
  })
})

describe('early end', () => {
  it('keeps the workout and the running rest when the user cancels', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.finishSet)
    const raw = localStorage.getItem(WORKOUT_KEY)
    afterGuard(api.askEnd)
    expect(api.confirmingEnd.value).toBe(true)
    advance(10_000)
    api.cancelEnd()
    expect(api.confirmingEnd.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
    expect(api.view.value?.mode).toBe('rest')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.view.value?.restRemainingMs).toBe(60_000 - 10_000 - ACTION_GUARD_MS)
  })

  it('removes the workout on confirm', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.askEnd)
    advance(ACTION_GUARD_MS)
    expect(api.confirmEnd()).toBe(true)
    expect(api.view.value).toBeNull()
    expect(api.confirmingEnd.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('ignores a confirm tap that lands right after the confirm step opened', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.askEnd)
    expect(api.confirmEnd()).toBe(false)
    expect(api.view.value?.mode).toBe('set')
    advance(ACTION_GUARD_MS)
    expect(api.confirmEnd()).toBe(true)
  })

  it('does nothing on confirm when the step is not open', () => {
    const api = mountWorkout()
    api.start(PLAN)
    afterGuard(api.confirmEnd)
    expect(api.view.value?.mode).toBe('set')
  })

  it('does not open the confirm step on the end screen or with no workout', () => {
    const none = mountWorkout()
    none.askEnd()
    expect(none.confirmingEnd.value).toBe(false)
    unmountAll()

    const api = mountWorkout()
    api.start(PLAN)
    for (let i = 0; i < 3; i += 1) {
      afterGuard(api.finishSet)
      afterGuard(api.endRest)
    }
    afterGuard(api.finishSet)
    expect(api.view.value?.mode).toBe('finished')
    afterGuard(api.askEnd)
    expect(api.confirmingEnd.value).toBe(false)
  })
})
