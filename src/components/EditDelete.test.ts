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

/** "Edytuj plan" opens every card collapsed; a test that reads or types into a card opens it first. */
async function openCard(wrapper: VueWrapper, position: number): Promise<void> {
  await button(region(wrapper.element, `Ćwiczenie ${position}`), `Ćwiczenie ${position}`).trigger('click')
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
    await openCard(wrapper, 2)
    expect(field(region(wrapper.element, 'Ćwiczenie 2'), 'Nazwa ćwiczenia').element.value).toBe('Przysiady')
  })

  it('saves name and exercise changes under the same id, with no duplicate, also after a reload', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Drugi').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Drugi zmieniony')
    await openCard(wrapper, 1)
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
    await openCard(wrapper, 1)
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Zwiększ serie').trigger('click')
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(names(wrapper)).toEqual(['Pierwszy', 'Drugi'])
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Pierwszy')
    await openCard(wrapper, 1)
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

describe('moving exercises in a saved plan', () => {
  const orderedPlan: Plan = {
    id: 'm',
    name: 'Plecy i nogi',
    exercises: [
      { id: 'm1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
      { id: 'm2', name: 'Przysiady', sets: 3, reps: 12, restSeconds: 90 },
      { id: 'm3', name: 'Wyciskanie leżąc', sets: 4, reps: 6, restSeconds: 120 },
      { id: 'm4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 },
    ],
  }
  const movedOrder = ['Wiosłowanie', 'Martwy ciąg', 'Przysiady', 'Wyciskanie leżąc']

  beforeEach(() => {
    savePlan(orderedPlan)
  })

  function storedNames(): string[] {
    return (getPlan('m')?.exercises ?? []).map((exercise) => exercise.name)
  }

  async function openEditor(wrapper: VueWrapper): Promise<void> {
    await button(wrapper.element, 'Edytuj: Plecy i nogi').trigger('click')
  }

  it('saves the new order, keeps it in the list and after a fresh mount, and the editor shows it again', async () => {
    const wrapper = mountApp()
    await openEditor(wrapper)
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w górę').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 3 w górę').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(names(wrapper)).toEqual(['Plecy i nogi'])
    expect(storedNames()).toEqual(movedOrder)
    expect(listPlans().map((plan) => plan.id)).toEqual(['m'])

    wrapper.unmount()
    apps = []
    const fresh = mountApp()
    expect(storedNames()).toEqual(movedOrder)
    await openEditor(fresh)
    for (const position of [1, 2, 3, 4]) await openCard(fresh, position)
    const shown = [1, 2, 3, 4].map(
      (position) => field(region(fresh.element, `Ćwiczenie ${position}`), 'Nazwa ćwiczenia').element.value,
    )
    expect(shown).toEqual(movedOrder)
  })

  it('a workout started after a move runs the exercises in the new order', async () => {
    const wrapper = mountApp()
    await openEditor(wrapper)
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w górę').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 3 w górę').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 2 w górę').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(wrapper.element, 'Start: Plecy i nogi').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Martwy ciąg')
    expect(wrapper.text()).toContain('Dalej: Wiosłowanie')
  })

  it('moving the first exercise down starts the workout with the former second exercise', async () => {
    const wrapper = mountApp()
    await openEditor(wrapper)
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w dół').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(wrapper.element, 'Start: Plecy i nogi').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Przysiady')
  })

  it('"Anuluj" after a move leaves the stored order and the stored text unchanged', async () => {
    const wrapper = mountApp()
    const before = localStorage.getItem(PLANS_KEY)
    await openEditor(wrapper)
    await button(wrapper.element, 'Przesuń ćwiczenie 2 w dół').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w dół').trigger('click')
    await button(wrapper.element, 'Anuluj').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
    expect(storedNames()).toEqual(['Wiosłowanie', 'Przysiady', 'Wyciskanie leżąc', 'Martwy ciąg'])
    await openEditor(wrapper)
    await openCard(wrapper, 1)
    expect(field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').element.value).toBe('Wiosłowanie')
  })
})

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

describe('collapsed cards in a saved plan', () => {
  const sixPlan: Plan = {
    id: 'k',
    name: 'Plecy i nogi',
    exercises: [
      { id: 'k1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
      { id: 'k2', name: 'Przysiady', sets: 3, reps: 12, restSeconds: 90 },
      { id: 'k3', name: 'Wyciskanie leżąc', sets: 4, reps: 6, restSeconds: 120 },
      { id: 'k4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 },
      { id: 'k5', name: 'Podciąganie', sets: 3, reps: 8, restSeconds: 90 },
      { id: 'k6', name: 'Wykroki', sets: 3, reps: 10, restSeconds: 60 },
    ],
  }

  beforeEach(() => {
    savePlan(sixPlan)
  })

  function expanded(wrapper: VueWrapper): (string | undefined)[] {
    return wrapper
      .findAll('section[aria-labelledby] h2 button')
      .map((toggle) => toggle.attributes('aria-expanded'))
  }

  it('"Edytuj" opens every exercise collapsed, with name and summary shown and no exercise field', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Plecy i nogi').trigger('click')
    expect(expanded(wrapper)).toEqual(['false', 'false', 'false', 'false', 'false', 'false'])
    expect(wrapper.findAll('section[aria-labelledby] input')).toHaveLength(0)
    expect(region(wrapper.element, 'Ćwiczenie 5').textContent).toContain('Podciąganie')
    expect(region(wrapper.element, 'Ćwiczenie 5').textContent).toContain('3 × 8, przerwa 1:30')
  })

  it('a new plan from the list opens with the first exercise expanded', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Siła').trigger('click')
    expect(expanded(wrapper)).toEqual(['true'])
  })

  it('moves a collapsed exercise from position 5 to 1, saves it with the same stored keys, and the editor and the workout follow the order', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Plecy i nogi').trigger('click')
    for (const delta of [4, 3, 2, 1]) {
      await button(wrapper.element, `Przesuń ćwiczenie ${delta + 1} w górę`).trigger('click')
    }
    expect(expanded(wrapper)).toEqual(['false', 'false', 'false', 'false', 'false', 'false'])
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    const expectedOrder = ['Podciąganie', 'Wiosłowanie', 'Przysiady', 'Wyciskanie leżąc', 'Martwy ciąg', 'Wykroki']
    expect(getPlan('k')?.exercises.map((exercise) => exercise.name)).toEqual(expectedOrder)
    const stored = JSON.parse(localStorage.getItem(PLANS_KEY) ?? 'null') as { plans: Record<string, unknown>[] }
    expect(Object.keys(stored.plans[0] ?? {}).sort()).toEqual(['exercises', 'id', 'name'])
    for (const exercise of (stored.plans[0]?.exercises ?? []) as Record<string, unknown>[]) {
      expect(Object.keys(exercise).sort()).toEqual(['id', 'name', 'reps', 'restSeconds', 'sets'])
    }

    wrapper.unmount()
    apps = []
    const fresh = mountApp()
    await button(fresh.element, 'Edytuj: Plecy i nogi').trigger('click')
    expect(expanded(fresh)).toEqual(['false', 'false', 'false', 'false', 'false', 'false'])
    expect(region(fresh.element, 'Ćwiczenie 1').textContent).toContain('Podciąganie')

    await button(fresh.element, 'Anuluj').trigger('click')
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(fresh.element, 'Start: Plecy i nogi').trigger('click')
    expect(fresh.get('h1').text()).toBe('Podciąganie')
  })

  it('a failed save in a saved plan opens only the card with the error', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Plecy i nogi').trigger('click')
    await openCard(wrapper, 4)
    await field(region(wrapper.element, 'Ćwiczenie 4'), 'Nazwa ćwiczenia').setValue('')
    await button(region(wrapper.element, 'Ćwiczenie 4'), 'Ćwiczenie 4').trigger('click')
    expect(expanded(wrapper)).toEqual(['false', 'false', 'false', 'false', 'false', 'false'])
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Edytuj plan')
    expect(expanded(wrapper)).toEqual(['false', 'false', 'false', 'true', 'false', 'false'])
    expect(region(wrapper.element, 'Ćwiczenie 4').textContent).toContain('Wpisz nazwę ćwiczenia 4.')
  })
})
