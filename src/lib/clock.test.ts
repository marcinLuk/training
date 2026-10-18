import { afterEach, describe, expect, it, vi } from 'vitest'
import { now } from './clock'

afterEach(() => {
  vi.useRealTimers()
})

describe('now', () => {
  it('follows the system clock when it is moved', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    expect(now()).toBe(1_000_000)
    vi.setSystemTime(1_090_000)
    expect(now()).toBe(1_090_000)
  })
})
