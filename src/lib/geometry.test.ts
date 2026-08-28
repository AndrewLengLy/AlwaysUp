import { describe, it, expect } from 'vitest'
import { clamp01, lerp, lerpArray, project, niceTicks } from './geometry'
import { reflect, shift } from './flip'
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

describe('what a self-scaled axis normalises away', () => {
  const real = series(190, 200, 205)

  /**
   * Scaling every version to its own extent is what lets each be drawn as if it were the
   * real price history — and it means a lift is undetectable from the picture. The line
   * lands on identical pixels; only the axis labels and the figures change. The app does
   * not fight this by holding the two to one axis, because that would squash the shape
   * flat exactly when the lift is largest, and the shape is the one thing it never
   * distorts. It says what it did instead: see describeComfort().
   */
  it('draws a lifted series exactly on top of the original', () => {
    const a = project(real, plot)
    const b = project(shift(real, 23), plot)
    a.ys.forEach((y, i) => expect(b.ys[i]).toBeCloseTo(y, 6))
  })

  it('reports the moved domain, which is the only place the lift shows up', () => {
    const a = project(real, plot)
    const b = project(shift(real, 23), plot)
    expect(b.min - a.min).toBeCloseTo(23, 6)
    expect(b.max - a.max).toBeCloseTo(23, 6)
  })
})

describe('the fold axis, when the anchor is what you paid', () => {
  const inset = { x: 4, y: 18, w: 100, h: 200 }
  const yIn = (p: { min: number; max: number }, v: number) =>
    inset.y + inset.h - ((v - p.min) / (p.max - p.min)) * inset.h

  /**
   * Reflection about an arbitrary level is still an exact mirror in pixels, because it
   * still spans the same distance. The chart depends on this for a flip anchored on a
   * cost basis rather than on the open.
   */
  it('is still a pixel-exact mirror about the plot midline', () => {
    const real = series(220, 205, 190, 198)
    const a = project(real, inset)
    const b = project(reflect(real, 214), inset)
    const mid = inset.y + inset.h / 2
    a.ys.forEach((y, i) => expect(b.ys[i]).toBeCloseTo(2 * mid - y, 6))
  })

  /**
   * The anchor is the one price that sits at the same height in both frames once you
   * average them — which is why the break-even line, the reflection axis and the flat
   * line all arrive in the same place half way through a flip anchored on your cost.
   */
  it('puts the anchor itself on the midline at the half way point', () => {
    const real = series(220, 205, 190, 198)
    const basis = 214
    const a = project(real, inset)
    const b = project(reflect(real, basis), inset)
    expect((yIn(a, basis) + yIn(b, basis)) / 2).toBeCloseTo(inset.y + inset.h / 2, 6)
  })

  /**
   * A lift gets the same beat for free. The line does not move — it cannot, on a
   * self-scaled axis — but break-even sweeps across it and meets the last point exactly
   * half way, which is the moment the position is worth precisely what it cost.
   */
  it('sweeps break-even onto the end of the line at the half way point of a lift', () => {
    const real = series(190, 200, 205)
    const basis = 214
    const last = real[real.length - 1].p
    const a = project(real, inset)
    const b = project(shift(real, 2 * (basis - last)), inset)
    expect((yIn(a, basis) + yIn(b, basis)) / 2).toBeCloseTo(a.ys[a.ys.length - 1], 6)
  })
})
