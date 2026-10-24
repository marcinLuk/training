import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { createCardioPlan, type CardioPlan, type Plan } from '../plans/plan'
import { savePlan } from '../plans/planStore'
import { IDLE_EXPIRY_MS, startWorkout } from '../workout/engine'
import { playCountdownBeep, playRestStart, playWorkStart } from '../workout/sound'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { releaseWakeLock } from '../workout/wakeLock'
import { WORKOUT_KEY, saveWorkout } from '../workout/workoutStore'
import sessionSource from './CardioSession.vue?raw'
import { button } from './testHelpers'

vi.mock('../workout/sound', () => ({
  playRestEnd: vi.fn(),
  unlockAudio: vi.fn(),
  playCountdownBeep: vi.fn(),
  playWorkStart: vi.fn(),
  playRestStart: vi.fn(),
}))

const sw = vi.hoisted(() => ({
  needRefresh: undefined as { value: boolean } | undefined,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/vue', async () => {
  const { ref: makeRef } = await import('vue')
  return {
    useRegisterSW: () => {
      sw.needRefresh = makeRef(false)
      return { needRefresh: sw.needRefresh, offlineReady: makeRef(false), updateServiceWorker: sw.updateServiceWorker }
    },
  }
})

const T0 = new Date('2026-10-24T10:00:00Z').getTime()
const EXPIRY_NOTICE = 'Trening wygasł po 2 godzinach bez dotknięcia.'

/**
 * Offsets from the start: get-ready 0-3 s, then Sprint w górę (work) 3-23, Odpoczynek (rest)
 * 23-33, Sprint w górę 33-53, Odpoczynek 53-63. The planned end is at 63 s.
 */
const PLAN: CardioPlan = {
  type: 'cardio',
  id: 'cardio-1',
  name: 'Żwawy bieg w Łodzi',
  blocks: [
    {
      id: 'b1',
      repeat: 2,
      intervals: [
        { id: 'i1', name: 'Sprint w górę', seconds: 20, kind: 'work' },
        { id: 'i2', name: 'Odpoczynek', seconds: 10, kind: 'rest' },
      ],
    },
  ],
}

const STRENGTH_PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [{ id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 }],
}

interface FakeSentinel {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
}

let apps: VueWrapper[]
let sentinels: FakeSentinel[]

function mountApp(): VueWrapper {
  const wrapper = mount(App, { attachTo: document.body })
  apps.push(wrapper)
  return wrapper
}

/** Unmounts every app instance: the next mount is a reload. */
function reload(): VueWrapper {
  apps.forEach((app) => app.unmount())
  apps = []
  document.body.innerHTML = ''
  return mountApp()
}

/** Moves the clock to an offset from the start. No timer callback runs. */
function moveTo(offsetMs: number): void {
  vi.setSystemTime(T0 + offsetMs)
}

/** Moves the clock and asks for a re-read the way a returning page does. No interval callback runs. */
async function look(offsetMs: number): Promise<void> {
  moveTo(offsetMs)
  document.dispatchEvent(new Event('visibilitychange'))
  await nextTick()
}

async function tap(wrapper: VueWrapper, name: string): Promise<void> {
  vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
  await button(wrapper.element, name).trigger('click')
}

async function startPlan(): Promise<VueWrapper> {
  const wrapper = mountApp()
  await button(wrapper.element, `Start: ${PLAN.name}`).trigger('click')
  return wrapper
}

function text(wrapper: VueWrapper, selector: string): string {
  return wrapper.get(selector).text()
}

const phase = (wrapper: VueWrapper): string => text(wrapper, '[data-testid="phase"]')
const clock = (wrapper: VueWrapper): string => text(wrapper, '[role="timer"]')
const heading = (wrapper: VueWrapper): string => wrapper.get('h1').text()

async function flush(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

function unreleased(): number {
  return sentinels.filter((sentinel) => !sentinel.released).length
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  sentinels = []
  sw.updateServiceWorker.mockClear()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  const request = vi.fn(() => {
    const sentinel: FakeSentinel = {
      released: false,
      release: vi.fn(() => {
        sentinel.released = true
        return Promise.resolve()
      }),
      addEventListener: vi.fn(),
    }
    sentinels.push(sentinel)
    return Promise.resolve(sentinel)
  })
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  savePlan(STRENGTH_PLAN)
  savePlan(PLAN)
})

afterEach(() => {
  apps.forEach((app) => app.unmount())
  releaseWakeLock()
  Reflect.deleteProperty(navigator, 'wakeLock')
  vi.useRealTimers()
})

describe('the cardio session screen', () => {
  it('opens in get-ready: PRZYGOTUJ SIĘ, 0:03, the first interval under "Dalej:", no current segment', async () => {
    const wrapper = await startPlan()

    expect(phase(wrapper)).toBe('PRZYGOTUJ SIĘ')
    expect(clock(wrapper)).toBe('0:03')
    expect(wrapper.text()).toContain('Żwawy bieg w Łodzi')
    expect(wrapper.text()).not.toContain('Interwał 1 z')
    expect(wrapper.text()).toContain('Dalej: Sprint w górę · 0:20')
    expect(wrapper.text()).toContain('Razem 0:00')
    expect(wrapper.text()).toContain('Zostało 1:00')
    expect(wrapper.findAll('[aria-label="Przebieg"] li')).toHaveLength(4)
    expect(wrapper.find('[aria-current]').exists()).toBe(false)
    expect(wrapper.findAll('h2')).toHaveLength(0)
  })

  it('counts the get-ready down from stored timestamps with no ticks: 1.5 s in reads 0:02, 3 s in is the first interval', async () => {
    const wrapper = await startPlan()

    await look(1500)
    expect(clock(wrapper)).toBe('0:02')
    expect(phase(wrapper)).toBe('PRZYGOTUJ SIĘ')

    await look(2999)
    expect(clock(wrapper)).toBe('0:01')

    await look(3000)
    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:20')
  })

  it('shows a work interval: PRACA, its own name, Interwał 1 z 4, Dalej, Razem and Zostało from the clock alone', async () => {
    const wrapper = await startPlan()

    await look(10_000)

    expect(phase(wrapper)).toBe('PRACA')
    expect(wrapper.get('.interval-name').text()).toBe('Sprint w górę')
    expect(clock(wrapper)).toBe('0:13')
    expect(wrapper.text()).toContain('Interwał 1 z 4')
    expect(wrapper.text()).toContain('Dalej: Odpoczynek · 0:10')
    expect(wrapper.text()).toContain('Razem 0:07')
    expect(wrapper.text()).toContain('Zostało 0:53')
    expect(wrapper.get('.bar-fill').attributes('style')).toContain('width: 35%')
  })

  it('shows a rest interval: ODPOCZYNEK, no name line when the name is the type word, current segment 2', async () => {
    const wrapper = await startPlan()

    await look(25_000)

    expect(phase(wrapper)).toBe('ODPOCZYNEK')
    expect(wrapper.find('.interval-name').exists()).toBe(false)
    expect(clock(wrapper)).toBe('0:08')
    expect(wrapper.text()).toContain('Interwał 2 z 4')
    expect(wrapper.text()).toContain('Dalej: Sprint w górę · 0:20')
    const segments = wrapper.findAll('[aria-label="Przebieg"] li')
    expect(segments.map((segment) => segment.classes())).toEqual([
      ['segment', 'segment-work'],
      ['segment', 'segment-rest', 'segment-current'],
      ['segment', 'segment-work'],
      ['segment', 'segment-rest'],
    ])
    expect(segments.map((segment) => segment.attributes('aria-current'))).toEqual([undefined, 'step', undefined, undefined])
  })

  it('hides the name line of a work interval that is still called "Praca"', async () => {
    savePlan({ ...createCardioPlan(), id: 'cardio-default', name: 'Domyślny' })
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Domyślny').trigger('click')

    await look(5000)

    expect(phase(wrapper)).toBe('PRACA')
    expect(wrapper.find('.interval-name').exists()).toBe(false)
  })

  it('the last interval says "To ostatni interwał" and has no "Dalej:"', async () => {
    const wrapper = await startPlan()

    await look(55_000)

    expect(wrapper.text()).toContain('Interwał 4 z 4')
    expect(wrapper.text()).toContain('To ostatni interwał')
    expect(wrapper.text()).not.toContain('Dalej:')
    expect(wrapper.text()).toContain('Zostało 0:08')
  })

  it('draws a narrow timeline gap above 24 segments and a normal gap at 24', async () => {
    const long: CardioPlan = {
      ...PLAN,
      id: 'cardio-long',
      name: 'Długi plan',
      blocks: [{ ...PLAN.blocks[0], repeat: 13 }],
    }
    const exactly24: CardioPlan = {
      ...PLAN,
      id: 'cardio-24',
      name: 'Dwadzieścia cztery',
      blocks: [{ ...PLAN.blocks[0], repeat: 12 }],
    }
    savePlan(long)
    savePlan(exactly24)

    const dense = mountApp()
    await button(dense.element, 'Start: Długi plan').trigger('click')
    expect(dense.findAll('[aria-label="Przebieg"] li')).toHaveLength(26)
    expect(dense.get('[aria-label="Przebieg"]').classes()).toContain('timeline-dense')

    localStorage.removeItem(WORKOUT_KEY)
    const normal = reload()
    await button(normal.element, 'Start: Dwadzieścia cztery').trigger('click')
    expect(normal.findAll('[aria-label="Przebieg"] li')).toHaveLength(24)
    expect(normal.get('[aria-label="Przebieg"]').classes()).not.toContain('timeline-dense')
  })

  it('sets the Meta rows in the display font, bold 700, uppercase (DESIGN.md Meta role; the browser walk is the real proof)', () => {
    const rule = /\.meta-row\s*\{([^}]*)\}/.exec(sessionSource)?.[1] ?? ''
    expect(rule).toMatch(/font-family:\s*var\(--font-display\);/)
    expect(rule).toMatch(/font-size:\s*var\(--text-meta\);/)
    expect(rule).toMatch(/font-weight:\s*700;/)
    expect(rule).toMatch(/text-transform:\s*uppercase;/)
  })

  it('switches the interval bar transition off under prefers-reduced-motion', () => {
    expect(sessionSource).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.bar-fill\s*\{\s*transition:\s*none;/)
  })

  it('"Zablokuj" is a plain button in this phase: tapping it changes nothing', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    const before = wrapper.html()

    await tap(wrapper, 'Zablokuj')

    expect(wrapper.html()).toBe(before)
    expect(phase(wrapper)).toBe('PRACA')
  })
})

describe('pause, resume and the tap guard', () => {
  it('Pauza shows PAUZA and Wznów, the clock stands while the real clock moves, Wznów continues from there', async () => {
    const wrapper = await startPlan()
    await look(10_000)

    await tap(wrapper, 'Pauza')
    expect(phase(wrapper)).toBe('PAUZA')
    expect(clock(wrapper)).toBe('0:13')
    expect(() => button(wrapper.element, 'Wznów')).not.toThrow()
    expect(wrapper.text()).toContain('Interwał 1 z 4')

    await look(40_000)
    expect(clock(wrapper)).toBe('0:13')
    expect(phase(wrapper)).toBe('PAUZA')

    await tap(wrapper, 'Wznów')
    await look(41_000 + ACTION_GUARD_MS)
    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:12')
  })

  it('a double tap on Pauza 150 ms apart pauses once: the second tap does not resume', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)

    await button(wrapper.element, 'Pauza').trigger('click')
    vi.setSystemTime(Date.now() + 150)
    await button(wrapper.element, 'Wznów').trigger('click')

    expect(phase(wrapper)).toBe('PAUZA')
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY) ?? 'null').pausedAt).not.toBeNull()
  })

  it('a pause in the get-ready shows PAUZA with the get-ready time frozen', async () => {
    const wrapper = await startPlan()
    await look(500)

    await tap(wrapper, 'Pauza')
    await look(20_000)

    expect(phase(wrapper)).toBe('PAUZA')
    expect(clock(wrapper)).toBe('0:02')
  })
})

describe('Zakończ and the end screen', () => {
  it('asks "Zakończyć trening?", the session runs on behind the question, "Wróć do treningu" keeps it', async () => {
    const wrapper = await startPlan()
    await look(10_000)

    await tap(wrapper, 'Zakończ')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
    await look(15_000)
    expect(clock(wrapper)).toBe('0:08')

    await tap(wrapper, 'Wróć do treningu')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(phase(wrapper)).toBe('PRACA')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
  })

  it('confirming ends the session, clears storage and shows the plan list', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    await tap(wrapper, 'Zakończ')

    await button(wrapper.get('[role="alertdialog"]').element, 'Zakończ trening').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(wrapper.get('[role="alertdialog"]').element, 'Zakończ trening').trigger('click')

    expect(heading(wrapper)).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('after the last interval the end screen shows the plan name, and "Wróć do planów" returns to the list', async () => {
    const wrapper = await startPlan()

    await look(63_000)

    expect(heading(wrapper)).toBe('Koniec treningu')
    expect(wrapper.text()).toContain('Żwawy bieg w Łodzi')
    await tap(wrapper, 'Wróć do planów')
    expect(heading(wrapper)).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })
})

describe('after a reload (a fresh mount reading storage)', () => {
  it('a get-ready comes back paused with the same time', async () => {
    await startPlan()
    moveTo(1000)

    const wrapper = reload()
    moveTo(30_000)
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()

    expect(phase(wrapper)).toBe('PAUZA')
    expect(clock(wrapper)).toBe('0:02')
    expect(() => button(wrapper.element, 'Wznów')).not.toThrow()
  })

  it('a work interval comes back paused at the same interval and time', async () => {
    await startPlan()
    moveTo(10_000)

    const wrapper = reload()
    await look(50_000)

    expect(phase(wrapper)).toBe('PAUZA')
    expect(wrapper.text()).toContain('Interwał 1 z 4')
    expect(wrapper.get('.interval-name').text()).toBe('Sprint w górę')
    expect(clock(wrapper)).toBe('0:13')
    expect(wrapper.text()).toContain('Razem 0:07')
  })

  it('a rest interval comes back paused at the same interval and time', async () => {
    await startPlan()
    moveTo(25_000)

    const wrapper = reload()
    await look(50_000)

    expect(phase(wrapper)).toBe('PAUZA')
    expect(wrapper.text()).toContain('Interwał 2 z 4')
    expect(clock(wrapper)).toBe('0:08')
  })

  it('a session that was paused stays paused at the same place, also after a second reload', async () => {
    const first = await startPlan()
    await look(10_000)
    await tap(first, 'Pauza')

    reload()
    moveTo(5 * 60_000)
    const second = reload()
    await look(6 * 60_000)

    expect(phase(second)).toBe('PAUZA')
    expect(clock(second)).toBe('0:13')
  })

  it('can be resumed with Wznów after the reload, and runs on from the stored position', async () => {
    await startPlan()
    moveTo(10_000)
    const wrapper = reload()
    moveTo(30_000)

    await tap(wrapper, 'Wznów')
    await look(32_500)

    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:11')
  })

  it('ignores a tap in the first 500 ms after the restore, then accepts it', async () => {
    await startPlan()
    moveTo(10_000)
    const wrapper = reload()

    await button(wrapper.element, 'Wznów').trigger('click')
    expect(phase(wrapper)).toBe('PAUZA')

    await tap(wrapper, 'Wznów')
    expect(phase(wrapper)).toBe('PRACA')
  })

  it('a session past its planned end shows the end screen with the plan name', async () => {
    await startPlan()
    moveTo(70_000)

    const wrapper = reload()

    expect(heading(wrapper)).toBe('Koniec treningu')
    expect(wrapper.text()).toContain('Żwawy bieg w Łodzi')
  })

  it('a paused session older than 2 h expires on load with the strength notice on the plan list', async () => {
    const first = await startPlan()
    await look(10_000)
    await tap(first, 'Pauza')

    moveTo(10_000 + ACTION_GUARD_MS + IDLE_EXPIRY_MS + 1)
    const wrapper = reload()

    expect(heading(wrapper)).toBe('Plany')
    expect(wrapper.text()).toContain(EXPIRY_NOTICE)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('the expiry timer armed after a restore still ends a session left paused on the screen', async () => {
    await startPlan()
    moveTo(10_000)
    const wrapper = reload()
    expect(phase(wrapper)).toBe('PAUZA')

    await vi.advanceTimersByTimeAsync(IDLE_EXPIRY_MS + 5000)

    expect(heading(wrapper)).toBe('Plany')
    expect(wrapper.text()).toContain(EXPIRY_NOTICE)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('the expiry notice goes away when a cardio session starts', async () => {
    const first = await startPlan()
    await look(10_000)
    await tap(first, 'Pauza')
    moveTo(10_000 + ACTION_GUARD_MS + IDLE_EXPIRY_MS + 1)
    const list = reload()
    expect(list.text()).toContain(EXPIRY_NOTICE)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(list.element, `Start: ${PLAN.name}`).trigger('click')
    await tap(apps[0], 'Zakończ')
    await tap(apps[0], 'Zakończ trening')

    expect(heading(apps[0])).toBe('Plany')
    expect(apps[0].text()).not.toContain(EXPIRY_NOTICE)
  })

  it('a strength expiry notice does not come back after a cardio session starts and ends', async () => {
    saveWorkout(startWorkout(STRENGTH_PLAN, T0))
    moveTo(IDLE_EXPIRY_MS + 1)
    const list = mountApp()
    expect(list.text()).toContain(EXPIRY_NOTICE)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(list.element, `Start: ${PLAN.name}`).trigger('click')
    expect(list.text()).not.toContain(EXPIRY_NOTICE)
    await tap(list, 'Zakończ')
    await tap(list, 'Zakończ trening')

    expect(heading(list)).toBe('Plany')
    expect(list.text()).not.toContain(EXPIRY_NOTICE)
  })

  it('a cardio expiry notice does not come back after a strength workout starts and ends', async () => {
    const first = await startPlan()
    await look(10_000)
    await tap(first, 'Pauza')
    moveTo(10_000 + ACTION_GUARD_MS + IDLE_EXPIRY_MS + 1)
    const list = reload()
    expect(list.text()).toContain(EXPIRY_NOTICE)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(list.element, `Start: ${STRENGTH_PLAN.name}`).trigger('click')
    expect(list.text()).not.toContain(EXPIRY_NOTICE)
    await tap(list, 'Zakończ trening')
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(list.get('[role="alertdialog"]').element, 'Zakończ trening').trigger('click')

    expect(heading(list)).toBe('Plany')
    expect(list.text()).not.toContain(EXPIRY_NOTICE)
  })

  it('a saved strength workout still restores to the strength screen, not the cardio screen', () => {
    saveWorkout(startWorkout(STRENGTH_PLAN, T0))

    const wrapper = mountApp()

    expect(heading(wrapper)).toBe('Wiosłowanie')
    expect(wrapper.find('[data-testid="phase"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="sets-left"]').text()).toBe('2')
  })
})

describe('the sounds on the screen', () => {
  it('plays 3 countdown beeps through the get-ready, then the work start, from a clock that moves with no ticks', async () => {
    await startPlan()
    expect(playCountdownBeep).toHaveBeenCalledTimes(1)

    await look(1000)
    expect(playCountdownBeep).toHaveBeenCalledTimes(2)
    await look(2000)
    expect(playCountdownBeep).toHaveBeenCalledTimes(3)
    expect(playWorkStart).not.toHaveBeenCalled()

    await look(3000)
    expect(playWorkStart).toHaveBeenCalledTimes(1)
    expect(playCountdownBeep).toHaveBeenCalledTimes(3)

    await look(23_000)
    expect(playRestStart).toHaveBeenCalledTimes(1)
  })

  it('makes no sound for a session restored paused', async () => {
    await startPlan()
    vi.clearAllMocks()
    moveTo(10_000)

    reload()
    await look(30_000)

    expect(playCountdownBeep).not.toHaveBeenCalled()
    expect(playWorkStart).not.toHaveBeenCalled()
    expect(playRestStart).not.toHaveBeenCalled()
  })
})

describe('the silent app update', () => {
  async function signalUpdate(): Promise<void> {
    if (sw.needRefresh) sw.needRefresh.value = true
    await nextTick()
  }

  it('does not reload during a cardio session and applies once after Zakończ is confirmed', async () => {
    const wrapper = await startPlan()
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await look(10_000)
    await tap(wrapper, 'Pauza')
    await tap(wrapper, 'Wznów')
    await tap(wrapper, 'Zakończ')
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await tap(wrapper, 'Zakończ trening')
    expect(heading(wrapper)).toBe('Plany')
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('waits on the cardio end screen and applies after "Wróć do planów"', async () => {
    const wrapper = await startPlan()
    await look(63_000)
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await tap(wrapper, 'Wróć do planów')
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits while a restored cardio session is on screen', async () => {
    await startPlan()
    moveTo(10_000)

    const restored = reload()
    await signalUpdate()

    expect(phase(restored)).toBe('PAUZA')
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })
})

describe('the screen lock (wake lock)', () => {
  it('a running cardio session holds the screen lock from the start', async () => {
    await startPlan()
    await flush()

    expect(sentinels).toHaveLength(1)
    expect(unreleased()).toBe(1)
  })

  it('keeps the screen lock after a visibilitychange return', async () => {
    await startPlan()
    await flush()

    await look(10_000)
    await flush()

    expect(unreleased()).toBe(1)
    expect(sentinels[sentinels.length - 1].released).toBe(false)
  })

  it('keeps the screen lock after a reload with the restored paused session', async () => {
    await startPlan()
    await flush()
    moveTo(10_000)

    reload()
    await flush()

    expect(unreleased()).toBe(1)
    expect(sentinels[sentinels.length - 1].released).toBe(false)
  })

  it('releases the screen lock when the session ends', async () => {
    const wrapper = await startPlan()
    await flush()

    await tap(wrapper, 'Zakończ')
    await tap(wrapper, 'Zakończ trening')
    await flush()

    expect(unreleased()).toBe(0)
  })
})
