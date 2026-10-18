import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { PLANS_KEY, listPlans, savePlan } from '../plans/planStore'
import type { Plan } from '../plans/plan'
import { IDLE_EXPIRY_MS } from '../workout/engine'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { WORKOUT_CORRUPT_PREFIX, WORKOUT_KEY } from '../workout/workoutStore'
import { button } from './testHelpers'

const T0 = new Date('2026-10-18T10:00:00Z').getTime()
const EXPIRY_NOTICE = 'Trening wygasł po 2 godzinach bez dotknięcia.'

/** 2 exercises x 2 sets, 60 s rest. */
const PLAN: Plan = {
  id: 'plan-1',
  name: 'Wiosłowanie i przysiady',
  exercises: [
    { id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
    { id: 'e2', name: 'Przysiady', sets: 2, reps: 12, restSeconds: 60 },
  ],
}

let apps: VueWrapper[]

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

async function tap(wrapper: VueWrapper, name: string): Promise<void> {
  advance(ACTION_GUARD_MS)
  await button(wrapper.element, name).trigger('click')
}

async function tapInDialog(wrapper: VueWrapper, name: string): Promise<void> {
  advance(ACTION_GUARD_MS)
  await button(wrapper.get('[role="alertdialog"]').element, name).trigger('click')
}

async function wake(wrapper: VueWrapper): Promise<void> {
  document.dispatchEvent(new Event('visibilitychange'))
  await wrapper.vm.$nextTick()
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

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  savePlan(PLAN)
})

afterEach(() => {
  apps.forEach((app) => app.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('an app mounted over a stored workout', () => {
  it('opens the set view mid-set at once, with the same exercise and sets left', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    expect(setsLeft(wrapper)).toBe('1')

    advance(30 * 60_000)
    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(reloaded)).toBe('1')
    expect(reloaded.text()).toContain('Dalej: Przysiady')
    expect(reloaded.find('[aria-label="Zapisane plany"]').exists()).toBe(false)
  })

  it('opens the rest view mid-rest with the remaining time from the timestamps, not a restart', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    expect(timeShown(wrapper)).toBe('1:00')

    advance(25_000)
    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Przerwa')
    expect(timeShown(reloaded)).toBe('0:35')
    expect(reloaded.text()).toContain('Wiosłowanie, seria 2 z 2')
  })

  it('shows the set view when the rest ended while the app was away', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')

    advance(5 * 60_000)
    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(reloaded)).toBe('1')
  })

  it('keeps the restored rest running: it ends by itself after the clock passes its end', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    advance(20_000)
    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Przerwa')
    advance(41_000)
    await wake(reloaded)
    expect(reloaded.get('h1').text()).toBe('Wiosłowanie')
  })

  it('opens the end screen for a stored finished workout', async () => {
    const wrapper = await startPlan()
    for (let set = 0; set < 3; set += 1) {
      await tap(wrapper, 'Gotowe')
      await tap(wrapper, 'Gotowy, zaczynam')
    }
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Koniec treningu')

    const reloaded = reload()
    expect(reloaded.get('h1').text()).toBe('Koniec treningu')
    await tap(reloaded, 'Wróć do planów')
    expect(reloaded.get('h1').text()).toBe('Plany')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(reload().get('h1').text()).toBe('Plany')
  })

  it('opens the plan list with the plans intact when the stored workout is unreadable', () => {
    const plansBefore = localStorage.getItem(PLANS_KEY)
    localStorage.setItem(WORKOUT_KEY, '{"version":1,"planId":')
    const wrapper = mountApp()
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).not.toContain(EXPIRY_NOTICE)
    expect(localStorage.getItem(PLANS_KEY)).toBe(plansBefore)
    expect(listPlans()).toEqual([PLAN])
    expect(Object.keys(localStorage).filter((key) => key.startsWith(WORKOUT_CORRUPT_PREFIX))).toHaveLength(1)
  })
})

describe('expiry notice', () => {
  async function expiredApp(): Promise<VueWrapper> {
    await startPlan()
    advance(IDLE_EXPIRY_MS + 1)
    return reload()
  }

  it('shows the notice and the plan list when the last tap is more than 2 h old', async () => {
    const wrapper = await expiredApp()
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.get('[role="status"]').text()).toBe(EXPIRY_NOTICE)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('shows no notice a second time after another reload', async () => {
    await expiredApp()
    const again = reload()
    expect(again.text()).not.toContain(EXPIRY_NOTICE)
  })

  it('shows no notice for a workout exactly 2 h old: it resumes', async () => {
    await startPlan()
    advance(IDLE_EXPIRY_MS)
    const wrapper = reload()
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(wrapper.text()).not.toContain(EXPIRY_NOTICE)
  })

  it('shows the notice when the app sits open behind a lock and the page becomes visible', async () => {
    const wrapper = await startPlan()
    advance(IDLE_EXPIRY_MS + 1)
    await wake(wrapper)
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.get('[role="status"]').text()).toBe(EXPIRY_NOTICE)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('goes away when the user opens the editor', async () => {
    const wrapper = await expiredApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).not.toContain(EXPIRY_NOTICE)
  })

  it('goes away when the user starts a workout', async () => {
    const wrapper = await expiredApp()
    advance(ACTION_GUARD_MS)
    await button(wrapper.element, `Start: ${PLAN.name}`).trigger('click')
    await tap(wrapper, 'Zakończ trening')
    await tapInDialog(wrapper, 'Zakończ trening')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).not.toContain(EXPIRY_NOTICE)
  })
})

describe('"Zakończ trening"', () => {
  it('is a danger button at the top of the set view, before the heading, at least 56 px tall', async () => {
    const wrapper = await startPlan()
    const end = button(wrapper.element, 'Zakończ trening')
    expect(end.classes()).toContain('btn-danger')
    expect(end.classes()).not.toContain('btn-primary')
    const main = wrapper.get('main').element
    const buttons = Array.from(main.querySelectorAll('button'))
    expect(buttons[0]).toBe(end.element)
    expect(buttons[buttons.length - 1]?.textContent?.trim()).toBe('Gotowe')
    expect(main.querySelector('h1')!.compareDocumentPosition(end.element) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('is also on the rest view, with "Gotowy, zaczynam" as the only primary button', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    expect(button(wrapper.element, 'Zakończ trening').classes()).toContain('btn-danger')
    expect(wrapper.findAll('.btn-primary')).toHaveLength(1)
  })

  it('is not on the end screen', async () => {
    const wrapper = await startPlan()
    for (let set = 0; set < 3; set += 1) {
      await tap(wrapper, 'Gotowe')
      await tap(wrapper, 'Gotowy, zaczynam')
    }
    await tap(wrapper, 'Gotowe')
    expect(wrapper.findAll('button').map((item) => item.text())).toEqual(['Wróć do planów'])
  })

  it('opens an in-app confirm with no chalk button and no native dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const wrapper = await startPlan()
    await tap(wrapper, 'Zakończ trening')
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(dialog.text()).toContain('Zakończyć trening?')
    expect(dialog.findAll('button').map((item) => item.text())).toEqual(['Wróć do treningu', 'Zakończ trening'])
    expect(dialog.find('.btn-primary').exists()).toBe(false)
    expect(button(dialog.element, 'Zakończ trening').classes()).toContain('btn-danger')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('confirm removes the workout, opens the plan list and survives a reload', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Zakończ trening')
    await tapInDialog(wrapper, 'Zakończ trening')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(wrapper.text()).toContain(PLAN.name)
    expect(reload().get('h1').text()).toBe('Plany')
  })

  it('cancel keeps the set view and its state', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Gotowy, zaczynam')
    await tap(wrapper, 'Zakończ trening')
    await tapInDialog(wrapper, 'Wróć do treningu')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(setsLeft(wrapper)).toBe('1')
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
  })

  it('cancel keeps a running rest, still counting from its timestamps', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Zakończ trening')
    advance(10_000)
    await tapInDialog(wrapper, 'Wróć do treningu')
    await wake(wrapper)
    expect(wrapper.get('h1').text()).toBe('Przerwa')
    // 0.5 s guard + 10 s + 0.5 s guard = 11 s of the 60 s rest have passed.
    expect(timeShown(wrapper)).toBe('0:49')
  })

  it('cancel after the rest ended behind the confirm shows the set view', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Gotowe')
    await tap(wrapper, 'Zakończ trening')
    advance(61_000)
    await wake(wrapper)
    await tapInDialog(wrapper, 'Wróć do treningu')
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
  })

  it('ignores a confirm tap that lands right after the confirm step opened', async () => {
    const wrapper = await startPlan()
    await tap(wrapper, 'Zakończ trening')
    await button(wrapper.get('[role="alertdialog"]').element, 'Zakończ trening').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).not.toBeNull()
    await tapInDialog(wrapper, 'Zakończ trening')
    expect(wrapper.get('h1').text()).toBe('Plany')
  })
})
