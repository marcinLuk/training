export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  restSeconds: number
}

export interface Plan {
  id: string
  name: string
  exercises: Exercise[]
}

export const DEFAULT_SETS = 3
export const DEFAULT_REPS = 10
export const DEFAULT_REST_SECONDS = 90

export const LIMITS = {
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 100 },
  rest: { min: 0, max: 600, step: 15 },
} as const

export interface ValidationError {
  /** Where the error belongs: `name`, `exercises`, `exercises.<index>.name|sets|reps|restSeconds`. */
  path: string
  /** Polish text that names the fix. */
  message: string
}

export function newExerciseId(): string {
  return crypto.randomUUID()
}

export function newPlanId(): string {
  return crypto.randomUUID()
}

export function createExercise(): Exercise {
  return {
    id: newExerciseId(),
    name: '',
    sets: DEFAULT_SETS,
    reps: DEFAULT_REPS,
    restSeconds: DEFAULT_REST_SECONDS,
  }
}

export function createPlan(): Plan {
  return { id: newPlanId(), name: '', exercises: [] }
}

function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isValidRest(value: unknown): boolean {
  return (
    isIntegerInRange(value, LIMITS.rest.min, LIMITS.rest.max) &&
    (value as number) % LIMITS.rest.step === 0
  )
}

export function validatePlan(plan: Plan): ValidationError[] {
  const errors: ValidationError[] = []

  if (plan.name.trim() === '') {
    errors.push({ path: 'name', message: 'Wpisz nazwę planu.' })
  }

  if (plan.exercises.length === 0) {
    errors.push({ path: 'exercises', message: 'Dodaj co najmniej jedno ćwiczenie.' })
  }

  plan.exercises.forEach((exercise, index) => {
    const position = index + 1
    const base = `exercises.${index}`

    if (exercise.name.trim() === '') {
      errors.push({
        path: `${base}.name`,
        message: `Wpisz nazwę ćwiczenia ${position}.`,
      })
    }
    if (!isIntegerInRange(exercise.sets, LIMITS.sets.min, LIMITS.sets.max)) {
      errors.push({
        path: `${base}.sets`,
        message: `Ćwiczenie ${position}: ustaw liczbę serii od ${LIMITS.sets.min} do ${LIMITS.sets.max}.`,
      })
    }
    if (!isIntegerInRange(exercise.reps, LIMITS.reps.min, LIMITS.reps.max)) {
      errors.push({
        path: `${base}.reps`,
        message: `Ćwiczenie ${position}: ustaw liczbę powtórzeń od ${LIMITS.reps.min} do ${LIMITS.reps.max}.`,
      })
    }
    if (!isValidRest(exercise.restSeconds)) {
      errors.push({
        path: `${base}.restSeconds`,
        message: `Ćwiczenie ${position}: ustaw przerwę od ${LIMITS.rest.min} do ${LIMITS.rest.max} s, co ${LIMITS.rest.step} s.`,
      })
    }
  })

  return errors
}

/** Polish plural: 1 -> one, 2-4 (not 12-14) -> few, everything else -> many. */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return few
  }
  return many
}

/** Plan card summary, for example "2 ćwiczenia, 6 serii". */
export function summarizePlan(plan: Plan): string {
  const exerciseCount = plan.exercises.length
  const setCount = plan.exercises.reduce((total, exercise) => total + exercise.sets, 0)
  const exercises = pluralPl(exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')
  const sets = pluralPl(setCount, 'seria', 'serie', 'serii')
  return `${exerciseCount} ${exercises}, ${setCount} ${sets}`
}
