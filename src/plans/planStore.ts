import { backupUnreadable, readRaw, writeRaw } from '../lib/storage'
import { validatePlan, type Exercise, type Plan } from './plan'

export const PLANS_KEY = 'trening.plans.v1'
export const PLANS_CORRUPT_PREFIX = 'trening.plans.corrupt'
const PLANS_VERSION = 1

interface PlansDocument {
  version: typeof PLANS_VERSION
  plans: Plan[]
}

interface ReadResult {
  plans: Plan[]
  /** True when the stored value held something this version could not read. */
  unreadable: boolean
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'backup-failed' | 'write-failed' }

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: 'backup-failed' | 'write-failed' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toExercise(value: unknown): Exercise | null {
  if (!isRecord(value)) return null
  const { id, name, sets, reps, restSeconds } = value
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof sets !== 'number' ||
    typeof reps !== 'number' ||
    typeof restSeconds !== 'number'
  ) {
    return null
  }
  return { id, name, sets, reps, restSeconds }
}

function toPlan(value: unknown): Plan | null {
  if (!isRecord(value)) return null
  const { id, name, exercises } = value
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || !Array.isArray(exercises)) {
    return null
  }
  const parsed: Exercise[] = []
  for (const item of exercises) {
    const exercise = toExercise(item)
    if (exercise === null) return null
    parsed.push(exercise)
  }
  const plan: Plan = { id, name, exercises: parsed }
  return validatePlan(plan).length === 0 ? plan : null
}

function readStored(): ReadResult {
  const raw = readRaw(PLANS_KEY)
  if (raw === null) return { plans: [], unreadable: false }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { plans: [], unreadable: true }
  }
  if (!isRecord(parsed) || parsed.version !== PLANS_VERSION || !Array.isArray(parsed.plans)) {
    return { plans: [], unreadable: true }
  }

  const plans: Plan[] = []
  let unreadable = false
  for (const item of parsed.plans) {
    const plan = toPlan(item)
    if (plan === null) {
      unreadable = true
    } else {
      plans.push(plan)
    }
  }
  return { plans, unreadable }
}

/** All saved plans. Never throws; missing or unreadable data gives what could be read. */
export function listPlans(): Plan[] {
  return readStored().plans
}

export function getPlan(id: string): Plan | undefined {
  return readStored().plans.find((plan) => plan.id === id)
}

let persistRequested = false

/**
 * Ask the browser once per page load to keep the data, at the first
 * successful save. A missing API, a throw or a rejection changes nothing.
 */
function requestPersistOnce(): void {
  if (persistRequested) return
  persistRequested = true
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') return
    void Promise.resolve(navigator.storage.persist()).catch(() => undefined)
  } catch {
    // Persistence is a best effort request; the save already succeeded.
  }
}

function writePlans(plans: Plan[]): boolean {
  const document: PlansDocument = { version: PLANS_VERSION, plans }
  return writeRaw(PLANS_KEY, JSON.stringify(document))
}

/** Copy unreadable stored data aside before a write over it. False means: do not write. */
function backupIfUnreadable(stored: ReadResult, now: number): boolean {
  if (!stored.unreadable) return true
  const raw = readRaw(PLANS_KEY)
  return raw === null || backupUnreadable(PLANS_CORRUPT_PREFIX, raw, now)
}

/**
 * Insert a plan, or replace the plan with the same id. Unreadable stored data
 * is copied to `trening.plans.corrupt.<timestamp>` first. If that copy fails,
 * nothing is written.
 */
export function savePlan(plan: Plan, now: number = Date.now()): SaveResult {
  if (validatePlan(plan).length > 0) return { ok: false, reason: 'invalid' }

  const stored = readStored()
  if (!backupIfUnreadable(stored, now)) return { ok: false, reason: 'backup-failed' }

  const clean: Plan = {
    id: plan.id,
    name: plan.name.trim(),
    exercises: plan.exercises.map((exercise) => ({ ...exercise, name: exercise.name.trim() })),
  }
  const index = stored.plans.findIndex((item) => item.id === clean.id)
  const plans = [...stored.plans]
  if (index === -1) {
    plans.push(clean)
  } else {
    plans[index] = clean
  }

  if (!writePlans(plans)) return { ok: false, reason: 'write-failed' }
  requestPersistOnce()
  return { ok: true }
}

/**
 * Remove the plan with this id. An unknown id is a no-op that writes nothing. The other plans are
 * written back as they were read; unreadable stored data is copied aside first, like in
 * `savePlan`, and a failed copy means no write. Never touches the running workout.
 */
export function deletePlan(id: string, now: number = Date.now()): DeleteResult {
  const stored = readStored()
  if (!stored.plans.some((plan) => plan.id === id)) return { ok: true }
  if (!backupIfUnreadable(stored, now)) return { ok: false, reason: 'backup-failed' }

  const plans = stored.plans.filter((plan) => plan.id !== id)
  return writePlans(plans) ? { ok: true } : { ok: false, reason: 'write-failed' }
}
