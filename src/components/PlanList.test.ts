import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createExercise, type Plan } from '../plans/plan'
import PlanList from './PlanList.vue'
import { button } from './testHelpers'

function plan(name: string, sets: number[]): Plan {
  return {
    id: name,
    name,
    exercises: sets.map((count) => ({ ...createExercise(), name: 'Ćwiczenie', sets: count })),
  }
}

describe('PlanList', () => {
  it('shows the plan title and an empty-state text when there are no plans', () => {
    const wrapper = mount(PlanList, { props: { plans: [] } })
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).toContain('Nie masz jeszcze planów.')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('shows one card per plan with its name and summary, using Polish plural forms', () => {
    const wrapper = mount(PlanList, {
      props: { plans: [plan('A', [1]), plan('B', [3, 3]), plan('C', [2, 2, 2, 2, 2])] },
    })
    const cards = wrapper.findAll('li')
    expect(cards.map((card) => card.get('h2').text())).toEqual(['A', 'B', 'C'])
    expect(cards.map((card) => card.get('p').text())).toEqual([
      '1 ćwiczenie, 1 seria',
      '2 ćwiczenia, 6 serii',
      '5 ćwiczeń, 10 serii',
    ])
  })

  it('has "Nowy plan" as the only chalk action and emits new-plan on tap', async () => {
    const wrapper = mount(PlanList, { props: { plans: [plan('A', [3])] } })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.classes()).toContain('btn-primary')
    await button(wrapper.element, 'Nowy plan').trigger('click')
    expect(wrapper.emitted('new-plan')).toHaveLength(1)
  })
})
