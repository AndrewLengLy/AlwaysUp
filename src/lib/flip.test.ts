import { describe, it, expect } from 'vitest'
import { reflect, isDown, ascend, comfortSeries, isComforted, changeOf, extentOf, nextFlipTarget } from './flip'
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
