import { formatRest } from './format'

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  restSeconds: number
}

export interface Plan {
  /** Absent in plans stored before the cardio module; a plan with no `type` is strength. */
  type?: 'strength'
  id: string
  name: string
  exercises: Exercise[]
}

export type IntervalKind = 'work' | 'rest'

export interface CardioInterval {
  id: string
  name: string
  seconds: number
  kind: IntervalKind
}

export interface CardioBlock {
  id: string
  repeat: number
  intervals: CardioInterval[]
}

export interface CardioPlan {
  type: 'cardio'
  id: string
  name: string
  blocks: CardioBlock[]
}

/** Any plan the app stores: strength (`Plan`) or cardio. */
export type AnyPlan = Plan | CardioPlan

/** One step of a cardio session after the block repeats are applied. */
export interface ExpandedInterval {
  name: string
  seconds: number
  kind: IntervalKind
}

export const DEFAULT_SETS = 3
export const DEFAULT_REPS = 10
export const DEFAULT_REST_SECONDS = 90

export const LIMITS = {
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 100 },
  rest: { min: 0, max: 600, step: 15 },
} as const

export const CARDIO_LIMITS = {
  repeat: { min: 1, max: 20 },
  seconds: { min: 5, max: 3600, step: 5 },
} as const

export const DEFAULT_REPEAT = 8
export const DEFAULT_INTERVAL_SECONDS = 30

/** The default interval name is the Polish word for its type. */
export const INTERVAL_KIND_NAMES: Record<IntervalKind, string> = {
  work: 'Praca',
  rest: 'Odpoczynek',
}

export interface ValidationError {
  /**
   * Where the error belongs. Strength: `name`, `exercises`, `exercises.<index>.name|sets|reps|restSeconds`.
   * Cardio: `name`, `blocks`, `blocks.<b>.repeat`, `blocks.<b>.intervals`,
   * `blocks.<b>.intervals.<i>.name|seconds`.
   */
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

export function isCardioPlan(plan: AnyPlan): plan is CardioPlan {
  return plan.type === 'cardio'
}

export function createInterval(kind: IntervalKind): CardioInterval {
  return {
    id: crypto.randomUUID(),
    name: INTERVAL_KIND_NAMES[kind],
    seconds: DEFAULT_INTERVAL_SECONDS,
    kind,
  }
}

/** A block of "Praca" and "Odpoczynek", repeated the default number of times. */
export function createBlock(): CardioBlock {
  return {
    id: crypto.randomUUID(),
    repeat: DEFAULT_REPEAT,
    intervals: [createInterval('work'), createInterval('rest')],
  }
}

export function createCardioPlan(): CardioPlan {
  return { type: 'cardio', id: newPlanId(), name: '', blocks: [createBlock()] }
}

/** A deep copy, so an editor can change values without touching the stored list. */
export function clonePlan(plan: Plan): Plan
export function clonePlan(plan: CardioPlan): CardioPlan
export function clonePlan(plan: AnyPlan): AnyPlan
export function clonePlan(plan: AnyPlan): AnyPlan {
  if (isCardioPlan(plan)) {
    return {
      type: 'cardio',
      id: plan.id,
      name: plan.name,
      blocks: plan.blocks.map((block) => ({
        ...block,
        intervals: block.intervals.map((interval) => ({ ...interval })),
      })),
    }
  }
  return {
    ...(plan.type === undefined ? {} : { type: plan.type }),
    id: plan.id,
    name: plan.name,
    exercises: plan.exercises.map((exercise) => ({ ...exercise })),
  }
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

function isValidIntervalSeconds(value: unknown): boolean {
  return (
    isIntegerInRange(value, CARDIO_LIMITS.seconds.min, CARDIO_LIMITS.seconds.max) &&
    (value as number) % CARDIO_LIMITS.seconds.step === 0
  )
}

function validateCardioPlan(plan: CardioPlan): ValidationError[] {
  const errors: ValidationError[] = []

  if (plan.name.trim() === '') {
    errors.push({ path: 'name', message: 'Wpisz nazwę planu.' })
  }

  if (plan.blocks.length === 0) {
    errors.push({ path: 'blocks', message: 'Dodaj co najmniej jeden blok.' })
  }

  plan.blocks.forEach((block, blockIndex) => {
    const blockPosition = blockIndex + 1
    const blockPath = `blocks.${blockIndex}`

    if (!isIntegerInRange(block.repeat, CARDIO_LIMITS.repeat.min, CARDIO_LIMITS.repeat.max)) {
      errors.push({
        path: `${blockPath}.repeat`,
        message: `Blok ${blockPosition}: ustaw powtórzenia od ${CARDIO_LIMITS.repeat.min} do ${CARDIO_LIMITS.repeat.max}.`,
      })
    }
    if (block.intervals.length === 0) {
      errors.push({
        path: `${blockPath}.intervals`,
        message: `Blok ${blockPosition}: dodaj co najmniej jeden interwał.`,
      })
    }

    block.intervals.forEach((interval, intervalIndex) => {
      const intervalPosition = intervalIndex + 1
      const intervalPath = `${blockPath}.intervals.${intervalIndex}`

      if (interval.name.trim() === '') {
        errors.push({
          path: `${intervalPath}.name`,
          message: `Blok ${blockPosition}: wpisz nazwę interwału ${intervalPosition}.`,
        })
      }
      if (!isValidIntervalSeconds(interval.seconds)) {
        errors.push({
          path: `${intervalPath}.seconds`,
          message: `Blok ${blockPosition}, interwał ${intervalPosition}: ustaw czas od ${CARDIO_LIMITS.seconds.min} do ${CARDIO_LIMITS.seconds.max} s, co ${CARDIO_LIMITS.seconds.step} s.`,
        })
      }
    })
  })

  return errors
}

export function validatePlan(plan: AnyPlan): ValidationError[] {
  if (isCardioPlan(plan)) return validateCardioPlan(plan)

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

/** The intervals of a cardio plan in running order, with every block repeated. */
export function expandCardioPlan(plan: CardioPlan): ExpandedInterval[] {
  return plan.blocks.flatMap((block) =>
    Array.from({ length: block.repeat }, () =>
      block.intervals.map(({ name, seconds, kind }) => ({ name, seconds, kind })),
    ).flat(),
  )
}

function summarizeCardioPlan(plan: CardioPlan): string {
  const intervals = expandCardioPlan(plan)
  const totalSeconds = intervals.reduce((total, interval) => total + interval.seconds, 0)
  const word = pluralPl(intervals.length, 'interwał', 'interwały', 'interwałów')
  return `${intervals.length} ${word}, ${formatRest(totalSeconds)}`
}

/** Plan card summary, for example "2 ćwiczenia, 6 serii" or "16 interwałów, 8:00". */
export function summarizePlan(plan: AnyPlan): string {
  if (isCardioPlan(plan)) return summarizeCardioPlan(plan)
  const exerciseCount = plan.exercises.length
  const setCount = plan.exercises.reduce((total, exercise) => total + exercise.sets, 0)
  const exercises = pluralPl(exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')
  const sets = pluralPl(setCount, 'seria', 'serie', 'serii')
  return `${exerciseCount} ${exercises}, ${setCount} ${sets}`
}
