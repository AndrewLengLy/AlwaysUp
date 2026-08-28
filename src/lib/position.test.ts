import { describe, it, expect } from 'vitest'
import { basisOf, missingBasis, positionAt, returnOf, totalCost } from './position'

describe('returnOf', () => {
  it('reports the gain and the percentage against what it cost', () => {
    const r = returnOf(5400, 5000)
    expect(r.gain).toBe(400)
    expect(r.pct).toBeCloseTo(8, 10)
  })

  it('does not divide by a zero cost', () => {
    expect(returnOf(120, 0).pct).toBe(0)
  })
})

describe('positionAt', () => {
  it('multiplies out to the whole holding', () => {
    const r = positionAt(190, 25, 214)
    expect(r.cost).toBe(5350)
    expect(r.value).toBe(4750)
    expect(r.gain).toBe(-600)
    expect(r.pct).toBeCloseTo(-11.2149, 3)
  })
})

describe('basisOf', () => {
  it('treats missing, zero, negative and nonsense as "not set"', () => {
    expect(basisOf({ shares: 1 })).toBeNull()
    expect(basisOf({ shares: 1, basis: null })).toBeNull()
    expect(basisOf({ shares: 1, basis: 0 })).toBeNull()
    expect(basisOf({ shares: 1, basis: -4 })).toBeNull()
    expect(basisOf({ shares: 1, basis: NaN })).toBeNull()
    expect(basisOf({ shares: 1, basis: 214 })).toBe(214)
  })
})

describe('totalCost', () => {
  it('adds up what the whole portfolio cost', () => {
    expect(totalCost([{ shares: 25, basis: 214 }, { shares: 12, basis: 468 }])).toBe(25 * 214 + 12 * 468)
  })

  /** A total return computed over some of your holdings is not a total return. */
  it('refuses to report a total when any holding has no entry price', () => {
    expect(totalCost([{ shares: 25, basis: 214 }, { shares: 12 }])).toBeNull()
  })

  it('costs nothing to own nothing', () => {
    expect(totalCost([])).toBe(0)
  })
})

describe('missingBasis', () => {
  it('counts the holdings that still need a cost', () => {
    expect(missingBasis([{ shares: 1, basis: 10 }, { shares: 2 }, { shares: 3, basis: 0 }])).toBe(2)
  })
})
