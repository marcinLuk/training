/**
 * End-of-rest sound, made with the Web Audio API (no audio file). Chrome only lets an
 * AudioContext make sound after a user gesture, so `unlockAudio()` is called inside the Start
 * and "Gotowe" taps. A missing API or any thrown error never breaks the workout.
 */

export const BEEP_COUNT = 3
export const BEEP_FREQUENCY_HZ = 880
export const BEEP_DURATION_S = 0.15
export const BEEP_GAP_S = 0.25
export const BEEP_PEAK_GAIN = 0.4
const ATTACK_S = 0.01

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (context !== null) return context
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
  try {
    context = new window.AudioContext()
  } catch {
    // Audio is optional: without it the screen change alone marks the end of the rest.
    return null
  }
  return context
}

function resumeIfSuspended(audio: AudioContext): void {
  if (audio.state !== 'suspended') return
  audio.resume().catch(() => undefined)
}

/** Create or resume the AudioContext. Call it from a user gesture. */
export function unlockAudio(): void {
  try {
    const audio = getContext()
    if (audio !== null) resumeIfSuspended(audio)
  } catch {
    // Audio is optional, see getContext.
  }
}

/** Three short 880 Hz beeps with a gain envelope (no clicks, no clipping). */
export function playRestEnd(): void {
  try {
    const audio = getContext()
    if (audio === null) return
    resumeIfSuspended(audio)
    for (let index = 0; index < BEEP_COUNT; index += 1) {
      const start = audio.currentTime + index * BEEP_GAP_S
      const end = start + BEEP_DURATION_S
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = BEEP_FREQUENCY_HZ
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, start + ATTACK_S)
      gain.gain.setValueAtTime(BEEP_PEAK_GAIN, end - ATTACK_S)
      gain.gain.linearRampToValueAtTime(0, end)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(end)
    }
  } catch {
    // Audio is optional, see getContext.
  }
}

/** One note of a cardio cue: its pitch, when it starts after the cue and how long it lasts. */
interface Tone {
  frequencyHz: number
  offsetS: number
  durationS: number
}

/** Cardio countdown: one short, mid-pitch beep at 3, 2 and 1 s before an interval ends. */
export const COUNTDOWN_TONES: readonly Tone[] = [{ frequencyHz: 660, offsetS: 0, durationS: 0.1 }]

/** Work starts: two rising, high notes. The highest of the cardio cues. */
export const WORK_START_TONES: readonly Tone[] = [
  { frequencyHz: 988, offsetS: 0, durationS: 0.15 },
  { frequencyHz: 1319, offsetS: 0.2, durationS: 0.25 },
]

/** Rest starts: one long, low note. */
export const REST_START_TONES: readonly Tone[] = [{ frequencyHz: 330, offsetS: 0, durationS: 0.5 }]

/** Plays the notes of one cardio cue with the same gain envelope and safety rules as `playRestEnd`. */
function playTones(tones: readonly Tone[]): void {
  try {
    const audio = getContext()
    if (audio === null) return
    resumeIfSuspended(audio)
    for (const tone of tones) {
      const start = audio.currentTime + tone.offsetS
      const end = start + tone.durationS
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = tone.frequencyHz
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, start + ATTACK_S)
      gain.gain.setValueAtTime(BEEP_PEAK_GAIN, end - ATTACK_S)
      gain.gain.linearRampToValueAtTime(0, end)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(end)
    }
  } catch {
    // Audio is optional, see getContext.
  }
}

/** One short beep, 3, 2 and 1 s before the end of a cardio interval. */
export function playCountdownBeep(): void {
  playTones(COUNTDOWN_TONES)
}

/** Two rising notes: a work interval starts. */
export function playWorkStart(): void {
  playTones(WORK_START_TONES)
}

/** One low, long note: a rest interval starts (or the session ends). */
export function playRestStart(): void {
  playTones(REST_START_TONES)
}

/** Drop the cached context. Used by tests, and safe to call at any time. */
export function resetSound(): void {
  const audio = context
  context = null
  if (audio !== null) audio.close().catch(() => undefined)
}
