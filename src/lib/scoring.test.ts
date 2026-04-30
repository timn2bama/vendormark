import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from './scoring'

describe('calculateRiskScore', () => {
  it('returns 100 for no negative factors', () => {
    expect(calculateRiskScore([], [], [])).toBe(100)
  })

  it('penalties breaches by 15 points each', () => {
    const breaches = [{ id: '1' }] as any
    expect(calculateRiskScore(breaches, [], [])).toBe(85)
  })

  it('applies vulnerability severity penalties', () => {
    const vulns = [
      { severity: 'CRITICAL' },
      { severity: 'HIGH' },
      { severity: 'MEDIUM' },
      { severity: 'LOW' }
    ] as any
    // 100 - 10 - 7 - 4 - 1 = 78
    expect(calculateRiskScore([], vulns, [])).toBe(78)
  })

  it('clamps the score between 0 and 100', () => {
    const manyBreaches = Array(10).fill({ id: '1' }) as any
    expect(calculateRiskScore(manyBreaches, [], [])).toBe(0)
  })

  it('applies compliance document penalties', () => {
    const docs = [
      { status: 'Gaps Identified' },
      { status: 'Expired' }
    ] as any
    // 100 - 20 - 25 = 55
    expect(calculateRiskScore([], [], docs)).toBe(55)
  })
})
