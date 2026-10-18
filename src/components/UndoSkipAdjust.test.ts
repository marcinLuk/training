import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { savePlan } from '../plans/planStore'
import type { Plan } from '../plans/plan'
import { IDLE_EXPIRY_MS } from '../workout/engine'
import { resetSound } from '../workout/sound'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { WORKOUT_KEY } from '../workout/workoutStore'
import { button } from './testHelpers'

const T0 = new Date('2026-10-18T10:00:00Z').getTime()

/** 2 exercises x 2 sets, 30 s rest. */
const PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [
    { id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 30 },
    { id: 'e2', name: 'Przysiady', sets: 2, reps: 12, restSeconds: 30 },
  ],
}

let oscillatorsCreated: number
let apps: VueWrapper[]

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  close = vi.fn(() => Promise.resolve())
  createOscillator() {
    oscillatorsCreated += 1
    return { frequency: { value: 0 }, type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() }
  }
}

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

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

/** A deliberate tap: the clock first moves past the guard window. */
async function tap(wrapper: VueWrapper, name: string): Promise<void> {
  advance(ACTION_GUARD_MS)
  await button(wrapper.element, name).trigger('click')
}

/** A tap a literal number of ms after the last one. */
async function tapAfter(wrapper: VueWrapper, ms: number, name: string): Promise<void> {
  advance(ms)
  await button(wrapper.element, name).trigger('click')
}

async function startPlan(): Promise<VueWrapper> {
  const wrapper = mountApp()
  await button(wrapper.element, `Start: ${PLAN.name}`).trigger('click')
  return wrapper
}

function setsLeft(wrapper: VueWrapper): string {
  return wrapper.get('[data-testid="sets-left"]').text()
}

function timeShown(wrapper: VueWrapper): string {
  return wrapper.get('[role="timer"]').text()
}

function undoDepth(): number {
  const raw = localStorage.getItem(WORKOUT_KEY)
  return raw === null ? -1 : (JSON.parse(raw) as { undoStack: unknown[] }).undoStack.length
}

function disabled(wrapper: VueWrapper, name: string): boolean {
  return button(wrapper.element, name).element.disabled
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  oscillatorsCreated = 0
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  savePlan(PLAN)
})

afterEach(() => {
  apps.forEach((app) => app.unmount())
  apps = []
  resetSound()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('"Cofnij" and "Pomiń serię" on the set view', () => {
  it('shows both buttons at 56 px height class and "Gotowe" stays the only chalk button', async () => {
    const wrapper = await startPlan()
    expect(wrapper.findAll('button.btn-primary').map((b) => b.text())).toEqual(['Gotowe'])
    expect(button(wrapper.element, 'Cofnij').classes()).not.toContain('btn-large')
    expect(button(wrapper.element, 'Pomiń serię').classes()).not.toContain('btn-large')
  })

  it('puts "Cofnij" and "Pomiń serię" before "Gotowe" in the page', async () => {
    const wrapper = await startPlan()
    const names = wrapper.findAll('button').map((b) => b.text())
    expect(names.indexOf('Cofnij')).toBeLessThan(names.indexOf('Gotowe'))
    expect(names.indexOf('Pomiń serię')).toBeLessThan(names.indexOf('Gotowe'))
  })

  it('disables "Cofnij" (not hides it) when there is nothing to undo', async () => {
    const wrapper = await startPlan()
    expect(disabled(wrapper, 'Cofnij')).toBe(true)
    await tap(wrapper, 'Pomiń serię')
    expect(disabled(wrapper, 'Cofnij')).toBe(false)
  })

  it('"Cofnij" after "Gotowe" returns to that set with the same sets left and ends the rest', async () => {
    const wrapper = await startPlan()
    expect(setsLeft(wrapper)).toBe('2')
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    await tap(wrapper, 'Cofnij')
    expect(wrapper.find('[role="timer"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('2')
    expect(disabled(wrapper, 'Cofnij')).toBe(true)
  })

  it('"Pomiń serię" moves to the next set with no rest', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    expect(wrapper.find('[role="timer"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
  })

  it('ignores "Gotowe" 150 ms after "Pomiń serię" moved to a new set, and accepts it 700 ms after', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    expect(setsLeft(wrapper)).toBe('1')
    await tapAfter(wrapper, 150, 'Gotowe')
    expect(setsLeft(wrapper)).toBe('1')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    await tapAfter(wrapper, 550, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
  })

  it('"Cofnij" after "Pomiń serię" returns to the skipped set', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    expect(setsLeft(wrapper)).toBe('1')
    await tap(wrapper, 'Cofnij')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('2')
  })

  it('skipping the last set opens the end screen, which has no undo', async () => {
    const wrapper = await startPlan()
    for (let set = 0; set < 3; set += 1) await tap(wrapper, 'Pomiń serię')
    expect(wrapper.get('h1').text()).toBe('Przysiady')
    await tap(wrapper, 'Pomiń serię')
    expect(wrapper.get('h1').text()).toBe('Koniec treningu')
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Wróć do planów'])
  })
})

describe('"Cofnij" on the rest view', () => {
  it('is a secondary button, enabled, and "Gotowy, zaczynam" stays the only chalk button', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    expect(disabled(wrapper, 'Cofnij')).toBe(false)
    expect(wrapper.findAll('button.btn-primary').map((b) => b.text())).toEqual(['Gotowy, zaczynam'])
  })

  it('undoes only the set that started the rest, one step', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(setsLeft(wrapper)).toBe('1')
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Cofnij')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
  })
})

describe('"−15 s" and "+15 s" on the rest view', () => {
  async function inRest(): Promise<VueWrapper> {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    return wrapper
  }

  it('shows both as secondary buttons with their names', async () => {
    const wrapper = await inRest()
    expect(button(wrapper.element, '+15 s').classes()).not.toContain('btn-primary')
    expect(button(wrapper.element, '−15 s').classes()).not.toContain('btn-primary')
  })

  it('"+15 s" adds 15 s to the remaining rest', async () => {
    const wrapper = await inRest()
    expect(timeShown(wrapper)).toBe('0:30')
    await tap(wrapper, '+15 s')
    expect(timeShown(wrapper)).toBe('0:45')
  })

  it('"−15 s" takes 15 s off the remaining rest', async () => {
    const wrapper = await inRest()
    await tap(wrapper, '−15 s')
    expect(timeShown(wrapper)).toBe('0:15')
  })

  it('counts the time already spent: 10 s in, "+15 s" leaves 35 s', async () => {
    const wrapper = await inRest()
    advance(10_000)
    await tap(wrapper, '+15 s')
    expect(timeShown(wrapper)).toBe('0:35')
  })

  it('counts two "+15 s" taps 200 ms apart, so the rest grows by 30 s', async () => {
    const wrapper = await inRest()
    await tap(wrapper, '+15 s')
    await tapAfter(wrapper, 200, '+15 s')
    expect(timeShown(wrapper)).toBe('1:00')
  })

  it('counts a "+15 s" and then two "−15 s" taps 200 ms apart, so 30 s become 15 s', async () => {
    const wrapper = await inRest()
    await tap(wrapper, '+15 s')
    await tapAfter(wrapper, 200, '−15 s')
    await tapAfter(wrapper, 200, '−15 s')
    expect(timeShown(wrapper)).toBe('0:15')
  })

  it('ignores a tap 150 ms after "Gotowe" opened the rest view', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tapAfter(wrapper, 150, '+15 s')
    expect(timeShown(wrapper)).toBe('0:30')
  })

  it('ends the rest when the time reaches 0, with no sound', async () => {
    const wrapper = await inRest()
    await tap(wrapper, '−15 s')
    await tap(wrapper, '−15 s')
    expect(wrapper.find('[role="timer"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(oscillatorsCreated).toBe(0)
  })

  it('plays the sound when a rest runs out by itself (so the silent case above is meaningful)', async () => {
    const wrapper = await inRest()
    advance(29_900)
    document.dispatchEvent(new Event('visibilitychange'))
    advance(200)
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()
    expect(oscillatorsCreated).toBeGreaterThan(0)
  })
})

describe('each change survives a reload', () => {
  it('keeps a "Gotowe" that was undone', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Cofnij')
    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(reloaded)).toBe('2')
    expect(reloaded.find('[role="timer"]').exists()).toBe(false)
  })

  it('keeps a skipped set, and the undo of it', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    const skipped = reload()
    expect(setsLeft(skipped)).toBe('1')
    expect(skipped.find('[role="timer"]').exists()).toBe(false)
    await tap(skipped, 'Cofnij')
    const undone = reload()
    expect(setsLeft(undone)).toBe('2')
  })

  it('keeps the rest time changed by "+15 s" and "−15 s"', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, '+15 s')
    advance(5_000)
    const longer = reload()
    expect(longer.get('h1').text()).toBe('Przerwa')
    expect(timeShown(longer)).toBe('0:40')
    await tap(longer, '−15 s')
    advance(5_000)
    const shorter = reload()
    // 44.5 s after "+15 s", 5 s later 39.5 s, 0.5 s guard + "−15 s" leaves 24 s, 5 s later 19 s.
    expect(timeShown(shorter)).toBe('0:19')
  })
})

describe('fast double taps on "Pomiń serię" and "Cofnij"', () => {
  it('counts one "Pomiń serię" when a second tap follows 150 ms later, and a tap 700 ms later counts', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    await tapAfter(wrapper, 150, 'Pomiń serię')
    expect(setsLeft(wrapper)).toBe('1')
    expect(undoDepth()).toBe(1)
    await tapAfter(wrapper, 550, 'Pomiń serię')
    expect(wrapper.get('h1').text()).toBe('Przysiady')
    expect(undoDepth()).toBe(2)
  })

  it('counts one "Cofnij" on the set view when a second tap follows 150 ms later, and a tap 700 ms later counts', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    await tap(wrapper, 'Pomiń serię')
    expect(wrapper.get('h1').text()).toBe('Przysiady')
    expect(undoDepth()).toBe(2)
    await tap(wrapper, 'Cofnij')
    expect(undoDepth()).toBe(1)
    await tapAfter(wrapper, 150, 'Cofnij')
    expect(undoDepth()).toBe(1)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    await tapAfter(wrapper, 550, 'Cofnij')
    expect(undoDepth()).toBe(0)
    expect(setsLeft(wrapper)).toBe('2')
  })

  it('ignores a tap on the same spot 150 ms after rest "Cofnij" (now "Pomiń serię"), and accepts it 700 ms after', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Cofnij')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('2')
    await tapAfter(wrapper, 150, 'Pomiń serię')
    expect(setsLeft(wrapper)).toBe('2')
    expect(undoDepth()).toBe(0)
    await tapAfter(wrapper, 550, 'Pomiń serię')
    expect(setsLeft(wrapper)).toBe('1')
    expect(undoDepth()).toBe(1)
  })
})

describe('a tap after the idle limit expires the workout', () => {
  function expectExpired(wrapper: VueWrapper): void {
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(wrapper.text()).toContain('Trening wygasł po 2 godzinach bez dotknięcia.')
    expect(wrapper.find('[data-testid="sets-left"]').exists()).toBe(false)
  }

  it('"Cofnij" at 2 h + 1 ms expires and undoes nothing', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Pomiń serię')
    await tapAfter(wrapper, IDLE_EXPIRY_MS + 1, 'Cofnij')
    expectExpired(wrapper)
  })

  it('"Pomiń serię" at 2 h + 1 ms expires and skips nothing', async () => {
    const wrapper = await startPlan()
    await tapAfter(wrapper, IDLE_EXPIRY_MS + 1, 'Pomiń serię')
    expectExpired(wrapper)
  })

  it('"−15 s" at 2 h + 1 ms expires and adjusts nothing', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tapAfter(wrapper, IDLE_EXPIRY_MS + 1, '−15 s')
    expectExpired(wrapper)
  })

  it('"+15 s" at 2 h + 1 ms expires and adjusts nothing', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tapAfter(wrapper, IDLE_EXPIRY_MS + 1, '+15 s')
    expectExpired(wrapper)
  })

  it('"Pomiń serię" at exactly 2 h still counts', async () => {
    const wrapper = await startPlan()
    await tapAfter(wrapper, IDLE_EXPIRY_MS, 'Pomiń serię')
    expect(wrapper.text()).not.toContain('wygasł')
    expect(setsLeft(wrapper)).toBe('1')
    expect(undoDepth()).toBe(1)
  })
})
