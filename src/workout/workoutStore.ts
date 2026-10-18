import { backupUnreadable, readRaw, removeRaw, writeRaw } from '../lib/storage'
import {
  WORKOUT_STATE_VERSION,
  type RestState,
  type SetStatus,
  type UndoEntry,
  type WorkoutExercise,
  type WorkoutMode,
  type WorkoutSet,
  type WorkoutState,
} from './engine'

export const WORKOUT_KEY = 'trening.workout.v1'
export const WORKOUT_CORRUPT_PREFIX = 'trening.workout.corrupt'

const MAX_SETS_PER_EXERCISE = 1000
const SET_STATUSES: readonly SetStatus[] = ['pending', 'done', 'skipped']
const MODES: readonly WorkoutMode[] = ['set', 'rest', 'finished']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIndex(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
}

function toExercise(value: unknown): WorkoutExercise | null {
  if (!isRecord(value)) return null
  const { name, sets, reps, restSeconds } = value
  if (
    typeof name !== 'string' ||
    typeof sets !== 'number' ||
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > MAX_SETS_PER_EXERCISE ||
    !isFiniteNumber(reps) ||
    !isFiniteNumber(restSeconds) ||
    restSeconds < 0
  ) {
    return null
  }
  return { name, sets, reps, restSeconds }
}

/** The flat set list must be exactly what the exercises expand to; only the statuses are free. */
function toSets(value: unknown, exercises: WorkoutExercise[]): WorkoutSet[] | null {
  if (!Array.isArray(value)) return null
  const sets: WorkoutSet[] = []
  for (const [exerciseIndex, exercise] of exercises.entries()) {
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
      const item: unknown = value[sets.length]
      if (!isRecord(item)) return null
      const status = item.status
      if (
        item.exerciseIndex !== exerciseIndex ||
        item.setNumber !== setNumber ||
        !SET_STATUSES.some((known) => known === status)
      ) {
        return null
      }
      sets.push({ exerciseIndex, setNumber, status: status as SetStatus })
    }
  }
  return sets.length === value.length ? sets : null
}

function toRest(value: unknown): RestState | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const { startedAt, durationMs } = value
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(durationMs) || durationMs <= 0) return undefined
  return { startedAt, durationMs }
}

function toUndoStack(value: unknown, setCount: number): UndoEntry[] | null {
  if (!Array.isArray(value)) return null
  const stack: UndoEntry[] = []
  for (const item of value) {
    if (!isRecord(item) || !isIndex(item.setIndex, setCount - 1)) return null
    if (item.kind !== 'done' && item.kind !== 'skipped') return null
    stack.push({ setIndex: item.setIndex, kind: item.kind })
  }
  return stack
}

/**
 * Validates a parsed value against the full workout shape and returns a fresh state, or null.
 * Besides the field types it checks what the engine guarantees: the cursor is inside the set
 * list, `rest` exists exactly in rest mode, and the mode is `finished` exactly when the cursor
 * is past the last set.
 */
export function parseWorkoutState(value: unknown): WorkoutState | null {
  if (!isRecord(value) || value.version !== WORKOUT_STATE_VERSION) return null
  const { planId, planName, exercises: rawExercises, cursor, mode, startedAt, lastActivityAt } = value
  if (typeof planId !== 'string' || typeof planName !== 'string' || !Array.isArray(rawExercises)) return null
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(lastActivityAt)) return null

  const exercises: WorkoutExercise[] = []
  for (const item of rawExercises) {
    const exercise = toExercise(item)
    if (exercise === null) return null
    exercises.push(exercise)
  }
  if (exercises.length === 0) return null

  const sets = toSets(value.sets, exercises)
  if (sets === null) return null
  if (!isIndex(cursor, sets.length)) return null
  const knownMode = MODES.find((candidate) => candidate === mode)
  if (knownMode === undefined) return null
  const rest = toRest(value.rest)
  if (rest === undefined) return null
  const undoStack = toUndoStack(value.undoStack, sets.length)
  if (undoStack === null) return null

  if ((knownMode === 'rest') !== (rest !== null)) return null
  if ((knownMode === 'finished') !== (cursor === sets.length)) return null

  return {
    version: WORKOUT_STATE_VERSION,
    planId,
    planName,
    exercises,
    sets,
    cursor,
    mode: knownMode,
    rest,
    undoStack,
    startedAt,
    lastActivityAt,
  }
}

/**
 * Stores the running workout. Returns false when the write failed; the workout then goes on in
 * memory and the caller does not need to react.
 */
export function saveWorkout(state: WorkoutState): boolean {
  return writeRaw(WORKOUT_KEY, JSON.stringify(state))
}

export function clearWorkout(): boolean {
  return removeRaw(WORKOUT_KEY)
}

/**
 * The stored workout, or null when there is none or it cannot be read. Never throws and never
 * touches the plans. Unreadable data is copied once to `trening.workout.corrupt.<timestamp>`
 * and the live key is then removed, so the next load does not copy it again. If the copy
 * fails, the live key stays and nothing is lost.
 */
export function loadWorkout(now: number): WorkoutState | null {
  const raw = readRaw(WORKOUT_KEY)
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = undefined
  }
  const state = parseWorkoutState(parsed)
  if (state !== null) return state
  if (backupUnreadable(WORKOUT_CORRUPT_PREFIX, raw, now)) removeRaw(WORKOUT_KEY)
  return null
}
