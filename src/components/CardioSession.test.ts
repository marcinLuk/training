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

  it('"Zablokuj" locks only the screen: the session state and the storage are left as they were', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    const stored = localStorage.getItem(WORKOUT_KEY)

    await tap(wrapper, 'Zablokuj')

    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:13')
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(stored)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })
})

describe('lock mode', () => {
  const UNLOCK_NAME = 'Przytrzymaj, aby odblokować'
  const HOLD_MS = 2000

  /** Locks a running session at 10 s and returns the app. Phase PRACA, clock 0:13. */
  async function lockedSession(): Promise<VueWrapper> {
    const wrapper = await startPlan()
    await look(10_000)
    await tap(wrapper, 'Zablokuj')
    return wrapper
  }

  const bar = (wrapper: VueWrapper) => button(wrapper.element, UNLOCK_NAME)
  const isLocked = (wrapper: VueWrapper): boolean => wrapper.find('[data-testid="hold-label"]').exists()
  const fillStyle = (wrapper: VueWrapper): string => wrapper.get('[data-testid="hold-fill"]').attributes('style') ?? ''
  const label = (wrapper: VueWrapper): string => text(wrapper, '[data-testid="hold-label"]')

  /**
   * The clock jumps ahead by all but the last 50 ms, then exactly one render tick runs. The tick
   * only asks for a re-read; the time it reads is the jump, not the number of ticks.
   */
  async function holdFor(wrapper: VueWrapper, ms: number): Promise<void> {
    vi.setSystemTime(Date.now() + ms - 50)
    await vi.advanceTimersByTimeAsync(50)
    await wrapper.vm.$nextTick()
  }

  function stubReducedMotion(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: matches && query.includes('prefers-reduced-motion'), media: query }),
    })
  }

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('"Zablokuj" replaces Pauza, Zablokuj and Zakończ with one hold bar and shows "Ekran zablokowany" in the top Meta row', async () => {
    const wrapper = await lockedSession()

    expect(isLocked(wrapper)).toBe(true)
    expect(label(wrapper)).toBe(UNLOCK_NAME)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].attributes('aria-label')).toBe(UNLOCK_NAME)
    expect(wrapper.get('.meta-row').text()).toContain('Ekran zablokowany')
    expect(wrapper.get('.meta-row').text()).not.toContain('Żwawy bieg w Łodzi')
    expect(wrapper.get('.meta-row').text()).toContain('Interwał 1 z 4')
    expect(() => button(wrapper.element, 'Pauza')).toThrow()
    expect(() => button(wrapper.element, 'Zakończ')).toThrow()
    expect(() => button(wrapper.element, 'Zablokuj')).toThrow()
  })

  it('the hold bar is a 64 px full-width button with a stroke SVG padlock (2 px, aria-hidden), no emoji', async () => {
    const wrapper = await lockedSession()

    expect(bar(wrapper).classes()).toEqual(expect.arrayContaining(['btn-large', 'btn-block', 'hold-bar']))
    const icon = bar(wrapper).get('svg')
    expect(icon.attributes('stroke-width')).toBe('2')
    expect(icon.attributes('stroke')).toBe('currentColor')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.actions').text()).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(sessionSource).toMatch(/\.hold-bar\s*\{[^}]*border-color:\s*var\(--on-cardio\);/)
  })

  it('a 1.9 s hold stays locked and the fill goes back to zero on release', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    await holdFor(wrapper, 1900)
    expect(isLocked(wrapper)).toBe(true)
    await bar(wrapper).trigger('pointerup')

    expect(isLocked(wrapper)).toBe(true)
    expect(label(wrapper)).toBe(UNLOCK_NAME)
    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')
  })

  it('a 2.0 s hold unlocks, read from the clock with no tick: the release alone is enough', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    vi.setSystemTime(Date.now() + HOLD_MS)
    await bar(wrapper).trigger('pointerup')

    expect(isLocked(wrapper)).toBe(false)
    expect(wrapper.get('.meta-row').text()).toContain('Żwawy bieg w Łodzi')
    expect(() => button(wrapper.element, 'Pauza')).not.toThrow()
    expect(() => button(wrapper.element, 'Zablokuj')).not.toThrow()
    expect(() => button(wrapper.element, 'Zakończ')).not.toThrow()
  })

  it('a hold still pressed unlocks when the render timer reads 2.0 s, and not at 1.9 s', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    await holdFor(wrapper, 1900)
    expect(isLocked(wrapper)).toBe(true)

    await holdFor(wrapper, 100)
    expect(isLocked(wrapper)).toBe(false)
  })

  it('the fill grows from the left with the clock: 0%, 50% after 1 s, back to 0% after a release', async () => {
    const wrapper = await lockedSession()
    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')

    await bar(wrapper).trigger('pointerdown')
    await holdFor(wrapper, 1000)
    expect(fillStyle(wrapper)).toContain('calc(100% - 50%)')

    await bar(wrapper).trigger('pointerup')
    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')
  })

  it.each(['pointerup', 'pointercancel', 'pointerleave'])(
    'a %s before 2 s resets the hold: a second press needs its own full 2 s',
    async (ending) => {
      const wrapper = await lockedSession()

      await bar(wrapper).trigger('pointerdown')
      await holdFor(wrapper, 1500)
      await bar(wrapper).trigger(ending)
      expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')

      await bar(wrapper).trigger('pointerdown')
      await holdFor(wrapper, 1500)
      expect(isLocked(wrapper)).toBe(true)
      await holdFor(wrapper, 500)
      expect(isLocked(wrapper)).toBe(false)
    },
  )

  /** A pointer event with an id, as a touch sends it. Dispatched on the element, like the browser does. */
  async function pointer(element: Element, type: string, pointerId: number): Promise<void> {
    // Vue skips a listener attached in the same millisecond as an event that another listener saw first.
    vi.setSystemTime(Date.now() + 1)
    element.dispatchEvent(new PointerEvent(type, { pointerId, bubbles: true, cancelable: true }))
    await nextTick()
  }

  async function click(element: Element): Promise<void> {
    vi.setSystemTime(Date.now() + 1)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await nextTick()
  }

  /** Locks, presses the bar with pointer 7 and lets the render timer unlock it with the finger still down. */
  async function unlockedWithFingerDown(): Promise<VueWrapper> {
    const wrapper = await lockedSession()
    await pointer(bar(wrapper).element, 'pointerdown', 7)
    await holdFor(wrapper, 1900)
    expect(isLocked(wrapper)).toBe(true)
    await holdFor(wrapper, 100)
    expect(isLocked(wrapper)).toBe(false)
    return wrapper
  }

  /** A move of the captured pointer, as a touch sends it to the bar when the finger slides. */
  async function move(element: Element, x: number, y: number): Promise<void> {
    vi.setSystemTime(Date.now() + 1)
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: x, clientY: y, bubbles: true }))
    await nextTick()
  }

  /** The bar sits at x 16-396, y 835-899 on a 412 px phone. jsdom has no layout, so the rectangle is given. */
  function placeBar(element: Element): void {
    element.getBoundingClientRect = () => new DOMRect(16, 835, 380, 64)
  }

  it('a finger that slides off the bar resets the hold, with no pointerleave (a touch has none until the lift)', async () => {
    const wrapper = await lockedSession()
    const element = bar(wrapper).element
    placeBar(element)

    await pointer(element, 'pointerdown', 7)
    await holdFor(wrapper, 1500)
    expect(fillStyle(wrapper)).toContain('calc(100% - 75%)')
    await move(element, 206, 400)
    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')
    await holdFor(wrapper, 1000)

    expect(isLocked(wrapper)).toBe(true)
  })

  it.each([
    ['left', 10, 867],
    ['right', 400, 867],
    ['above', 206, 830],
    ['below', 206, 905],
  ])('a slide off the bar to the %s resets the hold', async (_side, x, y) => {
    const wrapper = await lockedSession()
    const element = bar(wrapper).element
    placeBar(element)

    await pointer(element, 'pointerdown', 7)
    await holdFor(wrapper, 1000)
    await move(element, x, y)

    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')
  })

  it('moves that stay on the bar keep the hold, so a 2 s hold with a little finger drift still unlocks', async () => {
    const wrapper = await lockedSession()
    const element = bar(wrapper).element
    placeBar(element)

    await pointer(element, 'pointerdown', 7)
    await holdFor(wrapper, 1000)
    await move(element, 20, 840)
    await move(element, 392, 895)
    await move(element, 206, 867)
    expect(fillStyle(wrapper)).toContain('calc(100% - 50%)')
    await holdFor(wrapper, 1000)

    expect(isLocked(wrapper)).toBe(false)
  })

  it('a move with no hold running does nothing', async () => {
    const wrapper = await lockedSession()
    const element = bar(wrapper).element
    placeBar(element)

    await move(element, 206, 400)

    expect(isLocked(wrapper)).toBe(true)
    expect(fillStyle(wrapper)).toContain('calc(100% - 0%)')
  })

  it.each(['Zablokuj', 'Zakończ'])('the lift and click of the press that unlocked do nothing on %s: no re-lock, no question', async (name) => {
    const wrapper = await unlockedWithFingerDown()
    const stored = localStorage.getItem(WORKOUT_KEY)
    const target = button(wrapper.element, name).element

    await pointer(target, 'pointerup', 7)
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await click(target)

    expect(isLocked(wrapper)).toBe(false)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(phase(wrapper)).toBe('PRACA')
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(stored)
  })

  it.each(['Zablokuj', 'Zakończ', 'Pauza'])('the lift on %s alone (its click is not needed) is swallowed', async (name) => {
    const wrapper = await unlockedWithFingerDown()
    const stored = localStorage.getItem(WORKOUT_KEY)
    const target = button(wrapper.element, name).element
    const seen = vi.fn()
    target.addEventListener('pointerup', seen)

    await pointer(target, 'pointerup', 7)

    expect(seen).not.toHaveBeenCalled()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(stored)
  })

  it('the lift of another pointer is not swallowed: only the unlocking press is', async () => {
    const wrapper = await unlockedWithFingerDown()

    await pointer(button(wrapper.element, 'Zakończ').element, 'pointerup', 8)
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await click(button(wrapper.element, 'Zakończ').element)

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
  })

  it('after the lift a fresh tap works again: Zakończ asks the question, and so does Zablokuj lock', async () => {
    const wrapper = await unlockedWithFingerDown()
    const end = button(wrapper.element, 'Zakończ').element
    await pointer(end, 'pointerup', 7)
    await click(end)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await pointer(end, 'pointerdown', 9)
    await pointer(end, 'pointerup', 9)
    await click(end)
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
    await button(wrapper.element, 'Wróć do treningu').trigger('click')

    const lock = button(wrapper.element, 'Zablokuj').element
    await pointer(lock, 'pointerdown', 10)
    await pointer(lock, 'pointerup', 10)
    await click(lock)
    expect(isLocked(wrapper)).toBe(true)
  })

  it('the guard swallows one click only: the next click works with no pointerdown before it', async () => {
    const wrapper = await unlockedWithFingerDown()
    const end = button(wrapper.element, 'Zakończ').element
    await pointer(end, 'pointerup', 7)
    await click(end)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await click(end)

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
  })

  it('a lift whose click never comes does not swallow the next fresh tap', async () => {
    const wrapper = await unlockedWithFingerDown()
    await pointer(button(wrapper.element, 'Zakończ').element, 'pointerup', 7)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    const lock = button(wrapper.element, 'Zablokuj').element
    await pointer(lock, 'pointerdown', 11)
    await pointer(lock, 'pointerup', 11)
    await click(lock)

    expect(isLocked(wrapper)).toBe(true)
  })

  it('a cancelled press ends the guard: the next click works', async () => {
    const wrapper = await unlockedWithFingerDown()
    await pointer(button(wrapper.element, 'Zakończ').element, 'pointercancel', 7)

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await click(button(wrapper.element, 'Zakończ').element)

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
  })

  it('a timer that fires after a cancel does not unlock', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    await bar(wrapper).trigger('pointercancel')
    await vi.advanceTimersByTimeAsync(HOLD_MS + 1000)

    expect(isLocked(wrapper)).toBe(true)
  })

  it('taps where Pauza and Zakończ were do nothing: the session is not paused and no question opens', async () => {
    const wrapper = await lockedSession()
    const stored = localStorage.getItem(WORKOUT_KEY)

    for (const selector of ['.actions', '.clock', '.next-row', '.phase-block', '.cardio-session', '.timeline']) {
      vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
      await wrapper.get(selector).trigger('click')
    }
    await bar(wrapper).trigger('click')

    expect(isLocked(wrapper)).toBe(true)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(phase(wrapper)).toBe('PRACA')
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY) ?? 'null').pausedAt).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(stored)
  })

  it('a quick tap on the bar (down and up at once) does not unlock', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    await bar(wrapper).trigger('pointerup')

    expect(isLocked(wrapper)).toBe(true)
  })

  it('the session keeps running while locked: the clock moves and a sound cue still plays', async () => {
    const wrapper = await lockedSession()
    vi.clearAllMocks()

    await look(22_000)
    expect(isLocked(wrapper)).toBe(true)
    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:01')
    expect(playCountdownBeep).toHaveBeenCalledTimes(3)

    await look(23_000)
    expect(phase(wrapper)).toBe('ODPOCZYNEK')
    expect(playRestStart).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.meta-row').text()).toContain('Interwał 2 z 4')
    expect(wrapper.text()).toContain('Razem 0:20')
  })

  it('the session is still at the right place after the unlock', async () => {
    const wrapper = await lockedSession()
    await bar(wrapper).trigger('pointerdown')
    vi.setSystemTime(Date.now() + HOLD_MS)
    await bar(wrapper).trigger('pointerup')
    await look(12_500)

    expect(phase(wrapper)).toBe('PRACA')
    expect(clock(wrapper)).toBe('0:11')
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY) ?? 'null').pausedAt).toBeNull()
  })

  it('a locked session that reaches its planned end shows the end screen', async () => {
    const wrapper = await lockedSession()

    await look(63_000)

    expect(heading(wrapper)).toBe('Koniec treningu')
  })

  it('a paused session can be locked too, and the lock does not resume it', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    await tap(wrapper, 'Pauza')
    await tap(wrapper, 'Zablokuj')

    await look(40_000)

    expect(isLocked(wrapper)).toBe(true)
    expect(phase(wrapper)).toBe('PAUZA')
    expect(clock(wrapper)).toBe('0:13')
  })

  it('locking writes nothing to storage', async () => {
    const wrapper = await startPlan()
    await look(10_000)
    const before = { ...localStorage }

    await tap(wrapper, 'Zablokuj')

    expect({ ...localStorage }).toEqual(before)
  })

  it('a fresh mount (a reload) shows the session unlocked and paused', async () => {
    await lockedSession()
    moveTo(12_000)

    const wrapper = reload()

    expect(isLocked(wrapper)).toBe(false)
    expect(phase(wrapper)).toBe('PAUZA')
    expect(wrapper.get('.meta-row').text()).toContain('Żwawy bieg w Łodzi')
    expect(() => button(wrapper.element, 'Wznów')).not.toThrow()
    expect(() => button(wrapper.element, 'Zakończ')).not.toThrow()
  })

  it('holding Space for 2.0 s unlocks and 1.9 s does not', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('keydown', { key: ' ' })
    await holdFor(wrapper, 1900)
    await bar(wrapper).trigger('keyup', { key: ' ' })
    expect(isLocked(wrapper)).toBe(true)

    await bar(wrapper).trigger('keydown', { key: ' ' })
    vi.setSystemTime(Date.now() + HOLD_MS)
    await bar(wrapper).trigger('keyup', { key: ' ' })
    expect(isLocked(wrapper)).toBe(false)
  })

  it('holding Enter for 2.0 s unlocks, with the key repeat ignored and the bar still filling', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('keydown', { key: 'Enter' })
    await holdFor(wrapper, 1500)
    await bar(wrapper).trigger('keydown', { key: 'Enter', repeat: true })
    expect(fillStyle(wrapper)).toContain('calc(100% - 75%)')
    await holdFor(wrapper, 500)

    expect(isLocked(wrapper)).toBe(false)
  })

  it('other keys start no hold, and losing focus before 2 s resets the hold', async () => {
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('keydown', { key: 'a' })
    await holdFor(wrapper, HOLD_MS)
    await bar(wrapper).trigger('keyup', { key: 'a' })
    expect(isLocked(wrapper)).toBe(true)

    await bar(wrapper).trigger('keydown', { key: ' ' })
    await holdFor(wrapper, 1000)
    await bar(wrapper).trigger('blur')
    await holdFor(wrapper, 1500)
    await bar(wrapper).trigger('keyup', { key: ' ' })
    expect(isLocked(wrapper)).toBe(true)
  })

  it('under prefers-reduced-motion the bar shows "Trzymaj… 1" then "Trzymaj… 2" and no fill', async () => {
    stubReducedMotion(true)
    const wrapper = await lockedSession()
    expect(label(wrapper)).toBe(UNLOCK_NAME)

    await bar(wrapper).trigger('pointerdown')
    expect(label(wrapper)).toBe('Trzymaj… 1')
    expect(wrapper.find('[data-testid="hold-fill"]').exists()).toBe(false)

    await holdFor(wrapper, 900)
    expect(label(wrapper)).toBe('Trzymaj… 1')
    await holdFor(wrapper, 100)
    expect(label(wrapper)).toBe('Trzymaj… 2')

    await holdFor(wrapper, 999)
    expect(isLocked(wrapper)).toBe(true)
    await bar(wrapper).trigger('pointerup')
    expect(label(wrapper)).toBe(UNLOCK_NAME)
  })

  it('without reduced motion the label stays and the fill shows', async () => {
    stubReducedMotion(false)
    const wrapper = await lockedSession()

    await bar(wrapper).trigger('pointerdown')
    await holdFor(wrapper, 1200)

    expect(label(wrapper)).toBe(UNLOCK_NAME)
    expect(wrapper.find('[data-testid="hold-fill"]').exists()).toBe(true)
  })

  it('the unlock lands back on a working screen: Zakończ asks the question again', async () => {
    const wrapper = await lockedSession()
    await bar(wrapper).trigger('pointerdown')
    vi.setSystemTime(Date.now() + HOLD_MS)
    await bar(wrapper).trigger('pointerup')

    await tap(wrapper, 'Zakończ')

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Zakończyć trening?')
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
