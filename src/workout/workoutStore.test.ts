import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plan } from '../plans/plan'
import { PLANS_KEY, listPlans, savePlan } from '../plans/planStore'
import { completeSet, skipSet, startWorkout, type WorkoutState } from './engine'
import {
  WORKOUT_CORRUPT_PREFIX,
  WORKOUT_KEY,
  clearWorkout,
  loadWorkout,
  parseWorkoutState,
  saveWorkout,
} from './workoutStore'

const T0 = 1_000_000

const PLAN: Plan = {
  id: 'plan-1',
  name: 'Push',
  exercises: [
    { id: 'e1', name: 'Wyciskanie', sets: 3, reps: 8, restSeconds: 90 },
    { id: 'e2', name: 'Rozpiętki', sets: 2, reps: 12, restSeconds: 30 },
  ],
}

function midSet(): WorkoutState {
  return skipSet(completeSet(startWorkout(PLAN, T0), T0 + 1_000), T0 + 2_000)
}

function midRest(): WorkoutState {
  return completeSet(startWorkout(PLAN, T0), T0 + 1_000)
}

function finished(): WorkoutState {
  let state = startWorkout(PLAN, T0)
  for (let i = 0; i < 5; i += 1) state = skipSet(state, T0 + i)
  return state
}

function corruptKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(`${WORKOUT_CORRUPT_PREFIX}.`))
}

/** The state the engine writes, as a plain object that a test can damage. */
function damaged(base: WorkoutState, change: (draft: Record<string, unknown>) => void): string {
  const draft = JSON.parse(JSON.stringify(base)) as Record<string, unknown>
  change(draft)
  return JSON.stringify(draft)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saving and loading', () => {
  it.each([
    ['mid-set', midSet],
    ['mid-rest', midRest],
    ['finished', finished],
  ])('reads back exactly what was saved (%s)', (_name, make) => {
    const state = make()
    expect(saveWorkout(state)).toBe(true)
    expect(loadWorkout(T0 + 5_000)).toEqual(state)
  })

  it('stores the state under trening.workout.v1', () => {
    saveWorkout(midRest())
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY)!)).toEqual(midRest())
  })

  it('returns null when nothing is stored', () => {
    expect(loadWorkout(T0)).toBeNull()
    expect(corruptKeys()).toEqual([])
  })

  it('clearWorkout removes the key', () => {
    saveWorkout(midSet())
    expect(clearWorkout()).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('does not throw when the write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(saveWorkout(midSet())).toBe(false)
  })
})

describe('unreadable data', () => {
  const fixtures: Array<[string, () => string]> = [
    ['invalid JSON', () => '{"version":1,'],
    ['a JSON array', () => '[]'],
    ['null', () => 'null'],
    ['another version', () => damaged(midSet(), (d) => (d.version = 2))],
    ['the old version 0', () => damaged(midSet(), (d) => (d.version = 0))],
    ['a missing plan id', () => damaged(midSet(), (d) => delete d.planId)],
    ['a plan name that is a number', () => damaged(midSet(), (d) => (d.planName = 5))],
    ['no exercises', () => damaged(midSet(), (d) => (d.exercises = []))],
    [
      'an exercise with a text rest',
      () => damaged(midSet(), (d) => ((d.exercises as Array<Record<string, unknown>>)[0]!.restSeconds = '90')),
    ],
    ['a sets list that does not match the exercises', () => damaged(midSet(), (d) => (d.sets = (d.sets as unknown[]).slice(1)))],
    [
      'a set with an unknown status',
      () => damaged(midSet(), (d) => ((d.sets as Array<Record<string, unknown>>)[0]!.status = 'maybe')),
    ],
    ['a negative cursor', () => damaged(midSet(), (d) => (d.cursor = -1))],
    ['a cursor past the end', () => damaged(midSet(), (d) => (d.cursor = 6))],
    ['a fractional cursor', () => damaged(midSet(), (d) => (d.cursor = 1.5))],
    ['an unknown mode', () => damaged(midSet(), (d) => (d.mode = 'paused'))],
    ['rest mode with no rest', () => damaged(midRest(), (d) => (d.rest = null))],
    ['set mode with a rest', () => damaged(midRest(), (d) => (d.mode = 'set'))],
    ['a rest with a text start', () => damaged(midRest(), (d) => ((d.rest as Record<string, unknown>).startedAt = 'now'))],
    ['finished mode with the cursor inside', () => damaged(finished(), (d) => (d.cursor = 4))],
    ['the cursor at the end in set mode', () => damaged(finished(), (d) => (d.mode = 'set'))],
    ['an undo entry out of range', () => damaged(midSet(), (d) => (d.undoStack = [{ setIndex: 99, kind: 'done' }]))],
    ['an undo entry of an unknown kind', () => damaged(midSet(), (d) => (d.undoStack = [{ setIndex: 0, kind: 'undone' }]))],
    ['a text last activity', () => damaged(midSet(), (d) => (d.lastActivityAt = 'yesterday'))],
  ]

  it.each(fixtures)('treats %s as no workout, keeps a copy and leaves the plans alone', (_name, make) => {
    expect(savePlan(PLAN).ok).toBe(true)
    const plansBefore = localStorage.getItem(PLANS_KEY)
    const raw = make()
    localStorage.setItem(WORKOUT_KEY, raw)

    expect(loadWorkout(T0 + 7)).toBeNull()

    expect(localStorage.getItem(`${WORKOUT_CORRUPT_PREFIX}.${T0 + 7}`)).toBe(raw)
    expect(localStorage.getItem(PLANS_KEY)).toBe(plansBefore)
    expect(listPlans()).toEqual([PLAN])
  })

  it('copies unreadable data once and removes the live key, so the next load copies nothing', () => {
    localStorage.setItem(WORKOUT_KEY, 'broken')
    expect(loadWorkout(T0)).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(corruptKeys()).toHaveLength(1)
    expect(loadWorkout(T0 + 10)).toBeNull()
    expect(corruptKeys()).toHaveLength(1)
  })

  it('keeps the live key when the copy cannot be written', () => {
    localStorage.setItem(WORKOUT_KEY, 'broken')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(loadWorkout(T0)).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe('broken')
  })

  it('does not throw when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(loadWorkout(T0)).toBeNull()
  })

  it('accepts the engine output of every mode (control for the fixtures above)', () => {
    for (const make of [midSet, midRest, finished]) {
      expect(parseWorkoutState(JSON.parse(JSON.stringify(make())))).toEqual(make())
    }
  })
})
