import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App.vue'
import { button, field, region } from './testHelpers'

function headingText(root: ParentNode): string {
  return root.querySelector('h1')?.textContent?.trim() ?? ''
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('App', () => {
  it('opens on the plan list and moves to the editor and back on cancel', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    expect(headingText(wrapper.element)).toBe('Plany')
    await button(wrapper.element, 'Nowy plan').trigger('click')
    expect(headingText(wrapper.element)).toBe('Nowy plan')
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(headingText(wrapper.element)).toBe('Plany')
  })

  it('shows a saved plan with its summary in the list, also after a fresh mount (reload)', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await field(wrapper.element, 'Nazwa planu').setValue('Wiosłowanie i przysiady')
    await field(region(wrapper.element, 'Ćwiczenie 1'), 'Nazwa ćwiczenia').setValue('Wiosłowanie')
    await button(wrapper.element, 'Dodaj ćwiczenie').trigger('click')
    const second = region(wrapper.element, 'Ćwiczenie 2')
    await field(second, 'Nazwa ćwiczenia').setValue('Przysiady')
    await button(second, 'Zwiększ serie').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')

    expect(headingText(wrapper.element)).toBe('Plany')
    expect(wrapper.get('li h2').text()).toBe('Wiosłowanie i przysiady')
    expect(wrapper.get('li p').text()).toBe('2 ćwiczenia, 7 serii')

    wrapper.unmount()
    const reloaded = mount(App, { attachTo: document.body })
    expect(reloaded.get('li h2').text()).toBe('Wiosłowanie i przysiady')
    expect(reloaded.get('li p').text()).toBe('2 ćwiczenia, 7 serii')
  })

  it('stays in the editor when the plan is invalid', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await button(wrapper.element, 'Zapisz plan').trigger('click')
    expect(headingText(wrapper.element)).toBe('Nowy plan')
  })
})
