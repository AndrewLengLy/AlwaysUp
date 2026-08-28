import { describe, it, expect } from 'vitest'
import {
  reflect,
  shift,
  isDown,
  ascend,
  comfortOf,
  comfortSeries,
  isComforted,
  describeComfort,
  changeOf,
  extentOf,
  nextFlipTarget,
} from './flip'
import type { Point } from './types'

const series = (...prices: number[]): Point[] => prices.map((p, i) => ({ t: i, p }))

describe('reflect', () => {
  it('keeps the opening price fixed', () => {
    const out = reflect(series(100, 96, 92))
    expect(out[0].p).toBe(100)
  })

  it('turns a loss into an equal and opposite gain', () => {
    const real = series(100, 97, 95.8)
    const flipped = reflect(real)
    expect(changeOf(flipped).pct).toBeCloseTo(-changeOf(real).pct, 10)
  })

  it('preserves the shape: every move keeps its magnitude, inverted', () => {
    const real = series(100, 103, 99, 101, 94)
    const flipped = reflect(real)
    for (let i = 1; i < real.length; i++) {
      const d = real[i].p - real[i - 1].p
      const f = flipped[i].p - flipped[i - 1].p
      expect(f).toBeCloseTo(-d, 10)
    }
  })

  it('spans the same vertical distance, so the redrawn chart is a true mirror', () => {
    const real = series(100, 108, 91, 104)
    const a = extentOf(real)
    const b = extentOf(reflect(real))
    expect(b.max - b.min).toBeCloseTo(a.max - a.min, 10)
  })

  it('is an involution', () => {
    const real = series(100, 93, 111, 88)
    expect(reflect(reflect(real))).toEqual(real)
  })

  it('survives empty input', () => {
    expect(reflect([])).toEqual([])
  })
})

describe('reflect about an explicit anchor', () => {
  it('holds the anchor still instead of the opening price', () => {
    const out = reflect(series(100, 96, 92), 120)
    expect(out.map((d) => d.p)).toEqual([140, 144, 148])
  })

  it('is still an involution, and still spans the same distance', () => {
    const real = series(100, 93, 111, 88)
    expect(reflect(reflect(real, 214), 214)).toEqual(real)
    const a = extentOf(real)
    const b = extentOf(reflect(real, 214))
    expect(b.max - b.min).toBeCloseTo(a.max - a.min, 10)
  })

  it('turns a position underwater into a gain of exactly the same size', () => {
    const real = series(220, 205, 190)
    const basis = 214
    const out = reflect(real, basis)
    const loss = real[2].p - basis
    const gain = out[2].p - basis
    expect(gain).toBeCloseTo(-loss, 10)
  })
})

describe('shift', () => {
  it('moves the level and leaves every move alone', () => {
    const real = series(100, 103, 99)
    const out = shift(real, 12.5)
    expect(out.map((d) => d.p)).toEqual([112.5, 115.5, 111.5])
    expect(changeOf(out).abs).toBeCloseTo(changeOf(real).abs, 10)
  })

  it('returns the input untouched for a zero delta', () => {
    const real = series(100, 103)
    expect(shift(real, 0)).toBe(real)
  })
})

describe('comfortOf', () => {
  const downDay = series(100, 97, 94)
  const upDay = series(100, 103, 106)

  it('does nothing in honest mode, whatever is underwater', () => {
    expect(comfortOf(downDay, 'honest', 200)).toEqual({ kind: 'none' })
  })

  it('without a cost basis, mirrors a down session about its open and leaves a green one', () => {
    expect(comfortOf(downDay, 'comfort')).toEqual({ kind: 'reflect', anchor: 100 })
    expect(comfortOf(upDay, 'comfort')).toEqual({ kind: 'none' })
  })

  it('leaves a profitable position on the original transform', () => {
    // 94 is still above a cost of 80, so there is no position to rescue.
    expect(comfortOf(downDay, 'comfort', 80)).toEqual({ kind: 'reflect', anchor: 100 })
    expect(comfortOf(upDay, 'comfort', 80)).toEqual({ kind: 'none' })
  })

  it('mirrors about your cost when the day and the position are both down', () => {
    expect(comfortOf(downDay, 'comfort', 110)).toEqual({ kind: 'reflect', anchor: 110 })
  })

  /** A reflection inverts every direction, so it cannot rescue a position without
   *  spending the day's gain to do it. That is what the translation is for. */
  it('lifts instead of mirroring when the day is green but the position is not', () => {
    expect(comfortOf(upDay, 'comfort', 110)).toEqual({ kind: 'shift', delta: 8 })
  })

  it('leaves a green day green when it lifts', () => {
    const lifted = comfortSeries(upDay, 'comfort', 110)
    for (let i = 1; i < upDay.length; i++) {
      expect(lifted[i].p - lifted[i - 1].p).toBeCloseTo(upDay[i].p - upDay[i - 1].p, 10)
    }
    expect(changeOf(lifted).abs).toBeGreaterThan(0)
  })

  it('lifts a delulu chart only as far as it has to, and never below zero', () => {
    expect(comfortOf(downDay, 'delulu')).toEqual({ kind: 'ascend', lift: 0 })
    const { kind, lift } = comfortOf(downDay, 'delulu', 300) as { kind: string; lift: number }
    expect(kind).toBe('ascend')
    expect(lift).toBeGreaterThan(0)
  })
})

describe('the position, once there is a cost basis', () => {
  const cases: { points: Point[]; basis: number }[] = [
    { points: series(220, 205, 190), basis: 214 },   // down day, underwater
    { points: series(190, 200, 205), basis: 214 },   // green day, still underwater
    { points: series(220, 205, 190), basis: 100 },   // down day, in profit
    { points: series(100, 103, 106), basis: 100 },   // green day, in profit
    { points: series(50, 50, 50), basis: 60 },       // flat day, underwater
    { points: series(12, 3, 40, 1), basis: 9 },      // nonsense, underwater
  ]

  it('never draws a position below what it cost, outside honest mode', () => {
    for (const mode of ['comfort', 'delulu'] as const) {
      for (const { points, basis } of cases) {
        const out = comfortSeries(points, mode, basis)
        expect(out[out.length - 1].p).toBeGreaterThanOrEqual(basis)
      }
    }
  })

  it('never draws a losing session either', () => {
    for (const mode of ['comfort', 'delulu'] as const) {
      for (const { points, basis } of cases) {
        expect(changeOf(comfortSeries(points, mode, basis)).abs).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('turns the loss into a gain of exactly its own size, whichever transform runs', () => {
    for (const { points, basis } of cases) {
      const last = points[points.length - 1].p
      if (last >= basis) continue
      const out = comfortSeries(points, 'comfort', basis)
      expect(out[out.length - 1].p).toBeCloseTo(2 * basis - last, 10)
      expect(out[out.length - 1].p - basis).toBeCloseTo(basis - last, 10)
    }
  })

  it('flags a comforted position even on a day that needed no help', () => {
    expect(isComforted(series(190, 200, 205), 'comfort', 214)).toBe(true)
    expect(isComforted(series(190, 200, 205), 'comfort', 100)).toBe(false)
    expect(isComforted(series(190, 200, 205), 'comfort')).toBe(false)
  })

  it('ignores a basis that is not a usable price', () => {
    expect(comfortOf(series(100, 103), 'comfort', 0)).toEqual({ kind: 'none' })
    expect(comfortOf(series(100, 103), 'comfort', -5)).toEqual({ kind: 'none' })
    expect(comfortOf(series(100, 103), 'comfort', null)).toEqual({ kind: 'none' })
  })
})

describe('describeComfort', () => {
  it('says nothing when nothing was done, and names the operation when something was', () => {
    expect(describeComfort({ kind: 'none' })).toBeNull()
    expect(describeComfort({ kind: 'reflect', anchor: 214 })).toContain('Mirrored')
    // A lift is not a mirror, and does not get to be described as one.
    const lifted = describeComfort({ kind: 'shift', delta: 47.2 })!
    expect(lifted).toContain('Lifted')
    expect(lifted).toContain('47.20')
  })
})

describe('isDown', () => {
  it('compares the close against the open, not the trough', () => {
    expect(isDown(series(100, 80, 101))).toBe(false)
    expect(isDown(series(100, 130, 99))).toBe(true)
  })

  it('treats an unchanged or single-point series as not down', () => {
    expect(isDown(series(100, 100))).toBe(false)
    expect(isDown(series(100))).toBe(false)
    expect(isDown([])).toBe(false)
  })
})

describe('ascend', () => {
  it('never loses ground, whatever it is fed', () => {
    for (const input of [series(100, 90, 80, 70), series(100, 100, 100), series(50, 61, 44, 70, 39)]) {
      const out = ascend(input)
      for (let i = 1; i < out.length; i++) {
        expect(out[i].p).toBeGreaterThan(out[i - 1].p)
      }
    }
  })

  it('opens at the real opening price', () => {
    expect(ascend(series(100, 90, 80))[0].p).toBe(100)
  })

  it('keeps the timestamps intact', () => {
    const input = series(100, 90, 95)
    expect(ascend(input).map((d) => d.t)).toEqual(input.map((d) => d.t))
  })

  it('lifts a flat line anyway', () => {
    const out = ascend(series(100, 100, 100))
    expect(out[2].p).toBeGreaterThan(out[0].p)
  })
})

describe('comfortSeries', () => {
  const loser = series(100, 97, 94)
  const winner = series(100, 103, 106)

  it('honest mode changes nothing', () => {
    expect(comfortSeries(loser, 'honest')).toEqual(loser)
  })

  it('comfort mode leaves winners alone', () => {
    expect(comfortSeries(winner, 'comfort')).toEqual(winner)
  })

  it('comfort mode rescues losers', () => {
    expect(changeOf(comfortSeries(loser, 'comfort')).pct).toBeGreaterThan(0)
  })

  it('delulu mode rescues everything', () => {
    expect(changeOf(comfortSeries(loser, 'delulu')).pct).toBeGreaterThan(0)
    expect(changeOf(comfortSeries(winner, 'delulu')).pct).toBeGreaterThan(0)
  })

  it('never shows a loss outside honest mode', () => {
    for (const mode of ['comfort', 'delulu'] as const) {
      for (const input of [loser, winner, series(100, 100), series(12, 3, 40, 1)]) {
        expect(changeOf(comfortSeries(input, mode)).pct).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('isComforted', () => {
  it('flags exactly when the picture departs from reality', () => {
    expect(isComforted(series(100, 94), 'honest')).toBe(false)
    expect(isComforted(series(100, 94), 'comfort')).toBe(true)
    expect(isComforted(series(100, 106), 'comfort')).toBe(false)
    expect(isComforted(series(100, 106), 'delulu')).toBe(true)
  })
})

describe('nextFlipTarget', () => {
  it('toggles, so the flip can be run over and over', () => {
    let parked = 0
    const landed: number[] = []
    for (let i = 0; i < 6; i++) {
      parked = nextFlipTarget(parked)
      landed.push(parked)
    }
    expect(landed).toEqual([1, 0, 1, 0, 1, 0])
  })

  it('resolves a half-scrubbed chart to whichever side it has not committed to', () => {
    expect(nextFlipTarget(0.2)).toBe(1)
    expect(nextFlipTarget(0.5)).toBe(1)
    expect(nextFlipTarget(0.51)).toBe(0)
    expect(nextFlipTarget(0.9)).toBe(0)
  })
})
