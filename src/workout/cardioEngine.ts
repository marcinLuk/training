import { expandCardioPlan, type CardioPlan, type ExpandedInterval } from '../plans/plan'
import { IDLE_EXPIRY_MS } from './engine'

/**
 * Pure cardio session engine. No UI, no storage, no timers, no clock: every function takes
 * `now` (ms since epoch) and returns a NEW state or a computed view. The state is plain JSON so
 * it can be stored and validated on load.
 *
 * Everything is derived from timestamps. The session timeline runs from `startedAt`:
 * a get-ready of `GET_READY_MS`, then the intervals one after another. Time spent paused is
 * kept in `pausedTotalMs` and never counts, so the position on the timeline is
 * `now - startedAt - pausedTotalMs` (or `pausedAt` instead of `now` while paused).
 */

export const CARDIO_STATE_VERSION = 1

/** The get-ready that opens every session, before the first interval. */
export const GET_READY_MS = 3000

/** A countdown beep sounds this long before the end of an interval, once per entry. */
const COUNTDOWN_OFFSETS_MS = [3000, 2000, 1000]

/** An interval shorter than this has no countdown beeps. */
const MIN_COUNTDOWN_INTERVAL_MS = 4000

export type CardioIntervalKind = ExpandedInterval['kind']

export interface CardioState {
  version: 1
  kind: 'cardio'
  planId: string
  planName: string
  /** The plan after block repeats, in running order. */
  intervals: ExpandedInterval[]
  startedAt: number
  /** Set while the session is paused; the view is frozen at this moment. */
  pausedAt: number | null
  /** Total length of all earlier, finished pauses. */
  pausedTotalMs: number
  lastActivityAt: number
}

export type CardioPhase = 'get-ready' | 'work' | 'rest' | 'paused' | 'finished'

export interface CardioView {
  phase: CardioPhase
  planName: string
  /** Number of intervals after repeats ("Y" in "Interwał X z Y"). */
  intervalCount: number
  /** 0-based index of the current interval. Null in get-ready and when finished. */
  intervalIndex: number | null
  /** 1-based number of the current interval ("X"). Null in get-ready and when finished. */
  intervalNumber: number | null
  /** The current interval. Kept while paused (so the screen can still show its kind). */
  current: ExpandedInterval | null
  /** The interval after the current one. In get-ready it is the first interval. */
  next: ExpandedInterval | null
  /** True while the current interval is the last one ("To ostatni interwał"). */
  isLast: boolean
  /** The Clock: time left in the current interval, or in the get-ready. 0 when finished. */
  intervalRemainingMs: number
  /** Progress of the current interval, 0 to 1. 0 in get-ready, 1 when finished. */
  progress: number
  /** Razem: session time, without the get-ready and without pauses. */
  elapsedMs: number
  /** Zostało: time to the planned end of the last interval. */
  remainingMs: number
}

export type CardioCueType = 'countdown' | 'work-start' | 'rest-start'

export interface CardioCue {
  /** The planned time of the cue, ms since epoch. */
  at: number
  type: CardioCueType
}

export function startCardio(plan: CardioPlan, now: number): CardioState {
  return {
    version: CARDIO_STATE_VERSION,
    kind: 'cardio',
    planId: plan.id,
    planName: plan.name,
    intervals: expandCardioPlan(plan),
    startedAt: now,
    pausedAt: null,
    pausedTotalMs: 0,
    lastActivityAt: now,
  }
}

function totalIntervalsMs(state: CardioState): number {
  return state.intervals.reduce((sum, interval) => sum + interval.seconds * 1000, 0)
}

/** Position on the session timeline: 0 at `startedAt`, never counting paused time. */
function timelineMs(state: CardioState, now: number): number {
  const reference = state.pausedAt ?? now
  return Math.max(0, reference - state.startedAt - state.pausedTotalMs)
}

function isFinishedAt(state: CardioState, now: number): boolean {
  return timelineMs(state, now) >= GET_READY_MS + totalIntervalsMs(state)
}

/** Pausing a paused or finished session changes nothing. */
export function pauseCardio(state: CardioState, now: number): CardioState {
  if (state.pausedAt !== null || isFinishedAt(state, now)) return state
  return { ...state, pausedAt: now, lastActivityAt: now }
}

/** Resuming a running session changes nothing. The paused time is added to `pausedTotalMs`. */
export function resumeCardio(state: CardioState, now: number): CardioState {
  if (state.pausedAt === null) return state
  const pausedForMs = Math.max(0, now - state.pausedAt)
  return {
    ...state,
    pausedAt: null,
    pausedTotalMs: state.pausedTotalMs + pausedForMs,
    lastActivityAt: now,
  }
}

/** A session is expired only while paused for longer than `IDLE_EXPIRY_MS` (strictly). */
export function isCardioExpired(state: CardioState, now: number): boolean {
  return state.pausedAt !== null && now - state.pausedAt > IDLE_EXPIRY_MS
}

export function getCardioView(state: CardioState, now: number): CardioView {
  const { intervals } = state
  const totalMs = totalIntervalsMs(state)
  const position = timelineMs(state, now)
  const intervalCount = intervals.length
  const base = { planName: state.planName, intervalCount }

  if (position >= GET_READY_MS + totalMs) {
    return {
      ...base,
      phase: 'finished',
      intervalIndex: null,
      intervalNumber: null,
      current: null,
      next: null,
      isLast: false,
      intervalRemainingMs: 0,
      progress: 1,
      elapsedMs: totalMs,
      remainingMs: 0,
    }
  }

  if (position < GET_READY_MS) {
    return {
      ...base,
      phase: state.pausedAt !== null ? 'paused' : 'get-ready',
      intervalIndex: null,
      intervalNumber: null,
      current: null,
      next: intervals[0] ?? null,
      isLast: false,
      intervalRemainingMs: GET_READY_MS - position,
      progress: 0,
      elapsedMs: 0,
      remainingMs: totalMs,
    }
  }

  const elapsedMs = position - GET_READY_MS
  let intervalStartMs = 0
  let index = 0
  while (elapsedMs >= intervalStartMs + intervals[index].seconds * 1000) {
    intervalStartMs += intervals[index].seconds * 1000
    index += 1
  }
  const current = intervals[index]
  const durationMs = current.seconds * 1000
  const intoIntervalMs = elapsedMs - intervalStartMs
  return {
    ...base,
    phase: state.pausedAt !== null ? 'paused' : current.kind,
    intervalIndex: index,
    intervalNumber: index + 1,
    current,
    next: intervals[index + 1] ?? null,
    isLast: index === intervalCount - 1,
    intervalRemainingMs: durationMs - intoIntervalMs,
    progress: intoIntervalMs / durationMs,
    elapsedMs,
    remainingMs: totalMs - elapsedMs,
  }
}

function startCueType(next: ExpandedInterval | undefined): CardioCueType {
  return next?.kind === 'work' ? 'work-start' : 'rest-start'
}

/**
 * The sound cues whose planned time falls in `(fromMs, toMs]` (both ms since epoch), oldest first.
 *
 * - The get-ready has countdown beeps at 3, 2 and 1 s before its end.
 * - An interval of 4 s or longer has countdown beeps at 3, 2 and 1 s before its end.
 * - At the end of the get-ready and of every interval there is a `work-start` or `rest-start`
 *   cue, by the kind of the interval that follows. The end of the last interval gives `rest-start`.
 * - While the session is paused no cue falls after `pausedAt`.
 *
 * The state keeps only the total pause length, so every pause counts as earlier than every cue.
 * The caller must not start a window before the last resume: an earlier cue would move too.
 */
export function cardioCues(state: CardioState, fromMs: number, toMs: number): CardioCue[] {
  const originMs = state.startedAt + state.pausedTotalMs
  const upperMs = state.pausedAt === null ? toMs : Math.min(toMs, state.pausedAt)
  const cues: CardioCue[] = []

  const add = (timelineOffsetMs: number, type: CardioCueType): void => {
    const at = originMs + timelineOffsetMs
    if (at > fromMs && at <= upperMs) cues.push({ at, type })
  }

  for (const beforeEndMs of COUNTDOWN_OFFSETS_MS) {
    add(GET_READY_MS - beforeEndMs, 'countdown')
  }
  add(GET_READY_MS, startCueType(state.intervals[0]))

  let endMs = GET_READY_MS
  state.intervals.forEach((interval, index) => {
    const durationMs = interval.seconds * 1000
    endMs += durationMs
    if (durationMs >= MIN_COUNTDOWN_INTERVAL_MS) {
      for (const beforeEndMs of COUNTDOWN_OFFSETS_MS) {
        add(endMs - beforeEndMs, 'countdown')
      }
    }
    add(endMs, startCueType(state.intervals[index + 1]))
  })

  return cues
}
