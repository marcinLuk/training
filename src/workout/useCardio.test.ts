import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { CardioPlan, Plan } from '../plans/plan'
import { IDLE_EXPIRY_MS } from './engine'
import { playCountdownBeep, playRestStart, playWorkStart, unlockAudio } from './sound'
import { useCardio } from './useCardio'
import { ACTION_GUARD_MS, SOUND_MAX_LATE_MS, useWorkout } from './useWorkout'
import { releaseWakeLock } from './wakeLock'
import { WORKOUT_CORRUPT_PREFIX, WORKOUT_KEY } from './workoutStore'

vi.mock('./sound', () => ({
  playRestEnd: vi.fn(),
  unlockAudio: vi.fn(),
  playCountdownBeep: vi.fn(),
  playWorkStart: vi.fn(),
  playRestStart: vi.fn(),
}))

const T0 = new Date('2026-10-24T10:00:00Z').getTime()

function makePlan(intervals: { name: string; seconds: number; kind: 'work' | 'rest' }[], id = 'cardio-1'): CardioPlan {
  return {
    type: 'cardio',
    id,
    name: 'Bieg z rozgrzewką',
    blocks: [{ id: 'b1', repeat: 1, intervals: intervals.map((interval, i) => ({ id: `i${i}`, ...interval })) }],
  }
}

/**
 * Offsets from the start (ms): get-ready 0-3000, Bieg work 3000-13000, Marsz rest 13000-18000,
 * Sprint work 18000-38000 (the planned end).
 */
const PLAN = makePlan([
  { name: 'Bieg', seconds: 10, kind: 'work' },
  { name: 'Marsz', seconds: 5, kind: 'rest' },
  { name: 'Sprint', seconds: 20, kind: 'work' },
])

/** A first interval of 30 s: after the get-ready cues the next cue is far away (offset 30000). */
const LONG_PLAN = makePlan([
  { name: 'Bieg', seconds: 30, kind: 'work' },
  { name: 'Marsz', seconds: 10, kind: 'rest' },
])

const STRENGTH_PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [{ id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 }],
}

/** A strength workout exactly as the app stored it before the cardio module: no `kind`. */
const OLD_STRENGTH_JSON = JSON.stringify({
  version: 1,
  planId: 'plan-1',
  planName: 'Wiosłowanie i przysiady',
  exercises: [{ name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 }],
  sets: [
    { exerciseIndex: 0, setNumber: 1, status: 'pending' },
    { exerciseIndex: 0, setNumber: 2, status: 'pending' },
  ],
  cursor: 0,
  mode: 'set',
  rest: null,
  undoStack: [],
  startedAt: T0 - 1_000,
  lastActivityAt: T0 - 1_000,
})

type Api = ReturnType<typeof useCardio>

let hosts: VueWrapper[]
let visibility: DocumentVisibilityState
let request: ReturnType<typeof vi.fn>
let sentinels: Array<{ release: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }>
let heard: Array<{ sound: string; at: number }>

function mountCardio(): Api {
  let api: Api | undefined
  const host = defineComponent({
    setup() {
      api = useCardio()
      return () => null
    },
  })
  hosts.push(mount(host))
  return api!
}

function mountStrength(): ReturnType<typeof useWorkout> {
  let api: ReturnType<typeof useWorkout> | undefined
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

/** Moves the clock and asks for a re-read the way a returning page does. No interval callback runs. */
function tick(ms: number): void {
  advance(ms)
  document.dispatchEvent(new Event('visibilitychange'))
}

function offset(): number {
  return Date.now() - T0
}

function stored(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(WORKOUT_KEY)!) as Record<string, unknown>
}

function corruptKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(`${WORKOUT_CORRUPT_PREFIX}.`))
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function hide(): void {
  visibility = 'hidden'
  document.dispatchEvent(new Event('visibilitychange'))
}

function show(): void {
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
}

function count(sound: string): number {
  return heard.filter((entry) => entry.sound === sound).length
}

/** Starts a session at T0, then waits out the tap guard (the sounds of the start stay counted). */
function startedSession(plan: CardioPlan = PLAN): Api {
  const api = mountCardio()
  expect(api.start(plan)).toBe(true)
  return api
}

beforeEach(() => {
  localStorage.clear()
  hosts = []
  visibility = 'visible'
  sentinels = []
  heard = []
  request = vi.fn(() => {
    const sentinel = { release: vi.fn(() => Promise.resolve()), addEventListener: vi.fn() }
    sentinels.push(sentinel)
    return Promise.resolve(sentinel)
  })
  vi.stubGlobal('navigator', { wakeLock: { request } })
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  vi.mocked(unlockAudio).mockClear()
  vi.mocked(playCountdownBeep).mockReset().mockImplementation(() => void heard.push({ sound: 'countdown', at: offset() }))
  vi.mocked(playWorkStart).mockReset().mockImplementation(() => void heard.push({ sound: 'work-start', at: offset() }))
  vi.mocked(playRestStart).mockReset().mockImplementation(() => void heard.push({ sound: 'rest-start', at: offset() }))
})

afterEach(() => {
  unmountAll()
  releaseWakeLock()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('starting a session', () => {
  it('shows the get-ready, saves a cardio state under the workout key and unlocks audio in the tap', () => {
    const api = startedSession()
    expect(api.view.value).toMatchObject({ phase: 'get-ready', planName: 'Bieg z rozgrzewką', intervalCount: 3 })
    expect(api.view.value?.intervalRemainingMs).toBe(3000)
    expect(stored()).toMatchObject({
      version: 1,
      kind: 'cardio',
      planId: 'cardio-1',
      startedAt: T0,
      pausedAt: null,
      pausedTotalMs: 0,
    })
    expect(WORKOUT_KEY).toBe('trening.workout.v1')
    expect(unlockAudio).toHaveBeenCalledTimes(1)
  })

  it('has no view when nothing runs', () => {
    expect(mountCardio().view.value).toBeNull()
  })

  it('keeps the session going in memory when the write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const api = mountCardio()
    expect(() => api.start(PLAN)).not.toThrow()
    tick(5_000)
    expect(api.view.value?.phase).toBe('work')
  })

  it('hears three get-ready beeps, not two, and then the work start', () => {
    startedSession()
    expect(heard).toEqual([{ sound: 'countdown', at: 0 }])
    tick(1_000)
    tick(1_000)
    expect(count('countdown')).toBe(3)
    expect(count('work-start')).toBe(0)
    tick(1_000)
    expect(heard.map((entry) => [entry.sound, entry.at])).toEqual([
      ['countdown', 0],
      ['countdown', 1_000],
      ['countdown', 2_000],
      ['work-start', 3_000],
    ])
  })

  it('opens the sound window below startedAt: a start at any later time still plays the beep at startedAt', () => {
    vi.setSystemTime(T0 + 12_345)
    startedSession()
    expect(heard).toEqual([{ sound: 'countdown', at: 12_345 }])
  })
})

describe('the sound schedule', () => {
  it('plays exactly the planned cues, each once, with different sounds for work start and rest start', () => {
    startedSession()
    for (let second = 1; second <= 45; second += 1) tick(1_000)
    expect(heard.map((entry) => [entry.sound, entry.at])).toEqual([
      ['countdown', 0],
      ['countdown', 1_000],
      ['countdown', 2_000],
      ['work-start', 3_000],
      ['countdown', 10_000],
      ['countdown', 11_000],
      ['countdown', 12_000],
      ['rest-start', 13_000],
      ['countdown', 15_000],
      ['countdown', 16_000],
      ['countdown', 17_000],
      ['work-start', 18_000],
      ['countdown', 35_000],
      ['countdown', 36_000],
      ['countdown', 37_000],
      ['rest-start', 38_000],
    ])
  })

  it('plays no countdown for an interval shorter than 4 s, only the start cues', () => {
    startedSession(
      makePlan([
        { name: 'Skok', seconds: 3, kind: 'work' },
        { name: 'Przerwa', seconds: 3, kind: 'rest' },
      ]),
    )
    for (let second = 1; second <= 10; second += 1) tick(1_000)
    expect(heard.map((entry) => [entry.sound, entry.at])).toEqual([
      ['countdown', 0],
      ['countdown', 1_000],
      ['countdown', 2_000],
      ['work-start', 3_000],
      ['rest-start', 6_000],
      ['rest-start', 9_000],
    ])
  })

  it('plays the countdown for an interval of exactly 4 s', () => {
    startedSession(makePlan([{ name: 'Skok', seconds: 4, kind: 'work' }]))
    for (let second = 1; second <= 8; second += 1) tick(1_000)
    expect(heard.filter((entry) => entry.at > 3_000).map((entry) => [entry.sound, entry.at])).toEqual([
      ['countdown', 4_000],
      ['countdown', 5_000],
      ['countdown', 6_000],
      ['rest-start', 7_000],
    ])
  })

  it('renders from the clock when the render timer fires', async () => {
    const api = startedSession()
    await settle()
    vi.advanceTimersByTime(250)
    expect(api.view.value?.intervalRemainingMs).toBe(2_750)
    vi.advanceTimersByTime(3_000)
    expect(api.view.value).toMatchObject({ phase: 'work', intervalNumber: 1 })
    expect(count('work-start')).toBe(1)
  })

  it('runs the render timer only while the session runs', async () => {
    const api = startedSession()
    await settle()
    expect(vi.getTimerCount()).toBe(1)
    tick(60_000)
    await settle()
    expect(api.view.value?.phase).toBe('finished')
    expect(vi.getTimerCount()).toBe(0)
    unmountAll()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    [2_000, true],
    [2_001, false],
  ])('plays an interval-start cue %i ms late: %s', (late, plays) => {
    startedSession(LONG_PLAN)
    heard = []
    // The get-ready ends at offset 3000, where the work-start cue falls; the clock jumps `late` later.
    tick(3_000 + late)
    expect(count('work-start')).toBe(plays ? 1 : 0)
  })

  it.each([
    [2_000, 3],
    [2_001, 2],
  ])('plays a countdown cue %i ms late only when it is not older than 2 s (%i beeps heard)', (late, beeps) => {
    startedSession(LONG_PLAN)
    tick(29_000)
    heard = []
    // The first countdown cue falls at offset 30000; the cues at 31000 and 32000 follow it.
    tick(1_000 + late)
    expect(offset()).toBe(30_000 + late)
    expect(count('countdown')).toBe(beeps)
  })

  it('pins the late limit to 2 s', () => {
    expect(SOUND_MAX_LATE_MS).toBe(2_000)
  })

  it('stays silent for cues that fall while the page is hidden, even when it returns within 2 s', () => {
    startedSession()
    heard = []
    hide()
    tick(3_500)
    show()
    expect(count('work-start')).toBe(0)
    expect(count('countdown')).toBe(0)
  })

  it('stays silent when a render timer fires while hidden, and never replays the missed cue', async () => {
    startedSession()
    await settle()
    heard = []
    hide()
    vi.advanceTimersByTime(3_000)
    expect(heard).toEqual([])
    show()
    expect(heard).toEqual([])
    vi.advanceTimersByTime(1_000)
    tick(1_000)
    expect(count('work-start')).toBe(0)
    expect(count('countdown')).toBe(0)
  })

  it('plays again after the page returns, for the cues that fall after it became visible', () => {
    startedSession()
    hide()
    tick(5_000)
    show()
    heard = []
    tick(5_000)
    expect(heard).toEqual([{ sound: 'countdown', at: 10_000 }])
  })

  it('does not replay a cue after a pause and a resume', () => {
    const api = startedSession()
    tick(2_500)
    expect(count('countdown')).toBe(3)
    api.pause()
    advance(60_000)
    api.resume()
    tick(1_000)
    // Resumed at offset 62500: the timeline position is 2500, the work start is 500 ms ahead.
    expect(count('countdown')).toBe(3)
    expect(count('work-start')).toBe(1)
    expect(heard.at(-1)).toEqual({ sound: 'work-start', at: 63_500 })
    for (let second = 0; second < 40; second += 1) tick(1_000)
    expect(count('countdown')).toBe(3 + 9)
  })

  it('plays the cues that are due up to the tap before it pauses', () => {
    const api = startedSession()
    advance(3_000)
    api.pause()
    expect(count('work-start')).toBe(1)
    expect(count('countdown')).toBe(3)
  })

  it('plays nothing while paused', () => {
    const api = startedSession()
    tick(2_500)
    api.pause()
    heard = []
    tick(60_000)
    vi.advanceTimersByTime(5_000)
    expect(heard).toEqual([])
  })

  it('plays nothing after the view unmounts', () => {
    startedSession()
    unmountAll()
    heard = []
    tick(5_000)
    expect(heard).toEqual([])
  })
})

describe('a screen lock or app switch', () => {
  it('keeps the session running and shows the position from the clock, with no ticks', () => {
    const api = startedSession()
    tick(500)
    hide()
    advance(19_500)
    show()
    // 20 s in: 17 s after the get-ready, inside Sprint (from 15 s of intervals).
    expect(api.view.value).toMatchObject({
      phase: 'work',
      intervalNumber: 3,
      intervalRemainingMs: 18_000,
      elapsedMs: 17_000,
      remainingMs: 18_000,
    })
    expect(api.view.value?.current?.name).toBe('Sprint')
  })

  it('shows the end screen when the screen was locked past the planned end', () => {
    const api = startedSession()
    hide()
    advance(60_000)
    show()
    expect(api.view.value?.phase).toBe('finished')
  })
})

describe('pause and resume', () => {
  it('pauses at the tap time, freezes the view and saves it', () => {
    const api = startedSession()
    advance(8_000)
    api.pause()
    expect(api.view.value).toMatchObject({ phase: 'paused', intervalNumber: 1, intervalRemainingMs: 5_000 })
    expect(stored()).toMatchObject({ pausedAt: T0 + 8_000, pausedTotalMs: 0 })
    tick(30_000)
    expect(api.view.value).toMatchObject({ phase: 'paused', intervalRemainingMs: 5_000 })
  })

  it('resumes at the tap time, adds the pause to the total and saves it', () => {
    const api = startedSession()
    advance(8_000)
    api.pause()
    advance(30_000)
    api.resume()
    expect(stored()).toMatchObject({ pausedAt: null, pausedTotalMs: 30_000 })
    tick(2_000)
    expect(api.view.value).toMatchObject({ phase: 'work', intervalNumber: 1, intervalRemainingMs: 3_000 })
    expect(unlockAudio).toHaveBeenCalledTimes(2)
  })

  it('does nothing when it is paused again or resumed while running', () => {
    const api = startedSession()
    advance(1_000)
    api.resume()
    expect(stored()).toMatchObject({ pausedAt: null, pausedTotalMs: 0 })
    api.pause()
    const savedAt = stored()
    advance(1_000)
    api.pause()
    expect(stored()).toEqual(savedAt)
  })
})

describe('the tap guard', () => {
  it('ignores Pauza within 500 ms of the start and takes it at 500 ms', () => {
    const api = startedSession()
    advance(499)
    api.pause()
    expect(api.view.value?.phase).toBe('get-ready')
    advance(1)
    api.pause()
    expect(api.view.value?.phase).toBe('paused')
    expect(ACTION_GUARD_MS).toBe(500)
  })

  it('ignores Wznów within 500 ms of Pauza and takes it at 500 ms', () => {
    const api = startedSession()
    advance(500)
    api.pause()
    advance(499)
    api.resume()
    expect(api.view.value?.phase).toBe('paused')
    advance(1)
    api.resume()
    expect(api.view.value?.phase).not.toBe('paused')
  })

  it('ignores Zakończ within 500 ms of the last tap and takes it at 500 ms', () => {
    const api = startedSession()
    advance(499)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(false)
    advance(1)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(true)
  })

  it('ignores the confirm tap within 500 ms of the question and takes it at 500 ms', () => {
    const api = startedSession()
    advance(500)
    api.askEnd()
    advance(499)
    expect(api.confirmEnd()).toBe(false)
    expect(api.view.value).not.toBeNull()
    advance(1)
    expect(api.confirmEnd()).toBe(true)
    expect(api.view.value).toBeNull()
  })

  it('ignores a leave tap within 500 ms of a restored end screen and takes it at 500 ms', () => {
    startedSession()
    unmountAll()
    advance(38_000)
    const api = mountCardio()
    expect(api.view.value?.phase).toBe('finished')
    advance(499)
    expect(api.leave()).toBe(false)
    expect(api.view.value).not.toBeNull()
    advance(1)
    expect(api.leave()).toBe(true)
    expect(api.view.value).toBeNull()
  })

  it('ignores a tap right after a restore and takes it at 500 ms', () => {
    startedSession()
    unmountAll()
    advance(5_000)
    const api = mountCardio()
    advance(499)
    api.resume()
    expect(api.view.value?.phase).toBe('paused')
    advance(1)
    api.resume()
    expect(api.view.value?.phase).not.toBe('paused')
  })

  it('refuses a second start 100 ms after the first', () => {
    const api = mountCardio()
    expect(api.start(PLAN)).toBe(true)
    advance(100)
    expect(api.start(PLAN)).toBe(false)
    expect(unlockAudio).toHaveBeenCalledTimes(1)
  })
})

describe('ending a session', () => {
  it('keeps the session running behind the confirm question and cancels it', () => {
    const api = startedSession()
    advance(1_000)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(true)
    tick(4_000)
    expect(api.view.value?.phase).toBe('work')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
    api.cancelEnd()
    expect(api.confirmingEnd.value).toBe(false)
    expect(api.view.value).not.toBeNull()
    expect(api.confirmEnd()).toBe(false)
  })

  it('removes the session and closes the question on confirm', async () => {
    const api = startedSession()
    await settle()
    advance(500)
    api.askEnd()
    advance(500)
    expect(api.confirmEnd()).toBe(true)
    expect(api.view.value).toBeNull()
    expect(api.confirmingEnd.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('opens no question on the end screen', () => {
    const api = startedSession()
    tick(60_000)
    advance(500)
    api.askEnd()
    expect(api.confirmingEnd.value).toBe(false)
  })

  it('leaves the end screen and removes the session', () => {
    const api = startedSession()
    tick(60_000)
    expect(api.view.value?.phase).toBe('finished')
    advance(500)
    expect(api.leave()).toBe(true)
    expect(api.view.value).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })
})

describe('restore after a reload (a fresh mount reading storage)', () => {
  it('brings a running session back paused at the current interval', () => {
    startedSession()
    tick(20_000)
    unmountAll()

    const api = mountCardio()
    expect(api.view.value).toMatchObject({
      phase: 'paused',
      intervalNumber: 3,
      intervalRemainingMs: 18_000,
    })
    expect(api.view.value?.current?.name).toBe('Sprint')
    expect(stored()).toMatchObject({ pausedAt: T0 + 20_000 })
  })

  it('keeps the restored position on a second reload, much later', () => {
    startedSession()
    tick(20_000)
    unmountAll()
    mountCardio()
    unmountAll()

    advance(60 * 60_000)
    const api = mountCardio()
    expect(api.view.value).toMatchObject({ phase: 'paused', intervalNumber: 3, intervalRemainingMs: 18_000 })
  })

  it('keeps a paused session paused at the stored position', () => {
    const first = startedSession()
    advance(5_000)
    first.pause()
    unmountAll()

    advance(30 * 60_000)
    const api = mountCardio()
    expect(api.view.value).toMatchObject({ phase: 'paused', intervalNumber: 1, intervalRemainingMs: 8_000 })
    expect(stored()).toMatchObject({ pausedAt: T0 + 5_000 })
    expect(api.expired.value).toBe(false)
  })

  it('keeps a session paused for exactly 2 h and removes one paused for 2 h and 1 ms', () => {
    const first = startedSession()
    advance(5_000)
    first.pause()
    const pausedAt = Date.now()
    unmountAll()

    vi.setSystemTime(pausedAt + 7_200_000)
    const kept = mountCardio()
    expect(kept.view.value?.phase).toBe('paused')
    expect(kept.expired.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
    unmountAll()

    vi.setSystemTime(pausedAt + 7_200_001)
    const gone = mountCardio()
    expect(gone.view.value).toBeNull()
    expect(gone.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(corruptKeys()).toEqual([])
    expect(IDLE_EXPIRY_MS).toBe(7_200_000)
  })

  it('never expires a running session, however long it was away', () => {
    startedSession()
    unmountAll()
    advance(3 * 3_600_000)
    const api = mountCardio()
    expect(api.expired.value).toBe(false)
    expect(api.view.value?.phase).toBe('finished')
  })

  it('shows the end screen for a session found after its planned end', () => {
    startedSession()
    unmountAll()
    advance(38_000)
    const api = mountCardio()
    expect(api.view.value).toMatchObject({ phase: 'finished', planName: 'Bieg z rozgrzewką' })
    expect(api.expired.value).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
    advance(500)
    expect(api.leave()).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it.each([
    [37_999, 'paused'],
    [38_000, 'finished'],
  ])('finds a session %i ms after its start as %s (the planned end is at 38000)', (after, phase) => {
    startedSession()
    unmountAll()
    advance(after)
    expect(mountCardio().view.value?.phase).toBe(phase)
  })

  it('restores nothing and leaves the key alone when it holds an old-shape strength workout', () => {
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    const api = mountCardio()
    expect(api.view.value).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(OLD_STRENGTH_JSON)
    expect(corruptKeys()).toEqual([])
  })

  it('restores an old-shape strength workout exactly as before', () => {
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    const strength = mountStrength()
    expect(strength.view.value).toMatchObject({ mode: 'set', exerciseName: 'Wiosłowanie', setsLeft: 2 })
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(OLD_STRENGTH_JSON)
  })

  it('leaves a stored cardio session alone when the strength side loads', () => {
    startedSession()
    const raw = localStorage.getItem(WORKOUT_KEY)
    unmountAll()
    const strength = mountStrength()
    expect(strength.view.value).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
    expect(corruptKeys()).toEqual([])
  })

  it('copies an unreadable value before anything writes over it, then lets a session start', () => {
    localStorage.setItem(WORKOUT_KEY, '{"kind":"cardio","version":1,')
    const api = mountCardio()
    expect(api.view.value).toBeNull()
    expect(corruptKeys()).toHaveLength(1)
    expect(localStorage.getItem(corruptKeys()[0]!)).toBe('{"kind":"cardio","version":1,')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(api.start(PLAN)).toBe(true)
  })
})

describe('expiry of a paused session while the app stays open', () => {
  it('expires by a timer just after the idle limit, with no event', async () => {
    const api = startedSession()
    advance(5_000)
    api.pause()
    await settle()
    vi.advanceTimersByTime(7_200_000)
    expect(api.view.value).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('expires by a timer just after the idle limit when the session was restored paused', async () => {
    const first = startedSession()
    advance(5_000)
    first.pause()
    const pausedAt = Date.now()
    unmountAll()

    advance(3_600_000)
    const api = mountCardio()
    await settle()
    expect(api.view.value?.phase).toBe('paused')
    vi.advanceTimersByTime(7_200_000 - 3_600_000)
    expect(Date.now()).toBe(pausedAt + 7_200_000)
    expect(api.view.value).not.toBeNull()
    expect(api.expired.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('expires on a tap and does not act on it', () => {
    const api = startedSession()
    advance(5_000)
    api.pause()
    advance(7_200_001)
    api.resume()
    expect(api.view.value).toBeNull()
    expect(api.expired.value).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('expires when the page returns, only past 2 h', () => {
    const api = startedSession()
    advance(5_000)
    api.pause()
    tick(7_200_000)
    expect(api.view.value?.phase).toBe('paused')
    tick(1)
    expect(api.view.value).toBeNull()
  })

  it('never expires a running session while it stays open', async () => {
    const api = startedSession()
    tick(3 * 3_600_000)
    await settle()
    expect(api.expired.value).toBe(false)
    expect(api.view.value?.phase).toBe('finished')
    vi.advanceTimersByTime(3 * 3_600_000)
    expect(api.expired.value).toBe(false)
  })

  it('can dismiss the notice', () => {
    const api = startedSession()
    advance(5_000)
    api.pause()
    advance(7_200_001)
    api.resume()
    api.dismissExpired()
    expect(api.expired.value).toBe(false)
  })

  it('resets the notice when a new session starts', () => {
    const api = startedSession()
    advance(5_000)
    api.pause()
    advance(7_200_001)
    api.resume()
    expect(api.expired.value).toBe(true)
    advance(500)
    expect(api.start(PLAN)).toBe(true)
    expect(api.expired.value).toBe(false)
  })
})

describe('the wake lock', () => {
  it('is held while running and while paused, and released at the end screen', async () => {
    const api = startedSession()
    await settle()
    expect(request).toHaveBeenCalledWith('screen')
    expect(request).toHaveBeenCalledTimes(1)
    advance(5_000)
    api.pause()
    await settle()
    expect(sentinels[0]!.release).not.toHaveBeenCalled()
    advance(500)
    api.resume()
    expect(sentinels[0]!.release).not.toHaveBeenCalled()
    tick(60_000)
    expect(api.view.value?.phase).toBe('finished')
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('is released when the session is left or the view unmounts', async () => {
    startedSession()
    await settle()
    unmountAll()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('is held again after a restore', async () => {
    startedSession()
    await settle()
    unmountAll()
    advance(1_000)
    mountCardio()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('is not held for a restored end screen', async () => {
    startedSession()
    await settle()
    unmountAll()
    advance(60_000)
    mountCardio()
    await settle()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('is not held with no session', async () => {
    mountCardio()
    await settle()
    expect(request).not.toHaveBeenCalled()
  })

  describe('shared with a strength workout (both composables mounted, as in the app)', () => {
    it('is not released by cardio when a strength workout is restored', async () => {
      localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
      mountStrength()
      mountCardio()
      await settle()
      expect(sentinels).toHaveLength(1)
      expect(sentinels[0]!.release).not.toHaveBeenCalled()
    })

    it('is still held by the strength workout after a screen lock and a return', async () => {
      const strength = mountStrength()
      mountCardio()
      expect(strength.start(STRENGTH_PLAN)).toBe(true)
      await settle()
      hide()
      show()
      await settle()
      const live = sentinels.filter((sentinel) => sentinel.release.mock.calls.length === 0)
      expect(live).toHaveLength(1)
    })

    it('is not released when the cardio host unmounts during a strength workout', async () => {
      const strength = mountStrength()
      expect(strength.start(STRENGTH_PLAN)).toBe(true)
      mountCardio()
      await settle()
      const cardioHost = hosts.pop()!
      cardioHost.unmount()
      expect(sentinels).toHaveLength(1)
      expect(sentinels[0]!.release).not.toHaveBeenCalled()
    })
  })
})

describe('one workout at a time', () => {
  it('refuses to start a cardio session while a strength workout is stored, and leaves it alone', () => {
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    const api = mountCardio()
    expect(api.start(PLAN)).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(OLD_STRENGTH_JSON)
    expect(api.view.value).toBeNull()
    expect(unlockAudio).not.toHaveBeenCalled()
  })

  it('refuses a strength start while a cardio session is stored, and leaves it alone', () => {
    startedSession()
    const raw = localStorage.getItem(WORKOUT_KEY)
    const strength = mountStrength()
    advance(1_000)
    expect(strength.start(STRENGTH_PLAN)).toBe(false)
    expect(strength.view.value).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
  })

  it('still starts a strength workout when nothing is stored', () => {
    const strength = mountStrength()
    expect(strength.start(STRENGTH_PLAN)).toBe(true)
    expect(strength.view.value?.mode).toBe('set')
  })

  it('refuses a second cardio session over a running one', () => {
    const api = startedSession()
    advance(1_000)
    const raw = localStorage.getItem(WORKOUT_KEY)
    expect(api.start(makePlan([{ name: 'Inny', seconds: 30, kind: 'work' }], 'cardio-2'))).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
  })

  it('starts another session after the first was left', () => {
    const api = startedSession()
    advance(500)
    api.askEnd()
    advance(500)
    api.confirmEnd()
    advance(500)
    expect(api.start(PLAN)).toBe(true)
  })
})
