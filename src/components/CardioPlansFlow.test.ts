import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { createCardioPlan, createExercise, type CardioPlan, type Plan } from '../plans/plan'
import { PLANS_KEY, listAllPlans, savePlan } from '../plans/planStore'
import { WORKOUT_KEY } from '../workout/workoutStore'
import PlanList from './PlanList.vue'
import planListSource from './PlanList.vue?raw'
import { button, field, region, stepperValue } from './testHelpers'

const T0 = new Date('2026-10-24T10:00:00Z').getTime()

let apps: VueWrapper[]

function mountApp(): VueWrapper {
  const wrapper = mount(App, { attachTo: document.body })
  apps.push(wrapper)
  return wrapper
}

function cardio(id: string, name: string, repeat = 8): CardioPlan {
  const plan = createCardioPlan()
  const [block] = plan.blocks
  if (block !== undefined) block.repeat = repeat
  return { ...plan, id, name }
}

function strength(id: string, name: string): Plan {
  return { id, name, exercises: [{ ...createExercise(), name: 'Wiosłowanie' }] }
}

function cardNamed(wrapper: VueWrapper, name: string): HTMLElement {
  const card = wrapper.findAll('li').find((item) => item.get('h2').text() === name)
  if (card === undefined) throw new Error(`No card "${name}"`)
  return card.element
}

function tagOf(card: HTMLElement): HTMLElement {
  const tag = card.querySelector<HTMLElement>('.plan-tag')
  if (tag === null) throw new Error('No tag')
  return tag
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  apps = []
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})

afterEach(() => {
  apps.forEach((wrapper) => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('plan type tags on the plan list', () => {
  it('shows "Siła" on a strength card and "Cardio" on a cardio card, with the cardio summary', () => {
    savePlan(strength('s1', 'Plecy'))
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    savePlan(strength('s2', 'Nogi'))
    const wrapper = mountApp()

    expect(tagOf(cardNamed(wrapper, 'Plecy')).textContent?.trim()).toBe('Siła')
    expect(tagOf(cardNamed(wrapper, 'Bieg z rozgrzewką')).textContent?.trim()).toBe('Cardio')
    expect(tagOf(cardNamed(wrapper, 'Nogi')).textContent?.trim()).toBe('Siła')
    expect(cardNamed(wrapper, 'Bieg z rozgrzewką').textContent).toContain('16 interwałów, 8:00')
    expect(cardNamed(wrapper, 'Plecy').textContent).toContain('1 ćwiczenie, 3 serie')
  })

  it('tags a plan stored before the cardio module (no type field) as "Siła"', () => {
    localStorage.setItem(
      PLANS_KEY,
      JSON.stringify({
        version: 1,
        plans: [{ id: 'old', name: 'Stary plan', exercises: [{ id: 'e', name: 'Przysiady', sets: 3, reps: 10, restSeconds: 90 }] }],
      }),
    )
    const wrapper = mountApp()
    expect(tagOf(cardNamed(wrapper, 'Stary plan')).textContent?.trim()).toBe('Siła')
  })

  it('puts the tag beside the name, outside the heading, and uses the cardio class on cardio cards only', () => {
    savePlan(strength('s1', 'Plecy'))
    savePlan(cardio('c1', 'Bieg'))
    const wrapper = mountApp()
    const strengthTag = tagOf(cardNamed(wrapper, 'Plecy'))
    const cardioTag = tagOf(cardNamed(wrapper, 'Bieg'))

    expect(cardioTag.classList.contains('plan-tag-cardio')).toBe(true)
    expect(cardioTag.classList.contains('plan-tag-strength')).toBe(false)
    expect(strengthTag.classList.contains('plan-tag-strength')).toBe(true)
    expect(strengthTag.classList.contains('plan-tag-cardio')).toBe(false)
    expect(cardNamed(wrapper, 'Bieg').querySelector('h2')?.textContent).toBe('Bieg')
    expect(cardioTag.parentElement).toBe(cardNamed(wrapper, 'Bieg').querySelector('h2')?.parentElement)
  })

  it('keeps Start chalk and large on both card types, and never gives a violet class to a button', () => {
    savePlan(strength('s1', 'Plecy'))
    savePlan(cardio('c1', 'Bieg'))
    const wrapper = mountApp()
    for (const name of ['Start: Plecy', 'Start: Bieg']) {
      const start = button(wrapper.element, name)
      expect(start.classes()).toContain('btn-primary')
      expect(start.classes()).toContain('btn-large')
    }
    for (const candidate of wrapper.findAll('button')) {
      expect(candidate.classes().some((name) => name.includes('cardio'))).toBe(false)
    }
  })

  it('uses violet only in the cardio tag rule of the plan list styles', () => {
    const source = planListSource
    const rule = (selector: string): string => {
      const start = source.indexOf(`${selector} {`)
      return source.slice(start, source.indexOf('}', start))
    }
    expect(rule('.plan-tag-cardio')).toContain('background: var(--cardio)')
    expect(rule('.plan-tag-cardio')).toContain('color: var(--on-cardio)')
    expect(rule('.plan-tag-strength')).toContain('background: var(--surface-2)')
    expect(rule('.plan-tag-strength')).toContain('color: var(--ink)')
    expect(rule('.plan-tag')).toContain('border-radius: var(--radius-pill)')
    expect(rule('.plan-tag')).toContain('min-height: 24px')
    expect(source.match(/--cardio|--on-cardio/g)).toHaveLength(2)
    expect(source).not.toMatch(/border-left|gradient/)
  })

  it('emits the same events for a cardio card as for a strength card', async () => {
    const wrapper = mount(PlanList, { props: { plans: [strength('s1', 'Plecy'), cardio('c1', 'Bieg')] } })
    await button(wrapper.element, 'Edytuj: Bieg').trigger('click')
    await button(wrapper.element, 'Start: Bieg').trigger('click')
    expect(wrapper.emitted('edit')).toEqual([['c1']])
    expect(wrapper.emitted('start')).toEqual([['c1']])
  })
})

describe('"Nowy plan" asks "Jaki plan?"', () => {
  it('opens the question with "Siła", "Cardio" and "Anuluj", none of them chalk, each at least 56 px by class', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')

    expect(wrapper.get('[role="alertdialog"] h2').text()).toBe('Jaki plan?')
    const buttons = wrapper.findAll('[role="alertdialog"] button')
    expect(buttons.map((candidate) => candidate.text())).toEqual(['Siła', 'Cardio', 'Anuluj'])
    for (const candidate of buttons) {
      expect(candidate.classes()).toContain('btn')
      expect(candidate.classes()).not.toContain('btn-primary')
      expect(candidate.classes()).not.toContain('btn-danger')
    }
    expect(wrapper.text()).not.toContain('Zapisz plan')
  })

  it('"Siła" opens the strength editor unchanged', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Siła').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Nowy plan')
    expect(wrapper.text()).not.toContain('Jaki plan?')
    expect(wrapper.text()).toContain('Dodaj ćwiczenie')
    expect(region(wrapper.element, 'Ćwiczenie 1')).toBeTruthy()
  })

  it('"Cardio" opens the cardio editor with one block "Powtórz × 8"', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Cardio').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Nowy plan cardio')
    expect(wrapper.text()).not.toContain('Jaki plan?')
    expect(wrapper.text()).not.toContain('Dodaj ćwiczenie')
    expect(stepperValue(region(wrapper.element, 'Blok 1'), 'Powtórz')).toBe('× 8')
    expect(wrapper.findAll('section.block')).toHaveLength(1)
  })

  it('"Anuluj" closes the question, stays on the list and changes nothing', async () => {
    savePlan(strength('s1', 'Plecy'))
    const before = localStorage.getItem(PLANS_KEY)
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    expect(wrapper.get('[role="alertdialog"] h2').text()).toBe('Jaki plan?')
    await button(wrapper.get('[role="alertdialog"]').element, 'Anuluj').trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Jaki plan?')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })

  it('shows the question again on the next "Nowy plan" after a cancel from an editor', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Cardio').trigger('click')
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(wrapper.text()).not.toContain('Jaki plan?')
    await button(wrapper.element, 'Nowy plan').trigger('click')
    expect(wrapper.text()).toContain('Jaki plan?')
  })
})

describe('cardio plans through the app', () => {
  it('creates a plan "Bieg z rozgrzewką" with a second block, shows it tagged, and it survives a reload', async () => {
    const wrapper = mountApp()
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Cardio').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg z rozgrzewką')
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    await button(region(wrapper.element, 'Blok 2'), 'Zmniejsz liczbę powtórzeń').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Plany')
    const card = cardNamed(wrapper, 'Bieg z rozgrzewką')
    expect(tagOf(card).textContent?.trim()).toBe('Cardio')
    expect(card.textContent).toContain('30 interwałów, 15:00')

    wrapper.unmount()
    const reloaded = mountApp()
    expect(tagOf(cardNamed(reloaded, 'Bieg z rozgrzewką')).textContent?.trim()).toBe('Cardio')
  })

  it('edits the first and the middle of three plans under their own ids', async () => {
    savePlan(cardio('c1', 'Pierwszy'))
    savePlan(strength('s1', 'Plecy'))
    savePlan(cardio('c2', 'Środkowy', 3))
    savePlan(cardio('c3', 'Ostatni'))
    const wrapper = mountApp()

    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    expect(wrapper.get('h1').text()).toBe('Edytuj plan cardio')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Pierwszy')
    await field(wrapper.element, 'Nazwa planu').setValue('Wiosłowanie')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    await button(wrapper.element, 'Edytuj: Środkowy').trigger('click')
    expect(stepperValue(region(wrapper.element, 'Blok 1'), 'Powtórz')).toBe('× 3')
    await button(region(wrapper.element, 'Blok 1'), 'Zwiększ liczbę powtórzeń').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(listAllPlans().map((plan) => [plan.id, plan.name])).toEqual([
      ['c1', 'Wiosłowanie'],
      ['s1', 'Plecy'],
      ['c2', 'Środkowy'],
      ['c3', 'Ostatni'],
    ])
    expect(cardNamed(wrapper, 'Środkowy').textContent).toContain('8 interwałów, 4:00')
  })

  it('"Anuluj" in the cardio editor returns to the list and the stored plan stays', async () => {
    savePlan(cardio('c1', 'Pierwszy'))
    const before = localStorage.getItem(PLANS_KEY)
    const wrapper = mountApp()
    await button(wrapper.element, 'Edytuj: Pierwszy').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Inna')
    await button(wrapper.element, 'Anuluj').trigger('click')

    expect(wrapper.get('h1').text()).toBe('Plany')
    expect(cardNamed(wrapper, 'Pierwszy')).toBeTruthy()
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })

  it('deletes a cardio plan through the confirm question and leaves the other plans', async () => {
    savePlan(strength('s1', 'Plecy'))
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    savePlan(cardio('c2', 'Wiosłowanie'))
    const wrapper = mountApp()

    await button(wrapper.element, 'Usuń plan: Bieg z rozgrzewką').trigger('click')
    expect(wrapper.get('[role="alertdialog"] h2').text()).toBe('Usunąć plan „Bieg z rozgrzewką”?')
    vi.setSystemTime(T0 + 600)
    await button(wrapper.get('[role="alertdialog"]').element, 'Usuń plan').trigger('click')

    expect(listAllPlans().map((plan) => plan.id)).toEqual(['s1', 'c2'])
    expect(wrapper.findAll('li h2').map((heading) => heading.text())).toEqual(['Plecy', 'Wiosłowanie'])
  })

  it('Start on a cardio card starts the cardio session (phase 5)', async () => {
    savePlan(cardio('c1', 'Bieg z rozgrzewką'))
    const wrapper = mountApp()
    await button(wrapper.element, 'Start: Bieg z rozgrzewką').trigger('click')
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY) ?? 'null')).toMatchObject({ kind: 'cardio', planId: 'c1' })
    expect(wrapper.get('h1').text()).toBe('PRZYGOTUJ SIĘ')
  })
})
