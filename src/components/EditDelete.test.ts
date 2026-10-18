import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import type { Plan } from '../plans/plan'
import { PLANS_KEY, deletePlan, getPlan, listPlans, savePlan } from '../plans/planStore'
import { startWorkout } from '../workout/engine'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { WORKOUT_KEY, saveWorkout } from '../workout/workoutStore'
import PlanList from './PlanList.vue'
import { button, field, region } from './testHelpers'

const T0 = new Date('2026-10-18T10:00:00Z').getTime()

function makePlan(id: string, name: string): Plan {
  return {
    id,
    name,
    exercises: [
      { id: `${id}-e1`, name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
      { id: `${id}-e2`, name: 'Przysiady', sets: 3, reps: 12, restSeconds: 90 },
    ],
  }
}

let apps: VueWrapper[]

function mountApp(): VueWrapper {
  const wrapper = mount(App, { attachTo: document.body })
  apps.push(wrapper)
  return wrapper
}

function names(wrapper: VueWrapper): string[] {
  return wrapper.findAll('li h2').map((heading) => heading.text())
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})

afterEach(() => {
  apps.forEach((app) => app.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('plan card', () => {
  it('has Edytuj and Usuń plan buttons named after the plan, both with the btn class that sets the target height, not chalk', () => {
    const wrapper = mount(PlanList, { props: { plans: [makePlan('a', 'Nogi')] } })
    const edit = button(wrapper.element, 'Edytuj: Nogi')
    const remove = button(wrapper.element, 'Usuń plan: Nogi')
    expect(edit.text()).toBe('Edytuj')
    expect(remove.text()).toBe('Usuń plan')
    expect(edit.classes()).toContain('btn')
    expect(remove.classes()).toContain('btn')
    expect(edit.classes()).not.toContain('btn-primary')
    expect(remove.classes()).toContain('btn-danger')
    expect(remove.classes()).not.toContain('btn-primary')
    expect(button(wrapper.element, 'Start: Nogi').classes()).toContain('btn-primary')
  })

  it('emits edit with the id of the tapped plan', async () => {
    const wrapper = mount(PlanList, { props: { plans: [makePlan('a', 'A'), makePlan('b', 'B')] } })
    await button(wrapper.element, 'Edytuj: B').trigger('click')
    expect(wrapper.emitted('edit')).toEqual([['b']])
  })

  it('asks in the app before it deletes, with no chalk button, and cancel keeps the plan', async () => {
    const wrapper = mount(PlanList, { props: { plans: [makePlan('a', 'Nogi')] }, attachTo: document.body })
    await button(wrapper.element, 'Usuń plan: Nogi').trigger('click')
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(dialog.text()).toContain('Usunąć plan „Nogi”?')
    expect(dialog.findAll('button').some((candidate) => candidate.classes().includes('btn-primary'))).toBe(false)
    await button(dialog.element, 'Anuluj').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('emits delete after a deliberate tap on the confirm button', async () => {
    const wrapper = mount(PlanList, { props: { plans: [makePlan('a', 'Nogi')] }, attachTo: document.body })
    await button(wrapper.element, 'Usuń plan: Nogi').trigger('click')
    vi.setSystemTime(T0 + ACTION_GUARD_MS)
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(wrapper.emitted('delete')).toEqual([['a']])
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('ignores a confirm tap that comes less than 500 ms after the question opened', async () => {
    const wrapper = mount(PlanList, { props: { plans: [makePlan('a', 'Nogi')] }, attachTo: document.body })
    await button(wrapper.element, 'Usuń plan: Nogi').trigger('click')
    vi.setSystemTime(T0 + 499)
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
  })
})

describe('editing a plan', () => {
  beforeEach(() => {
    savePlan(makePlan('a', 'Pierwszy'))
    savePlan(makePlan('b', 'Drugi'))
  })

  it('opens with the current values under the title "Edytuj plan"', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Drugi').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Edytuj plan')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Drugi')
    expect(field(region(wrapper.element, 'Ćwiczenie 2'), 'Nazwa ćwiczenia').element.value).toBe('Przysiady')
  })

  it('saves name and exercise changes under the same id, with no duplicate, also after a reload', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Drugi').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Drugi zmieniony')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Martwy ciąg')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi zmieniony'])
    expect(listPlans().map((plan) => plan.id)).toEqual(['a', 'b'])
    expect(getPlan('b')?.exercises[0]?.name).toBe('Martwy ciąg')
    expect(getPlan('b')?.exercises[1]).toEqual(makePlan('b', 'x').exercises[1])

    wrapper.unmount()
    apps = []
    expect(names(mountApp())).toEqual(['Pierwszy', 'Drugi zmieniony'])
  })

  it('does not change the plan in the list or in storage until it is saved, and cancel keeps it', async () => {
    const wrapper = mountApp()
    const before = localStorage.getItem(PLANS_KEY)
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Niezapisane')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Zwiększ serie').trigger('click')
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi'])
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Pierwszy')
    expect(stepperSets(wrapper)).toBe('2')
  })

  it('keeps the typed data and shows a Polish message when the save fails', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Nowa nazwa')
    const before = localStorage.getItem(PLANS_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Edytuj plan')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Nowa nazwa')
    expect(wrapper.get('[role="alert"]').text()).toContain('Nie udało się zapisać planu')
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })
})

function stepperSets(wrapper: VueWrapper): string {
  return region(wrapper.element, 'Ćwiczenie 1').querySelector('output')?.textContent?.trim() ?? ''
}

describe('deleting a plan', () => {
  beforeEach(() => {
    savePlan(makePlan('a', 'Pierwszy'))
    savePlan(makePlan('b', 'Drugi'))
    savePlan(makePlan('c', 'Trzeci'))
  })

  async function askToDelete(wrapper: VueWrapper, name: string): Promise<void> {
    await button(wrapper.element, `Usuń plan: ${name}`).trigger('click')
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
  }

  it('confirm removes the plan from the list and from storage, also after a reload', async () => {
    const wrapper = mountApp()
    await askToDelete(wrapper, 'Drugi')
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Trzeci'])
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)

    wrapper.unmount()
    apps = []
    expect(names(mountApp())).toEqual(['Pierwszy', 'Trzeci'])
  })

  it('cancel keeps the plan in the list and in storage', async () => {
    const wrapper = mountApp()
    const before = localStorage.getItem(PLANS_KEY)
    await askToDelete(wrapper, 'Drugi')
    await button(wrapper.get('[role="alertdialog"]').element, 'Anuluj').trigger('click')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi', 'Trzeci'])
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })

  it('a failed delete shows a Polish message and changes nothing', async () => {
    const wrapper = mountApp()
    const before = localStorage.getItem(PLANS_KEY)
    await askToDelete(wrapper, 'Drugi')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Nie udało się usunąć planu')
    expect(wrapper.get('[role="alert"]').find('svg').exists()).toBe(true)
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi', 'Trzeci'])
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })

  it('does not show an old delete error after Edytuj and Anuluj', async () => {
    const wrapper = mountApp()
    await askToDelete(wrapper, 'Drugi')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    spy.mockRestore()
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('does not show an old delete error after a later successful delete', async () => {
    const wrapper = mountApp()
    await askToDelete(wrapper, 'Drugi')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    spy.mockRestore()
    await askToDelete(wrapper, 'Trzeci')
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('a stored running workout', () => {
  it('stays unchanged when its plan is edited or deleted, and restores with the old plan copy', () => {
    const original = makePlan('a', 'Pierwszy')
    savePlan(original)
    saveWorkout(startWorkout(original, Date.now()))
    const storedWorkout = localStorage.getItem(WORKOUT_KEY)

    savePlan({ ...original, name: 'Zmieniony', exercises: [{ id: 'x', name: 'Inne', sets: 1, reps: 1, restSeconds: 0 }] })
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(storedWorkout)
    const wrapper = mountApp()
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(wrapper.text()).toContain('Dalej: Przysiady')
  })

  it('survives a delete of its plan: a fresh mount shows the old exercises', () => {
    const original = makePlan('a', 'Pierwszy')
    savePlan(original)
    saveWorkout(startWorkout(original, Date.now()))
    const storedWorkout = localStorage.getItem(WORKOUT_KEY)

    expect(deletePlan('a')).toEqual({ ok: true })
    expect(listPlans()).toEqual([])
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(storedWorkout)
    const wrapper = mountApp()
    expect(wrapper.get('h1').text()).toBe('Wiosłowanie')
    expect(wrapper.text()).toContain('Dalej: Przysiady')
  })
})
