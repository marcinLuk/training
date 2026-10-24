import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardioPlan } from '../plans/plan'
import { PLANS_KEY, listAllPlans, savePlan } from '../plans/planStore'
import CardioPlanEditor from './CardioPlanEditor.vue'
import { button, field, region, stepperValue } from './testHelpers'

function mountEditor(plan?: CardioPlan): VueWrapper {
  return mount(CardioPlanEditor, { attachTo: document.body, props: plan === undefined ? {} : { plan } })
}

function stored(id: string, name: string, seconds = 30, repeat = 8): CardioPlan {
  return {
    type: 'cardio',
    id,
    name,
    blocks: [
      {
        id: `${id}-b1`,
        repeat,
        intervals: [
          { id: `${id}-i1`, name: 'Sprint', seconds, kind: 'work' },
          { id: `${id}-i2`, name: 'Odpoczynek', seconds: 30, kind: 'rest' },
        ],
      },
    ],
  }
}

function pressed(root: ParentNode, name: string): string | null {
  return button(root, name).attributes('aria-pressed') ?? null
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('CardioPlanEditor defaults', () => {
  it('opens as "Nowy plan cardio" with one block "Powtórz × 8" of Praca 0:30 and Odpoczynek 0:30', () => {
    const wrapper = mountEditor()
    expect(wrapper.get('h1').text()).toBe('Nowy plan cardio')
    expect(wrapper.findAll('section.block')).toHaveLength(1)
    const block = region(wrapper.element, 'Blok 1')
    expect(stepperValue(block, 'Powtórz')).toBe('× 8')
    const work = region(block, 'Interwał 1')
    expect(pressed(work, 'Praca')).toBe('true')
    expect(pressed(work, 'Odpoczynek')).toBe('false')
    expect(field(work, 'Nazwa interwału').element.value).toBe('Praca')
    expect(stepperValue(work, 'Czas')).toBe('0:30')
    const rest = region(block, 'Interwał 2')
    expect(pressed(rest, 'Odpoczynek')).toBe('true')
    expect(pressed(rest, 'Praca')).toBe('false')
    expect(field(rest, 'Nazwa interwału').element.value).toBe('Odpoczynek')
    expect(stepperValue(rest, 'Czas')).toBe('0:30')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('')
  })

  it('titles an existing plan "Edytuj plan cardio" and shows its values', () => {
    const wrapper = mountEditor(stored('c1', 'Bieg z rozgrzewką', 45, 3))
    expect(wrapper.get('h1').text()).toBe('Edytuj plan cardio')
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Bieg z rozgrzewką')
    const block = region(wrapper.element, 'Blok 1')
    expect(stepperValue(block, 'Powtórz')).toBe('× 3')
    expect(stepperValue(region(block, 'Interwał 1'), 'Czas')).toBe('0:45')
    expect(field(region(block, 'Interwał 1'), 'Nazwa interwału').element.value).toBe('Sprint')
  })

  it('has the chalk action only on "Zapisz plan"; the toggles and other buttons are not chalk', () => {
    const wrapper = mountEditor()
    const chalk = wrapper.findAll('button').filter((candidate) => candidate.classes().includes('btn-primary'))
    expect(chalk.map((candidate) => candidate.text())).toEqual(['Zapisz plan'])
    expect(button(wrapper.element, 'Zapisz plan').classes()).toContain('btn-large')
    for (const toggle of ['Praca', 'Odpoczynek']) {
      expect(button(region(wrapper.element, 'Interwał 1'), toggle).classes()).not.toContain('btn-primary')
    }
    expect(button(wrapper.element, 'Usuń blok').classes()).toContain('btn-danger')
  })
})

describe('CardioPlanEditor steppers', () => {
  it('"Powtórz" runs from × 1 to × 20 in steps of 1 and disables the button at each limit', async () => {
    const wrapper = mountEditor()
    const block = region(wrapper.element, 'Blok 1')
    await button(block, 'Zwiększ liczbę powtórzeń').trigger('click')
    expect(stepperValue(block, 'Powtórz')).toBe('× 9')
    for (let tap = 0; tap < 15; tap += 1) await button(block, 'Zwiększ liczbę powtórzeń').trigger('click')
    expect(stepperValue(block, 'Powtórz')).toBe('× 20')
    expect(button(block, 'Zwiększ liczbę powtórzeń').element.disabled).toBe(true)
    for (let tap = 0; tap < 25; tap += 1) await button(block, 'Zmniejsz liczbę powtórzeń').trigger('click')
    expect(stepperValue(block, 'Powtórz')).toBe('× 1')
    expect(button(block, 'Zmniejsz liczbę powtórzeń').element.disabled).toBe(true)
  })

  it('"Czas" moves by 5 s and is shown as m:ss', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    await button(work, 'Wydłuż czas o 5 s').trigger('click')
    expect(stepperValue(work, 'Czas')).toBe('0:35')
    for (let tap = 0; tap < 5; tap += 1) await button(work, 'Wydłuż czas o 5 s').trigger('click')
    expect(stepperValue(work, 'Czas')).toBe('1:00')
    await button(work, 'Skróć czas o 5 s').trigger('click')
    expect(stepperValue(work, 'Czas')).toBe('0:55')
  })

  it('"Czas" stops at 0:05 at the bottom', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    for (let tap = 0; tap < 8; tap += 1) await button(work, 'Skróć czas o 5 s').trigger('click')
    expect(stepperValue(work, 'Czas')).toBe('0:05')
    expect(button(work, 'Skróć czas o 5 s').element.disabled).toBe(true)
  })

  it('"Czas" stops at 60:00 at the top', async () => {
    const wrapper = mountEditor(stored('c1', 'Długi', 3595))
    const work = region(wrapper.element, 'Interwał 1')
    expect(stepperValue(work, 'Czas')).toBe('59:55')
    await button(work, 'Wydłuż czas o 5 s').trigger('click')
    expect(stepperValue(work, 'Czas')).toBe('60:00')
    expect(button(work, 'Wydłuż czas o 5 s').element.disabled).toBe(true)
  })
})

describe('CardioPlanEditor intervals and blocks', () => {
  it('"Dodaj interwał" adds an interval of the opposite type with the defaults, and "Usuń interwał" removes that one', async () => {
    const wrapper = mountEditor()
    const block = region(wrapper.element, 'Blok 1')
    await button(block, 'Dodaj interwał').trigger('click')
    const third = region(block, 'Interwał 3')
    expect(pressed(third, 'Praca')).toBe('true')
    expect(field(third, 'Nazwa interwału').element.value).toBe('Praca')
    expect(stepperValue(third, 'Czas')).toBe('0:30')

    await button(region(block, 'Interwał 1'), 'Usuń interwał').trigger('click')
    expect(wrapper.findAll('section.interval')).toHaveLength(2)
    expect(field(region(block, 'Interwał 1'), 'Nazwa interwału').element.value).toBe('Odpoczynek')
  })

  it('"Dodaj interwał" alternates: after Praca it adds Odpoczynek, after Odpoczynek it adds Praca', async () => {
    const wrapper = mountEditor()
    const block = region(wrapper.element, 'Blok 1')
    await button(block, 'Dodaj interwał').trigger('click')
    await button(block, 'Dodaj interwał').trigger('click')
    await button(block, 'Dodaj interwał').trigger('click')
    const expected = ['Praca', 'Odpoczynek', 'Praca', 'Odpoczynek', 'Praca']
    expect(wrapper.findAll('section.interval')).toHaveLength(5)
    expected.forEach((word, index) => {
      const interval = region(block, `Interwał ${index + 1}`)
      expect(field(interval, 'Nazwa interwału').element.value).toBe(word)
      expect(pressed(interval, word)).toBe('true')
      expect(pressed(interval, word === 'Praca' ? 'Odpoczynek' : 'Praca')).toBe('false')
    })
  })

  it('"Dodaj interwał" follows the type the last interval has now, also after the user changed it', async () => {
    const wrapper = mountEditor()
    const block = region(wrapper.element, 'Blok 1')
    await button(region(block, 'Interwał 2'), 'Praca').trigger('click')
    await button(block, 'Dodaj interwał').trigger('click')
    expect(field(region(block, 'Interwał 3'), 'Nazwa interwału').element.value).toBe('Odpoczynek')
    await button(region(block, 'Interwał 3'), 'Praca').trigger('click')
    await button(block, 'Dodaj interwał').trigger('click')
    expect(pressed(region(block, 'Interwał 4'), 'Odpoczynek')).toBe('true')
  })

  it('"Dodaj interwał" looks at the last interval of its own block, and an empty block starts with Praca', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    const second = region(wrapper.element, 'Blok 2')
    await button(region(second, 'Interwał 2'), 'Usuń interwał').trigger('click')
    await button(second, 'Dodaj interwał').trigger('click')
    expect(field(region(second, 'Interwał 2'), 'Nazwa interwału').element.value).toBe('Odpoczynek')
    expect(pressed(region(second, 'Interwał 2'), 'Odpoczynek')).toBe('true')
    expect(wrapper.findAll('section.interval')).toHaveLength(4)

    await button(region(second, 'Interwał 1'), 'Usuń interwał').trigger('click')
    await button(region(second, 'Interwał 1'), 'Usuń interwał').trigger('click')
    await button(second, 'Dodaj interwał').trigger('click')
    expect(field(region(second, 'Interwał 1'), 'Nazwa interwału').element.value).toBe('Praca')
    expect(pressed(region(second, 'Interwał 1'), 'Praca')).toBe('true')
    expect(region(wrapper.element, 'Blok 1').querySelectorAll('section.interval')).toHaveLength(2)
  })

  it('"Dodaj blok" adds a default block that is independent of the first, and "Usuń blok" removes the chosen one', async () => {
    const wrapper = mountEditor()
    await button(region(wrapper.element, 'Blok 1'), 'Zwiększ liczbę powtórzeń').trigger('click')
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    expect(wrapper.findAll('section.block')).toHaveLength(2)
    expect(stepperValue(region(wrapper.element, 'Blok 1'), 'Powtórz')).toBe('× 9')
    const second = region(wrapper.element, 'Blok 2')
    expect(stepperValue(second, 'Powtórz')).toBe('× 8')
    expect(field(region(second, 'Interwał 1'), 'Nazwa interwału').element.value).toBe('Praca')
    expect(stepperValue(region(second, 'Interwał 2'), 'Czas')).toBe('0:30')

    await button(region(wrapper.element, 'Blok 1'), 'Usuń blok').trigger('click')
    expect(wrapper.findAll('section.block')).toHaveLength(1)
    expect(stepperValue(region(wrapper.element, 'Blok 1'), 'Powtórz')).toBe('× 8')
  })
})

describe('CardioPlanEditor type toggle', () => {
  it('sets aria-pressed on the chosen type only', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    await button(work, 'Odpoczynek').trigger('click')
    expect(pressed(work, 'Odpoczynek')).toBe('true')
    expect(pressed(work, 'Praca')).toBe('false')
    await button(work, 'Praca').trigger('click')
    expect(pressed(work, 'Praca')).toBe('true')
    expect(pressed(work, 'Odpoczynek')).toBe('false')
  })

  it('renames an untouched name to the new type word, in both directions', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    await button(work, 'Odpoczynek').trigger('click')
    expect(field(work, 'Nazwa interwału').element.value).toBe('Odpoczynek')
    await button(work, 'Praca').trigger('click')
    expect(field(work, 'Nazwa interwału').element.value).toBe('Praca')
  })

  it('keeps a name the user changed', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    await field(work, 'Nazwa interwału').setValue('Wiosłowanie')
    await button(work, 'Odpoczynek').trigger('click')
    expect(field(work, 'Nazwa interwału').element.value).toBe('Wiosłowanie')
    expect(pressed(work, 'Odpoczynek')).toBe('true')
  })

  it('keeps a name that is the word of the new type, not the old one', async () => {
    const wrapper = mountEditor()
    const work = region(wrapper.element, 'Interwał 1')
    await field(work, 'Nazwa interwału').setValue('Odpoczynek')
    await button(work, 'Odpoczynek').trigger('click')
    expect(field(work, 'Nazwa interwału').element.value).toBe('Odpoczynek')
    expect(pressed(work, 'Odpoczynek')).toBe('true')
  })
})

describe('CardioPlanEditor validation', () => {
  it('shows the plan name message and marks the field, and nothing is stored', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.text()).toContain('Wpisz nazwę planu.')
    expect(field(wrapper.element, 'Nazwa planu').attributes('aria-invalid')).toBe('true')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(localStorage.getItem(PLANS_KEY)).toBeNull()
  })

  it('shows the interval name message under that interval only', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg')
    await field(region(wrapper.element, 'Interwał 2'), 'Nazwa interwału').setValue('  ')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(region(wrapper.element, 'Interwał 2').textContent).toContain('Blok 1: wpisz nazwę interwału 2.')
    expect(region(wrapper.element, 'Interwał 1').textContent).not.toContain('wpisz nazwę interwału')
    expect(field(region(wrapper.element, 'Interwał 2'), 'Nazwa interwału').attributes('aria-invalid')).toBe('true')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('shows "dodaj co najmniej jeden interwał" for a block with no interval', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg')
    await button(region(wrapper.element, 'Interwał 1'), 'Usuń interwał').trigger('click')
    await button(region(wrapper.element, 'Interwał 1'), 'Usuń interwał').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(region(wrapper.element, 'Blok 1').textContent).toContain('Blok 1: dodaj co najmniej jeden interwał.')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('shows "Dodaj co najmniej jeden blok." when the last block was removed', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg')
    await button(wrapper.element, 'Usuń blok').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.get('#blocks-error').text()).toBe('Dodaj co najmniej jeden blok.')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('shows the repeat and time messages under their steppers for values outside the limits', async () => {
    const invalid = stored('c1', 'Bieg', 7, 21)
    const wrapper = mountEditor(invalid)
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    const block = region(wrapper.element, 'Blok 1')
    expect(block.textContent).toContain('Blok 1: ustaw powtórzenia od 1 do 20.')
    expect(region(block, 'Interwał 1').textContent).toContain(
      'Blok 1, interwał 1: ustaw czas od 5 do 3600 s, co 5 s.',
    )
    expect(region(block, 'Interwał 2').textContent).not.toContain('ustaw czas')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('clears the messages after an interval is removed', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.text()).toContain('Wpisz nazwę planu.')
    await button(region(wrapper.element, 'Interwał 2'), 'Usuń interwał').trigger('click')
    expect(wrapper.text()).not.toContain('Wpisz nazwę planu.')
  })

  it('clears the plan name message after a block is removed', async () => {
    const wrapper = mountEditor()
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(wrapper.text()).toContain('Wpisz nazwę planu.')
    await button(region(wrapper.element, 'Blok 2'), 'Usuń blok').trigger('click')
    expect(wrapper.text()).not.toContain('Wpisz nazwę planu.')
    expect(field(wrapper.element, 'Nazwa planu').attributes('aria-invalid')).toBeUndefined()
  })

  it('does not move a block message onto the block that takes its place after a block is removed', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg')
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    await field(region(region(wrapper.element, 'Blok 1'), 'Interwał 1'), 'Nazwa interwału').setValue('  ')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(region(wrapper.element, 'Blok 1').textContent).toContain('Blok 1: wpisz nazwę interwału 1.')

    await button(region(wrapper.element, 'Blok 1'), 'Usuń blok').trigger('click')
    expect(wrapper.findAll('section.block')).toHaveLength(1)
    const remaining = region(wrapper.element, 'Blok 1')
    expect(remaining.textContent).not.toContain('wpisz nazwę interwału')
    expect(field(region(remaining, 'Interwał 1'), 'Nazwa interwału').attributes('aria-invalid')).toBeUndefined()
  })
})

describe('CardioPlanEditor save and cancel', () => {
  it('saves a new plan with Polish letters as a cardio plan and tells the parent', async () => {
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg z rozgrzewką')
    await field(region(wrapper.element, 'Interwał 1'), 'Nazwa interwału').setValue('Wiosłowanie')
    await button(wrapper.element, 'Dodaj blok').trigger('click')
    await button(region(wrapper.element, 'Blok 2'), 'Zwiększ liczbę powtórzeń').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toHaveLength(1)
    const [plan] = listAllPlans()
    expect(plan).toMatchObject({ type: 'cardio', name: 'Bieg z rozgrzewką' })
    const cardio = plan as CardioPlan
    expect(cardio.blocks.map((block) => block.repeat)).toEqual([8, 9])
    expect(cardio.blocks[0]?.intervals.map((interval) => [interval.name, interval.seconds, interval.kind])).toEqual([
      ['Wiosłowanie', 30, 'work'],
      ['Odpoczynek', 30, 'rest'],
    ])
    expect(cardio.blocks[1]?.intervals.map((interval) => interval.name)).toEqual(['Praca', 'Odpoczynek'])
  })

  it('edits one of three plans, the first and then the middle one, and saves under the same id and place', async () => {
    savePlan(stored('c1', 'Pierwszy'))
    savePlan(stored('c2', 'Środkowy'))
    savePlan(stored('c3', 'Ostatni'))

    const first = mountEditor(listAllPlans().find((plan) => plan.id === 'c1') as CardioPlan)
    await field(first.element, 'Nazwa planu').setValue('Bieg z rozgrzewką')
    await button(first.element, 'Zapisz plan').trigger('click')
    expect(listAllPlans().map((plan) => [plan.id, plan.name])).toEqual([
      ['c1', 'Bieg z rozgrzewką'],
      ['c2', 'Środkowy'],
      ['c3', 'Ostatni'],
    ])

    const middle = mountEditor(listAllPlans().find((plan) => plan.id === 'c2') as CardioPlan)
    await button(region(middle.element, 'Interwał 1'), 'Wydłuż czas o 5 s').trigger('click')
    await button(middle.element, 'Zapisz plan').trigger('click')
    const plans = listAllPlans()
    expect(plans.map((plan) => plan.id)).toEqual(['c1', 'c2', 'c3'])
    const saved = plans[1] as CardioPlan
    expect(saved.blocks[0]?.intervals[0]?.seconds).toBe(35)
    expect(saved.blocks[0]?.id).toBe('c2-b1')
    expect(plans[0]?.name).toBe('Bieg z rozgrzewką')
    expect(plans[2]?.name).toBe('Ostatni')
  })

  it('"Anuluj" tells the parent and leaves the stored plan as it was', async () => {
    savePlan(stored('c1', 'Pierwszy'))
    const before = localStorage.getItem(PLANS_KEY)
    const wrapper = mountEditor(listAllPlans()[0] as CardioPlan)
    await field(wrapper.element, 'Nazwa planu').setValue('Inna nazwa')
    await button(region(wrapper.element, 'Interwał 1'), 'Wydłuż czas o 5 s').trigger('click')
    await button(wrapper.element, 'Anuluj').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(localStorage.getItem(PLANS_KEY)).toBe(before)
  })

  it('editing does not change the plan object that was passed in until it is saved', async () => {
    const original = stored('c1', 'Pierwszy')
    const wrapper = mountEditor(original)
    await field(wrapper.element, 'Nazwa planu').setValue('Inna nazwa')
    await button(region(wrapper.element, 'Interwał 1'), 'Odpoczynek').trigger('click')
    expect(original.name).toBe('Pierwszy')
    expect(original.blocks[0]?.intervals[0]?.kind).toBe('work')
  })

  it('keeps the typed data on screen and does not emit "saved" when the write fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Bieg z rozgrzewką')
    await button(region(wrapper.element, 'Interwał 1'), 'Wydłuż czas o 5 s').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('Nie udało się zapisać planu.')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(field(wrapper.element, 'Nazwa planu').element.value).toBe('Bieg z rozgrzewką')
    expect(stepperValue(region(wrapper.element, 'Interwał 1'), 'Czas')).toBe('0:35')
  })

  it('saves once when "Zapisz plan" is tapped twice 150 ms apart', async () => {
    vi.useFakeTimers()
    const wrapper = mountEditor()
    await field(wrapper.element, 'Nazwa planu').setValue('Wiosłowanie')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    vi.advanceTimersByTime(150)
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(listAllPlans()).toHaveLength(1)
  })

  it('two new plans saved from two editors are stored as two plans', async () => {
    const first = mountEditor()
    await field(first.element, 'Nazwa planu').setValue('Jeden')
    await button(first.element, 'Zapisz plan').trigger('click')
    const second = mountEditor()
    await field(second.element, 'Nazwa planu').setValue('Dwa')
    await button(second.element, 'Zapisz plan').trigger('click')
    expect(listAllPlans().map((plan) => plan.name)).toEqual(['Jeden', 'Dwa'])
  })
})
