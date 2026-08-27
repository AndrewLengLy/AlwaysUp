import type { Point } from './types'

export type ComfortMode = 'honest' | 'comfort' | 'delulu'

export const COMFORT_MODES: { id: ComfortMode; label: string; blurb: string }[] = [
  { id: 'honest', label: 'Honest', blurb: 'Red is red. Not recommended.' },
  { id: 'comfort', label: 'Comfort', blurb: 'Losses are mirrored. The shape is real, the direction is not.' },
  { id: 'delulu', label: 'Delulu', blurb: 'Every chart ascends. No exceptions, no dips, no notes.' },
]

/**
 * Reflect a price series about its own first point: p' = 2 * p[0] - p.
 *
 * The opening price is a fixed point, the shape of the day is preserved exactly,
 * and the direction inverts. A -4.2% slide becomes a visually identical +4.2% climb.
 *
 * Reflecting about p[0] (rather than the mean, or the plot's midline) is what makes
 * the lie coherent: rescale the y-axis to the reflected values and every tick label,
 * high, and low lands on a number that could plausibly have been traded today.
 */
export function reflect(points: Point[]): Point[] {
  if (points.length === 0) return []
  const anchor = points[0].p
  return points.map(({ t, p }) => ({ t, p: 2 * anchor - p }))
}

/** True when the series ends below where it opened. */
export function isDown(points: Point[]): boolean {
  if (points.length < 2) return false
  return points[points.length - 1].p < points[0].p
}

/**
 * Delulu mode. Keep the texture of the real series, remove the concept of "down":
 * up moves pass through at full amplitude, down moves are folded upward and damped,
 * so the line still looks like a market and never once loses ground.
 */
export function ascend(points: Point[]): Point[] {
  if (points.length === 0) return []

  const deltas: number[] = []
  for (let i = 1; i < points.length; i++) deltas.push(points[i].p - points[i - 1].p)

  const avgAbs = deltas.length ? deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length : 0
  // A flat input is still not allowed to be flat.
  const floor = avgAbs > 0 ? avgAbs * 0.05 : Math.abs(points[0].p) * 0.0004 || 0.01

  const out: Point[] = [{ ...points[0] }]
  for (let i = 0; i < deltas.length; i++) {
    const d = deltas[i]
    const lifted = d >= 0 ? d : -d * 0.35
    out.push({ t: points[i + 1].t, p: out[i].p + Math.max(lifted, floor) })
  }
  return out
}

/** The series the chart should actually draw, for a given comfort mode. */
export function comfortSeries(points: Point[], mode: ComfortMode): Point[] {
  switch (mode) {
    case 'honest':
      return points
    case 'comfort':
      return isDown(points) ? reflect(points) : points
    case 'delulu':
      return ascend(points)
  }
}

/** Whether the displayed series departs from reality — drives the flip animation and the badge. */
export function isComforted(points: Point[], mode: ComfortMode): boolean {
  if (mode === 'honest') return false
  if (mode === 'delulu') return true
  return isDown(points)
}

/**
 * Where a deliberate flip should land, given where the chart is currently parked.
 *
 * The flip has to be repeatable and it has to work from a half-scrubbed position, so it
 * is a toggle about the midpoint rather than a counter: anything past half way falls back
 * to the comforting version, anything short of it goes to reality.
 */
export function nextFlipTarget(parked: number): 0 | 1 {
  return parked > 0.5 ? 0 : 1
}

export type Change = { abs: number; pct: number; from: number; to: number }

export function changeOf(points: Point[]): Change {
  if (points.length === 0) return { abs: 0, pct: 0, from: 0, to: 0 }
  const from = points[0].p
  const to = points[points.length - 1].p
  const abs = to - from
  return { abs, pct: from === 0 ? 0 : (abs / from) * 100, from, to }
}

export function extentOf(points: Point[]): { min: number; max: number } {
  if (points.length === 0) return { min: 0, max: 1 }
  let min = Infinity
  let max = -Infinity
  for (const { p } of points) {
    if (p < min) min = p
    if (p > max) max = p
  }
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
}
