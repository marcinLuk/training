import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { savePlan } from '../plans/planStore'
import { ACTION_GUARD_MS } from '../workout/useWorkout'
import { button, field, region } from './testHelpers'

const sw = vi.hoisted(() => ({
  needRefresh: undefined as { value: boolean } | undefined,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/vue', async () => {
  const { ref: makeRef } = await import('vue')
  return {
    useRegisterSW: () => {
      sw.needRefresh = makeRef(false)
      return { needRefresh: sw.needRefresh, offlineReady: makeRef(false), updateServiceWorker: sw.updateServiceWorker }
    },
  }
})

function headingText(root: ParentNode): string {
  return root.querySelector('h1')?.textContent?.trim() ?? ''
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  sw.updateServiceWorker.mockClear()
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

describe('service worker update', () => {
  const T0 = new Date('2026-10-18T10:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    savePlan({
      id: 'plan-1',
      name: 'Wiosłowanie',
      exercises: [{ id: 'e1', name: 'Wiosłowanie', sets: 2, reps: 8, restSeconds: 15 }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function tap(root: ParentNode, name: string): Promise<void> {
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(root, name).trigger('click')
  }

  async function signalUpdate(): Promise<void> {
    if (sw.needRefresh) sw.needRefresh.value = true
    await nextTick()
  }

  it('applies a waiting update on the plan list with no workout', async () => {
    mount(App, { attachTo: document.body })
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    await signalUpdate()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('does not reload during a workout and applies once after the workout ends', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await button(wrapper.element, 'Start: Wiosłowanie').trigger('click')
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await tap(wrapper.element, 'Gotowe')
    await tap(wrapper.element, 'Gotowy, zaczynam')
    expect(headingText(wrapper.element)).not.toBe('Plany')
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await tap(wrapper.element, 'Zakończ trening')
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    vi.setSystemTime(Date.now() + ACTION_GUARD_MS)
    await button(wrapper.get('[role="alertdialog"]').element, 'Zakończ trening').trigger('click')
    expect(headingText(wrapper.element)).toBe('Plany')
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits on the end screen and applies after the user goes back to the plan list', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await button(wrapper.element, 'Start: Wiosłowanie').trigger('click')
    await tap(wrapper.element, 'Gotowe')
    await tap(wrapper.element, 'Gotowy, zaczynam')
    await tap(wrapper.element, 'Gotowe')
    await signalUpdate()
    expect(button(wrapper.element, 'Wróć do planów')).toBeDefined()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await tap(wrapper.element, 'Wróć do planów')
    expect(headingText(wrapper.element)).toBe('Plany')
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits in the plan editor and applies after the user leaves it', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await button(wrapper.element, 'Nowy plan').trigger('click')
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    await button(wrapper.element, 'Anuluj').trigger('click')
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits while a restored workout is on screen', async () => {
    const first = mount(App, { attachTo: document.body })
    await button(first.element, 'Start: Wiosłowanie').trigger('click')
    first.unmount()

    const restored = mount(App, { attachTo: document.body })
    expect(headingText(restored.element)).toBe('Wiosłowanie')
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })
})
