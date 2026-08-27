import { describe, it, expect } from 'vitest'
import { clamp01, lerp, lerpArray, project, niceTicks } from './geometry'
import { reflect } from './flip'
import type { Point } from './types'

const series = (...prices: number[]): Point[] => prices.map((p, i) => ({ t: i, p }))
const plot = { x: 0, y: 0, w: 100, h: 200 }

describe('morph clamping', () => {
  it('clamps overshoot, so a springy animation cannot throw the line out of the plot', () => {
    expect(clamp01(1.4)).toBe(1)
    expect(clamp01(-0.3)).toBe(0)
    expect(lerp(10, 20, 1.5)).toBe(20)
    expect(lerp(10, 20, -0.5)).toBe(10)
    expect(lerpArray([0, 10], [100, 110], 1.8)).toEqual([100, 110])
  })

  it('interpolates normally inside the range', () => {
    expect(lerpArray([0, 10], [100, 110], 0.5)).toEqual([50, 60])
  })
})

describe('project', () => {
  it('draws a reflected series as an exact vertical mirror', () => {
    const real = series(100, 108, 91, 104, 96)
    const a = project(real, plot)
    const b = project(reflect(real), plot)
    // y' = plotHeight - y, which is what makes the flip animation a true mirror.
    a.ys.forEach((y, i) => expect(b.ys[i]).toBeCloseTo(plot.h - y, 6))
  })

  it('keeps every point inside the plot', () => {
    const { ys } = project(series(100, 130, 70, 110), plot)
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(plot.y)
      expect(y).toBeLessThanOrEqual(plot.y + plot.h)
    }
  })

  it('survives a perfectly flat series without dividing by zero', () => {
    const { ys } = project(series(50, 50, 50), plot)
    for (const y of ys) expect(Number.isFinite(y)).toBe(true)
  })
})

describe('niceTicks', () => {
  it('returns round numbers inside the domain', () => {
    const ticks = niceTicks(28.4, 31.6, 4)
    expect(ticks.length).toBeGreaterThan(1)
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(28.4)
      expect(t).toBeLessThanOrEqual(31.6)
    }
  })

  it('does not hang on a zero span', () => {
    expect(niceTicks(5, 5)).toEqual([5])
  })
})

describe('the fold axis', () => {
  /**
   * In price space the reflection is about the opening price. In pixel space, once the
   * axis has been rescaled to the reflected values, it lands on the plot's own horizontal
   * midline. The chart draws a "reflection axis" line there during a flip, so this is the
   * fact that line depends on.
   */
  const inset = { x: 4, y: 18, w: 100, h: 200 }

  it('is the plot midline, whatever the plot is inset by', () => {
    const real = series(100, 96, 103, 88, 94)
    const a = project(real, inset)
    const b = project(reflect(real), inset)
    const mid = inset.y + inset.h / 2
    a.ys.forEach((y, i) => expect(b.ys[i]).toBeCloseTo(2 * mid - y, 6))
  })

  it('leaves the morph passing exactly through flat at the half way point', () => {
    const real = series(100, 96, 103, 88, 94)
    const a = project(real, inset)
    const b = project(reflect(real), inset)
    const half = lerpArray(a.ys, b.ys, 0.5)
    for (const y of half) expect(y).toBeCloseTo(inset.y + inset.h / 2, 6)
  })
})
