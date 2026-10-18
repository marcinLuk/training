import type { Plan } from '../plans/plan'

/**
 * Pure workout engine. No UI, no storage, no timers, no clock: every function takes `now`
 * (ms since epoch) and returns a NEW state. The state is plain JSON (objects, arrays,
 * numbers, strings, null) so it can be stored and validated on load.
 *
 * Rest time comes from timestamps only: remaining = startedAt + durationMs - now.
 */

export const WORKOUT_STATE_VERSION = 1

/** A workout with no user action for longer than this is expired (strictly greater). */
export const IDLE_EXPIRY_MS = 2 * 60 * 60 * 1000

export type SetStatus = 'pending' | 'done' | 'skipped'
export type WorkoutMode = 'set' | 'rest' | 'finished'

export interface WorkoutExercise {
  name: string
  sets: number
  reps: number
  restSeconds: number
}

export interface WorkoutSet {
  exerciseIndex: number
  /** 1-based number of the set inside its exercise. */
  setNumber: number
  status: SetStatus
}

export interface RestState {
  startedAt: number
  durationMs: number
}

export interface UndoEntry {
  /** Index into `sets` of the set that was marked. */
  setIndex: number
  kind: 'done' | 'skipped'
}

export interface WorkoutState {
  version: 1
  planId: string
  planName: string
  exercises: WorkoutExercise[]
  sets: WorkoutSet[]
  /**
   * Index of the current set. In rest mode it points at the set that comes after the rest.
   * In finished mode it equals `sets.length`.
   */
  cursor: number
  mode: WorkoutMode
  rest: RestState | null
  undoStack: UndoEntry[]
  startedAt: number
  lastActivityAt: number
}

export interface RestNext {
  exerciseName: string
  setNumber: number
  setsInExercise: number
}

export interface WorkoutView {
  mode: WorkoutMode
  planName: string
  /** Current exercise (in rest: the exercise of the set that comes next). Null when finished. */
  exerciseName: string | null
  reps: number | null
  /** Pending sets of the current exercise, counting the current set. 0 when finished. */
  setsLeft: number
  /** Name of the exercise after the current one, or null when the current one is the last. */
  nextExerciseName: string | null
  isLastExercise: boolean
  isLastSet: boolean
  /** Remaining rest in ms, 0 outside a rest and never below 0. */
  restRemainingMs: number
  /** During a rest: the set that comes next. Null otherwise. */
  restNext: RestNext | null
  canUndo: boolean
}

const MAX_ABS_SET_COUNT = 1000

export function startWorkout(plan: Plan, now: number): WorkoutState {
  if (plan.exercises.length === 0) {
    throw new Error('Cannot start a workout from a plan with no exercises.')
  }
  const exercises: WorkoutExercise[] = plan.exercises.map((exercise) => {
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > MAX_ABS_SET_COUNT) {
      throw new Error('Cannot start a workout from an exercise with an invalid number of sets.')
    }
    return {
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
    }
  })
  const sets: WorkoutSet[] = []
  exercises.forEach((exercise, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      sets.push({ exerciseIndex, setNumber, status: 'pending' })
    }
  })
  return {
    version: WORKOUT_STATE_VERSION,
    planId: plan.id,
    planName: plan.name,
    exercises,
    sets,
    cursor: 0,
    mode: 'set',
    rest: null,
    undoStack: [],
    startedAt: now,
    lastActivityAt: now,
  }
}

function restRemaining(rest: RestState, now: number): number {
  return Math.min(rest.durationMs, Math.max(0, rest.startedAt + rest.durationMs - now))
}

export function getView(state: WorkoutState, now: number): WorkoutView {
  const canUndo = state.mode !== 'finished' && state.undoStack.length > 0
  const current = state.sets[state.cursor]
  if (state.mode === 'finished' || current === undefined) {
    return {
      mode: 'finished',
      planName: state.planName,
      exerciseName: null,
      reps: null,
      setsLeft: 0,
      nextExerciseName: null,
      isLastExercise: true,
      isLastSet: true,
      restRemainingMs: 0,
      restNext: null,
      canUndo: false,
    }
  }
  const exercise = state.exercises[current.exerciseIndex]!
  const next = state.exercises[current.exerciseIndex + 1]
  const setsLeft = state.sets.filter(
    (set) => set.exerciseIndex === current.exerciseIndex && set.status === 'pending',
  ).length
  const inRest = state.mode === 'rest' && state.rest !== null
  return {
    mode: state.mode,
    planName: state.planName,
    exerciseName: exercise.name,
    reps: exercise.reps,
    setsLeft,
    nextExerciseName: next === undefined ? null : next.name,
    isLastExercise: next === undefined,
    isLastSet: state.cursor === state.sets.length - 1,
    restRemainingMs: inRest ? restRemaining(state.rest!, now) : 0,
    restNext: inRest
      ? {
          exerciseName: exercise.name,
          setNumber: current.setNumber,
          setsInExercise: exercise.sets,
        }
      : null,
    canUndo,
  }
}

function withSetStatus(sets: WorkoutSet[], index: number, status: SetStatus): WorkoutSet[] {
  return sets.map((set, i) => (i === index ? { ...set, status } : set))
}

/** Marks the current set with `status` and moves on. Shared by completeSet and skipSet. */
function markCurrent(
  state: WorkoutState,
  status: 'done' | 'skipped',
  now: number,
  withRest: boolean,
): WorkoutState {
  if (state.mode !== 'set') return state
  const index = state.cursor
  const finishedSet = state.sets[index]
  if (finishedSet === undefined) return state
  const base = {
    ...state,
    sets: withSetStatus(state.sets, index, status),
    undoStack: [...state.undoStack, { setIndex: index, kind: status } satisfies UndoEntry],
    lastActivityAt: now,
  }
  if (index === state.sets.length - 1) {
    return { ...base, cursor: state.sets.length, mode: 'finished', rest: null }
  }
  const restSeconds = state.exercises[finishedSet.exerciseIndex]!.restSeconds
  if (withRest && restSeconds > 0) {
    return {
      ...base,
      cursor: index + 1,
      mode: 'rest',
      rest: { startedAt: now, durationMs: restSeconds * 1000 },
    }
  }
  return { ...base, cursor: index + 1, mode: 'set', rest: null }
}

export function completeSet(state: WorkoutState, now: number): WorkoutState {
  return markCurrent(state, 'done', now, true)
}

export function skipSet(state: WorkoutState, now: number): WorkoutState {
  return markCurrent(state, 'skipped', now, false)
}

/** Rest over -> set mode. Not a user action: `lastActivityAt` stays. Otherwise unchanged. */
export function resolveRest(state: WorkoutState, now: number): WorkoutState {
  if (state.mode !== 'rest' || state.rest === null) return state
  if (restRemaining(state.rest, now) > 0) return state
  return { ...state, mode: 'set', rest: null }
}

export function endRestEarly(state: WorkoutState, now: number): WorkoutState {
  if (state.mode !== 'rest') return state
  return { ...state, mode: 'set', rest: null, lastActivityAt: now }
}

export function undo(state: WorkoutState, now: number): WorkoutState {
  if (state.mode === 'finished' || state.undoStack.length === 0) return state
  const last = state.undoStack[state.undoStack.length - 1]!
  return {
    ...state,
    sets: withSetStatus(state.sets, last.setIndex, 'pending'),
    undoStack: state.undoStack.slice(0, -1),
    cursor: last.setIndex,
    mode: 'set',
    rest: null,
    lastActivityAt: now,
  }
}

/**
 * Moves the end of the rest by `deltaMs`. Only in rest mode. The remaining time never goes
 * below 0 and reaching 0 ends the rest. A rest that already ran out is ended, not extended.
 */
export function adjustRest(state: WorkoutState, deltaMs: number, now: number): WorkoutState {
  if (state.mode !== 'rest' || state.rest === null) return state
  const remaining = restRemaining(state.rest, now)
  const next = remaining === 0 ? 0 : Math.max(0, remaining + deltaMs)
  if (next === 0) {
    return { ...state, mode: 'set', rest: null, lastActivityAt: now }
  }
  return { ...state, rest: { startedAt: now, durationMs: next }, lastActivityAt: now }
}

export function isExpired(state: WorkoutState, now: number): boolean {
  return now - state.lastActivityAt > IDLE_EXPIRY_MS
}
