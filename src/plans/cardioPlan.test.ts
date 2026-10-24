import { describe, expect, it } from 'vitest'
import {
  clonePlan,
  createBlock,
  createCardioPlan,
  createInterval,
  createPlan,
  expandCardioPlan,
  isCardioPlan,
  summarizePlan,
  validatePlan,
  type CardioPlan,
} from './plan'

function cardio(overrides: Partial<CardioPlan> = {}): CardioPlan {
  return { ...createCardioPlan(), id: 'c1', name: 'Bieg z rozgrzewką', ...overrides }
}

function paths(plan: CardioPlan): string[] {
  return validatePlan(plan).map((error) => error.path)
}

describe('cardio factories', () => {
  it('a new cardio plan has one block of 8 repeats with Praca 30 s and Odpoczynek 30 s', () => {
    const plan = createCardioPlan()
    expect(plan.type).toBe('cardio')
    expect(plan.blocks).toHaveLength(1)
    expect(plan.blocks[0]?.repeat).toBe(8)
    expect(plan.blocks[0]?.intervals.map(({ name, seconds, kind }) => ({ name, seconds, kind }))).toEqual([
      { name: 'Praca', seconds: 30, kind: 'work' },
      { name: 'Odpoczynek', seconds: 30, kind: 'rest' },
    ])
  })

  it('createInterval names the interval with the Polish word of its type', () => {
    expect(createInterval('work').name).toBe('Praca')
    expect(createInterval('rest').name).toBe('Odpoczynek')
    expect(createInterval('rest').kind).toBe('rest')
  })

  it('plans, blocks and intervals get distinct ids', () => {
    expect(createCardioPlan().id).not.toBe(createCardioPlan().id)
    expect(createBlock().id).not.toBe(createBlock().id)
    expect(createInterval('work').id).not.toBe(createInterval('work').id)
  })

  it('isCardioPlan tells cardio from a strength plan with or without a type', () => {
    expect(isCardioPlan(createCardioPlan())).toBe(true)
    expect(isCardioPlan(createPlan())).toBe(false)
    expect(isCardioPlan({ ...createPlan(), type: 'strength' })).toBe(false)
  })
})

describe('validatePlan for cardio', () => {
  it('accepts a valid plan and the limit values', () => {
    expect(validatePlan(cardio())).toEqual([])
    const edge = cardio()
    edge.blocks[0]!.repeat = 20
    edge.blocks[0]!.intervals[0]!.seconds = 5
    edge.blocks[0]!.intervals[1]!.seconds = 3600
    expect(validatePlan(edge)).toEqual([])
    edge.blocks[0]!.repeat = 1
    expect(validatePlan(edge)).toEqual([])
  })

  it('rejects an empty name, with a Polish message', () => {
    const errors = validatePlan(cardio({ name: '   ' }))
    expect(errors).toEqual([{ path: 'name', message: 'Wpisz nazwę planu.' }])
  })

  it('rejects a plan with no blocks', () => {
    expect(validatePlan(cardio({ blocks: [] }))).toEqual([
      { path: 'blocks', message: 'Dodaj co najmniej jeden blok.' },
    ])
  })

  it('rejects a block with no intervals and names the block', () => {
    const plan = cardio()
    plan.blocks.push({ ...createBlock(), intervals: [] })
    expect(validatePlan(plan)).toEqual([
      { path: 'blocks.1.intervals', message: 'Blok 2: dodaj co najmniej jeden interwał.' },
    ])
  })

  it.each([0, 21, 2.5, Number.NaN])('rejects repeat %s', (repeat) => {
    const plan = cardio()
    plan.blocks[0]!.repeat = repeat
    expect(validatePlan(plan)).toEqual([
      { path: 'blocks.0.repeat', message: 'Blok 1: ustaw powtórzenia od 1 do 20.' },
    ])
  })

  it.each([0, 4, 7, 3601, 3605, 12.5, Number.NaN])('rejects %s seconds', (seconds) => {
    const plan = cardio()
    plan.blocks[0]!.intervals[1]!.seconds = seconds
    expect(validatePlan(plan)).toEqual([
      {
        path: 'blocks.0.intervals.1.seconds',
        message: 'Blok 1, interwał 2: ustaw czas od 5 do 3600 s, co 5 s.',
      },
    ])
  })

  it('rejects an empty interval name and points at the right block and interval', () => {
    const plan = cardio()
    plan.blocks.push(createBlock())
    plan.blocks[1]!.intervals[0]!.name = '  '
    expect(validatePlan(plan)).toEqual([
      { path: 'blocks.1.intervals.0.name', message: 'Blok 2: wpisz nazwę interwału 1.' },
    ])
  })

  it('collects several errors at once', () => {
    const plan = cardio({ name: '' })
    plan.blocks[0]!.repeat = 0
    plan.blocks[0]!.intervals[0]!.seconds = 7
    expect(paths(plan)).toEqual(['name', 'blocks.0.repeat', 'blocks.0.intervals.0.seconds'])
  })

  it('strength validation is unchanged for a plan with a strength type', () => {
    expect(validatePlan({ type: 'strength', id: 'a', name: '', exercises: [] }).map((e) => e.path)).toEqual([
      'name',
      'exercises',
    ])
  })
})

describe('expandCardioPlan', () => {
  it('repeats each block in order and keeps name, seconds and kind only', () => {
    const plan = cardio({
      blocks: [
        {
          id: 'b1',
          repeat: 1,
          intervals: [{ id: 'i1', name: 'Rozgrzewka', seconds: 300, kind: 'work' }],
        },
        {
          id: 'b2',
          repeat: 2,
          intervals: [
            { id: 'i2', name: 'Sprint', seconds: 20, kind: 'work' },
            { id: 'i3', name: 'Trucht', seconds: 40, kind: 'rest' },
          ],
        },
      ],
    })
    expect(expandCardioPlan(plan)).toEqual([
      { name: 'Rozgrzewka', seconds: 300, kind: 'work' },
      { name: 'Sprint', seconds: 20, kind: 'work' },
      { name: 'Trucht', seconds: 40, kind: 'rest' },
      { name: 'Sprint', seconds: 20, kind: 'work' },
      { name: 'Trucht', seconds: 40, kind: 'rest' },
    ])
  })

  it('the default plan expands to 16 intervals', () => {
    expect(expandCardioPlan(createCardioPlan())).toHaveLength(16)
  })
})

describe('summarizePlan for cardio', () => {
  it('shows the interval count after repeats and the total time as m:ss', () => {
    expect(summarizePlan(cardio())).toBe('16 interwałów, 8:00')
  })

  it.each([
    [1, 'interwał'],
    [2, 'interwały'],
    [4, 'interwały'],
    [5, 'interwałów'],
    [12, 'interwałów'],
    [22, 'interwały'],
  ])('%s intervals uses the right Polish plural', (count, word) => {
    const plan = cardio()
    plan.blocks = [
      { id: 'b', repeat: 1, intervals: Array.from({ length: count }, () => createInterval('work')) },
    ]
    expect(summarizePlan(plan)).toBe(`${count} ${word}, ${Math.floor((count * 30) / 60)}:${String((count * 30) % 60).padStart(2, '0')}`)
  })

  it('a strength plan still shows exercises and sets', () => {
    const strength = createPlan()
    strength.exercises = []
    expect(summarizePlan(strength)).toBe('0 ćwiczeń, 0 serii')
  })
})

describe('clonePlan for cardio', () => {
  it('copies blocks and intervals deeply and keeps the type', () => {
    const original = cardio()
    const copy = clonePlan(original)
    expect(copy).toEqual(original)
    expect(copy.type).toBe('cardio')

    copy.name = 'Inny'
    copy.blocks[0]!.repeat = 3
    copy.blocks[0]!.intervals[0]!.seconds = 60
    expect(original.name).toBe('Bieg z rozgrzewką')
    expect(original.blocks[0]!.repeat).toBe(8)
    expect(original.blocks[0]!.intervals[0]!.seconds).toBe(30)
  })

  it('a strength plan with no type is cloned with no type', () => {
    const original = { id: 'a', name: 'Nogi', exercises: [] }
    expect(clonePlan(original)).toEqual(original)
    expect('type' in clonePlan(original)).toBe(false)
  })
})
