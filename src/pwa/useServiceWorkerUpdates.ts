import { onScopeDispose, watchEffect } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { shouldApplyUpdate } from './updatePolicy'

export interface ScreenState {
  /** True while the plan list (not the plan editor) is on screen. */
  planListShown: () => boolean
  /** True while a workout view is active, including a restored workout and the end screen. */
  workoutRunning: () => boolean
}

/**
 * Registers the service worker and keeps it current without a visible prompt.
 * A new version installs in the background. The page reloads only at a safe moment,
 * decided by `shouldApplyUpdate`. The worker is checked for a new version each time
 * the page becomes visible again.
 */
export function useServiceWorkerUpdates(screen: ScreenState): void {
  let registration: ServiceWorkerRegistration | undefined
  let applied = false

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_scriptUrl, registered) {
      registration = registered
    },
    onRegisterError(error) {
      // The app works without a service worker; it only loses offline start and updates.
      console.warn('Service worker registration failed', error)
    },
  })

  watchEffect(() => {
    const apply = shouldApplyUpdate({
      updateWaiting: needRefresh.value,
      planListShown: screen.planListShown(),
      workoutRunning: screen.workoutRunning(),
      alreadyApplied: applied,
    })
    if (!apply) return
    applied = true
    updateServiceWorker(true).catch((error: unknown) => {
      // Let the next safe moment try again.
      applied = false
      console.warn('Service worker update failed', error)
    })
  })

  function checkForUpdate(): void {
    if (document.visibilityState !== 'visible' || registration === undefined) return
    registration.update().catch((error: unknown) => {
      // Offline or the server is unreachable: the next visit tries again.
      console.warn('Service worker update check failed', error)
    })
  }

  document.addEventListener('visibilitychange', checkForUpdate)
  onScopeDispose(() => document.removeEventListener('visibilitychange', checkForUpdate))
}
