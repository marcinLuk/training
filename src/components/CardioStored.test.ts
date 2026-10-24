import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { createCardioPlan, createExercise, type CardioPlan, type Plan } from '../plans/plan'
import { PLANS_KEY, listAllPlans, savePlan } from '../plans/planStore'
import { WORKOUT_KEY } from '../workout/workoutStore'
import { button } from './testHelpers'

const T0 = new Date('2026-10-24T10:00:00Z').getTime()

let apps: VueWrapper[]
let errors: unknown[]

function mountApp(): VueWrapper {
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { config: { errorHandler: (error) => errors.push(error) } },
  })
  apps.push(wrapper)
  return wrapper
}

function cardio(id: string, name: string): CardioPlan {
  return { ...createCardioPlan(), id, name }
}

function strength(id: string, name: string): Plan {
  return { id, name, exercises: [{ ...createExercise(), name: 'Wiosłowanie' }] }
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  errors = []
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})

afterEach(() => {
  apps.forEach((wrapper) => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a cardio plan in storage, before the cardio screens exist', () => {
  it('shows on the plan list next to a strength plan with its cardio summary and does not crash', () => {
    savePlan(strength('s1', 'Siła'))
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    savePlan(strength('s2', 'Plecy'))

    const wrapper = mountApp()

    expect(wrapper.findAll('li h2').map((heading) => heading.text())).toEqual(['Siła', 'Bieg z rozgrzewką', 'Plecy'])
    expect(wrapper.text()).toContain('16 interwałów, 8:00')
    expect(wrapper.text()).toContain('1 ćwiczenie, 3 serie')
  })

  it('Start on a cardio card starts no workout', async () => {
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    const wrapper = mountApp()

    await button(wrapper.element, 'Start: Bieg z rozgrzewką').trigger('click')

    expect(errors).toEqual([])
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(wrapper.findAll('li h2')).toHaveLength(1)
  })

  it('Edytuj on a cardio card opens no strength editor', async () => {
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    const wrapper = mountApp()

    await button(wrapper.element, 'Edytuj: Bieg z rozgrzewką').trigger('click')

    expect(wrapper.findAll('li h2')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Zapisz plan')
  })

  it('Usuń on a cardio card deletes it and leaves the strength plan', async () => {
    savePlan(strength('s1', 'Siła'))
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    const wrapper = mountApp()

    await button(wrapper.element, 'Usuń plan: Bieg z rozgrzewką').trigger('click')
    vi.setSystemTime(T0 + 600)
    await button(wrapper.element, 'Usuń plan').trigger('click')

    expect(listAllPlans().map((plan) => plan.id)).toEqual(['s1'])
    expect(localStorage.getItem(PLANS_KEY)).not.toBeNull()
  })
})
