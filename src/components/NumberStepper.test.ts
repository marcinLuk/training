import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { formatRest } from '../plans/format'
import NumberStepper from './NumberStepper.vue'
import { button } from './testHelpers'

function mountStepper(modelValue: number, extra: Record<string, unknown> = {}) {
  return mount(NumberStepper, {
    props: {
      label: 'Przerwa',
      decreaseLabel: 'Skróć przerwę o 15 s',
      increaseLabel: 'Wydłuż przerwę o 15 s',
      modelValue,
      min: 0,
      max: 600,
      step: 15,
      format: formatRest,
      ...extra,
    },
  })
}

describe('NumberStepper', () => {
  it('shows the value as m:ss through the format function', () => {
    expect(mountStepper(90).get('output').text()).toBe('1:30')
  })

  it('changes the value by one step per tap', async () => {
    const wrapper = mountStepper(90)
    await button(wrapper.element, 'Wydłuż przerwę o 15 s').trigger('click')
    await button(wrapper.element, 'Skróć przerwę o 15 s').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[105], [75]])
  })

  it('disables the decrease button at the minimum and emits nothing', async () => {
    const wrapper = mountStepper(0)
    const decrease = button(wrapper.element, 'Skróć przerwę o 15 s')
    expect(decrease.element.disabled).toBe(true)
    await decrease.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disables the increase button at the maximum', () => {
    const wrapper = mountStepper(600)
    expect(button(wrapper.element, 'Wydłuż przerwę o 15 s').element.disabled).toBe(true)
    expect(button(wrapper.element, 'Skróć przerwę o 15 s').element.disabled).toBe(false)
  })

  it('shows an error text under the stepper', () => {
    const wrapper = mountStepper(90, { error: 'Ustaw przerwę.' })
    expect(wrapper.get('.field-error').text()).toBe('Ustaw przerwę.')
  })
})
