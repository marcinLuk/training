import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

describe('test harness', () => {
  it('mounts a component in jsdom and renders Polish text', () => {
    const Probe = defineComponent({
      render: () => h('p', { class: 'probe' }, 'Ćwiczenie'),
    })

    const wrapper = mount(Probe)

    expect(wrapper.text()).toBe('Ćwiczenie')
    expect(wrapper.element.ownerDocument).toBe(document)
  })
})
