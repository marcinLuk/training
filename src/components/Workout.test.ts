import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { savePlan } from '../plans/planStore'
import type { Plan } from '../plans/plan'
import { resetSound } from '../workout/sound'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { button } from './testHelpers'

const T0 = new Date('2026-10-18T10:00:00Z').getTime()

/** 2 exercises x 2 sets, 15 s rest. */
const PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [
    { id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 15 },
    { id: 'e2', name: 'Przysiady', sets: 2, reps: 12, restSeconds: 15 },
  ],
}

let oscillatorsCreated: number
let contextsCreated: number

let contextState: string
let resumeCalls: number

class FakeAudioContext {
  state = contextState
  currentTime = 0
  destination = {}
  constructor() {
    contextsCreated += 1
  }
  resume = vi.fn(() => {
    resumeCalls += 1
    return Promise.resolve()
  })
  close = vi.fn(() => Promise.resolve())
  createOscillator() {
    oscillatorsCreated += 1
    return { frequency: { value: 0 }, type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
  }
}

/** Beeps played so far: one rest end makes `BEEPS` oscillators. */
const BEEPS = 3
function soundsPlayed(): number {
  return oscillatorsCreated / BEEPS
}

let visibility: DocumentVisibilityState
let mounted: VueWrapper | null

function mountApp(): VueWrapper {
  mounted = mount(App, { attachTo: document.body })
  return mounted
}

async function jumpClock(ms: number): Promise<void> {
  vi.setSystemTime(Date.now() + ms)
  document.dispatchEvent(new Event('visibilitychange'))
  await Promise.resolve()
  await mounted?.vm.$nextTick()
}

/** A deliberate tap: the clock first moves past the guard window that follows a screen change. */
async function tap(wrapper: VueWrapper, name: string): Promise<void> {
  vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
  await button(wrapper.element, name).trigger('click')
}

/** A tap with no time between it and the last one, like the second tap of a double tap. */
async function tapNow(wrapper: VueWrapper, name: string): Promise<void> {
  await button(wrapper.element, name).trigger('click')
}

function setsLeft(wrapper: VueWrapper): string {
  return wrapper.get('[data-testid="sets-left"]').text()
}

function timeShown(wrapper: VueWrapper): string {
  return wrapper.get('[role="timer"]').text()
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  oscillatorsCreated = 0
  contextsCreated = 0
  resumeCalls = 0
  contextState = 'running'
  visibility = 'visible'
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  // Every timer is faked and never advanced: only the clock moves, so a green test cannot depend on ticks.
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  savePlan(PLAN)
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  resetSound()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Start from a plan card', () => {
  it('opens the set view of the first exercise', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
  })

  it('creates the audio context inside the Start tap', async () => {
    const wrapper = mountApp()
    expect(contextsCreated).toBe(0)
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    expect(contextsCreated).toBe(1)
  })
})

describe('Start with three saved plans', () => {
  beforeEach(() => {
    savePlan({
      id: 'plan-2',
      name: 'Plecy',
      exercises: [{ id: 'x1', name: 'Podciąganie', sets: 3, reps: 5, restSeconds: 30 }],
    })
    savePlan({
      id: 'plan-3',
      name: 'Nogi',
      exercises: [{ id: 'y1', name: 'Wykroki', sets: 4, reps: 10, restSeconds: 45 }],
    })
  })

  const CARDS = [
    { card: 'Start: Wiosłowanie i przysiady', exercise: 'Wiosłowanie', sets: '2' },
    { card: 'Start: Plecy', exercise: 'Podciąganie', sets: '3' },
    { card: 'Start: Nogi', exercise: 'Wykroki', sets: '4' },
  ]

  it.each(CARDS)('starts the plan of the tapped card: $card', async ({ card, exercise, sets }) => {
    const wrapper = mountApp()
    await button(wrapper.element, card).trigger('click')
    expect(wrapper.get('h1').text()).toBe(exercise)
    expect(setsLeft(wrapper)).toBe(sets)
  })

  it('starts the right plan again after the user comes back to the list', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    wrapper.unmount()
    mounted = null
    const second = mountApp()
    await button(second.element, 'Start: Plecy').trigger('click')
    expect(second.get('h1').text()).toBe('Podciąganie')
    expect(setsLeft(second)).toBe('3')
  })
})

describe('set view', () => {
  it('shows the exercise, the reps, the sets left and what comes next', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(wrapper.text()).toContain('8 powtórzeń')
    expect(setsLeft(wrapper)).toBe('2')
    expect(wrapper.text()).toContain('serii zostało')
    expect(wrapper.text()).toContain('Dalej: Przysiady')
    expect(button(wrapper.element, 'Gotowe').classes()).toEqual(
      expect.arrayContaining(['btn-primary', 'btn-large']),
    )
  })

  it('says it is the last exercise, then the last set of the plan', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Przysiady')
    expect(setsLeft(wrapper)).toBe('2')
    expect(wrapper.text()).toContain('To ostatnie ćwiczenie')
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(setsLeft(wrapper)).toBe('1')
    expect(wrapper.text()).toContain('To ostatnia seria')
  })
})

describe('rest view', () => {
  async function startAndFinishFirstSet(): Promise<VueWrapper> {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    await tap(wrapper, 'Gotowe')
    return wrapper
  }

  it('opens after "Gotowe" with 0:15, the next set and the early-end button', async () => {
    const wrapper = await startAndFinishFirstSet()
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    expect(timeShown(wrapper)).toBe('0:15')
    expect(wrapper.text()).toContain('Dalej: Wiosłowanie, seria 2 z 2')
    expect(button(wrapper.element, 'Gotowy, zaczynam').classes()).toContain('btn-large')
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
  })

  it('draws a ring that follows the remaining time', async () => {
    const wrapper = await startAndFinishFirstSet()
    const offset = () => Number(wrapper.get('.ring-progress').attributes('stroke-dashoffset'))
    expect(offset()).toBeCloseTo(0)
    await jumpClock(7_500)
    expect(offset()).toBeCloseTo(Number(wrapper.get('.ring-progress').attributes('stroke-dasharray')) / 2)
  })

  it('shows the right remaining time after a big clock jump with no timer tick', async () => {
    const wrapper = await startAndFinishFirstSet()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    await jumpClock(11_000)
    expect(timeShown(wrapper)).toBe('0:04')
  })

  it('returns to the set view and plays the sound once when the clock passes the rest end', async () => {
    const wrapper = await startAndFinishFirstSet()
    expect(soundsPlayed()).toBe(0)
    await jumpClock(16_000)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
    expect(soundsPlayed()).toBe(1)
    await jumpClock(5_000)
    await jumpClock(5_000)
    expect(soundsPlayed()).toBe(1)
  })

  it('also returns to the set view when the display timer sees the rest end', async () => {
    const wrapper = await startAndFinishFirstSet()
    vi.setSystemTime(Date.now() + 15_000)
    await vi.advanceTimersByTimeAsync(250)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(1)
  })

  it('stays silent when the page is hidden at the rest end, and plays nothing later', async () => {
    const wrapper = await startAndFinishFirstSet()
    visibility = 'hidden'
    vi.setSystemTime(Date.now() + 16_000)
    await vi.advanceTimersByTimeAsync(250)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(0)
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await jumpClock(30_000)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(soundsPlayed()).toBe(0)
  })

  it('stays silent when a rest that ended while hidden is first seen at the return', async () => {
    const wrapper = await startAndFinishFirstSet()
    visibility = 'hidden'
    vi.setSystemTime(Date.now() + 60_000)
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(0)
  })

  it('stays silent when the rest ended while hidden and the page is visible again 1 s later with no tick', async () => {
    const wrapper = await startAndFinishFirstSet()
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    vi.setSystemTime(Date.now() + 15_500)
    visibility = 'visible'
    vi.setSystemTime(Date.now() + 500)
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(0)
  })

  it('stays silent when the page is visible but the rest end is seen more than 2 s late', async () => {
    const wrapper = await startAndFinishFirstSet()
    await jumpClock(18_000)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(0)
  })

  it('plays when the visible page sees the rest end 2 s late, not more', async () => {
    const wrapper = await startAndFinishFirstSet()
    await jumpClock(17_000)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(soundsPlayed()).toBe(1)
  })

  it('reads whole seconds rounded up between whole seconds, and never 0:00 while it runs', async () => {
    const wrapper = await startAndFinishFirstSet()
    await jumpClock(250)
    expect(timeShown(wrapper)).toBe('0:15')
    await jumpClock(14_500)
    expect(timeShown(wrapper)).toBe('0:01')
    await jumpClock(249)
    expect(timeShown(wrapper)).toBe('0:01')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('creates or resumes the audio context inside the "Gotowe" tap', async () => {
    contextState = 'suspended'
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    const afterStart = resumeCalls
    await tap(wrapper, 'Gotowe')
    expect(resumeCalls).toBe(afterStart + 1)
  })

  it('ends at once with "Gotowy, zaczynam" and plays no sound', async () => {
    const wrapper = await startAndFinishFirstSet()
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
    await jumpClock(60_000)
    expect(soundsPlayed()).toBe(0)
  })

  it('does not lose a tap when the rest ran out but no tick has run yet', async () => {
    const wrapper = await startAndFinishFirstSet()
    vi.setSystemTime(Date.now() + 20_000)
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('stops the display timer when the rest ends and when the app unmounts', async () => {
    const wrapper = await startAndFinishFirstSet()
    expect(vi.getTimerCount()).toBe(1)
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(vi.getTimerCount()).toBe(0)
    await tap(wrapper, 'Gotowe')
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    mounted = null
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('taps right after a screen change', () => {
  async function started(): Promise<VueWrapper> {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    return wrapper
  }

  it('ignores a second "Gotowe" tap that lands on the rest screen, then accepts a later one', async () => {
    const wrapper = await started()
    await tap(wrapper, 'Gotowe')
    await tapNow(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    expect(timeShown(wrapper)).toBe('0:15')
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS - 1)
    await tapNow(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    vi.setSystemTime(Date.now() + 1)
    await tapNow(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
  })

  it('ignores a second "Gotowy, zaczynam" tap that lands on the next set, so no set is marked', async () => {
    const wrapper = await started()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(setsLeft(wrapper)).toBe('1')
    await tapNow(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('ignores "Gotowe" right after Start', async () => {
    const wrapper = await started()
    await tapNow(wrapper, 'Gotowe')
    expect(setsLeft(wrapper)).toBe('2')
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('ignores "Gotowe" right after the rest ended by itself', async () => {
    const wrapper = await started()
    await tap(wrapper, 'Gotowe')
    await jumpClock(15_500)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    await tapNow(wrapper, 'Gotowe')
    expect(setsLeft(wrapper)).toBe('1')
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('measures the window from the screen change, not from the app start', async () => {
    const wrapper = await started()
    vi.setSystemTime(Date.now() + 10 * 60_000)
    await tapNow(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    vi.setSystemTime(Date.now() + 10 * 60_000)
    await tapNow(wrapper, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
  })
})

describe('size of the guard window', () => {
  async function started(): Promise<VueWrapper> {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    return wrapper
  }

  /** Literal times on purpose: they must not depend on ACTION_GUARD_MS. */
  async function tapAfter(wrapper: VueWrapper, ms: number, name: string): Promise<void> {
    vi.setSystemTime(Date.now() + ms)
    await button(wrapper.element, name).trigger('click')
  }

  it('is between 400 and 600 ms', () => {
    expect(ACTION_GUARD_MS).toBeGreaterThanOrEqual(400)
    expect(ACTION_GUARD_MS).toBeLessThanOrEqual(600)
  })

  it('ignores a second tap 150 ms after a screen change and accepts one 700 ms after it', async () => {
    const wrapper = await started()
    await tapAfter(wrapper, 1_000, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    await tapAfter(wrapper, 150, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    await tapAfter(wrapper, 550, 'Gotowy, zaczynam')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
  })

  it('ignores "Wróć do planów" 150 ms after the last "Gotowe" and accepts it 700 ms after', async () => {
    const wrapper = await started()
    for (let set = 0; set < 3; set += 1) {
      await tap(wrapper, 'Gotowe')
      await tap(wrapper, 'Gotowy, zaczynam')
    }
    await tapAfter(wrapper, 1_000, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Koniec treningu')
    await tapAfter(wrapper, 150, 'Wróć do planów')
    expect(wrapper.get('h1').text()).toBe('Koniec treningu')
    await tapAfter(wrapper, 550, 'Wróć do planów')
    expect(wrapper.get('h1').text()).toBe('Plany')
  })
})

describe('end of the workout', () => {
  it('opens the end screen after the last set and "Wróć do planów" opens the plan list', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Wiosłowanie i przysiady').trigger('click')
    for (let set = 0; set < 3; set += 1) {
      await tap(wrapper, 'Gotowe')
      await tap(wrapper, 'Gotowy, zaczynam')
    }
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Koniec treningu')
    expect(wrapper.text()).toContain('Wiosłowanie i przysiady')
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    await tap(wrapper, 'Wróć do planów')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).toContain('Wiosłowanie i przysiady')
  })
})
