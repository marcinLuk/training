import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { holdWakeLock, releaseWakeLock } from './wakeLock'

interface FakeSentinel {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: (type: string, listener: () => void) => void
  fireRelease: () => void
}

let sentinels: FakeSentinel[]
let request: ReturnType<typeof vi.fn>

function makeSentinel(): FakeSentinel {
  const listeners: Array<() => void> = []
  const sentinel: FakeSentinel = {
    released: false,
    release: vi.fn(() => {
      sentinel.released = true
      return Promise.resolve()
    }),
    addEventListener: (_type, listener) => listeners.push(listener),
    fireRelease: () => {
      sentinel.released = true
      listeners.forEach((listener) => listener())
    },
  }
  return sentinel
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  sentinels = []
  request = vi.fn(() => {
    const sentinel = makeSentinel()
    sentinels.push(sentinel)
    return Promise.resolve(sentinel)
  })
  vi.stubGlobal('navigator', { wakeLock: { request } })
})

afterEach(() => {
  releaseWakeLock()
  vi.unstubAllGlobals()
})

describe('wake lock', () => {
  it('requests the screen lock', async () => {
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')
  })

  it('does not hold a second sentinel while one is held or being requested', async () => {
    holdWakeLock()
    holdWakeLock()
    await settle()
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('requests again after the browser released the lock (page hidden)', async () => {
    holdWakeLock()
    await settle()
    sentinels[0]!.fireRelease()
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('releases the held sentinel', async () => {
    holdWakeLock()
    await settle()
    releaseWakeLock()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('releases a sentinel that arrives after the release was asked for', async () => {
    holdWakeLock()
    releaseWakeLock()
    await settle()
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1)
  })

  it('does nothing and does not throw when the API is missing', async () => {
    vi.stubGlobal('navigator', {})
    expect(() => holdWakeLock()).not.toThrow()
    await settle()
    expect(() => releaseWakeLock()).not.toThrow()
  })

  it('survives a rejected request and tries again on the next call', async () => {
    request.mockImplementationOnce(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    holdWakeLock()
    await settle()
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
    expect(sentinels).toHaveLength(1)
  })

  it('survives a request that throws at once', async () => {
    request.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    expect(() => holdWakeLock()).not.toThrow()
    await settle()
    holdWakeLock()
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('survives a release that rejects', async () => {
    holdWakeLock()
    await settle()
    sentinels[0]!.release.mockImplementation(() => Promise.reject(new Error('gone')))
    expect(() => releaseWakeLock()).not.toThrow()
    await settle()
  })
})
