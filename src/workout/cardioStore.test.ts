import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardioPlan, Plan } from '../plans/plan'
import { PLANS_KEY, listPlans, savePlan } from '../plans/planStore'
import { pauseCardio, resumeCardio, startCardio, type CardioState } from './cardioEngine'
import { startWorkout } from './engine'
import {
  WORKOUT_CORRUPT_PREFIX,
  WORKOUT_KEY,
  clearWorkout,
  isCardioState,
  loadStoredWorkout,
  loadWorkout,
  parseCardioState,
  parseStoredWorkout,
  parseWorkoutState,
  saveWorkout,
  storedWorkoutKind,
} from './workoutStore'

const T0 = 1_000_000

const CARDIO_PLAN: CardioPlan = {
  type: 'cardio',
  id: 'cardio-1',
  name: 'Bieg z rozgrzewką',
  blocks: [
    {
      id: 'b1',
      repeat: 2,
      intervals: [
        { id: 'i1', name: 'Praca', seconds: 30, kind: 'work' },
        { id: 'i2', name: 'Odpoczynek', seconds: 20, kind: 'rest' },
      ],
    },
  ],
}

const STRENGTH_PLAN: Plan = {
  id: 'plan-1',
  name: 'Push',
  exercises: [{ id: 'e1', name: 'Wyciskanie', sets: 2, reps: 8, restSeconds: 90 }],
}

/** A strength workout exactly as the app stored it before the cardio module: no `kind`. */
const OLD_STRENGTH_JSON = JSON.stringify({
  version: 1,
  planId: 'plan-1',
  planName: 'Push',
  exercises: [{ name: 'Wyciskanie', sets: 2, reps: 8, restSeconds: 90 }],
  sets: [
    { exerciseIndex: 0, setNumber: 1, status: 'done' },
    { exerciseIndex: 0, setNumber: 2, status: 'pending' },
  ],
  cursor: 1,
  mode: 'rest',
  rest: { startedAt: 1_000_500, durationMs: 90_000 },
  undoStack: [{ setIndex: 0, kind: 'done' }],
  startedAt: 1_000_000,
  lastActivityAt: 1_000_500,
})

function running(): CardioState {
  return startCardio(CARDIO_PLAN, T0)
}

function paused(): CardioState {
  return pauseCardio(running(), T0 + 10_000)
}

function resumedAfterPause(): CardioState {
  return resumeCardio(paused(), T0 + 25_000)
}

function corruptKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(`${WORKOUT_CORRUPT_PREFIX}.`))
}

function damaged(base: CardioState, change: (draft: Record<string, unknown>) => void): string {
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

describe('a cardio state in the workout key', () => {
  it.each([
    ['running', running],
    ['paused', paused],
    ['resumed after a pause', resumedAfterPause],
  ])('reads back exactly what was saved (%s)', (_name, make) => {
    const state = make()
    expect(saveWorkout(state)).toBe(true)
    expect(loadStoredWorkout(T0 + 5_000)).toEqual(state)
  })

  it('uses the same key as the strength workout', () => {
    saveWorkout(running())
    expect(WORKOUT_KEY).toBe('trening.workout.v1')
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY)!)).toEqual(running())
    expect(JSON.parse(localStorage.getItem(WORKOUT_KEY)!)).toMatchObject({ kind: 'cardio' })
  })

  it('tells a cardio state from a strength state', () => {
    expect(isCardioState(running())).toBe(true)
    expect(isCardioState(startWorkout(STRENGTH_PLAN, T0))).toBe(false)
  })

  it('clearWorkout removes a cardio state too', () => {
    saveWorkout(running())
    expect(clearWorkout()).toBe(true)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
  })

  it('leaves a valid cardio state alone when the strength loader reads the key', () => {
    saveWorkout(paused())
    const raw = localStorage.getItem(WORKOUT_KEY)
    expect(loadWorkout(T0 + 5)).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
    expect(corruptKeys()).toEqual([])
  })

  it('copies unreadable cardio data once, keeps the plans and removes the live key', () => {
    expect(savePlan(STRENGTH_PLAN).ok).toBe(true)
    const plansBefore = localStorage.getItem(PLANS_KEY)
    localStorage.setItem(WORKOUT_KEY, '{"kind":"cardio","version":1,')
    expect(loadStoredWorkout(T0 + 7)).toBeNull()
    expect(localStorage.getItem(`${WORKOUT_CORRUPT_PREFIX}.${T0 + 7}`)).toBe('{"kind":"cardio","version":1,')
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(localStorage.getItem(PLANS_KEY)).toBe(plansBefore)
    expect(listPlans()).toEqual([STRENGTH_PLAN])
    expect(loadStoredWorkout(T0 + 10)).toBeNull()
    expect(corruptKeys()).toHaveLength(1)
  })

  it('keeps the live key when the copy of unreadable cardio data cannot be written', () => {
    localStorage.setItem(WORKOUT_KEY, damaged(running(), (d) => (d.intervals = [])))
    const raw = localStorage.getItem(WORKOUT_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(loadStoredWorkout(T0)).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe(raw)
  })
})

describe('unreadable cardio data', () => {
  const fixtures: Array<[string, () => string]> = [
    ['another version', () => damaged(running(), (d) => (d.version = 2))],
    ['a missing plan id', () => damaged(running(), (d) => delete d.planId)],
    ['a plan name that is a number', () => damaged(running(), (d) => (d.planName = 5))],
    ['no intervals', () => damaged(running(), (d) => (d.intervals = []))],
    ['intervals that are not a list', () => damaged(running(), (d) => (d.intervals = 'x'))],
    [
      'an interval of 0 s',
      () => damaged(running(), (d) => ((d.intervals as Array<Record<string, unknown>>)[0]!.seconds = 0)),
    ],
    [
      'an interval with a text length',
      () => damaged(running(), (d) => ((d.intervals as Array<Record<string, unknown>>)[0]!.seconds = '30')),
    ],
    [
      'an interval of an unknown kind',
      () => damaged(running(), (d) => ((d.intervals as Array<Record<string, unknown>>)[0]!.kind = 'jog')),
    ],
    [
      'an interval with no name',
      () => damaged(running(), (d) => delete (d.intervals as Array<Record<string, unknown>>)[0]!.name),
    ],
    ['an interval that is not an object', () => damaged(running(), (d) => (d.intervals = [3]))],
    ['a text start time', () => damaged(running(), (d) => (d.startedAt = 'now'))],
    ['a text pause time', () => damaged(paused(), (d) => (d.pausedAt = 'now'))],
    ['a missing pause time', () => damaged(running(), (d) => delete d.pausedAt)],
    ['a negative paused total', () => damaged(running(), (d) => (d.pausedTotalMs = -1))],
    ['a text paused total', () => damaged(running(), (d) => (d.pausedTotalMs = '0'))],
    ['a text last activity', () => damaged(running(), (d) => (d.lastActivityAt = 'yesterday'))],
    [
      'a cardio kind on a strength shape',
      () => JSON.stringify({ ...(JSON.parse(OLD_STRENGTH_JSON) as Record<string, unknown>), kind: 'cardio' }),
    ],
  ]

  it.each(fixtures)('treats %s as no workout and keeps a copy (like an unreadable strength value)', (_name, make) => {
    expect(savePlan(STRENGTH_PLAN).ok).toBe(true)
    const plansBefore = localStorage.getItem(PLANS_KEY)
    const raw = make()
    localStorage.setItem(WORKOUT_KEY, raw)

    expect(loadStoredWorkout(T0 + 7)).toBeNull()

    expect(localStorage.getItem(`${WORKOUT_CORRUPT_PREFIX}.${T0 + 7}`)).toBe(raw)
    expect(localStorage.getItem(WORKOUT_KEY)).toBeNull()
    expect(localStorage.getItem(PLANS_KEY)).toBe(plansBefore)
    expect(listPlans()).toEqual([STRENGTH_PLAN])
  })

  it('accepts the engine output of every pause state (control for the fixtures above)', () => {
    for (const make of [running, paused, resumedAfterPause]) {
      expect(parseCardioState(JSON.parse(JSON.stringify(make())))).toEqual(make())
    }
  })
})

describe('the strength workout in the same key', () => {
  it('parses an old-shape stored workout (no kind) exactly as before', () => {
    const expected = JSON.parse(OLD_STRENGTH_JSON) as Record<string, unknown>
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    const state = loadWorkout(T0)
    expect(state).toEqual(expected)
    expect(loadStoredWorkout(T0)).toEqual(state)
    expect(parseStoredWorkout(JSON.parse(OLD_STRENGTH_JSON))).toEqual(parseWorkoutState(JSON.parse(OLD_STRENGTH_JSON)))
    expect(corruptKeys()).toEqual([])
  })

  it('does not read a strength value as cardio', () => {
    expect(parseCardioState(JSON.parse(OLD_STRENGTH_JSON))).toBeNull()
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    const stored = loadStoredWorkout(T0)
    expect(stored).not.toBeNull()
    expect(isCardioState(stored!)).toBe(false)
  })

  it('still copies an unreadable strength value', () => {
    localStorage.setItem(WORKOUT_KEY, '{"version":1,')
    expect(loadStoredWorkout(T0 + 3)).toBeNull()
    expect(localStorage.getItem(`${WORKOUT_CORRUPT_PREFIX}.${T0 + 3}`)).toBe('{"version":1,')
  })

  it('saves a strength state through the widened saveWorkout', () => {
    const state = startWorkout(STRENGTH_PLAN, T0)
    expect(saveWorkout(state)).toBe(true)
    expect(loadWorkout(T0)).toEqual(state)
  })
})

describe('storedWorkoutKind', () => {
  it('is null when nothing is stored', () => {
    expect(storedWorkoutKind()).toBeNull()
  })

  it('reports cardio and strength', () => {
    saveWorkout(running())
    expect(storedWorkoutKind()).toBe('cardio')
    localStorage.setItem(WORKOUT_KEY, OLD_STRENGTH_JSON)
    expect(storedWorkoutKind()).toBe('strength')
  })

  it('is null for unreadable data and changes nothing', () => {
    localStorage.setItem(WORKOUT_KEY, 'broken')
    expect(storedWorkoutKind()).toBeNull()
    expect(localStorage.getItem(WORKOUT_KEY)).toBe('broken')
    expect(corruptKeys()).toEqual([])
  })

  it('does not throw when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(storedWorkoutKind()).toBeNull()
  })
})
