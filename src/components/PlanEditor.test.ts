import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plan } from '../plans/plan'
import { listPlans, PLANS_KEY } from '../plans/planStore'
import PlanEditor from './PlanEditor.vue'
import { button, field, region, stepperValue } from './testHelpers'

function mountEditor() {
  return mount(PlanEditor, { attachTo: document.body })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('PlanEditor', () => {
  it('starts with one exercise row holding the defaults 3 / 10 / 1:30', () => {
    const wrapper = mountEditor()
    const row = region(wrapper.element, 'Ćwiczenie 1')
    expect(stepperValue(row, 'Serie')).toBe('3')
    expect(stepperValue(row, 'Powtórzenia')).toBe('10')
    expect(stepperValue(row, 'Przerwa')).toBe('1:30')
    expect(field(row, 'Nazwa ćwiczenia').element.value).toBe('')
  })

  it('"Dodaj ćwiczenie" adds a row with the defaults', async () => {
    const wrapper = mountEditor()
    const first = region(wrapper.element, 'Ćwiczenie 1')
    await button(first, 'Zwiększ serie').trigger('click')
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    const second = region(wrapper.element, 'Ćwiczenie 2')
    expect(stepperValue(second, 'Serie')).toBe('3')
    expect(stepperValue(second, 'Przerwa')).toBe('1:30')
    expect(stepperValue(region(wrapper.element, 'Ćwiczenie 1'), 'Serie')).toBe('4')
  })

  it('the steppers change sets and reps by 1 and rest by 15 s, shown as m:ss', async () => {
    const wrapper = mountEditor()
    const row = region(wrapper.element, 'Ćwiczenie 1')
    await button(row, 'Zmniejsz serie').trigger('click')
    await button(row, 'Zwiększ powtórzenia').trigger('click')
    await button(row, 'Wydłuż przerwę o 15 s').trigger('click')
    expect(stepperValue(row, 'Serie')).toBe('2')
    expect(stepperValue(row, 'Powtórzenia')).toBe('11')
    expect(stepperValue(row, 'Przerwa')).toBe('1:45')
    await button(row, 'Skróć przerwę o 15 s').trigger('click')
    await button(row, 'Skróć przerwę o 15 s').trigger('click')
    expect(stepperValue(row, 'Przerwa')).toBe('1:15')
  })

  it('clamps the steppers at the limits and disables the button there', async () => {
    const wrapper = mountEditor()
    const row = region(wrapper.element, 'Ćwiczenie 1')
    for (let tap = 0; tap < 10; tap += 1) {
      await button(row, 'Zmniejsz serie').trigger('click')
      await button(row, 'Skróć przerwę o 15 s').trigger('click')
    }
    expect(stepperValue(row, 'Serie')).toBe('1')
    expect(button(row, 'Zmniejsz serie').element.disabled).toBe(true)
    expect(stepperValue(row, 'Przerwa')).toBe('0:00')
    expect(button(row, 'Skróć przerwę o 15 s').element.disabled).toBe(true)
  })

  it('removes the chosen exercise row', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Jedno')
    await field(region(wrapper.element, 'Ćwiczenie 2'), 'Nazwa ćwiczenia').setValue('Dwa')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Usuń ćwiczenie 1').trigger('click')
    expect(field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').element.value).toBe('Dwa')
    expect(() => region(wrapper.element, 'Ćwiczenie 2')).toThrow()
  })

  it('shows the empty-name errors next to their fields and saves nothing', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    const planName = field(wrapper.element, 'Nazwa planu')
    expect(planName.attributes('aria-invalid')).toBe('true')
    const planError = document.getElementById(planName.attributes('aria-describedby') ?? '')
    expect(planError?.textContent?.trim()).toBe('Wpisz nazwę planu.')

    const exerciseName = field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia')
    const exerciseError = document.getElementById(exerciseName.attributes('aria-describedby') ?? '')
    expect(exerciseError?.textContent?.trim()).toBe('Wpisz nazwę ćwiczenia 1.')

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(localStorage.getItem(PLANS_KEY)).toBeNull()
  })

  it('shows a message when no exercise is left', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Plan')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Usuń ćwiczenie 1').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toBe('Dodaj co najmniej jedno ćwiczenie.')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('keeps the typed input when validation fails', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Plan nogi')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Przysiady')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Zwiększ serie').trigger('click')
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    const second = region(wrapper.element, 'Ćwiczenie 2')
    await button(second, 'Zmniejsz powtórzenia').trigger('click')
    await button(second, 'Wydłuż przerwę o 15 s').trigger('click')
    // Exercise 2 keeps its name empty, so validation fails.

    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(localStorage.getItem(PLANS_KEY)).toBeNull()
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Plan nogi')
    const firstRow = region(wrapper.element, 'Ćwiczenie 1')
    expect(field(firstRow, 'Nazwa ćwiczenia').element.value).toBe('Przysiady')
    expect(stepperValue(firstRow, 'Serie')).toBe('4')
    expect(stepperValue(firstRow, 'Powtórzenia')).toBe('10')
    expect(stepperValue(firstRow, 'Przerwa')).toBe('1:30')
    const secondRow = region(wrapper.element, 'Ćwiczenie 2')
    expect(field(secondRow, 'Nazwa ćwiczenia').element.value).toBe('')
    expect(stepperValue(secondRow, 'Serie')).toBe('3')
    expect(stepperValue(secondRow, 'Powtórzenia')).toBe('9')
    expect(stepperValue(secondRow, 'Przerwa')).toBe('1:45')
    expect(wrapper.findAll('section[aria-labelledby]')).toHaveLength(2)
  })

  it('saves a valid plan with the chosen values to the store and emits saved', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Wiosłowanie i przysiady')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Wiosłowanie')
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    const second = region(wrapper.element, 'Ćwiczenie 2')
    await field(second, 'Nazwa ćwiczenia').setValue('Przysiady')
    await button(second, 'Zwiększ serie').trigger('click')
    await button(second, 'Zmniejsz powtórzenia').trigger('click')
    await button(second, 'Wydłuż przerwę o 15 s').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toHaveLength(1)
    const [saved] = listPlans()
    expect(saved?.name).toBe('Wiosłowanie i przysiady')
    expect(saved?.exercises.map(({ name, sets, reps, restSeconds }) => ({ name, sets, reps, restSeconds }))).toEqual([
      { name: 'Wiosłowanie', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Przysiady', sets: 4, reps: 9, restSeconds: 105 },
    ])
  })

  it('keeps the typed input and shows a Polish message when the save fails', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Plan')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Martwy ciąg')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Zwiększ serie').trigger('click')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('Nie udało się zapisać planu.')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Plan')
    const row = region(wrapper.element, 'Ćwiczenie 1')
    expect(field(row, 'Nazwa ćwiczenia').element.value).toBe('Martwy ciąg')
    expect(stepperValue(row, 'Serie')).toBe('4')
  })

  it('"Anuluj" emits cancel and saves nothing', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Plan')
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(localStorage.getItem(PLANS_KEY)).toBeNull()
  })

  it('has "Zapisz plan" as the only chalk action', () => {
    const wrapper = mountEditor()
    const primary = wrapper.findAll('button.btn-primary')
    expect(primary).toHaveLength(1)
    expect(primary[0]?.text()).toBe('Zapisz plan')
  })
})

describe('PlanEditor move buttons', () => {
  const fourPlan: Plan = {
    id: 'p',
    name: 'Plecy i nogi',
    exercises: [
      { id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
      { id: 'e2', name: 'Przysiady', sets: 3, reps: 12, restSeconds: 90 },
      { id: 'e3', name: 'Wyciskanie leżąc', sets: 4, reps: 6, restSeconds: 120 },
      { id: 'e4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 },
    ],
  }

  function mountPlan() {
    return mount(PlanEditor, { props: { plan: fourPlan }, attachTo: document.body })
  }

  // A saved plan opens with every card collapsed; the move tests read fields, so they open the cards first.
  async function mountOpen() {
    const wrapper = mountPlan()
    for (const toggle of wrapper.findAll('button[aria-expanded="false"]')) await toggle.trigger('click')
    return wrapper
  }

  function rowOf(wrapper: ReturnType<typeof mountPlan>, position: number) {
    const row = region(wrapper.element, `Ćwiczenie ${position}`)
    return {
      name: field(row, 'Nazwa ćwiczenia').element.value,
      sets: stepperValue(row, 'Serie'),
      reps: stepperValue(row, 'Powtórzenia'),
      rest: stepperValue(row, 'Przerwa'),
    }
  }

  function order(wrapper: ReturnType<typeof mountPlan>): string[] {
    return [1, 2, 3, 4].map((position) => rowOf(wrapper, position).name)
  }

  const original = ['Wiosłowanie', 'Przysiady', 'Wyciskanie leżąc', 'Martwy ciąg']

  it('puts "Przesuń ćwiczenie N w górę" and "w dół" on every card, as secondary 44 px icon buttons with an SVG chevron', async () => {
    const wrapper = await mountOpen()
    for (const position of [1, 2, 3, 4]) {
      const card = region(wrapper.element, `Ćwiczenie ${position}`)
      for (const label of [`Przesuń ćwiczenie ${position} w górę`, `Przesuń ćwiczenie ${position} w dół`]) {
        const move = button(card, label)
        expect(move.attributes('type')).toBe('button')
        expect(move.classes()).toContain('btn')
        expect(move.classes()).not.toContain('btn-primary')
        expect(move.find('svg[aria-hidden="true"] path').exists()).toBe(true)
        expect(move.text()).toBe('')
      }
    }
    expect(wrapper.findAll('button.btn-primary')).toHaveLength(1)
  })

  it('keeps the card title text exactly "Ćwiczenie N" in an h2', async () => {
    const wrapper = await mountOpen()
    expect(wrapper.findAll('section[aria-labelledby] h2').map((heading) => heading.text())).toEqual([
      'Ćwiczenie 1',
      'Ćwiczenie 2',
      'Ćwiczenie 3',
      'Ćwiczenie 4',
    ])
  })

  it('disables "up" on the first and "down" on the last exercise only', async () => {
    const wrapper = await mountOpen()
    const disabled = wrapper
      .findAll('button[aria-label^="Przesuń"]')
      .filter((move) => move.attributes('disabled') !== undefined)
      .map((move) => move.attributes('aria-label'))
    expect(disabled).toEqual(['Przesuń ćwiczenie 1 w górę', 'Przesuń ćwiczenie 4 w dół'])
  })

  it('a tap on "up" in the middle swaps with the previous exercise, with its sets, reps and rest, and renumbers labels', async () => {
    const wrapper = await mountOpen()
    await button(wrapper.element, 'Przesuń ćwiczenie 3 w górę').trigger('click')
    expect(order(wrapper)).toEqual(['Wiosłowanie', 'Wyciskanie leżąc', 'Przysiady', 'Martwy ciąg'])
    expect(rowOf(wrapper, 2)).toEqual({ name: 'Wyciskanie leżąc', sets: '4', reps: '6', rest: '2:00' })
    expect(rowOf(wrapper, 3)).toEqual({ name: 'Przysiady', sets: '3', reps: '12', rest: '1:30' })
    expect(button(region(wrapper.element, 'Ćwiczenie 2'), 'Przesuń ćwiczenie 2 w górę').element.disabled).toBe(false)
  })

  it('a tap on "down" on the first exercise moves it to the second place with its values', async () => {
    const wrapper = await mountOpen()
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w dół').trigger('click')
    expect(order(wrapper)).toEqual(['Przysiady', 'Wiosłowanie', 'Wyciskanie leżąc', 'Martwy ciąg'])
    expect(rowOf(wrapper, 2)).toEqual({ name: 'Wiosłowanie', sets: '2', reps: '8', rest: '1:00' })
    expect(rowOf(wrapper, 1)).toEqual({ name: 'Przysiady', sets: '3', reps: '12', rest: '1:30' })
  })

  it('a tap on "up" on the last exercise moves it to the third place', async () => {
    const wrapper = await mountOpen()
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w górę').trigger('click')
    expect(order(wrapper)).toEqual(['Wiosłowanie', 'Przysiady', 'Martwy ciąg', 'Wyciskanie leżąc'])
    expect(rowOf(wrapper, 3)).toEqual({ name: 'Martwy ciąg', sets: '5', reps: '5', rest: '2:30' })
  })

  it('a click on a disabled edge button changes nothing', async () => {
    const wrapper = await mountOpen()
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w górę').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w dół').trigger('click')
    expect(order(wrapper)).toEqual(original)
  })

  it('keeps the typed, unsaved text of a moved exercise', async () => {
    const wrapper = await mountOpen()
    await field(region(wrapper.element, 'Ćwiczenie 2'), 'Nazwa ćwiczenia').setValue('Przysiady ze sztangą')
    await button(wrapper.element, 'Przesuń ćwiczenie 2 w dół').trigger('click')
    expect(rowOf(wrapper, 3).name).toBe('Przysiady ze sztangą')
  })

  it('keeps focus on the same move button of the moved exercise (middle exercise, "up")', async () => {
    const wrapper = await mountOpen()
    const tapped = button(wrapper.element, 'Przesuń ćwiczenie 3 w górę')
    tapped.element.focus()
    await tapped.trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(button(region(wrapper.element, 'Ćwiczenie 2'), 'Przesuń ćwiczenie 2 w górę').element)
    expect(document.activeElement?.closest('section')?.querySelector('input')?.value).toBe('Wyciskanie leżąc')
  })

  it('keeps focus on the same move button of the moved exercise (first exercise, "down")', async () => {
    const wrapper = await mountOpen()
    const tapped = button(wrapper.element, 'Przesuń ćwiczenie 1 w dół')
    tapped.element.focus()
    await tapped.trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(button(region(wrapper.element, 'Ćwiczenie 2'), 'Przesuń ćwiczenie 2 w dół').element)
    expect(document.activeElement?.closest('section')?.querySelector('input')?.value).toBe('Wiosłowanie')
  })

  it('moves focus to the other move button when the moved exercise reached the top edge', async () => {
    const wrapper = await mountOpen()
    const tapped = button(wrapper.element, 'Przesuń ćwiczenie 2 w górę')
    tapped.element.focus()
    await tapped.trigger('click')
    await nextTick()
    expect(order(wrapper)[0]).toBe('Przysiady')
    const first = region(wrapper.element, 'Ćwiczenie 1')
    expect(button(first, 'Przesuń ćwiczenie 1 w górę').element.disabled).toBe(true)
    expect(document.activeElement).toBe(button(first, 'Przesuń ćwiczenie 1 w dół').element)
  })

  it('moves focus to the other move button when the moved exercise reached the bottom edge', async () => {
    const wrapper = await mountOpen()
    const tapped = button(wrapper.element, 'Przesuń ćwiczenie 3 w dół')
    tapped.element.focus()
    await tapped.trigger('click')
    await nextTick()
    expect(order(wrapper)[3]).toBe('Wyciskanie leżąc')
    const last = region(wrapper.element, 'Ćwiczenie 4')
    expect(button(last, 'Przesuń ćwiczenie 4 w dół').element.disabled).toBe(true)
    expect(document.activeElement).toBe(button(last, 'Przesuń ćwiczenie 4 w górę').element)
  })

  it('clears the shown validation errors after a move', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.text()).toContain('Wpisz nazwę planu.')
    expect(wrapper.text()).toContain('Wpisz nazwę ćwiczenia 2.')
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w dół').trigger('click')
    expect(wrapper.text()).not.toContain('Wpisz nazwę planu.')
    expect(wrapper.text()).not.toContain('Wpisz nazwę ćwiczenia')
    expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(false)
  })

  it('"Zapisz plan" after a move saves the new order under the same id', async () => {
    const wrapper = await mountOpen()
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w górę').trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 3 w górę').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    const [saved] = listPlans()
    expect(saved?.id).toBe('p')
    expect(saved?.exercises.map((exercise) => exercise.name)).toEqual([
      'Wiosłowanie',
      'Martwy ciąg',
      'Przysiady',
      'Wyciskanie leżąc',
    ])
    expect(saved?.exercises[1]).toEqual({ id: 'e4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 })
  })
})

describe('PlanEditor collapsing cards', () => {
  const sixPlan: Plan = {
    id: 'c',
    name: 'Plecy i nogi',
    exercises: [
      { id: 'c1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 60 },
      { id: 'c2', name: 'Przysiady', sets: 3, reps: 12, restSeconds: 90 },
      { id: 'c3', name: 'Wyciskanie leżąc', sets: 4, reps: 6, restSeconds: 120 },
      { id: 'c4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 },
    ],
  }

  function mountSaved() {
    return mount(PlanEditor, { props: { plan: sixPlan }, attachTo: document.body })
  }

  function card(wrapper: ReturnType<typeof mountSaved>, position: number): HTMLElement {
    return region(wrapper.element, `Ćwiczenie ${position}`)
  }

  function toggle(wrapper: ReturnType<typeof mountSaved>, position: number) {
    return button(card(wrapper, position), `Ćwiczenie ${position}`)
  }

  function expandedStates(wrapper: ReturnType<typeof mountSaved>): string[] {
    return [1, 2, 3, 4].map((position) => toggle(wrapper, position).attributes('aria-expanded') ?? 'missing')
  }

  it('has a toggle button inside the card h2 that exposes its state with aria-expanded and flips it on a tap', async () => {
    const wrapper = mountSaved()
    const heading = card(wrapper, 1).querySelector('h2')
    expect(heading?.querySelector('button[type="button"]')).toBe(toggle(wrapper, 1).element)
    expect(toggle(wrapper, 1).attributes('aria-expanded')).toBe('false')
    await toggle(wrapper, 1).trigger('click')
    expect(toggle(wrapper, 1).attributes('aria-expanded')).toBe('true')
    await toggle(wrapper, 1).trigger('click')
    expect(toggle(wrapper, 1).attributes('aria-expanded')).toBe('false')
  })

  it('draws the toggle chevron as an aria-hidden SVG stroke, with no text of its own', () => {
    const wrapper = mountSaved()
    const icon = toggle(wrapper, 2).find('svg')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('stroke')).toBe('currentColor')
    expect(icon.attributes('stroke-width')).toBe('2')
    expect(toggle(wrapper, 2).text()).toBe('Ćwiczenie 2')
  })

  it('points aria-controls at an existing element, open and collapsed', async () => {
    const wrapper = mountSaved()
    const target = toggle(wrapper, 3).attributes('aria-controls') ?? ''
    expect(document.getElementById(target)).not.toBeNull()
    await toggle(wrapper, 3).trigger('click')
    expect(toggle(wrapper, 3).attributes('aria-expanded')).toBe('true')
    expect(document.getElementById(toggle(wrapper, 3).attributes('aria-controls') ?? '')).not.toBeNull()
    expect(document.getElementById(target)?.closest('section')).toBe(card(wrapper, 3))
  })

  it('a collapsed card shows the title, the name, the summary and both move buttons, and hides the fields, steppers and delete', () => {
    const wrapper = mountSaved()
    const second = card(wrapper, 2)
    expect(second.querySelector('h2')?.textContent?.trim()).toBe('Ćwiczenie 2')
    expect(second.textContent).toContain('Przysiady')
    expect(second.textContent).toContain('3 × 12, przerwa 1:30')
    expect(button(second, 'Przesuń ćwiczenie 2 w górę').element.disabled).toBe(false)
    expect(button(second, 'Przesuń ćwiczenie 2 w dół').element.disabled).toBe(false)
    expect(second.querySelector('input')).toBeNull()
    expect(second.querySelector('[role="group"]')).toBeNull()
    expect(() => button(second, 'Usuń ćwiczenie 2')).toThrow()
    expect(() => button(second, 'Zwiększ serie')).toThrow()
  })

  it('shows the summary exactly as "3 × 10, przerwa 1:30" for the default exercise', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    await button(region(wrapper.element, 'Ćwiczenie 2'), 'Ćwiczenie 2').trigger('click')
    const summary = region(wrapper.element, 'Ćwiczenie 2').querySelector('.muted')
    expect(summary?.textContent).toBe('3 × 10, przerwa 1:30')
  })

  it('updates the summary after a stepper change made while the card was open', async () => {
    const wrapper = mountSaved()
    await toggle(wrapper, 1).trigger('click')
    await button(card(wrapper, 1), 'Zwiększ serie').trigger('click')
    await button(card(wrapper, 1), 'Zmniejsz powtórzenia').trigger('click')
    await button(card(wrapper, 1), 'Wydłuż przerwę o 15 s').trigger('click')
    await toggle(wrapper, 1).trigger('click')
    expect(card(wrapper, 1).textContent).toContain('3 × 7, przerwa 1:15')
    expect(card(wrapper, 1).textContent).not.toContain('2 × 8')
  })

  it('shows no name line when the name is blank or only spaces, and shows the typed name when it is not', async () => {
    const wrapper = mountEditor()
    expect(region(wrapper.element, 'Ćwiczenie 1').querySelector('.exercise-name')).toBeNull()
    await toggle1(wrapper)
    expect(region(wrapper.element, 'Ćwiczenie 1').querySelector('.exercise-name')).toBeNull()
    await toggle1(wrapper)
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('   ')
    await toggle1(wrapper)
    expect(region(wrapper.element, 'Ćwiczenie 1').querySelector('.exercise-name')).toBeNull()
    await toggle1(wrapper)
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Podciąganie')
    await toggle1(wrapper)
    expect(region(wrapper.element, 'Ćwiczenie 1').querySelector('.exercise-name')?.textContent).toBe('Podciąganie')
  })

  it('keeps "Zapisz plan" the only chalk button with the cards collapsed', () => {
    const wrapper = mountSaved()
    const primary = wrapper.findAll('button.btn-primary')
    expect(primary).toHaveLength(1)
    expect(primary[0]?.text()).toBe('Zapisz plan')
  })

  it('the move buttons work on collapsed cards and the cards stay collapsed', async () => {
    const wrapper = mountSaved()
    await button(wrapper.element, 'Przesuń ćwiczenie 4 w górę').trigger('click')
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'false', 'false'])
    expect(card(wrapper, 3).textContent).toContain('Martwy ciąg')
    expect(card(wrapper, 4).textContent).toContain('Wyciskanie leżąc')
  })

  it('the open or collapsed state follows the exercise when it moves (open middle card, then first card collapsed)', async () => {
    const wrapper = mountSaved()
    await toggle(wrapper, 2).trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 2 w dół').trigger('click')
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'true', 'false'])
    expect(field(card(wrapper, 3), 'Nazwa ćwiczenia').element.value).toBe('Przysiady')
    expect(card(wrapper, 2).textContent).toContain('Wyciskanie leżąc')

    await button(wrapper.element, 'Przesuń ćwiczenie 3 w górę').trigger('click')
    expect(expandedStates(wrapper)).toEqual(['false', 'true', 'false', 'false'])
    await button(wrapper.element, 'Przesuń ćwiczenie 1 w dół').trigger('click')
    expect(expandedStates(wrapper)).toEqual(['true', 'false', 'false', 'false'])
    expect(field(card(wrapper, 1), 'Nazwa ćwiczenia').element.value).toBe('Przysiady')
    expect(card(wrapper, 2).textContent).toContain('Wiosłowanie')
  })

  it('removing an exercise leaves the open or collapsed state of the others as it was', async () => {
    const wrapper = mountSaved()
    await toggle(wrapper, 1).trigger('click')
    await toggle(wrapper, 3).trigger('click')
    await button(card(wrapper, 1), 'Usuń ćwiczenie 1').trigger('click')
    expect(card(wrapper, 1).textContent).toContain('Przysiady')
    expect(card(wrapper, 3).textContent).toContain('Martwy ciąg')
    expect([1, 2, 3].map((position) => toggle(wrapper, position).attributes('aria-expanded'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  it('a new plan opens with its first exercise expanded, and "Dodaj ćwiczenie" adds an expanded exercise next to a collapsed one', async () => {
    const wrapper = mountEditor()
    expect(button(region(wrapper.element, 'Ćwiczenie 1'), 'Ćwiczenie 1').attributes('aria-expanded')).toBe('true')
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Ćwiczenie 1').trigger('click')
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    expect(button(region(wrapper.element, 'Ćwiczenie 1'), 'Ćwiczenie 1').attributes('aria-expanded')).toBe('false')
    const added = region(wrapper.element, 'Ćwiczenie 2')
    expect(button(added, 'Ćwiczenie 2').attributes('aria-expanded')).toBe('true')
    expect(stepperValue(added, 'Serie')).toBe('3')
  })

  it('a saved plan opens with every card collapsed', () => {
    const wrapper = mountSaved()
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'false', 'false'])
    expect(wrapper.findAll('section input')).toHaveLength(0)
  })

  it('a failed "Zapisz plan" opens only the cards that hold an error and shows each error text', async () => {
    const wrapper = mountSaved()
    await toggle(wrapper, 3).trigger('click')
    await field(card(wrapper, 3), 'Nazwa ćwiczenia').setValue('')
    await toggle(wrapper, 3).trigger('click')
    await toggle(wrapper, 4).trigger('click')
    await field(card(wrapper, 4), 'Nazwa ćwiczenia').setValue('   ')
    await toggle(wrapper, 4).trigger('click')
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'false', 'false'])

    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'true', 'true'])
    expect(card(wrapper, 3).textContent).toContain('Wpisz nazwę ćwiczenia 3.')
    expect(card(wrapper, 4).textContent).toContain('Wpisz nazwę ćwiczenia 4.')
    const input = field(card(wrapper, 3), 'Nazwa ćwiczenia')
    expect(document.getElementById(input.attributes('aria-describedby') ?? '')?.textContent?.trim()).toBe(
      'Wpisz nazwę ćwiczenia 3.',
    )
    expect(card(wrapper, 1).querySelector('input')).toBeNull()
    expect(card(wrapper, 2).querySelector('input')).toBeNull()
  })

  it('a failed save with only a plan-name error opens no card', async () => {
    const wrapper = mountSaved()
    await field(wrapper.element, 'Nazwa planu').setValue('')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.text()).toContain('Wpisz nazwę planu.')
    expect(expandedStates(wrapper)).toEqual(['false', 'false', 'false', 'false'])
  })

  it('saves a plan whose cards were collapsed with the same stored keys and no open or collapsed field', async () => {
    const wrapper = mountSaved()
    await toggle(wrapper, 1).trigger('click')
    await toggle(wrapper, 1).trigger('click')
    await button(wrapper.element, 'Przesuń ćwiczenie 2 w dół').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.emitted('saved')).toHaveLength(1)

    const stored = JSON.parse(localStorage.getItem(PLANS_KEY) ?? 'null') as unknown
    expect(Object.keys(stored as Record<string, unknown>).sort()).toEqual(['plans', 'version'])
    const [plan] = listPlans()
    expect(Object.keys(plan ?? {}).sort()).toEqual(['exercises', 'id', 'name'])
    for (const exercise of plan?.exercises ?? []) {
      expect(Object.keys(exercise).sort()).toEqual(['id', 'name', 'reps', 'restSeconds', 'sets'])
    }
    expect(localStorage.getItem(PLANS_KEY)).not.toMatch(/collapsed|expanded|open/i)
  })

  async function toggle1(wrapper: ReturnType<typeof mountEditor>): Promise<void> {
    await button(region(wrapper.element, 'Ćwiczenie 1'), 'Ćwiczenie 1').trigger('click')
  }
})
