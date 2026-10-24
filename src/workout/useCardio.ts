import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { now } from '../lib/clock'
import type { CardioPlan } from '../plans/plan'
import {
  cardioCues,
  getCardioView,
  isCardioExpired,
  pauseCardio,
  resumeCardio,
  startCardio,
  type CardioCue,
  type CardioState,
  type CardioView,
} from './cardioEngine'
import { IDLE_EXPIRY_MS } from './engine'
import { playCountdownBeep, playRestStart, playWorkStart, unlockAudio } from './sound'
import { ACTION_GUARD_MS, DISPLAY_TICK_MS, SOUND_MAX_LATE_MS } from './useWorkout'
import { holdWakeLock, releaseWakeLock } from './wakeLock'
import {
  clearWorkout,
  isCardioState,
  loadStoredWorkout,
  saveWorkout,
  storedWorkoutKind,
} from './workoutStore'

/**
 * What a stored cardio session becomes at app start (decided from timestamps, never from ticks):
 * - a running session comes back PAUSED at the position it has now. If its planned end already
 *   passed, it stays as it is and the view is the end screen;
 * - a paused session stays paused, unless it has been paused for more than the idle limit: then
 *   it is removed and `expired` is true, so the plan list can show the strength expiry notice;
 * - a stored strength workout is not ours: nothing is restored and the key is left alone.
 * Restoring is not a user action. The paused state is saved again, so a second reload finds the
 * same position and not a later one.
 */
function restoreCardio(at: number): { state: CardioState | null; expired: boolean } {
  const stored = loadStoredWorkout(at)
  if (stored === null || !isCardioState(stored)) return { state: null, expired: false }
  if (isCardioExpired(stored, at)) {
    clearWorkout()
    return { state: null, expired: true }
  }
  const paused = pauseCardio(stored, at)
  if (paused !== stored) saveWorkout(paused)
  return { state: paused, expired: false }
}

/**
 * The running cardio session as UI state. Every state change goes through `commit`, which saves
 * it, so a reload returns to the same interval. The time on screen always comes from
 * `getCardioView(state, now())`: the render timer below only asks for a new render and counts
 * nothing, so a screen lock or an app switch cannot make the clock drift.
 *
 * Sounds: on each re-read of the clock the cues of `cardioCues` that fell since the last check
 * are played, but only while the page is visible, only if the page was already visible when the
 * cue fell, and only if the cue is at most SOUND_MAX_LATE_MS old. A cue that is missed is never
 * played later.
 *
 * One workout at a time: `start` returns false while the key holds any workout (strength or
 * cardio) or this session is open. The strength `start` replaces a strength workout, but a
 * second workout of the other kind would silently destroy the first one, so cardio never
 * starts over anything.
 *
 * Lock mode is not part of this session; it lives in memory in the screen.
 */
export function useCardio() {
  const restored = restoreCardio(now())
  const state = shallowRef<CardioState | null>(restored.state)
  /** True after a paused session expired; the plan list shows a notice until it is dismissed. */
  const expired = ref(restored.expired)
  /** True while the "Zakończyć trening?" confirm step is open. */
  const confirmingEnd = ref(false)
  const clockMs = ref(now())
  const view = computed<CardioView | null>(() =>
    state.value === null ? null : getCardioView(state.value, clockMs.value),
  )
  let timer: ReturnType<typeof setInterval> | null = null
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  // The restored screen is a screen change too: a tap in the first moments is not deliberate.
  let guardUntil = restored.state === null ? 0 : now() + ACTION_GUARD_MS
  /** When the page last became visible, or null while it is hidden. */
  let visibleSince: number | null = document.visibilityState === 'visible' ? now() : null
  /** Cues planned at or before this time were already played or missed. */
  let lastCheckedMs = now()

  /** True while the session is open and its planned end has not passed. */
  function isActive(at: number): boolean {
    return state.value !== null && getCardioView(state.value, at).phase !== 'finished'
  }

  /**
   * True while this composable holds the shared wake lock for its own session. The lock is one
   * module-level lock that the strength workout uses too, so cardio releases it only when it
   * took it itself.
   */
  let ownsWakeLock = false

  /** The screen stays on while a session runs or is paused; the end screen no longer needs it. */
  function syncWakeLock(): void {
    if (isActive(now())) {
      ownsWakeLock = true
      holdWakeLock()
    } else if (ownsWakeLock) {
      ownsWakeLock = false
      releaseWakeLock()
    }
  }

  /** Saves a new state. Every change is a screen change, so the tap guard starts again. */
  function commit(next: CardioState | null): void {
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
   * While a session is paused, one timeout fires just after the idle limit so a session left
   * paused on the screen still expires. It only asks for a check; `refresh` decides from the
   * timestamps. A running session never expires, so it arms nothing.
   */
  function armExpiry(): void {
    clearExpiryTimer()
    const current = state.value
    if (current === null || current.pausedAt === null) return
    const delay = Math.max(0, current.pausedAt + IDLE_EXPIRY_MS + 1 - now())
    expiryTimer = setTimeout(() => {
      expiryTimer = null
      refresh()
      armExpiry()
    }, delay)
  }

  /** Removes a session that is paused past the idle limit, like the expiry at app start. */
  function expireIfIdle(at: number): boolean {
    const current = state.value
    if (current === null || !isCardioExpired(current, at)) return false
    expired.value = true
    commit(null)
    return true
  }

  /** True while a tap is too close to the last screen change to be a deliberate new tap. */
  function guarded(at: number): boolean {
    return at < guardUntil
  }

  function playCue(cue: CardioCue): void {
    if (cue.type === 'countdown') playCountdownBeep()
    else if (cue.type === 'work-start') playWorkStart()
    else playRestStart()
  }

  /**
   * Plays the cues that fell in `(lastCheckedMs, at]`. A cue sounds only when the page is
   * visible now, was visible when the cue fell, and the cue is at most SOUND_MAX_LATE_MS old.
   * The window then moves to `at` for good, so a missed cue is never replayed.
   */
  function playDueCues(current: CardioState, at: number): void {
    const cues = cardioCues(current, lastCheckedMs, at)
    lastCheckedMs = Math.max(lastCheckedMs, at)
    if (document.visibilityState !== 'visible' || visibleSince === null) return
    for (const cue of cues) {
      if (visibleSince <= cue.at && at - cue.at <= SOUND_MAX_LATE_MS) playCue(cue)
    }
  }

  /** Re-read the clock: expire an idle pause, play the cues that are due, update the wake lock. */
  function refresh(): void {
    const current = state.value
    const at = now()
    clockMs.value = at
    if (current === null) return
    if (expireIfIdle(at)) return
    playDueCues(current, at)
    syncWakeLock()
  }

  /**
   * Starts a session. Returns false when the tap came too soon after a screen change, or when
   * another workout exists. The first sound window starts one ms before `startedAt`: the first
   * get-ready beep falls exactly at `startedAt` and a window is open at its start, so without
   * that the user would hear 2 beeps and not 3.
   */
  function start(plan: CardioPlan): boolean {
    const at = now()
    if (guarded(at) || state.value !== null || storedWorkoutKind() !== null) return false
    unlockAudio()
    clockMs.value = at
    expired.value = false
    lastCheckedMs = at - 1
    commit(startCardio(plan, at))
    refresh()
    return true
  }

  /** Pauses the session. Cues that are due up to this tap sound first. */
  function pause(): void {
    const at = now()
    if (expireIfIdle(at) || guarded(at)) return
    refresh()
    const current = state.value
    if (current === null) return
    const paused = pauseCardio(current, at)
    if (paused !== current) commit(paused)
  }

  /**
   * Continues a paused session. The engine keeps only the total pause length, so the sound
   * window restarts at the resume time: a cue that already sounded must not come back at a
   * shifted time.
   */
  function resume(): void {
    const at = now()
    if (expireIfIdle(at) || guarded(at)) return
    const current = state.value
    if (current === null || current.pausedAt === null) return
    unlockAudio()
    clockMs.value = at
    lastCheckedMs = at
    commit(resumeCardio(current, at))
  }

  /** Leaves the end screen. Returns false when the tap came too soon after the screen change. */
  function leave(): boolean {
    if (guarded(now())) return false
    commit(null)
    return true
  }

  /** Opens the confirm step. The session goes on underneath unchanged. */
  function askEnd(): void {
    const at = now()
    if (state.value === null || !isActive(at)) return
    if (expireIfIdle(at) || guarded(at)) return
    guardUntil = at + ACTION_GUARD_MS
    confirmingEnd.value = true
  }

  function cancelEnd(): void {
    confirmingEnd.value = false
  }

  /** Ends the session early. Returns false when the tap came too soon after the confirm opened. */
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
    () => state.value !== null && state.value.pausedAt === null && view.value?.phase !== 'finished',
    (running) => {
      stopTimer()
      if (running) timer = setInterval(refresh, DISPLAY_TICK_MS)
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
    if (ownsWakeLock) {
      ownsWakeLock = false
      releaseWakeLock()
    }
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopTimer()
    clearExpiryTimer()
  })

  return {
    view,
    expired,
    confirmingEnd,
    start,
    pause,
    resume,
    leave,
    askEnd,
    cancelEnd,
    confirmEnd,
    dismissExpired,
  }
}
