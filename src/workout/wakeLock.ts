/**
 * Screen Wake Lock for a running workout (FR-012). The browser releases the lock whenever the
 * page is hidden, so the caller asks again when the page becomes visible. At most one sentinel
 * is held at any time. A missing API or a rejected request is ignored: the workout goes on.
 */

let sentinel: WakeLockSentinel | null = null
let pending: Promise<void> | null = null
/** True between `holdWakeLock` and `releaseWakeLock`; a request that resolves later honours it. */
let wanted = false

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock != null
}

function dropSentinel(held: WakeLockSentinel): void {
  try {
    void Promise.resolve(held.release()).catch(() => undefined)
  } catch {
    // Releasing is best effort.
  }
}

async function request(): Promise<void> {
  try {
    const acquired = await navigator.wakeLock.request('screen')
    if (!wanted || sentinel !== null) {
      dropSentinel(acquired)
      return
    }
    sentinel = acquired
    acquired.addEventListener('release', () => {
      if (sentinel === acquired) sentinel = null
    })
  } catch {
    // The request may be refused (low battery, hidden page); the workout does not depend on it.
  }
}

/** Wants the screen kept on. Safe to call again: it reuses a held lock or a request in flight. */
export function holdWakeLock(): void {
  wanted = true
  if (!isSupported() || sentinel !== null || pending !== null) return
  pending = request().finally(() => {
    pending = null
  })
}

export function releaseWakeLock(): void {
  wanted = false
  const held = sentinel
  sentinel = null
  if (held !== null) dropSentinel(held)
}
