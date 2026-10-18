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

/** Drop the cached context. Used by tests, and safe to call at any time. */
export function resetSound(): void {
  const audio = context
  context = null
  if (audio !== null) audio.close().catch(() => undefined)
}
