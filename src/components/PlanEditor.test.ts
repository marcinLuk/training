import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
