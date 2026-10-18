/**
 * The one place that reads the wall clock for the workout UI. Components and the workout
 * session call `now()`, so a test can move time with `vi.setSystemTime` without running timers.
 */
export function now(): number {
  return Date.now()
}
