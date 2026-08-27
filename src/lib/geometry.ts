import type { Point } from './types'
import { extentOf } from './flip'

export type Plot = { x: number; y: number; w: number; h: number }

/** Map a series into pixel space. Domains are padded by a fraction of their own span,
 *  which keeps a reflected series an exact vertical mirror of the original. */
export function project(points: Point[], plot: Plot, pad = 0.08): { xs: number[]; ys: number[]; min: number; max: number } {
  const { min, max } = extentOf(points)
  const span = max - min
  const lo = min - span * pad
  const hi = max + span * pad
  const n = points.length
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    xs.push(plot.x + (n === 1 ? plot.w / 2 : (i / (n - 1)) * plot.w))
    ys.push(plot.y + plot.h - ((points[i].p - lo) / (hi - lo)) * plot.h)
  }
  return { xs, ys, min: lo, max: hi }
}

export function linePath(xs: number[], ys: number[]): string {
  if (!xs.length) return ''
  let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`
  return d
}

export function areaPath(xs: number[], ys: number[], baseline: number): string {
  if (!xs.length) return ''
  const last = xs.length - 1
  return `${linePath(xs, ys)} L ${xs[last].toFixed(2)} ${baseline.toFixed(2)} L ${xs[0].toFixed(2)} ${baseline.toFixed(2)} Z`
}

/**
 * Springs overshoot. Unclamped, an overshoot past 1 extrapolates beyond the honest
 * series — and since the two series are mirror images, that throws the line clean out
 * of the plot. The morph factor is always clamped.
 */
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export const lerpArray = (a: number[], b: number[], t: number): number[] => {
  const k = clamp01(t)
  return a.map((v, i) => v + (b[i] - v) * k)
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t)

/** Four ticks, rounded to something a human would print on an axis. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step * 0.001; v += step) out.push(Number(v.toFixed(6)))
  return out
}
