import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExercise, type Plan } from './plan'

type Store = typeof import('./planStore')

async function loadStore(): Promise<Store> {
  vi.resetModules()
  return import('./planStore')
}

function makePlan(id: string, name = 'Nogi'): Plan {
  return { id, name, exercises: [{ ...createExercise(), name: 'Przysiady' }] }
}

function corruptKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith('trening.plans.corrupt.'))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('reading', () => {
  it('a missing key reads as an empty list', async () => {
    const store = await loadStore()
    expect(store.listPlans()).toEqual([])
    expect(store.getPlan('x')).toBeUndefined()
  })

  it('does not throw when localStorage itself throws', async () => {
    const store = await loadStore()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(store.listPlans()).toEqual([])
  })

  it.each([
    ['broken JSON', '{not json'],
    ['unknown version', JSON.stringify({ version: 2, plans: [] })],
    ['a bare array', JSON.stringify([makePlan('a')])],
    ['plans that is not a list', JSON.stringify({ version: 1, plans: 'x' })],
    ['null', 'null'],
  ])('%s reads as an empty list and does not throw', async (_label, raw) => {
    localStorage.setItem('trening.plans.v1', raw)
    const store = await loadStore()
    expect(store.listPlans()).toEqual([])
    expect(localStorage.getItem('trening.plans.v1')).toBe(raw)
  })

  it('a stored plan with a bad shape is skipped, the valid ones are still listed', async () => {
    const good = makePlan('good')
    localStorage.setItem(
      'trening.plans.v1',
      JSON.stringify({
        version: 1,
        plans: [good, { id: 'bad', name: 'x', exercises: [{ id: 'e', name: 'y' }] }, 42],
      }),
    )
    const raw = localStorage.getItem('trening.plans.v1')
    const store = await loadStore()
    expect(store.listPlans()).toEqual([good])
    expect(store.getPlan('good')).toEqual(good)
    expect(store.getPlan('bad')).toBeUndefined()
    expect(localStorage.getItem('trening.plans.v1')).toBe(raw)
    expect(corruptKeys()).toEqual([])
  })

  it('a stored plan that breaks the limits is skipped', async () => {
    const bad = makePlan('bad')
    bad.exercises[0]!.sets = 99
    localStorage.setItem('trening.plans.v1', JSON.stringify({ version: 1, plans: [bad] }))
    const raw = localStorage.getItem('trening.plans.v1')
    const store = await loadStore()
    expect(store.listPlans()).toEqual([])
    expect(store.getPlan('bad')).toBeUndefined()
    expect(localStorage.getItem('trening.plans.v1')).toBe(raw)
    expect(corruptKeys()).toEqual([])
  })

  it('getPlan finds a plan by id among several, and an unknown id gives undefined', async () => {
    const store = await loadStore()
    const first = makePlan('p1', 'Pierwszy')
    const second = makePlan('p2', 'Drugi')
    store.savePlan(first)
    store.savePlan(second)

    expect(store.getPlan('p2')).toEqual(second)
    expect(store.getPlan('p1')).toEqual(first)
    expect(store.getPlan('zzz')).toBeUndefined()
  })
})

describe('saving', () => {
  it('a saved plan is read back from a fresh read of localStorage', async () => {
    const store = await loadStore()
    const plan = makePlan('p1', 'Wiosłowanie i przysiady')
    expect(store.savePlan(plan)).toEqual({ ok: true })

    expect(JSON.parse(localStorage.getItem('trening.plans.v1')!)).toEqual({
      version: 1,
      plans: [plan],
    })
    const fresh = await loadStore()
    expect(fresh.listPlans()).toEqual([plan])
    expect(fresh.getPlan('p1')).toEqual(plan)
  })

  it('saving the same id replaces the plan, a new id appends it', async () => {
    const store = await loadStore()
    store.savePlan(makePlan('a', 'Pierwszy'))
    store.savePlan(makePlan('b', 'Drugi'))
    store.savePlan(makePlan('a', 'Pierwszy zmieniony'))

    expect(store.listPlans().map((plan) => [plan.id, plan.name])).toEqual([
      ['a', 'Pierwszy zmieniony'],
      ['b', 'Drugi'],
    ])
  })

  it('trims the names it stores', async () => {
    const store = await loadStore()
    const plan = makePlan('a', '  Nogi  ')
    plan.exercises[0]!.name = ' Przysiady '
    store.savePlan(plan)
    expect(store.getPlan('a')?.name).toBe('Nogi')
    expect(store.getPlan('a')?.exercises[0]?.name).toBe('Przysiady')
  })

  it('refuses an invalid plan and writes nothing', async () => {
    const store = await loadStore()
    expect(store.savePlan({ id: 'a', name: '', exercises: [] })).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(localStorage.getItem('trening.plans.v1')).toBeNull()
  })

  it('reports a failed write instead of throwing', async () => {
    const store = await loadStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(store.savePlan(makePlan('a'))).toEqual({ ok: false, reason: 'write-failed' })
  })
})

describe('unreadable stored data', () => {
  it('corrupt data is copied to a corrupt key before the first write over it', async () => {
    localStorage.setItem('trening.plans.v1', '{not json')
    const store = await loadStore()
    expect(store.savePlan(makePlan('a'), 1700000000000)).toEqual({ ok: true })

    expect(localStorage.getItem('trening.plans.corrupt.1700000000000')).toBe('{not json')
    expect(store.listPlans().map((plan) => plan.id)).toEqual(['a'])
  })

  it('unknown-version data is kept the same way', async () => {
    const raw = JSON.stringify({ version: 7, plans: [makePlan('future')] })
    localStorage.setItem('trening.plans.v1', raw)
    const store = await loadStore()
    store.savePlan(makePlan('a'), 5)
    expect(localStorage.getItem('trening.plans.corrupt.5')).toBe(raw)
  })

  it('a plan dropped for its shape stays in the corrupt copy', async () => {
    const raw = JSON.stringify({
      version: 1,
      plans: [makePlan('good'), { id: 'bad', name: 'Zepsuty' }],
    })
    localStorage.setItem('trening.plans.v1', raw)
    const store = await loadStore()
    store.savePlan(makePlan('new'), 9)

    expect(localStorage.getItem('trening.plans.corrupt.9')).toBe(raw)
    expect(store.listPlans().map((plan) => plan.id)).toEqual(['good', 'new'])
  })

  it('does not write over unreadable data when the copy fails', async () => {
    localStorage.setItem('trening.plans.v1', '{not json')
    const store = await loadStore()
    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith('trening.plans.corrupt.')) throw new Error('quota')
      realSetItem.call(this, key, value)
    })

    expect(store.savePlan(makePlan('a'))).toEqual({ ok: false, reason: 'backup-failed' })
    expect(localStorage.getItem('trening.plans.v1')).toBe('{not json')
  })

  it('makes no corrupt copy when the data is readable or missing', async () => {
    const store = await loadStore()
    store.savePlan(makePlan('a'))
    store.savePlan(makePlan('b'))
    expect(corruptKeys()).toEqual([])
  })

  it('makes only one copy: the second save finds readable data', async () => {
    localStorage.setItem('trening.plans.v1', 'oops')
    const store = await loadStore()
    store.savePlan(makePlan('a'), 1)
    store.savePlan(makePlan('b'), 2)
    expect(corruptKeys()).toEqual(['trening.plans.corrupt.1'])
  })
})

describe('storage persistence request', () => {
  function stubPersist(persist: () => Promise<boolean>) {
    const spy = vi.fn(persist)
    vi.stubGlobal('navigator', { storage: { persist: spy } })
    return spy
  }

  it('calls navigator.storage.persist() at the first save only', async () => {
    const persist = stubPersist(() => Promise.resolve(true))
    const store = await loadStore()

    store.savePlan(makePlan('a'))
    store.savePlan(makePlan('b'))
    store.savePlan(makePlan('a', 'Zmieniony'))

    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('does not call persist() when only reading', async () => {
    const persist = stubPersist(() => Promise.resolve(true))
    const store = await loadStore()
    store.listPlans()
    store.getPlan('a')
    expect(persist).not.toHaveBeenCalled()
  })

  it('does not call persist() when the save is refused', async () => {
    const persist = stubPersist(() => Promise.resolve(true))
    const store = await loadStore()
    store.savePlan({ id: 'a', name: '', exercises: [] })
    expect(persist).not.toHaveBeenCalled()
  })

  it('a rejected persist() does not block the save and is handled', async () => {
    const rejection = Promise.reject(new Error('denied'))
    const handled = vi.spyOn(rejection, 'catch')
    const persist = stubPersist(() => rejection)
    const store = await loadStore()

    expect(store.savePlan(makePlan('a'))).toEqual({ ok: true })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(persist).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledTimes(1)
    expect(store.listPlans().map((plan) => plan.id)).toEqual(['a'])
  })

  it('a persist() that throws does not block the save', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: () => {
          throw new Error('boom')
        },
      },
    })
    const store = await loadStore()
    expect(store.savePlan(makePlan('a'))).toEqual({ ok: true })
  })

  it('saves normally when navigator.storage is missing', async () => {
    vi.stubGlobal('navigator', {})
    const store = await loadStore()
    expect(store.savePlan(makePlan('a'))).toEqual({ ok: true })
  })

  it('saves normally when navigator.storage has no persist()', async () => {
    vi.stubGlobal('navigator', { storage: {} })
    const store = await loadStore()
    expect(store.savePlan(makePlan('a'))).toEqual({ ok: true })
  })

  it('a failed write does not use up the one request', async () => {
    const persist = stubPersist(() => Promise.resolve(true))
    const store = await loadStore()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    store.savePlan(makePlan('a'))
    expect(persist).not.toHaveBeenCalled()

    setItem.mockRestore()
    store.savePlan(makePlan('a'))
    expect(persist).toHaveBeenCalledTimes(1)
  })
})
