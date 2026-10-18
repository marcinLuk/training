/** Rest time as m:ss, for example 90 -> "1:30", 0 -> "0:00". */
export function formatRest(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
