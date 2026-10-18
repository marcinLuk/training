/**
 * Small helpers shared by every localStorage-backed store (plans now, the
 * running workout later). Reading never throws. Writing reports failure with
 * a boolean so a full or blocked storage cannot crash the app.
 */

export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeRaw(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Copy unreadable stored data to `<prefix>.<timestamp>` so a later write over
 * the live key cannot destroy it. Returns false when the copy failed.
 */
export function backupUnreadable(prefix: string, raw: string, now: number): boolean {
  return writeRaw(`${prefix}.${now}`, raw)
}
