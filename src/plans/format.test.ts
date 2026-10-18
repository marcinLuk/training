import { describe, expect, it } from 'vitest'
import { formatRest } from './format'

describe('formatRest', () => {
  it('shows seconds as m:ss', () => {
    expect(formatRest(0)).toBe('0:00')
    expect(formatRest(15)).toBe('0:15')
    expect(formatRest(90)).toBe('1:30')
    expect(formatRest(600)).toBe('10:00')
  })
})
