import { computed, onBeforeUnmount, onMounted, shallowRef, ref, watch } from 'vue'
import { now } from '../lib/clock'
import type { Plan } from '../plans/plan'
import {
  completeSet,
  endRestEarly,
  getView,
  IDLE_EXPIRY_MS,
  isExpired,
  resolveRest,
  startWorkout,
  type WorkoutState,
  type WorkoutView,
} from './engine'
import { playRestEnd, unlockAudio } from './sound'
import { holdWakeLock, releaseWakeLock } from './wakeLock'
import { clearWorkout, loadWorkout, saveWorkout } from './workoutStore'

/** How often the display re-renders during a rest. It only triggers a render, it counts nothing. */
export const DISPLAY_TICK_MS = 250

/**
 * After any screen change, workout action taps are ignored for this long. "Gotowe" and
 * "Gotowy, zaczynam" sit in the same place, so the second tap of a double tap would land on the
 * new screen's main action and mark a set the user did not do.
 */
export const ACTION_GUARD_MS = 500

/** The end-of-rest sound plays only if the rest end is seen at most this long after it happened. */
export const SOUND_MAX_LATE_MS = 2_000

/**
 * What a stored workout becomes at app start. A finished workout opens the end screen; one
 * older than the idle limit is removed (a running one also reports `expired` so the plan list
 * can say why). A rest that ended while the app was away shows the set view. Restoring is not a
 * user action, so `lastActivityAt` stays as stored.
 */
function restoreWorkout(at: number): { state: WorkoutState | null; expired: boolean } {
  const stored = loadWorkout(at)
  if (stored === null) return { state: null, expired: false }
  if (isExpired(stored, at)) {
    clearWorkout()
    return { state: null, expired: stored.mode !== 'finished' }
  }
  return { state: resolveRest(stored, at), expired: false }
}

/**
 * The running workout as UI state. Every state change goes through `commit`, which saves it,
 * so a reload returns to the same set and rest. The time on screen always comes from `getView(state, now())`; the timer below
 * only asks for a new render.
 */
export function useWorkout() {
  const restored = restoreWorkout(now())
  const state = shallowRef<WorkoutState | null>(restored.state)
  /** True after a running workout expired; the plan list shows a notice until it is dismissed. */
  const expired = ref(restored.expired)
  /** True while the "Zakończ trening" confirm step is open. */
  const confirmingEnd = ref(false)
  const clockMs = ref(now())
  const view = computed<WorkoutView | null>(() =>
    state.value === null ? null : getView(state.value, clockMs.value),
  )
  const restDurationMs = computed(() => state.value?.rest?.durationMs ?? 0)
  let timer: ReturnType<typeof setInterval> | null = null
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  // The restored screen is a screen change too: a tap in the first moments is not deliberate.
  let guardUntil = restored.state === null ? 0 : now() + ACTION_GUARD_MS
  /** When the page last became visible, or null while it is hidden. */
  let visibleSince: number | null = document.visibilityState === 'visible' ? now() : null

  /** The screen stays on while a workout runs; the end screen no longer needs it. */
  function syncWakeLock(): void {
    if (state.value !== null && state.value.mode !== 'finished') holdWakeLock()
    else releaseWakeLock()
  }

  function commit(next: WorkoutState | null): void {
    state.value = next
    guardUntil = now() + ACTION_GUARD_MS
    if (next === null) {
      clearWorkout()
      confirmingEnd.value = false
    } else {
      saveWorkout(next)
    }
    syncWakeLock()
    armExpiry()
  }

  function clearExpiryTimer(): void {
    if (expiryTimer === null) return
    clearTimeout(expiryTimer)
    expiryTimer = null
  }

  /**
   * While a workout runs, one timeout fires just after the idle limit so a workout left open on
   * the set view still expires. It only asks for a check; `refresh` decides from the timestamps.
   */
  function armExpiry(): void {
    clearExpiryTimer()
    const current = state.value
    if (current === null || current.mode === 'finished') return
    const delay = Math.max(0, current.lastActivityAt + IDLE_EXPIRY_MS + 1 - now())
    expiryTimer = setTimeout(() => {
      expiryTimer = null
      refresh()
      armExpiry()
    }, delay)
  }

  /** Ends a running workout that is past the idle limit, like the expiry at app start. */
  function expireIfIdle(at: number): boolean {
    const current = state.value
    if (current === null || current.mode === 'finished' || !isExpired(current, at)) return false
    expired.value = true
    commit(null)
    return true
  }

  /** True while a tap is too close to the last screen change to be a deliberate new tap. */
  function guarded(at: number): boolean {
    return at < guardUntil
  }

  /**
   * Re-read the clock. A rest that has run out switches to the set view. The sound plays only
   * when the page is visible now, was already visible at the rest end, and the end is seen at
   * most SOUND_MAX_LATE_MS after it happened; a rest that ended while hidden, or is first seen
   * much later, ends silently.
   */
  function refresh(): void {
    const current = state.value
    const at = now()
    clockMs.value = at
    if (current === null) return
    if (expireIfIdle(at)) return
    const resolved = resolveRest(current, at)
    if (resolved === current) return
    const restEndsAt = current.rest === null ? at : current.rest.startedAt + current.rest.durationMs
    commit(resolved)
    const visibleAtEnd = visibleSince !== null && visibleSince <= restEndsAt
    if (document.visibilityState === 'visible' && visibleAtEnd && at - restEndsAt <= SOUND_MAX_LATE_MS) {
      playRestEnd()
    }
  }

  /**
   * The state for a tap. The engine's completeSet does nothing unless the state is in set mode,
   * so a rest that already ran out is resolved first (the clock may have passed the rest end
   * before any tick or visibility event committed it), or the tap would be dropped.
   */
  function settled(at: number): WorkoutState | null {
    clockMs.value = at
    return state.value === null ? null : resolveRest(state.value, at)
  }

  /** Starts a workout. Returns false when the tap came too soon after a screen change. */
  function start(plan: Plan): boolean {
    const at = now()
    if (guarded(at)) return false
    unlockAudio()
    clockMs.value = at
    expired.value = false
    commit(startWorkout(plan, at))
    return true
  }

  function finishSet(): void {
    unlockAudio()
    const at = now()
    if (expireIfIdle(at) || guarded(at)) return
    const current = settled(at)
    if (current !== null) commit(completeSet(current, at))
  }

  function endRest(): void {
    const at = now()
    if (expireIfIdle(at) || guarded(at)) return
    const current = settled(at)
    if (current !== null) commit(endRestEarly(current, at))
  }

  /** Leaves the end screen. Returns false when the tap came too soon after the screen change. */
  function leave(): boolean {
    if (guarded(now())) return false
    commit(null)
    return true
  }

  /** Opens the confirm step. The workout, and a running rest, go on underneath unchanged. */
  function askEnd(): void {
    if (state.value === null || state.value.mode === 'finished') return
    if (expireIfIdle(now())) return
    guardUntil = now() + ACTION_GUARD_MS
    confirmingEnd.value = true
  }

  function cancelEnd(): void {
    confirmingEnd.value = false
  }

  /** Ends the workout early. Returns false when the tap came too soon after the confirm opened. */
  function confirmEnd(): boolean {
    if (!confirmingEnd.value || guarded(now())) return false
    commit(null)
    return true
  }

  function dismissExpired(): void {
    expired.value = false
  }

  function stopTimer(): void {
    if (timer === null) return
    clearInterval(timer)
    timer = null
  }

  watch(
    () => state.value?.mode === 'rest',
    (resting) => {
      stopTimer()
      if (resting) timer = setInterval(refresh, DISPLAY_TICK_MS)
    },
    { immediate: true },
  )

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      visibleSince ??= now()
      refresh()
      syncWakeLock()
    } else {
      visibleSince = null
    }
  }

  syncWakeLock()
  armExpiry()
  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
  onBeforeUnmount(() => {
    releaseWakeLock()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopTimer()
    clearExpiryTimer()
  })

  return {
    view,
    restDurationMs,
    expired,
    confirmingEnd,
    start,
    finishSet,
    endRest,
    leave,
    askEnd,
    cancelEnd,
    confirmEnd,
    dismissExpired,
  }
}
