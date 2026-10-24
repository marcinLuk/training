/** What the app knows when it decides whether to apply a waiting service worker update. */
export interface UpdateState {
  /** A new service worker version is installed and waits to take control. */
  updateWaiting: boolean
  /** The plan list is on screen (not the plan editor). */
  planListShown: boolean
  /** A workout view is active: a set, a rest, the end screen or a restored workout. */
  workoutRunning: boolean
  /** The update was already applied once. */
  alreadyApplied: boolean
}

/**
 * An update reloads the page, so it is applied only when nothing is lost: the plan list is
 * on screen and no workout runs. At any other time it waits, and it is applied at most once.
 */
export function shouldApplyUpdate(state: UpdateState): boolean {
  return state.updateWaiting && state.planListShown && !state.workoutRunning && !state.alreadyApplied
}
