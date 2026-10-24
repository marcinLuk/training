import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BEEP_COUNT,
  BEEP_FREQUENCY_HZ,
  BEEP_PEAK_GAIN,
  COUNTDOWN_TONES,
  REST_START_TONES,
  WORK_START_TONES,
  playCountdownBeep,
  playRestEnd,
  playRestStart,
  playWorkStart,
  resetSound,
} from './sound'

interface FakeParam {
  value: number
  setValueAtTime: ReturnType<typeof vi.fn>
  linearRampToValueAtTime: ReturnType<typeof vi.fn>
}

function makeParam(): FakeParam {
  return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
}

interface FakeOscillator {
  frequency: FakeParam
  type: string
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const CURRENT_TIME = 10

let oscillators: FakeOscillator[]
let gains: { gain: FakeParam; connect: ReturnType<typeof vi.fn> }[]
let resume: ReturnType<typeof vi.fn>
let contextState: string

beforeEach(() => {
  oscillators = []
  gains = []
  contextState = 'suspended'
  resume = vi.fn(() => Promise.resolve())
  class FakeAudioContext {
    state = contextState
    currentTime = CURRENT_TIME
    destination = {}
    resume = resume
    close = vi.fn(() => Promise.resolve())
    createOscillator() {
      const oscillator: FakeOscillator = {
        frequency: makeParam(),
        type: '',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(oscillator)
      return oscillator
    }
    createGain() {
      const gain = { gain: makeParam(), connect: vi.fn() }
      gains.push(gain)
      return gain
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  resetSound()
  vi.unstubAllGlobals()
})

function frequencies(): number[] {
  return oscillators.map((oscillator) => oscillator.frequency.value)
}

/** What each cue made: one pitch list per cue, recorded from the fake AudioContext. */
function recorded(play: () => void): number[] {
  oscillators = []
  gains = []
  play()
  return frequencies()
}

describe('the cardio cue sounds', () => {
  it('plays the countdown as one 660 Hz sine beep', () => {
    playCountdownBeep()
    expect(frequencies()).toEqual([660])
    expect(oscillators[0]!.type).toBe('sine')
  })

  it('plays work start as two rising notes, 988 Hz then 1319 Hz', () => {
    playWorkStart()
    expect(frequencies()).toEqual([988, 1319])
    const starts = oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0] as number)
    expect(starts[0]).toBe(CURRENT_TIME)
    expect(starts[1]).toBeGreaterThan(starts[0]!)
  })

  it('plays rest start as one low 330 Hz note, longer than a countdown beep', () => {
    playRestStart()
    expect(frequencies()).toEqual([330])
    const [start, end] = [oscillators[0]!.start.mock.calls[0]?.[0] as number, oscillators[0]!.stop.mock.calls[0]?.[0] as number]
    expect(end - start).toBeCloseTo(0.5, 5)
  })

  it('makes the three cues different from each other and from the end-of-rest sound', () => {
    const countdown = recorded(playCountdownBeep)
    const workStart = recorded(playWorkStart)
    const restStart = recorded(playRestStart)
    const restEnd = recorded(playRestEnd)
    const all = [countdown, workStart, restStart, restEnd].map((pitches) => pitches.join(','))
    expect(new Set(all).size).toBe(4)
    expect(Math.min(...workStart)).toBeGreaterThan(Math.max(...restStart))
    expect(workStart).toHaveLength(2)
    expect(restStart).toHaveLength(1)
    expect(countdown).toHaveLength(1)
  })

  it('keeps the tone tables the sounds are built from', () => {
    expect(COUNTDOWN_TONES.map((tone) => tone.frequencyHz)).toEqual([660])
    expect(WORK_START_TONES.map((tone) => tone.frequencyHz)).toEqual([988, 1319])
    expect(REST_START_TONES.map((tone) => tone.frequencyHz)).toEqual([330])
  })

  it('gives every note a gain envelope that starts and ends at 0 and stays below clipping', () => {
    playWorkStart()
    playCountdownBeep()
    playRestStart()
    expect(gains).toHaveLength(4)
    for (const gain of gains) {
      const peaks = gain.gain.linearRampToValueAtTime.mock.calls.map((call) => call[0] as number)
      expect(Math.max(...peaks)).toBe(BEEP_PEAK_GAIN)
      expect(BEEP_PEAK_GAIN).toBeLessThan(0.5)
      expect(peaks[peaks.length - 1]).toBe(0)
      expect(gain.gain.setValueAtTime.mock.calls[0]?.[0]).toBe(0)
    }
    for (const oscillator of oscillators) {
      expect(oscillator.connect).toHaveBeenCalledTimes(1)
      expect(oscillator.start).toHaveBeenCalledTimes(1)
      expect(oscillator.stop).toHaveBeenCalledTimes(1)
    }
  })

  it('resumes a suspended context before it plays', () => {
    playCountdownBeep()
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the API is missing, the context cannot be made, or playing throws', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => {
      playCountdownBeep()
      playWorkStart()
      playRestStart()
    }).not.toThrow()

    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    expect(() => {
      playCountdownBeep()
      playWorkStart()
      playRestStart()
    }).not.toThrow()

    resetSound()
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running'
        currentTime = 0
        close = vi.fn(() => Promise.resolve())
        createOscillator(): never {
          throw new Error('broken')
        }
      },
    )
    expect(() => {
      playCountdownBeep()
      playWorkStart()
      playRestStart()
    }).not.toThrow()
  })

  it('leaves the end-of-rest sound as it was: three 880 Hz beeps', () => {
    playRestEnd()
    expect(frequencies()).toEqual(Array.from({ length: BEEP_COUNT }, () => BEEP_FREQUENCY_HZ))
    expect(BEEP_COUNT).toBe(3)
    expect(BEEP_FREQUENCY_HZ).toBe(880)
  })
})
