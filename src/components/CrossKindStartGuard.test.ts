import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { createCardioPlan, type CardioPlan, type Plan } from '../plans/plan'
import { savePlan } from '../plans/planStore'
import { releaseWakeLock } from '../workout/wakeLock'
import { WORKOUT_KEY } from '../workout/workoutStore'
import { button } from './testHelpers'

vi.mock('../workout/sound', () => ({
  playRestEnd: vi.fn(),
  unlockAudio: vi.fn(),
  playCountdownBeep: vi.fn(),
  playWorkStart: vi.fn(),
  playRestStart: vi.fn(),
}))

vi.mock('virtual:pwa-register/vue', async () => {
  const { ref: makeRef } = await import('vue')
  return {
    useRegisterSW: () => ({
      needRefresh: makeRef(false),
      offlineReady: makeRef(false),
      updateServiceWorker: vi.fn(() => Promise.resolve()),
    }),
  }
})

const T0 = new Date('2026-10-24T10:00:00Z').getTime()

/** One strength set: the first "Gotowe" ends the workout. */
const STRENGTH_PLAN: Plan = {
  id: 'strength-1',
  name: 'Przysiady w Łodzi',
  exercises: [{ id: 'e1', name: 'Przysiady', sets: 1, reps: 10, restSeconds: 30 }],
}

/** One 20 s work interval: the session ends 23 s after the start (3 s get-ready). */
const CARDIO_PLAN: CardioPlan = {
  ...createCardioPlan(),
  id: 'cardio-1',
  name: 'Żwawy bieg',
  blocks: [{ id: 'b1', repeat: 1, intervals: [{ id: 'i1', name: 'Sprint', seconds: 20, kind: 'work' }] }],
}

const STRENGTH_START = `Start: ${STRENGTH_PLAN.name}`
const CARDIO_START = `Start: ${CARDIO_PLAN.name}`

let wrapper: VueWrapper

/** Moves only the clock. No timer callback runs. */
function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

async function click(root: ParentNode, name: string): Promise<void> {
  await button(root, name).trigger('click')
}

const heading = (): string => wrapper.get('h1').text()
const confirmDialog = (): Element => wrapper.get('[role="alertdialog"]').element

/** Starts the plan from the list and moves the clock past the guard that the start opens. */
async function startAndSettle(startLabel: string): Promise<void> {
  await click(wrapper.element, startLabel)
  advance(500)
}

/** Ends the running workout through the "Zakończyć trening?" confirm. */
async function endThroughConfirm(endLabel: string): Promise<void> {
  await click(wrapper.element, endLabel)
  advance(500)
  await click(confirmDialog(), 'Zakończ trening')
}

/** Lets the cardio session run past its planned end, so the end screen shows. */
async function runCardioToEndScreen(): Promise<void> {
  advance(23_000)
  document.dispatchEvent(new Event('visibilitychange'))
  await wrapper.vm.$nextTick()
  advance(500)
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: vi.fn(() => Promise.resolve({ release: vi.fn(() => Promise.resolve()), addEventListener: vi.fn() })) },
  })
  savePlan(STRENGTH_PLAN)
  savePlan(CARDIO_PLAN)
  wrapper = mount(App, { attachTo: document.body })
})

afterEach(() => {
  wrapper.unmount()
  releaseWakeLock()
  Reflect.deleteProperty(navigator, 'wakeLock')
  vi.useRealTimers()
})

describe('the second tap of a double tap that ends a cardio session', () => {
  it('does not start a strength workout 150 ms after the Zakończ confirm, and does 500 ms after', async () => {
    await startAndSettle(CARDIO_START)
    await endThroughConfirm('Zakończ')
    expect(heading()).toBe('Plany')

    advance(150)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Przysiady')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
  })

  it('does not start a strength workout 150 ms after "Wróć do planów", and does 500 ms after', async () => {
    await startAndSettle(CARDIO_START)
    await runCardioToEndScreen()
    expect(heading()).toBe('Koniec treningu')
    await click(wrapper.element, 'Wróć do planów')
    expect(heading()).toBe('Plany')

    advance(150)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Przysiady')
  })

  it('still refuses a strength start 499 ms after the confirm', async () => {
    await startAndSettle(CARDIO_START)
    await endThroughConfirm('Zakończ')

    advance(499)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Plany')
  })
})

describe('the second tap of a double tap that ends a strength workout', () => {
  it('does not start a cardio session 150 ms after the Zakończ trening confirm, and does 500 ms after', async () => {
    await startAndSettle(STRENGTH_START)
    await endThroughConfirm('Zakończ trening')
    expect(heading()).toBe('Plany')

    advance(150)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
  })

  it('does not start a cardio session 150 ms after "Wróć do planów", and does 500 ms after', async () => {
    await startAndSettle(STRENGTH_START)
    await click(wrapper.element, 'Gotowe')
    advance(500)
    expect(heading()).toBe('Koniec treningu')
    await click(wrapper.element, 'Wróć do planów')
    expect(heading()).toBe('Plany')

    advance(150)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
  })

  it('still refuses a cardio start 499 ms after the confirm', async () => {
    await startAndSettle(STRENGTH_START)
    await endThroughConfirm('Zakończ trening')

    advance(499)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')
  })
})

describe('a start of the same kind after the end', () => {
  it('strength to strength: refused 150 ms after the confirm, accepted 500 ms after', async () => {
    await startAndSettle(STRENGTH_START)
    await endThroughConfirm('Zakończ trening')

    advance(150)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Plany')

    advance(350)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Przysiady')
  })

  it('cardio to cardio: refused 150 ms after the confirm, accepted 500 ms after', async () => {
    await startAndSettle(CARDIO_START)
    await endThroughConfirm('Zakończ')

    advance(150)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')

    advance(350)
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
  })
})

describe('the second tap of a double tap that expires an idle workout', () => {
  const IDLE_PAST_LIMIT_MS = 2 * 60 * 60 * 1000 + 1_000

  it('does not start a cardio session 150 ms after a "Gotowe" tap expired a strength workout, and does 500 ms after', async () => {
    await startAndSettle(STRENGTH_START)
    advance(IDLE_PAST_LIMIT_MS)
    await click(wrapper.element, 'Gotowe')
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(150)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
  })

  it('does not start a strength workout 150 ms after a "Wznów" tap expired a paused cardio session, and does 500 ms after', async () => {
    await startAndSettle(CARDIO_START)
    await click(wrapper.element, 'Pauza')
    advance(500)
    advance(IDLE_PAST_LIMIT_MS)
    await click(wrapper.element, 'Wznów')
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(150)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()

    advance(350)
    await click(wrapper.element, STRENGTH_START)
    expect(heading()).toBe('Przysiady')
  })

  it('still refuses a start 499 ms after a tap expired the workout', async () => {
    await startAndSettle(STRENGTH_START)
    advance(IDLE_PAST_LIMIT_MS)
    await click(wrapper.element, 'Gotowe')

    advance(499)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')
  })

  it('does not start a cardio session 150 ms after the workout expired by its own timer, and does 500 ms after', async () => {
    await startAndSettle(STRENGTH_START)
    // The fake clock keeps a pending timer's delay when the system time is set, so the expiry timer
    // (2 h + 1 ms) fires 2 h + 1 ms after the settle step.
    vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 1)
    await wrapper.vm.$nextTick()
    expect(heading()).toBe('Plany')

    advance(150)
    await click(wrapper.element, CARDIO_START)
    expect(heading()).toBe('Plany')

    advance(350)
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
  })
})

describe('a start with no workout ended before', () => {
  it('starts a cardio session at once after the app opens', async () => {
    await click(wrapper.element, CARDIO_START)
    expect(wrapper.get('[data-testid="phase"]').text()).toBe('PRZYGOTUJ SIĘ')
  })
})
