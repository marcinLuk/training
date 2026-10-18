import { computed, onBeforeUnmount, onMounted, shallowRef, ref, watch } from 'vue'
import { now } from '../lib/clock'
import type { Plan } from '../plans/plan'
import {
  completeSet,
  endRestEarly,
  getView,
  resolveRest,
  startWorkout,
  type WorkoutState,
  type WorkoutView,
} from './engine'
import { playRestEnd, unlockAudio } from './sound'

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
 * The running workout as UI state. Every state change goes through `commit`, so one place can
 * later save it. The time on screen always comes from `getView(state, now())`; the timer below
 * only asks for a new render.
 */
export function useWorkout() {
  const state = shallowRef<WorkoutState | null>(null)
  const clockMs = ref(now())
  const view = computed<WorkoutView | null>(() =>
    state.value === null ? null : getView(state.value, clockMs.value),
  )
  const restDurationMs = computed(() => state.value?.rest?.durationMs ?? 0)
  let timer: ReturnType<typeof setInterval> | null = null
  let guardUntil = 0
  /** When the page last became visible, or null while it is hidden. */
  let visibleSince: number | null = document.visibilityState === 'visible' ? now() : null

  function commit(next: WorkoutState | null): void {
    state.value = next
    guardUntil = now() + ACTION_GUARD_MS
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

  function start(plan: Plan): void {
    unlockAudio()
    const at = now()
    clockMs.value = at
    commit(startWorkout(plan, at))
  }

  function finishSet(): void {
    unlockAudio()
    const at = now()
    if (guarded(at)) return
    const current = settled(at)
    if (current !== null) commit(completeSet(current, at))
  }

  function endRest(): void {
    const at = now()
    if (guarded(at)) return
    const current = settled(at)
    if (current !== null) commit(endRestEarly(current, at))
  }

  /** Leaves the end screen. Returns false when the tap came too soon after the screen change. */
  function leave(): boolean {
    if (guarded(now())) return false
    commit(null)
    return true
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
    } else {
      visibleSince = null
    }
  }

  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopTimer()
  })

  return { view, restDurationMs, start, finishSet, endRest, leave }
}
