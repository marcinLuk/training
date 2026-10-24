import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCardioPlan, createExercise, type CardioPlan, type Plan } from './plan'

type Store = typeof import('./planStore')

async function loadStore(): Promise<Store> {
  vi.resetModules()
  return import('./planStore')
}

function cardio(id: string, name = 'Bieg z rozgrzewką'): CardioPlan {
  return { ...createCardioPlan(), id, name }
}

function strength(id: string, name = 'Nogi'): Plan {
  return { id, name, exercises: [{ ...createExercise(), name: 'Przysiady' }] }
}

function store(plans: unknown[]): void {
  localStorage.setItem('trening.plans.v1', JSON.stringify({ version: 1, plans }))
}

function corruptKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith('trening.plans.corrupt.'))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('old-shape plans', () => {
  it('a plan stored with no type loads as a strength plan with all its data', async () => {
    store([
      {
        id: 'old',
        name: 'Stary plan',
        exercises: [{ id: 'e1', name: 'Wiosłowanie', sets: 4, reps: 8, restSeconds: 120 }],
      },
    ])
    const loaded = await loadStore()

    const plan = loaded.getPlan('old')
    expect(plan).toEqual({
      id: 'old',
      name: 'Stary plan',
      exercises: [{ id: 'e1', name: 'Wiosłowanie', sets: 4, reps: 8, restSeconds: 120 }],
    })
    expect(loaded.listAllPlans().map((item) => item.type)).toEqual([undefined])
    expect(corruptKeys()).toEqual([])
  })

  it('an old plan and a cardio plan live side by side in the same document', async () => {
    store([
      { id: 'old', name: 'Stary', exercises: [{ id: 'e', name: 'A', sets: 3, reps: 10, restSeconds: 90 }] },
      cardio('c1'),
    ])
    const loaded = await loadStore()
    expect(loaded.listAllPlans().map((plan) => plan.id)).toEqual(['old', 'c1'])
    expect(corruptKeys()).toEqual([])
  })

  it('saving a strength plan with no type does not add a type to what is stored', async () => {
    const loaded = await loadStore()
    loaded.savePlan(strength('a'))
    const document = JSON.parse(localStorage.getItem('trening.plans.v1')!)
    expect('type' in document.plans[0]).toBe(false)
  })

  it('a strength plan stored with type "strength" keeps it', async () => {
    store([{ ...strength('s'), type: 'strength' }])
    const loaded = await loadStore()
    expect(loaded.getPlan('s')?.type).toBe('strength')
  })
})

describe('cardio round trip', () => {
  it('a saved cardio plan keeps its type, blocks, repeats and intervals after a fresh read', async () => {
    const loaded = await loadStore()
    const plan = cardio('c1', 'Bieg z rozgrzewką')
    plan.blocks.push({
      id: 'b2',
      repeat: 3,
      intervals: [{ id: 'i9', name: 'Schłodzenie żółwie', seconds: 3600, kind: 'rest' }],
    })
    expect(loaded.savePlan(plan)).toEqual({ ok: true })

    const document = JSON.parse(localStorage.getItem('trening.plans.v1')!)
    expect(document).toEqual({ version: 1, plans: [plan] })

    const fresh = await loadStore()
    expect(fresh.getAnyPlan('c1')).toEqual(plan)
    expect(fresh.listAllPlans()).toEqual([plan])
  })

  it('trims the plan name and the interval names it stores', async () => {
    const loaded = await loadStore()
    const plan = cardio('c1', '  Ścieżka  ')
    plan.blocks[0]!.intervals[0]!.name = '  Sprint  '
    loaded.savePlan(plan)
    const saved = loaded.getAnyPlan('c1') as CardioPlan
    expect(saved.name).toBe('Ścieżka')
    expect(saved.blocks[0]!.intervals[0]!.name).toBe('Sprint')
  })

  it('saving the same id replaces a cardio plan, a new id appends, and a strength plan sits beside it', async () => {
    const loaded = await loadStore()
    loaded.savePlan(cardio('a', 'Pierwszy'))
    loaded.savePlan(strength('b', 'Siłowy'))
    loaded.savePlan(cardio('c', 'Trzeci'))
    loaded.savePlan(cardio('a', 'Pierwszy zmieniony'))

    expect(loaded.listAllPlans().map((plan) => [plan.id, plan.name])).toEqual([
      ['a', 'Pierwszy zmieniony'],
      ['b', 'Siłowy'],
      ['c', 'Trzeci'],
    ])
  })

  it('getAnyPlan finds the right plan among three of both types, and an unknown id gives undefined', async () => {
    const loaded = await loadStore()
    const first = cardio('c1', 'Pierwszy')
    const second = strength('s2', 'Drugi')
    const third = cardio('c3', 'Trzeci')
    loaded.savePlan(first)
    loaded.savePlan(second)
    loaded.savePlan(third)

    expect(loaded.getAnyPlan('c3')).toEqual(third)
    expect(loaded.getAnyPlan('s2')).toEqual(second)
    expect(loaded.getAnyPlan('c1')).toEqual(first)
    expect(loaded.getAnyPlan('zzz')).toBeUndefined()
  })

  it('listPlans and getPlan return strength plans only', async () => {
    const loaded = await loadStore()
    loaded.savePlan(cardio('c1'))
    loaded.savePlan(strength('s1'))

    expect(loaded.listPlans().map((plan) => plan.id)).toEqual(['s1'])
    expect(loaded.getPlan('c1')).toBeUndefined()
    expect(loaded.getPlan('s1')?.id).toBe('s1')
  })

  it('refuses an invalid cardio plan and writes nothing', async () => {
    const loaded = await loadStore()
    const plan = cardio('c1')
    plan.blocks[0]!.intervals[0]!.seconds = 7
    expect(loaded.savePlan(plan)).toEqual({ ok: false, reason: 'invalid' })
    expect(localStorage.getItem('trening.plans.v1')).toBeNull()
  })

  it('deletes a cardio plan and keeps the others', async () => {
    const loaded = await loadStore()
    loaded.savePlan(cardio('c1'))
    loaded.savePlan(strength('s1'))
    loaded.savePlan(cardio('c2'))
    expect(loaded.deletePlan('c1')).toEqual({ ok: true })
    expect(loaded.listAllPlans().map((plan) => plan.id)).toEqual(['s1', 'c2'])
  })
})

describe('unreadable cardio data', () => {
  it.each([
    ['blocks is not a list', { ...cardio('bad'), blocks: 'x' }],
    ['a block with no intervals list', { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2 }] }],
    [
      'an interval with an unknown kind',
      { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2, intervals: [{ id: 'i', name: 'x', seconds: 30, kind: 'sprint' }] }] },
    ],
    ['an unknown plan type with valid exercises', { ...strength('bad'), type: 'swim' }],
    [
      'an interval with no name',
      { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2, intervals: [{ id: 'i', seconds: 30, kind: 'work' }] }] },
    ],
    [
      'an interval whose name is not a string',
      { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2, intervals: [{ id: 'i', name: 5, seconds: 30, kind: 'work' }] }] },
    ],
    [
      'an interval with no id',
      { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2, intervals: [{ name: 'x', seconds: 30, kind: 'work' }] }] },
    ],
    [
      'a block with no id',
      { ...cardio('bad'), blocks: [{ repeat: 2, intervals: [{ id: 'i', name: 'x', seconds: 30, kind: 'work' }] }] },
    ],
    ['a cardio plan with no blocks', { ...cardio('bad'), blocks: [] }],
    [
      'an interval time off the 5 s step',
      { ...cardio('bad'), blocks: [{ id: 'b', repeat: 2, intervals: [{ id: 'i', name: 'x', seconds: 7, kind: 'work' }] }] },
    ],
  ])('%s is skipped, the valid plans are still listed and nothing is written', async (_label, bad) => {
    store([strength('good'), bad, cardio('c-good')])
    const raw = localStorage.getItem('trening.plans.v1')
    const loaded = await loadStore()

    expect(loaded.listAllPlans().map((plan) => plan.id)).toEqual(['good', 'c-good'])
    expect(loaded.getAnyPlan('bad')).toBeUndefined()
    expect(localStorage.getItem('trening.plans.v1')).toBe(raw)
    expect(corruptKeys()).toEqual([])
  })

  it('a dropped cardio plan stays in the corrupt copy before the next write', async () => {
    const bad = { ...cardio('bad'), blocks: 'x' }
    store([strength('good'), bad])
    const raw = localStorage.getItem('trening.plans.v1')
    const loaded = await loadStore()

    expect(loaded.savePlan(cardio('new'), 11)).toEqual({ ok: true })
    expect(localStorage.getItem('trening.plans.corrupt.11')).toBe(raw)
    expect(loaded.listAllPlans().map((plan) => plan.id)).toEqual(['good', 'new'])
  })

  it('does not write over an unreadable cardio plan when the copy fails', async () => {
    store([{ ...cardio('bad'), blocks: 'x' }])
    const raw = localStorage.getItem('trening.plans.v1')
    const loaded = await loadStore()
    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith('trening.plans.corrupt.')) throw new Error('quota')
      realSetItem.call(this, key, value)
    })

    expect(loaded.savePlan(cardio('new'))).toEqual({ ok: false, reason: 'backup-failed' })
    expect(localStorage.getItem('trening.plans.v1')).toBe(raw)
  })
})

describe('storage format', () => {
  it('keeps the key and version of plans stored before the cardio module', async () => {
    const loaded = await loadStore()
    expect(loaded.PLANS_KEY).toBe('trening.plans.v1')
    loaded.savePlan(cardio('c1'))
    expect(JSON.parse(localStorage.getItem('trening.plans.v1')!).version).toBe(1)
  })
})
