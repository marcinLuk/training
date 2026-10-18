import { describe, expect, it } from 'vitest'
import type { Plan } from '../plans/plan'
import {
  IDLE_EXPIRY_MS,
  adjustRest,
  completeSet,
  endRestEarly,
  getView,
  isExpired,
  resolveRest,
  skipSet,
  startWorkout,
  undo,
  type WorkoutState,
} from './engine'

const T0 = 1_000_000

function makePlan(): Plan {
  return {
    id: 'plan-1',
    name: 'Push',
    exercises: [
      { id: 'e1', name: 'Wyciskanie', sets: 3, reps: 8, restSeconds: 90 },
      { id: 'e2', name: 'Rozpiętki', sets: 2, reps: 12, restSeconds: 30 },
      { id: 'e3', name: 'Plank', sets: 1, reps: 1, restSeconds: 0 },
    ],
  }
}

/** Plan with different rest times so "finished vs next exercise" is visible. */
function twoExercisePlan(restA: number, restB: number, setsA = 1, setsB = 1): Plan {
  return {
    id: 'p',
    name: 'Mini',
    exercises: [
      { id: 'a', name: 'A', sets: setsA, reps: 5, restSeconds: restA },
      { id: 'b', name: 'B', sets: setsB, reps: 6, restSeconds: restB },
    ],
  }
}

function start(plan: Plan = makePlan()): WorkoutState {
  return startWorkout(plan, T0)
}

describe('startWorkout', () => {
  it('builds the flat set list in plan order, pending, cursor 0, set mode', () => {
    const state = start()
    expect(state.version).toBe(1)
    expect(state.planId).toBe('plan-1')
    expect(state.planName).toBe('Push')
    expect(state.sets.map((s) => [s.exerciseIndex, s.setNumber, s.status])).toEqual([
      [0, 1, 'pending'],
      [0, 2, 'pending'],
      [0, 3, 'pending'],
      [1, 1, 'pending'],
      [1, 2, 'pending'],
      [2, 1, 'pending'],
    ])
    expect(state.cursor).toBe(0)
    expect(state.mode).toBe('set')
    expect(state.rest).toBeNull()
    expect(state.undoStack).toEqual([])
    expect(state.startedAt).toBe(T0)
    expect(state.lastActivityAt).toBe(T0)
  })

  it('throws for a plan with no exercises', () => {
    expect(() => startWorkout({ id: 'x', name: 'Pusty', exercises: [] }, T0)).toThrow()
  })

  it('throws for an exercise with zero sets', () => {
    const plan = makePlan()
    plan.exercises[1]!.sets = 0
    expect(() => startWorkout(plan, T0)).toThrow()
  })

  it('takes a deep copy: mutating the source plan afterwards does not change the state', () => {
    const plan = makePlan()
    const state = startWorkout(plan, T0)
    const before = JSON.stringify(state)
    plan.name = 'Zmieniony'
    plan.exercises[0]!.name = 'Inne'
    plan.exercises[0]!.reps = 99
    plan.exercises[0]!.restSeconds = 600
    plan.exercises[0]!.sets = 20
    plan.exercises.pop()
    plan.exercises[1]!.name = 'Też inne'
    expect(JSON.stringify(state)).toBe(before)
    const view = getView(state, T0)
    expect(view.exerciseName).toBe('Wyciskanie')
    expect(view.reps).toBe(8)
    expect(view.setsLeft).toBe(3)
    expect(view.planName).toBe('Push')
  })

  it('does not alias the plan exercise objects', () => {
    const plan = makePlan()
    const state = startWorkout(plan, T0)
    expect(state.exercises[0]).not.toBe(plan.exercises[0])
  })

  it('state survives a JSON round trip unchanged', () => {
    let state = completeSet(start(), T0 + 10)
    state = skipSet(resolveRest(state, T0 + 1_000_000), T0 + 1_000_001)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})

describe('getView', () => {
  it('shows the first set: name, reps, sets left, next exercise', () => {
    const view = getView(start(), T0)
    expect(view).toMatchObject({
      mode: 'set',
      exerciseName: 'Wyciskanie',
      reps: 8,
      setsLeft: 3,
      nextExerciseName: 'Rozpiętki',
      isLastExercise: false,
      isLastSet: false,
      restRemainingMs: 0,
      restNext: null,
      canUndo: false,
    })
  })

  it('counts sets left of the current exercise including the current set', () => {
    let state = start()
    state = resolveRest(completeSet(state, T0), T0 + 90_000)
    expect(getView(state, T0 + 90_000).setsLeft).toBe(2)
    state = resolveRest(completeSet(state, T0 + 90_000), T0 + 200_000)
    expect(getView(state, T0 + 200_000).setsLeft).toBe(1)
  })

  it('does not count a skipped set as left', () => {
    let state = start()
    state = skipSet(state, T0 + 1)
    expect(getView(state, T0 + 1).setsLeft).toBe(2)
    state = skipSet(state, T0 + 2)
    expect(getView(state, T0 + 2).setsLeft).toBe(1)
  })

  it('does not count a done set as left', () => {
    const state = endRestEarly(completeSet(start(), T0 + 1), T0 + 2)
    expect(getView(state, T0 + 2).setsLeft).toBe(2)
  })

  it('moves to the next exercise and resets sets left', () => {
    let state = start()
    state = skipSet(skipSet(skipSet(state, T0 + 1), T0 + 2), T0 + 3)
    const view = getView(state, T0 + 3)
    expect(view.exerciseName).toBe('Rozpiętki')
    expect(view.reps).toBe(12)
    expect(view.setsLeft).toBe(2)
    expect(view.nextExerciseName).toBe('Plank')
    expect(view.isLastExercise).toBe(false)
  })

  it('flags the last exercise (no next name) and the last set of the plan', () => {
    let state = start()
    for (let i = 0; i < 5; i += 1) state = skipSet(state, T0 + 1 + i)
    const view = getView(state, T0 + 10)
    expect(view.exerciseName).toBe('Plank')
    expect(view.nextExerciseName).toBeNull()
    expect(view.isLastExercise).toBe(true)
    expect(view.isLastSet).toBe(true)
  })

  it('does not flag the last set on the first set of a last exercise with more sets', () => {
    let state = skipSet(start(twoExercisePlan(0, 0, 1, 2)), T0 + 1)
    let view = getView(state, T0 + 10)
    expect(view.exerciseName).toBe('B')
    expect(view.isLastExercise).toBe(true)
    expect(view.isLastSet).toBe(false)
    state = skipSet(state, T0 + 11)
    view = getView(state, T0 + 20)
    expect(view.isLastExercise).toBe(true)
    expect(view.isLastSet).toBe(true)
  })

  it('during a rest shows the next set and exercise', () => {
    const state = completeSet(start(twoExercisePlan(30, 60, 2, 1)), T0)
    expect(getView(state, T0).restNext).toEqual({
      exerciseName: 'A',
      setNumber: 2,
      setsInExercise: 2,
    })
    const crossing = completeSet(start(twoExercisePlan(30, 60, 1, 2)), T0)
    expect(getView(crossing, T0).restNext).toEqual({
      exerciseName: 'B',
      setNumber: 1,
      setsInExercise: 2,
    })
  })

  it('reports canUndo only when there is something to undo', () => {
    const state = start()
    expect(getView(state, T0).canUndo).toBe(false)
    expect(getView(skipSet(state, T0 + 1), T0 + 1).canUndo).toBe(true)
  })

  it('finished view has no exercise and no sets left', () => {
    const state = skipSet(start(twoExercisePlan(0, 0)), T0 + 1)
    const done = skipSet(state, T0 + 2)
    const view = getView(done, T0 + 2)
    expect(view.mode).toBe('finished')
    expect(view.exerciseName).toBeNull()
    expect(view.setsLeft).toBe(0)
    expect(view.canUndo).toBe(false)
    expect(view.planName).toBe('Mini')
  })
})

describe('completeSet and rest', () => {
  it('"done" starts a rest with the rest time of the FINISHED exercise', () => {
    // A rests 30 s, B rests 90 s. Finishing A's last set must give 30 s, not 90 s.
    const state = completeSet(start(twoExercisePlan(30, 90)), T0 + 500)
    expect(state.mode).toBe('rest')
    expect(state.rest).toEqual({ startedAt: T0 + 500, durationMs: 30_000 })
    expect(state.sets[0]!.status).toBe('done')
    expect(state.cursor).toBe(1)
    expect(getView(state, T0 + 500).restRemainingMs).toBe(30_000)
  })

  it('uses the finished exercise rest also when the next exercise has none', () => {
    const state = completeSet(start(twoExercisePlan(45, 0)), T0)
    expect(state.rest?.durationMs).toBe(45_000)
  })

  it('a 0 s rest goes straight to the next set with no rest', () => {
    const state = completeSet(start(twoExercisePlan(0, 90, 2, 1)), T0 + 5)
    expect(state.mode).toBe('set')
    expect(state.rest).toBeNull()
    expect(state.cursor).toBe(1)
    expect(state.sets[0]!.status).toBe('done')
    expect(state.lastActivityAt).toBe(T0 + 5)
    expect(getView(state, T0 + 5).restRemainingMs).toBe(0)
  })

  it('the last set of the plan finishes the workout with no rest, even with a rest time', () => {
    let state = completeSet(start(twoExercisePlan(30, 90)), T0)
    state = endRestEarly(state, T0 + 1)
    state = completeSet(state, T0 + 2)
    expect(state.mode).toBe('finished')
    expect(state.cursor).toBe(state.sets.length)
    expect(state.rest).toBeNull()
    expect(state.sets.every((s) => s.status === 'done')).toBe(true)
    expect(getView(state, T0 + 2).mode).toBe('finished')
  })

  it('does nothing when called during a rest or after the end', () => {
    const resting = completeSet(start(), T0)
    expect(completeSet(resting, T0 + 1)).toEqual(resting)
    const finished = skipSet(skipSet(start(twoExercisePlan(0, 0)), T0), T0 + 1)
    expect(completeSet(finished, T0 + 2)).toEqual(finished)
  })

  it('remaining rest follows the clock with no calls in between (hidden tab)', () => {
    const state = completeSet(start(), T0)
    expect(getView(state, T0).restRemainingMs).toBe(90_000)
    expect(getView(state, T0 + 30_000).restRemainingMs).toBe(60_000)
    // The clock jumps far ahead without any tick: the answer still comes from timestamps.
    expect(getView(state, T0 + 89_999).restRemainingMs).toBe(1)
    expect(getView(state, T0 + 10_000_000).restRemainingMs).toBe(0)
  })

  it('gives the same answer however many times getView is called', () => {
    const state = completeSet(start(), T0)
    for (let i = 0; i < 500; i += 1) getView(state, T0 + 20_000)
    expect(getView(state, T0 + 20_000).restRemainingMs).toBe(70_000)
    expect(getView(state, T0 + 20_000).restRemainingMs).toBe(70_000)
    // An earlier now still gives the earlier answer: no hidden counter.
    expect(getView(state, T0 + 10_000).restRemainingMs).toBe(80_000)
  })

  it('resolveRest leaves a running rest unchanged (same content)', () => {
    const state = completeSet(start(), T0)
    expect(resolveRest(state, T0 + 89_999)).toEqual(state)
    expect(resolveRest(state, T0 + 89_999).mode).toBe('rest')
  })

  it('resolveRest returns to set mode exactly when the rest ends', () => {
    const state = completeSet(start(), T0)
    const ended = resolveRest(state, T0 + 90_000)
    expect(ended.mode).toBe('set')
    expect(ended.rest).toBeNull()
    expect(ended.cursor).toBe(state.cursor)
    expect(getView(ended, T0 + 90_000).restRemainingMs).toBe(0)
    expect(resolveRest(state, T0 + 50_000_000).mode).toBe('set')
  })

  it('resolveRest does NOT update lastActivityAt', () => {
    const state = completeSet(start(), T0 + 100)
    const ended = resolveRest(state, T0 + 100 + 90_000)
    expect(ended.lastActivityAt).toBe(T0 + 100)
  })

  it('resolveRest is a no-op in set mode', () => {
    const state = start()
    expect(resolveRest(state, T0 + 999)).toEqual(state)
  })

  it('endRestEarly returns to set mode and stamps lastActivityAt', () => {
    const state = completeSet(start(), T0)
    const next = endRestEarly(state, T0 + 5_000)
    expect(next.mode).toBe('set')
    expect(next.rest).toBeNull()
    expect(next.cursor).toBe(1)
    expect(next.lastActivityAt).toBe(T0 + 5_000)
  })

  it('endRestEarly outside a rest changes nothing', () => {
    const state = start()
    expect(endRestEarly(state, T0 + 5)).toEqual(state)
  })
})

describe('skipSet', () => {
  it('marks skipped, moves on, starts no rest, stamps lastActivityAt', () => {
    const state = skipSet(start(), T0 + 7)
    expect(state.sets[0]!.status).toBe('skipped')
    expect(state.cursor).toBe(1)
    expect(state.mode).toBe('set')
    expect(state.rest).toBeNull()
    expect(state.lastActivityAt).toBe(T0 + 7)
  })

  it('skipping the last set finishes the workout', () => {
    let state = start(twoExercisePlan(0, 0))
    state = skipSet(state, T0 + 1)
    state = skipSet(state, T0 + 2)
    expect(state.mode).toBe('finished')
    expect(state.cursor).toBe(state.sets.length)
    expect(state.rest).toBeNull()
  })

  it('does nothing during a rest', () => {
    const resting = completeSet(start(), T0)
    expect(skipSet(resting, T0 + 1)).toEqual(resting)
  })
})

describe('undo', () => {
  it('after "done": cursor back, set pending, rest cleared, set mode', () => {
    const resting = completeSet(start(), T0)
    expect(resting.mode).toBe('rest')
    const back = undo(resting, T0 + 3_000)
    expect(back.cursor).toBe(0)
    expect(back.sets[0]!.status).toBe('pending')
    expect(back.rest).toBeNull()
    expect(back.mode).toBe('set')
    expect(back.undoStack).toEqual([])
    expect(back.lastActivityAt).toBe(T0 + 3_000)
    expect(getView(back, T0 + 3_000).restRemainingMs).toBe(0)
  })

  it('after "done" with 0 s rest: back to that set', () => {
    const state = completeSet(start(twoExercisePlan(0, 0, 2, 1)), T0)
    const back = undo(state, T0 + 1)
    expect(back.cursor).toBe(0)
    expect(back.sets[0]!.status).toBe('pending')
  })

  it('after "skip": cursor back and the set is pending again', () => {
    const skipped = skipSet(start(), T0 + 1)
    const back = undo(skipped, T0 + 2)
    expect(back.cursor).toBe(0)
    expect(back.sets[0]!.status).toBe('pending')
    expect(back.mode).toBe('set')
  })

  it('sets left goes back up after undo', () => {
    const state = skipSet(start(), T0 + 1)
    expect(getView(state, T0 + 1).setsLeft).toBe(2)
    expect(getView(undo(state, T0 + 2), T0 + 2).setsLeft).toBe(3)
    const done = endRestEarly(completeSet(start(), T0), T0 + 1)
    expect(getView(done, T0 + 1).setsLeft).toBe(2)
    expect(getView(undo(done, T0 + 2), T0 + 2).setsLeft).toBe(3)
  })

  it('undoes more than one step, newest first', () => {
    let state = start()
    state = skipSet(state, T0 + 1)
    state = skipSet(state, T0 + 2)
    state = undo(state, T0 + 3)
    expect(state.cursor).toBe(1)
    expect(state.sets[1]!.status).toBe('pending')
    expect(state.sets[0]!.status).toBe('skipped')
    state = undo(state, T0 + 4)
    expect(state.cursor).toBe(0)
    expect(state.sets[0]!.status).toBe('pending')
  })

  it('from the next set after an ended rest, goes back to the done set', () => {
    let state = completeSet(start(), T0)
    state = resolveRest(state, T0 + 90_000)
    const back = undo(state, T0 + 91_000)
    expect(back.cursor).toBe(0)
    expect(back.sets[0]!.status).toBe('pending')
  })

  it('is a no-op with an empty stack', () => {
    const state = start()
    expect(undo(state, T0 + 50)).toEqual(state)
    expect(undo(state, T0 + 50).lastActivityAt).toBe(T0)
  })

  it('is a no-op when the workout is finished', () => {
    const finished = skipSet(skipSet(start(twoExercisePlan(0, 0)), T0 + 1), T0 + 2)
    expect(finished.mode).toBe('finished')
    const result = undo(finished, T0 + 3)
    expect(result).toEqual(finished)
    expect(result.mode).toBe('finished')
  })
})

describe('adjustRest', () => {
  it('+15 s adds to the remaining rest', () => {
    const state = completeSet(start(), T0)
    const longer = adjustRest(state, 15_000, T0 + 10_000)
    expect(getView(longer, T0 + 10_000).restRemainingMs).toBe(95_000)
    expect(getView(longer, T0 + 20_000).restRemainingMs).toBe(85_000)
    expect(longer.lastActivityAt).toBe(T0 + 10_000)
  })

  it('-15 s removes from the remaining rest', () => {
    const state = completeSet(start(), T0)
    const shorter = adjustRest(state, -15_000, T0 + 10_000)
    expect(getView(shorter, T0 + 10_000).restRemainingMs).toBe(65_000)
    expect(shorter.mode).toBe('rest')
  })

  it('clamps at zero and ends the rest when the remaining time would go below 0', () => {
    const state = completeSet(start(twoExercisePlan(30, 30)), T0)
    const result = adjustRest(state, -15_000, T0 + 20_000) // 10 s left, -15 s
    expect(result.mode).toBe('set')
    expect(result.rest).toBeNull()
    expect(result.lastActivityAt).toBe(T0 + 20_000)
    expect(getView(result, T0 + 20_000).restRemainingMs).toBe(0)
  })

  it('never shows a rest longer than the one set when the clock moves back', () => {
    const state = completeSet(start(twoExercisePlan(30, 30)), T0)
    expect(getView(state, T0 - 5_000).restRemainingMs).toBe(30_000)
  })

  it('reaching exactly 0 ends the rest', () => {
    const state = completeSet(start(twoExercisePlan(30, 30)), T0)
    const result = adjustRest(state, -15_000, T0 + 15_000) // 15 s left, -15 s
    expect(result.mode).toBe('set')
    expect(result.rest).toBeNull()
  })

  it('never leaves a negative remaining time after repeated -15 s', () => {
    let state = completeSet(start(twoExercisePlan(45, 45)), T0)
    for (let i = 0; i < 5; i += 1) state = adjustRest(state, -15_000, T0 + 1)
    expect(state.mode).toBe('set')
    expect(getView(state, T0 + 1).restRemainingMs).toBe(0)
    expect(state.rest).toBeNull()
  })

  it('a rest that already ran out is ended, not extended', () => {
    const state = completeSet(start(twoExercisePlan(30, 30)), T0)
    const result = adjustRest(state, 15_000, T0 + 40_000)
    expect(result.mode).toBe('set')
    expect(result.rest).toBeNull()
  })

  it('does nothing outside a rest', () => {
    const state = start()
    expect(adjustRest(state, 15_000, T0 + 1)).toEqual(state)
    expect(adjustRest(state, -15_000, T0 + 1).lastActivityAt).toBe(T0)
  })
})

describe('isExpired and lastActivityAt', () => {
  it('exports the 2 h constant', () => {
    expect(IDLE_EXPIRY_MS).toBe(7_200_000)
  })

  it('is not expired exactly at 2 h, expired 1 ms later (strictly greater)', () => {
    const state = start()
    expect(isExpired(state, T0)).toBe(false)
    expect(isExpired(state, T0 + 7_200_000 - 1)).toBe(false)
    expect(isExpired(state, T0 + 7_200_000)).toBe(false)
    expect(isExpired(state, T0 + 7_200_001)).toBe(true)
  })

  it('every user action moves lastActivityAt to now, so expiry restarts', () => {
    const base = start()
    const later = T0 + 5_000
    expect(completeSet(base, later).lastActivityAt).toBe(later)
    expect(skipSet(base, later).lastActivityAt).toBe(later)
    const resting = completeSet(base, T0 + 1)
    expect(endRestEarly(resting, later).lastActivityAt).toBe(later)
    expect(adjustRest(resting, 15_000, later).lastActivityAt).toBe(later)
    expect(undo(skipSet(base, T0 + 1), later).lastActivityAt).toBe(later)
    expect(isExpired(completeSet(base, T0 + 7_000_000), T0 + 7_000_000 + 7_200_000)).toBe(false)
  })

  it('the rest ending by itself does not keep the workout alive', () => {
    const resting = completeSet(start(), T0)
    const ended = resolveRest(resting, T0 + 90_000)
    expect(ended.lastActivityAt).toBe(T0)
    expect(isExpired(ended, T0 + 7_200_001)).toBe(true)
  })
})

describe('immutability', () => {
  it('no function mutates its input state', () => {
    const resting = completeSet(start(), T0)
    const set = start()
    const finished = skipSet(skipSet(start(twoExercisePlan(0, 0)), T0), T0 + 1)
    const states = [resting, set, finished, skipSet(set, T0 + 1)]
    const snapshots = states.map((s) => JSON.stringify(s))
    for (const s of states) {
      completeSet(s, T0 + 100)
      skipSet(s, T0 + 100)
      undo(s, T0 + 100)
      endRestEarly(s, T0 + 100)
      adjustRest(s, 15_000, T0 + 100)
      adjustRest(s, -15_000, T0 + 100)
      resolveRest(s, T0 + 10_000_000)
    }
    expect(states.map((s) => JSON.stringify(s))).toEqual(snapshots)
  })

  it('returns a new object for a changing action', () => {
    const state = start()
    expect(completeSet(state, T0 + 1)).not.toBe(state)
    expect(skipSet(state, T0 + 1)).not.toBe(state)
  })
})

describe('full run', () => {
  it('walks 2 exercises x 2 sets to the end', () => {
    const plan = twoExercisePlan(15, 15, 2, 2)
    let state = startWorkout(plan, T0)
    let now = T0
    const seen: string[] = []
    while (state.mode !== 'finished') {
      const view = getView(state, now)
      seen.push(`${view.exerciseName}:${view.setsLeft}`)
      state = completeSet(state, now)
      now += 15_000
      state = resolveRest(state, now)
    }
    expect(seen).toEqual(['A:2', 'A:1', 'B:2', 'B:1'])
    expect(state.rest).toBeNull()
  })
})
