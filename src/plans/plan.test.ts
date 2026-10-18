import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPS,
  DEFAULT_REST_SECONDS,
  DEFAULT_SETS,
  createExercise,
  createPlan,
  pluralPl,
  summarizePlan,
  validatePlan,
  type Exercise,
  type Plan,
} from './plan'

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return { ...createExercise(), name: 'Przysiady', ...overrides }
}

function plan(overrides: Partial<Plan> = {}): Plan {
  return { id: 'p1', name: 'Nogi', exercises: [exercise()], ...overrides }
}

describe('defaults', () => {
  it('a new exercise has 3 sets, 10 reps and 90 s rest', () => {
    const created = createExercise()
    expect(created.sets).toBe(3)
    expect(created.reps).toBe(10)
    expect(created.restSeconds).toBe(90)
    expect([DEFAULT_SETS, DEFAULT_REPS, DEFAULT_REST_SECONDS]).toEqual([3, 10, 90])
  })

  it('new exercises and plans get distinct ids', () => {
    expect(createExercise().id).not.toBe(createExercise().id)
    expect(createPlan().id).not.toBe(createPlan().id)
    expect(createPlan().exercises).toEqual([])
  })
})

describe('validatePlan', () => {
  it('accepts a valid plan', () => {
    expect(validatePlan(plan())).toEqual([])
  })

  it('rejects an empty or blank plan name with a Polish message', () => {
    expect(validatePlan(plan({ name: '   ' }))).toEqual([
      { path: 'name', message: 'Wpisz nazwę planu.' },
    ])
  })

  it('rejects a plan with no exercises', () => {
    expect(validatePlan(plan({ exercises: [] }))).toEqual([
      { path: 'exercises', message: 'Dodaj co najmniej jedno ćwiczenie.' },
    ])
  })

  it('rejects a blank exercise name and names the exercise position', () => {
    const errors = validatePlan(plan({ exercises: [exercise(), exercise({ name: ' ' })] }))
    expect(errors).toEqual([
      { path: 'exercises.1.name', message: 'Wpisz nazwę ćwiczenia 2.' },
    ])
  })

  it.each([
    ['sets', { sets: 0 }],
    ['sets', { sets: 21 }],
    ['sets', { sets: 2.5 }],
    ['sets', { sets: Number.NaN }],
    ['reps', { reps: 0 }],
    ['reps', { reps: 101 }],
    ['reps', { reps: 1.5 }],
    ['restSeconds', { restSeconds: -15 }],
    ['restSeconds', { restSeconds: 615 }],
    ['restSeconds', { restSeconds: 100 }],
    ['restSeconds', { restSeconds: 14 }],
    ['restSeconds', { restSeconds: 16 }],
    ['restSeconds', { restSeconds: 599 }],
    ['restSeconds', { restSeconds: 7.5 }],
  ])('rejects out-of-range or non-integer %s', (field, override) => {
    const errors = validatePlan(plan({ exercises: [exercise(override)] }))
    expect(errors.map((error) => error.path)).toEqual([`exercises.0.${field}`])
    expect(errors[0]?.message).toMatch(/^Ćwiczenie 1: ustaw /)
  })

  it('accepts the limits: sets 1 and 20, reps 1 and 100, rest 0 and 600', () => {
    expect(validatePlan(plan({ exercises: [exercise({ sets: 1, reps: 1, restSeconds: 0 })] }))).toEqual([])
    expect(
      validatePlan(plan({ exercises: [exercise({ sets: 20, reps: 100, restSeconds: 600 })] })),
    ).toEqual([])
  })

  it.each([15, 45, 75, 105, 585])('accepts a rest of %i s (an odd multiple of 15)', (restSeconds) => {
    expect(validatePlan(plan({ exercises: [exercise({ restSeconds })] }))).toEqual([])
  })

  it('reports every problem at once', () => {
    const errors = validatePlan(plan({ name: '', exercises: [exercise({ name: '', sets: 0 })] }))
    expect(errors.map((error) => error.path)).toEqual(['name', 'exercises.0.name', 'exercises.0.sets'])
  })
})

describe('Polish plural forms', () => {
  it.each([
    [1, 'ćwiczenie'],
    [2, 'ćwiczenia'],
    [4, 'ćwiczenia'],
    [5, 'ćwiczeń'],
    [12, 'ćwiczeń'],
    [14, 'ćwiczeń'],
    [22, 'ćwiczenia'],
    [0, 'ćwiczeń'],
    [11, 'ćwiczeń'],
    [21, 'ćwiczeń'],
    [31, 'ćwiczeń'],
    [101, 'ćwiczeń'],
    [102, 'ćwiczenia'],
    [103, 'ćwiczenia'],
    [104, 'ćwiczenia'],
    [111, 'ćwiczeń'],
    [112, 'ćwiczeń'],
    [113, 'ćwiczeń'],
    [114, 'ćwiczeń'],
    [122, 'ćwiczenia'],
  ])('%i -> %s', (count, expected) => {
    expect(pluralPl(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')).toBe(expected)
  })

  // Each row: sets per exercise, expected summary. The exercise word follows the exercise
  // count and the set word follows the TOTAL set count; the two forms differ in most rows.
  it.each<[number[], string]>([
    [[1], '1 ćwiczenie, 1 seria'],
    [[3], '1 ćwiczenie, 3 serie'],
    [[5], '1 ćwiczenie, 5 serii'],
    [[1, 1], '2 ćwiczenia, 2 serie'],
    [[3, 3], '2 ćwiczenia, 6 serii'],
    [[11, 11], '2 ćwiczenia, 22 serie'],
    [[1, 1, 1], '3 ćwiczenia, 3 serie'],
    [[4, 4, 4], '3 ćwiczenia, 12 serii'],
    [[1, 1, 1, 1, 1], '5 ćwiczeń, 5 serii'],
    [[1, 1, 1, 1, 1, 1, 1], '7 ćwiczeń, 7 serii'],
    [[4, 4, 4, 4, 4], '5 ćwiczeń, 20 serii'],
    [[5, 5, 5, 5, 4], '5 ćwiczeń, 24 serie'],
    [[5, 5, 5, 5, 2], '5 ćwiczeń, 22 serie'],
    [[5, 5, 5, 5, 1], '5 ćwiczeń, 21 serii'],
    [[3, 3, 3, 3, 3, 3, 3], '7 ćwiczeń, 21 serii'],
    [Array.from({ length: 22 }, () => 1), '22 ćwiczenia, 22 serie'],
    [Array.from({ length: 21 }, () => 1), '21 ćwiczeń, 21 serii'],
    [Array.from({ length: 12 }, () => 2), '12 ćwiczeń, 24 serie'],
    [Array.from({ length: 4 }, () => 1), '4 ćwiczenia, 4 serie'],
    [Array.from({ length: 4 }, () => 3), '4 ćwiczenia, 12 serii'],
  ])('summarises sets %j as "%s"', (sets, expected) => {
    const summary = summarizePlan(plan({ exercises: sets.map((count) => exercise({ sets: count })) }))
    expect(summary).toBe(expected)
  })
})
