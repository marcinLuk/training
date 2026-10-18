import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BEEP_COUNT, BEEP_FREQUENCY_HZ, BEEP_PEAK_GAIN, playRestEnd, resetSound, unlockAudio } from './sound'

interface FakeParam {
  value: number
  setValueAtTime: ReturnType<typeof vi.fn>
  linearRampToValueAtTime: ReturnType<typeof vi.fn>
}

function makeParam(): FakeParam {
  return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
}

let created: number
let oscillators: { frequency: FakeParam; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[]
let gains: { gain: FakeParam }[]
let resume: ReturnType<typeof vi.fn>
let state: string

function installFakeAudio(): void {
  class FakeAudioContext {
    state = state
    currentTime = 10
    destination = {}
    constructor() {
      created += 1
    }
    resume = resume
    close = vi.fn(() => Promise.resolve())
    createOscillator() {
      const oscillator = { frequency: makeParam(), type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
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
}

beforeEach(() => {
  created = 0
  oscillators = []
  gains = []
  state = 'suspended'
  resume = vi.fn(() => Promise.resolve())
  installFakeAudio()
})

afterEach(() => {
  resetSound()
  vi.unstubAllGlobals()
})

describe('sound', () => {
  it('creates the context lazily and resumes it on unlock', () => {
    expect(created).toBe(0)
    unlockAudio()
    unlockAudio()
    expect(created).toBe(1)
    expect(resume).toHaveBeenCalled()
  })

  it('plays a pattern of beeps at 880 Hz with a gain envelope that stays below clipping', () => {
    playRestEnd()
    expect(oscillators).toHaveLength(BEEP_COUNT)
    expect(gains).toHaveLength(BEEP_COUNT)
    for (const oscillator of oscillators) {
      expect(oscillator.frequency.value).toBe(BEEP_FREQUENCY_HZ)
      expect(oscillator.start).toHaveBeenCalledTimes(1)
      expect(oscillator.stop).toHaveBeenCalledTimes(1)
    }
    for (const gain of gains) {
      const peaks = gain.gain.linearRampToValueAtTime.mock.calls.map((call) => call[0] as number)
      expect(Math.max(...peaks)).toBe(BEEP_PEAK_GAIN)
      expect(BEEP_PEAK_GAIN).toBeLessThan(0.5)
      expect(peaks[peaks.length - 1]).toBe(0)
    }
    const starts = oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0] as number)
    expect(new Set(starts).size).toBe(BEEP_COUNT)
  })

  it('does nothing and does not throw when the API is missing', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => {
      unlockAudio()
      playRestEnd()
    }).not.toThrow()
  })

  it('does not throw when the context cannot be created', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    expect(() => {
      unlockAudio()
      playRestEnd()
    }).not.toThrow()
  })

  it('does not throw when resume is rejected or playing throws', () => {
    resume = vi.fn(() => Promise.reject(new Error('no gesture')))
    expect(() => unlockAudio()).not.toThrow()
    resetSound()
    state = 'running'
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
    expect(() => playRestEnd()).not.toThrow()
  })
})
