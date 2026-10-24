import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

const sw = vi.hoisted(() => ({
  options: undefined as RegisterSWOptions | undefined,
  needRefresh: undefined as { value: boolean } | undefined,
  updateServiceWorker: undefined as ReturnType<typeof vi.fn> | undefined,
}))

vi.mock('virtual:pwa-register/vue', async () => {
  const { ref: makeRef } = await import('vue')
  return {
    useRegisterSW: (options: RegisterSWOptions) => {
      sw.options = options
      sw.needRefresh = makeRef(false)
      return { needRefresh: sw.needRefresh, offlineReady: makeRef(false), updateServiceWorker: sw.updateServiceWorker }
    },
  }
})

import { useServiceWorkerUpdates } from './useServiceWorkerUpdates'

let planListShown: ReturnType<typeof ref<boolean>>
let workoutRunning: ReturnType<typeof ref<boolean>>
let scope: EffectScope
let visibility: DocumentVisibilityState
let update: Mock<() => Promise<ServiceWorkerRegistration>>
const REGISTRATION = {} as ServiceWorkerRegistration

function start(): void {
  scope = effectScope()
  scope.run(() =>
    useServiceWorkerUpdates({
      planListShown: () => planListShown.value === true,
      workoutRunning: () => workoutRunning.value === true,
    }),
  )
}

function registerWith(registration: Partial<ServiceWorkerRegistration> | undefined): void {
  sw.options?.onRegisteredSW?.('/sw.js', registration as ServiceWorkerRegistration | undefined)
}

async function signalUpdate(): Promise<void> {
  if (sw.needRefresh) sw.needRefresh.value = true
  await nextTick()
}

function becomeVisible(): void {
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  planListShown = ref(true)
  workoutRunning = ref(false)
  visibility = 'visible'
  update = vi.fn(() => Promise.resolve(REGISTRATION))
  sw.updateServiceWorker = vi.fn(() => Promise.resolve())
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  scope.stop()
  vi.restoreAllMocks()
})

describe('registration', () => {
  it('registers the service worker when the composable starts', () => {
    start()
    expect(sw.options).toBeDefined()
  })

  it('keeps the app running when the registration fails', () => {
    start()
    expect(() => sw.options?.onRegisterError?.(new Error('blocked'))).not.toThrow()
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('applying a waiting update', () => {
  it('does not reload when no update waits', async () => {
    start()
    await nextTick()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('applies a waiting update on the plan list with no workout, with a page reload', async () => {
    start()
    await signalUpdate()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('waits during a workout and applies when the plan list shows again with no workout', async () => {
    planListShown.value = false
    workoutRunning.value = true
    start()
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    workoutRunning.value = false
    await nextTick()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    planListShown.value = true
    await nextTick()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits in the plan editor and applies when the plan list shows again', async () => {
    planListShown.value = false
    start()
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    planListShown.value = true
    await nextTick()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits on the end screen (the workout view is still active) until the workout is left', async () => {
    workoutRunning.value = true
    start()
    await signalUpdate()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
    workoutRunning.value = false
    await nextTick()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('applies at most once, also when the safe state comes back', async () => {
    start()
    await signalUpdate()
    planListShown.value = false
    await nextTick()
    planListShown.value = true
    await nextTick()
    workoutRunning.value = true
    await nextTick()
    workoutRunning.value = false
    await nextTick()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('survives a failed apply and tries again at the next safe moment', async () => {
    sw.updateServiceWorker = vi.fn(() => Promise.reject(new Error('no worker')))
    start()
    await signalUpdate()
    await Promise.resolve()
    await Promise.resolve()
    expect(console.warn).toHaveBeenCalled()
    planListShown.value = false
    await nextTick()
    planListShown.value = true
    await nextTick()
    expect(sw.updateServiceWorker).toHaveBeenCalledTimes(2)
  })
})

describe('update check', () => {
  it('checks for an update when the document becomes visible', () => {
    start()
    registerWith({ update })
    becomeVisible()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('does not check when the document becomes hidden', () => {
    start()
    registerWith({ update })
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when there is no registration', () => {
    start()
    registerWith(undefined)
    expect(() => becomeVisible()).not.toThrow()
  })

  it('keeps running when the check fails', async () => {
    update = vi.fn(() => Promise.reject(new Error('offline')))
    start()
    registerWith({ update })
    becomeVisible()
    await Promise.resolve()
    await Promise.resolve()
    expect(console.warn).toHaveBeenCalled()
  })

  it('stops listening when the scope ends', () => {
    start()
    registerWith({ update })
    scope.stop()
    becomeVisible()
    expect(update).not.toHaveBeenCalled()
  })
})
