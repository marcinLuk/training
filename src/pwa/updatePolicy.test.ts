import { describe, expect, it } from 'vitest'
import { shouldApplyUpdate, type UpdateState } from './updatePolicy'

const SAFE: UpdateState = { updateWaiting: true, planListShown: true, workoutRunning: false, alreadyApplied: false }

describe('shouldApplyUpdate', () => {
  it('applies a waiting update on the plan list with no workout', () => {
    expect(shouldApplyUpdate(SAFE)).toBe(true)
  })

  it('does nothing when no update waits', () => {
    expect(shouldApplyUpdate({ ...SAFE, updateWaiting: false })).toBe(false)
  })

  it('waits when the plan list is not on screen', () => {
    expect(shouldApplyUpdate({ ...SAFE, planListShown: false })).toBe(false)
  })

  it('waits while a workout runs', () => {
    expect(shouldApplyUpdate({ ...SAFE, workoutRunning: true })).toBe(false)
  })

  it('does not apply twice', () => {
    expect(shouldApplyUpdate({ ...SAFE, alreadyApplied: true })).toBe(false)
  })
})
