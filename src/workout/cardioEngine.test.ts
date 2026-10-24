import { describe, expect, it } from 'vitest'
import type { CardioPlan } from '../plans/plan'
import {
  GET_READY_MS,
  cardioCues,
  getCardioView,
  isCardioExpired,
  pauseCardio,
  resumeCardio,
  startCardio,
  type CardioCue,
  type CardioState,
} from './cardioEngine'
import { IDLE_EXPIRY_MS } from './engine'

const T0 = 1_000_000

function makePlan(
  intervals: { name: string; seconds: number; kind: 'work' | 'rest' }[],
): CardioPlan {
  return {
    type: 'cardio',
    id: 'cardio-1',
    name: 'Bieg',
    blocks: [
      {
        id: 'b1',
        repeat: 1,
        intervals: intervals.map((interval, i) => ({ id: `i${i}`, ...interval })),
      },
    ],
  }
}

/**
 * Timeline after the 3 s get-ready (offsets from T0, ms):
 *   get-ready  0 - 3000
 *   Bieg   work 10 s  3000 - 13000
 *   Marsz  rest  5 s 13000 - 18000
 *   Sprint work 20 s 18000 - 38000   (planned end at 38000, 35 s in all)
 */
function makeState(): CardioState {
  return startCardio(
    makePlan([
      { name: 'Bieg', seconds: 10, kind: 'work' },
      { name: 'Marsz', seconds: 5, kind: 'rest' },
      { name: 'Sprint', seconds: 20, kind: 'work' },
    ]),
    T0,
  )
}

function cues(list: CardioCue[]): [number, string][] {
  return list.map((cue) => [cue.at - T0, cue.type])
}

describe('constants', () => {
  it('uses a literal 3 s get-ready', () => {
    expect(GET_READY_MS).toBe(3000)
  })

  it('shares the strength expiry of 2 h', () => {
    expect(IDLE_EXPIRY_MS).toBe(7_200_000)
  })
})

describe('startCardio', () => {
  it('builds a running state from the plan, with the repeats applied', () => {
    const plan: CardioPlan = {
      type: 'cardio',
      id: 'p-ł',
      name: 'Bieg z rozgrzewką',
      blocks: [
        {
          id: 'b1',
          repeat: 2,
          intervals: [
            { id: 'a', name: 'Praca', seconds: 30, kind: 'work' },
            { id: 'b', name: 'Odpoczynek', seconds: 15, kind: 'rest' },
          ],
        },
        {
          id: 'b2',
          repeat: 1,
          intervals: [{ id: 'c', name: 'Schłodzenie', seconds: 60, kind: 'rest' }],
        },
      ],
    }
    expect(startCardio(plan, T0)).toEqual({
      version: 1,
      kind: 'cardio',
      planId: 'p-ł',
      planName: 'Bieg z rozgrzewką',
      intervals: [
        { name: 'Praca', seconds: 30, kind: 'work' },
        { name: 'Odpoczynek', seconds: 15, kind: 'rest' },
        { name: 'Praca', seconds: 30, kind: 'work' },
        { name: 'Odpoczynek', seconds: 15, kind: 'rest' },
        { name: 'Schłodzenie', seconds: 60, kind: 'rest' },
      ],
      startedAt: T0,
      pausedAt: null,
      pausedTotalMs: 0,
      lastActivityAt: T0,
    })
  })

  it('stays plain JSON', () => {
    const state = pauseCardio(makeState(), T0 + 5000)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})

describe('getCardioView: get-ready', () => {
  it('counts the get-ready down from 3 s and shows the first interval as next', () => {
    const state = makeState()
    const view = getCardioView(state, T0)
    expect(view.phase).toBe('get-ready')
    expect(view.intervalRemainingMs).toBe(3000)
    expect(view.current).toBeNull()
    expect(view.intervalIndex).toBeNull()
    expect(view.intervalNumber).toBeNull()
    expect(view.next).toEqual({ name: 'Bieg', seconds: 10, kind: 'work' })
    expect(view.intervalCount).toBe(3)
    expect(view.progress).toBe(0)
    expect(getCardioView(state, T0 + 1000).intervalRemainingMs).toBe(2000)
    expect(getCardioView(state, T0 + 2999).intervalRemainingMs).toBe(1)
    expect(getCardioView(state, T0 + 2999).phase).toBe('get-ready')
  })

  it('starts the first interval at exactly 3000 ms', () => {
    const view = getCardioView(makeState(), T0 + 3000)
    expect(view.phase).toBe('work')
    expect(view.intervalIndex).toBe(0)
    expect(view.intervalRemainingMs).toBe(10_000)
  })

  it('does not count time before the start (clock set back)', () => {
    const view = getCardioView(makeState(), T0 - 5000)
    expect(view.phase).toBe('get-ready')
    expect(view.intervalRemainingMs).toBe(3000)
  })

  it('shows Razem 0 and Zostało as the whole plan', () => {
    const view = getCardioView(makeState(), T0 + 1500)
    expect(view.elapsedMs).toBe(0)
    expect(view.remainingMs).toBe(35_000)
  })
})

describe('getCardioView: current interval from the clock only', () => {
  it('finds the first, middle and last interval', () => {
    const state = makeState()

    const first = getCardioView(state, T0 + 3000 + 4000)
    expect(first.phase).toBe('work')
    expect(first.intervalIndex).toBe(0)
    expect(first.intervalNumber).toBe(1)
    expect(first.current).toEqual({ name: 'Bieg', seconds: 10, kind: 'work' })
    expect(first.next).toEqual({ name: 'Marsz', seconds: 5, kind: 'rest' })
    expect(first.isLast).toBe(false)
    expect(first.intervalRemainingMs).toBe(6000)
    expect(first.progress).toBeCloseTo(0.4, 10)

    const middle = getCardioView(state, T0 + 13_000 + 2000)
    expect(middle.phase).toBe('rest')
    expect(middle.intervalIndex).toBe(1)
    expect(middle.intervalNumber).toBe(2)
    expect(middle.current).toEqual({ name: 'Marsz', seconds: 5, kind: 'rest' })
    expect(middle.next).toEqual({ name: 'Sprint', seconds: 20, kind: 'work' })
    expect(middle.isLast).toBe(false)
    expect(middle.intervalRemainingMs).toBe(3000)

    const last = getCardioView(state, T0 + 18_000 + 15_000)
    expect(last.phase).toBe('work')
    expect(last.intervalIndex).toBe(2)
    expect(last.intervalNumber).toBe(3)
    expect(last.current).toEqual({ name: 'Sprint', seconds: 20, kind: 'work' })
    expect(last.next).toBeNull()
    expect(last.isLast).toBe(true)
    expect(last.intervalRemainingMs).toBe(5000)
    expect(last.progress).toBeCloseTo(0.75, 10)
    expect(last.intervalCount).toBe(3)
  })

  it('changes interval at exactly the end: 1 ms before, at, 1 ms after', () => {
    const state = makeState()
    const before = getCardioView(state, T0 + 13_000 - 1)
    expect(before.intervalIndex).toBe(0)
    expect(before.intervalRemainingMs).toBe(1)
    const at = getCardioView(state, T0 + 13_000)
    expect(at.intervalIndex).toBe(1)
    expect(at.intervalRemainingMs).toBe(5000)
    expect(at.progress).toBe(0)
    const after = getCardioView(state, T0 + 13_000 + 1)
    expect(after.intervalIndex).toBe(1)
    expect(after.intervalRemainingMs).toBe(4999)

    expect(getCardioView(state, T0 + 18_000 - 1).intervalIndex).toBe(1)
    expect(getCardioView(state, T0 + 18_000).intervalIndex).toBe(2)
  })

  it('finishes at exactly the planned end, not 1 ms before', () => {
    const state = makeState()
    const before = getCardioView(state, T0 + 38_000 - 1)
    expect(before.phase).toBe('work')
    expect(before.intervalRemainingMs).toBe(1)
    const at = getCardioView(state, T0 + 38_000)
    expect(at.phase).toBe('finished')
    expect(at.current).toBeNull()
    expect(at.next).toBeNull()
    expect(at.intervalNumber).toBeNull()
    expect(at.intervalRemainingMs).toBe(0)
    expect(at.progress).toBe(1)
    expect(at.elapsedMs).toBe(35_000)
    expect(at.remainingMs).toBe(0)
    expect(getCardioView(state, T0 + 38_001).phase).toBe('finished')
    expect(getCardioView(state, T0 + 10_000_000).phase).toBe('finished')
  })

  it('finishes a plan with no intervals right after the get-ready', () => {
    const state = startCardio(makePlan([]), T0)
    expect(getCardioView(state, T0 + 2999).phase).toBe('get-ready')
    expect(getCardioView(state, T0 + 3000).phase).toBe('finished')
  })
})

describe('getCardioView: Razem and Zostało', () => {
  it('count from the start of the first interval', () => {
    const state = makeState()
    const view = getCardioView(state, T0 + 3000 + 12_000)
    expect(view.elapsedMs).toBe(12_000)
    expect(view.remainingMs).toBe(23_000)
  })

  it('do not count a pause', () => {
    // 5 s into Bieg (T0 + 8000), pause for 100 s, resume at T0 + 108_000.
    let state = makeState()
    state = pauseCardio(state, T0 + 8000)
    const frozen = getCardioView(state, T0 + 50_000)
    expect(frozen.elapsedMs).toBe(5000)
    expect(frozen.remainingMs).toBe(30_000)
    state = resumeCardio(state, T0 + 108_000)
    const justAfter = getCardioView(state, T0 + 108_000)
    expect(justAfter.elapsedMs).toBe(5000)
    expect(justAfter.remainingMs).toBe(30_000)
    const later = getCardioView(state, T0 + 108_000 + 4000)
    expect(later.elapsedMs).toBe(9000)
    expect(later.remainingMs).toBe(26_000)
    expect(later.intervalIndex).toBe(0)
    expect(later.intervalRemainingMs).toBe(1000)
  })

  it('do not count a pause during the get-ready', () => {
    let state = makeState()
    state = pauseCardio(state, T0 + 1000)
    state = resumeCardio(state, T0 + 61_000)
    const view = getCardioView(state, T0 + 61_000 + 2000 + 4000)
    expect(view.phase).toBe('work')
    expect(view.elapsedMs).toBe(4000)
    expect(view.remainingMs).toBe(31_000)
  })
})

describe('pause and resume', () => {
  it('freezes the view at pausedAt and keeps the kind of the paused interval', () => {
    const state = pauseCardio(makeState(), T0 + 13_000 + 2000)
    expect(state.pausedAt).toBe(T0 + 15_000)
    expect(state.lastActivityAt).toBe(T0 + 15_000)
    const view = getCardioView(state, T0 + 15_000)
    expect(view.phase).toBe('paused')
    expect(view.current).toEqual({ name: 'Marsz', seconds: 5, kind: 'rest' })
    expect(view.intervalNumber).toBe(2)
    expect(view.next).toEqual({ name: 'Sprint', seconds: 20, kind: 'work' })
    expect(view.intervalRemainingMs).toBe(3000)
    // The clock moves, the view does not.
    for (const later of [1, 500, 60_000, IDLE_EXPIRY_MS]) {
      expect(getCardioView(state, T0 + 15_000 + later)).toEqual(view)
    }
  })

  it('freezes a pause in a work interval and during the get-ready', () => {
    const inWork = pauseCardio(makeState(), T0 + 4000)
    expect(getCardioView(inWork, T0 + 999_999).phase).toBe('paused')
    expect(getCardioView(inWork, T0 + 999_999).current?.kind).toBe('work')
    expect(getCardioView(inWork, T0 + 999_999).intervalRemainingMs).toBe(9000)

    const inGetReady = pauseCardio(makeState(), T0 + 1000)
    const view = getCardioView(inGetReady, T0 + 999_999)
    expect(view.phase).toBe('paused')
    expect(view.current).toBeNull()
    expect(view.intervalRemainingMs).toBe(2000)
  })

  it('resumes from the stopped place and moves the later boundaries by the pause', () => {
    let state = pauseCardio(makeState(), T0 + 8000)
    state = resumeCardio(state, T0 + 20_000)
    expect(state.pausedAt).toBeNull()
    expect(state.pausedTotalMs).toBe(12_000)
    expect(state.lastActivityAt).toBe(T0 + 20_000)
    // Bieg would have ended at T0 + 13_000; now it ends 12 s later.
    expect(getCardioView(state, T0 + 25_000 - 1).intervalIndex).toBe(0)
    expect(getCardioView(state, T0 + 25_000).intervalIndex).toBe(1)
    expect(getCardioView(state, T0 + 38_000 + 12_000 - 1).phase).toBe('work')
    expect(getCardioView(state, T0 + 38_000 + 12_000).phase).toBe('finished')
  })

  it('adds up several pauses', () => {
    let state = makeState()
    state = pauseCardio(state, T0 + 5000)
    state = resumeCardio(state, T0 + 6000)
    state = pauseCardio(state, T0 + 10_000)
    state = resumeCardio(state, T0 + 10_500)
    expect(state.pausedTotalMs).toBe(1500)
    // Position on the timeline = now - T0 - 1500.
    expect(getCardioView(state, T0 + 10_500 + 3000).elapsedMs).toBe(10_500 + 3000 - 1500 - 3000)
  })

  it('ignores a second pause and a resume of a running session', () => {
    const running = makeState()
    expect(resumeCardio(running, T0 + 5000)).toBe(running)
    const paused = pauseCardio(running, T0 + 5000)
    expect(pauseCardio(paused, T0 + 9000)).toBe(paused)
    expect(paused.pausedAt).toBe(T0 + 5000)
  })

  it('does not pause a finished session', () => {
    const state = makeState()
    expect(pauseCardio(state, T0 + 38_000)).toBe(state)
    expect(getCardioView(pauseCardio(state, T0 + 38_000), T0 + 40_000).phase).toBe('finished')
  })

  it('does not change the state it is given', () => {
    const state = makeState()
    const copy = structuredClone(state)
    const paused = pauseCardio(state, T0 + 5000)
    resumeCardio(paused, T0 + 9000)
    expect(state).toEqual(copy)
    expect(paused.pausedAt).toBe(T0 + 5000)
  })
})

describe('isCardioExpired', () => {
  it('never expires a running session', () => {
    const state = makeState()
    expect(isCardioExpired(state, T0)).toBe(false)
    expect(isCardioExpired(state, T0 + 3 * 7_200_000)).toBe(false)
  })

  it('expires a paused session strictly after 2 h (7 200 000 ms)', () => {
    const paused = pauseCardio(makeState(), T0 + 5000)
    expect(isCardioExpired(paused, T0 + 5000)).toBe(false)
    expect(isCardioExpired(paused, T0 + 5000 + 7_200_000 - 1)).toBe(false)
    expect(isCardioExpired(paused, T0 + 5000 + 7_200_000)).toBe(false)
    expect(isCardioExpired(paused, T0 + 5000 + 7_200_000 + 1)).toBe(true)
  })

  it('counts the 2 h from the pause, not from the start', () => {
    let state = makeState()
    state = pauseCardio(state, T0 + 5000)
    state = resumeCardio(state, T0 + 6000)
    state = pauseCardio(state, T0 + 30_000)
    expect(state.pausedAt).toBe(T0 + 30_000)
    expect(isCardioExpired(state, T0 + 30_000 + 7_200_000)).toBe(false)
    expect(isCardioExpired(state, T0 + 30_000 + 7_200_001)).toBe(true)
  })
})

describe('cardioCues', () => {
  const all = (state: CardioState) => cardioCues(state, T0 - 1, T0 + 1_000_000)

  it('lists the exact cues of the small plan', () => {
    expect(cues(all(makeState()))).toEqual([
      // get-ready 3-2-1, then the start of Bieg (work)
      [0, 'countdown'],
      [1000, 'countdown'],
      [2000, 'countdown'],
      [3000, 'work-start'],
      // Bieg ends at 13000, Marsz is rest
      [10_000, 'countdown'],
      [11_000, 'countdown'],
      [12_000, 'countdown'],
      [13_000, 'rest-start'],
      // Marsz ends at 18000, Sprint is work
      [15_000, 'countdown'],
      [16_000, 'countdown'],
      [17_000, 'countdown'],
      [18_000, 'work-start'],
      // Sprint is the last interval: its end gives rest-start
      [35_000, 'countdown'],
      [36_000, 'countdown'],
      [37_000, 'countdown'],
      [38_000, 'rest-start'],
    ])
  })

  it('gives no countdown to an interval shorter than 4 s and one to an interval of exactly 4 s', () => {
    const state = startCardio(
      makePlan([
        { name: 'Praca', seconds: 10, kind: 'work' },
        { name: 'Krótki', seconds: 3, kind: 'rest' },
        { name: 'Cztery', seconds: 4, kind: 'work' },
      ]),
      T0,
    )
    // Praca 3000-13000, Krótki 13000-16000, Cztery 16000-20000.
    expect(cues(all(state)).filter(([at]) => at >= 13_000)).toEqual([
      [13_000, 'rest-start'],
      [16_000, 'work-start'],
      [17_000, 'countdown'],
      [18_000, 'countdown'],
      [19_000, 'countdown'],
      [20_000, 'rest-start'],
    ])
  })

  it('gives a cue for the end of the get-ready of an empty plan as rest-start', () => {
    const state = startCardio(makePlan([]), T0)
    expect(cues(all(state))).toEqual([
      [0, 'countdown'],
      [1000, 'countdown'],
      [2000, 'countdown'],
      [3000, 'rest-start'],
    ])
  })

  it('carries the planned time as an epoch value', () => {
    const list = cardioCues(makeState(), T0 + 2999, T0 + 3000)
    expect(list).toEqual([{ at: T0 + 3000, type: 'work-start' }])
  })

  it('uses the window (from, to]: excludes from, includes to', () => {
    const state = makeState()
    expect(cardioCues(state, T0 + 1000, T0 + 2000)).toEqual([{ at: T0 + 2000, type: 'countdown' }])
    expect(cardioCues(state, T0 + 1000 - 1, T0 + 2000 - 1)).toEqual([
      { at: T0 + 1000, type: 'countdown' },
    ])
    expect(cardioCues(state, T0 + 2000, T0 + 2999)).toEqual([])
    expect(cardioCues(state, T0 + 2000 - 1, T0 + 2999)).toEqual([
      { at: T0 + 2000, type: 'countdown' },
    ])
    expect(cardioCues(state, T0 + 1000, T0 + 1000)).toEqual([])
  })

  it('splits cleanly: consecutive windows give every cue exactly once', () => {
    const state = makeState()
    const joined: CardioCue[] = []
    for (let from = T0 - 1; from < T0 + 40_000; from += 700) {
      joined.push(...cardioCues(state, from, from + 700))
    }
    expect(joined).toEqual(all(state))
  })

  it('gives no cue while paused', () => {
    const state = pauseCardio(makeState(), T0 + 5000)
    expect(cardioCues(state, T0 + 5000, T0 + 500_000)).toEqual([])
    // A cue planned for the moment of the pause still counts as played.
    const atPause = pauseCardio(makeState(), T0 + 11_000)
    expect(cues(cardioCues(atPause, T0 + 9000, T0 + 500_000))).toEqual([
      [10_000, 'countdown'],
      [11_000, 'countdown'],
    ])
  })

  it('moves later cues by the pause length', () => {
    let state = makeState()
    state = pauseCardio(state, T0 + 5000)
    state = resumeCardio(state, T0 + 9000)
    expect(state.pausedTotalMs).toBe(4000)
    expect(cues(cardioCues(state, T0 + 9000, T0 + 1_000_000)).slice(0, 5)).toEqual([
      [14_000, 'countdown'],
      [15_000, 'countdown'],
      [16_000, 'countdown'],
      [17_000, 'rest-start'],
      [19_000, 'countdown'],
    ])
    expect(cues(cardioCues(state, T0 + 9000, T0 + 1_000_000)).at(-1)).toEqual([42_000, 'rest-start'])
  })

  it('moves the get-ready cues when the get-ready itself was paused', () => {
    let state = makeState()
    state = pauseCardio(state, T0 + 1500)
    state = resumeCardio(state, T0 + 11_500)
    expect(state.pausedTotalMs).toBe(10_000)
    expect(cues(cardioCues(state, T0 + 11_500, T0 + 14_000))).toEqual([
      [12_000, 'countdown'],
      [13_000, 'work-start'],
    ])
  })
})
