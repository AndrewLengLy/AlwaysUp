import type { Point } from './types'
import { fmtMoney } from './format'

export type ComfortMode = 'honest' | 'comfort' | 'delulu'

export const COMFORT_MODES: { id: ComfortMode; label: string; blurb: string }[] = [
  { id: 'honest', label: 'Honest', blurb: 'Red is red. Not recommended.' },
  {
    id: 'comfort',
    label: 'Comfort',
    blurb: 'Losses are mirrored about what you paid. The shape is real, the direction is not.',
  },
  { id: 'delulu', label: 'Delulu', blurb: 'Every chart ascends. No exceptions, no dips, no notes.' },
]

/**
 * Reflect a price series about a level: p' = 2a - p.
 *
 * The anchor is a fixed point, the shape of the series is preserved exactly, and the
 * direction inverts. A -4.2% slide becomes a visually identical +4.2% climb.
 *
 * Reflecting about a level that means something (the opening price, or the price you
 * paid) rather than about the mean or the plot's midline is what makes the lie coherent:
 * rescale the y-axis to the reflected values and every tick label, high, and low lands on
 * a number that could plausibly have been traded.
 */
export function reflect(points: Point[], anchor?: number): Point[] {
  if (points.length === 0) return []
  const a = anchor ?? points[0].p
  return points.map(({ t, p }) => ({ t, p: 2 * a - p }))
}

/** Move a series bodily up or down the price axis. Shape and direction both survive. */
export function shift(points: Point[], delta: number): Point[] {
  if (delta === 0) return points
  return points.map(({ t, p }) => ({ t, p: p + delta }))
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

/**
 * The comfort transform, described rather than applied.
 *
 * Outside delulu, every comfort is an isometry of the price axis, and a line has exactly
 * two: a reflection, which inverts direction, and a translation, which preserves it.
 * Which one is in force falls out of what needs rescuing.
 *
 * A cost basis changes the question. Without one the app can only comfort you about the
 * session; with one it also has to keep the position out of the red, and a reflection is
 * the wrong tool when the day is already green — it would invert a gain into a loss to
 * rescue a different one. So:
 *
 * | position   | session | transform                | why                                     |
 * | ---------- | ------- | ------------------------ | --------------------------------------- |
 * | up or none | up      | none                     | nothing on screen is a loss             |
 * | up or none | down    | reflect about the open   | the original transform                  |
 * | down       | down    | reflect about your cost  | one reflection fixes the day and the P&L|
 * | down       | up      | lift to clear your cost  | the day is green; a mirror would ruin it|
 *
 * In every rescued case the last point lands on `2 * basis - last`: the position shows a
 * gain of exactly the size of the real loss.
 */
export type Comfort =
  | { kind: 'none' }
  | { kind: 'reflect'; anchor: number }
  | { kind: 'shift'; delta: number }
  | { kind: 'ascend'; lift: number }

export type Distortion = Comfort['kind']

export function comfortOf(points: Point[], mode: ComfortMode, basis?: number | null): Comfort {
  if (mode === 'honest' || points.length === 0) return { kind: 'none' }

  const last = points[points.length - 1].p
  // Where the final price has to end up for the position to read as a gain. Null when
  // there is no cost basis, or when the position is above it already.
  const target = basis != null && basis > 0 && last < basis ? 2 * basis - last : null

  if (mode === 'delulu') {
    // ascend() never ends below the real close, so it only ever needs lifting the rest
    // of the way, and a lift is a translation: the climb it just built is untouched.
    const end = ascend(points)[points.length - 1].p
    return { kind: 'ascend', lift: target === null ? 0 : Math.max(0, target - end) }
  }

  if (target !== null) return isDown(points) ? { kind: 'reflect', anchor: basis! } : { kind: 'shift', delta: target - last }

  return isDown(points) ? { kind: 'reflect', anchor: points[0].p } : { kind: 'none' }
}

export function applyComfort(points: Point[], c: Comfort): Point[] {
  switch (c.kind) {
    case 'none':
      return points
    case 'reflect':
      return reflect(points, c.anchor)
    case 'shift':
      return shift(points, c.delta)
    case 'ascend':
      return shift(ascend(points), c.lift)
  }
}

/** The series the chart should actually draw, for a given comfort mode. */
export function comfortSeries(points: Point[], mode: ComfortMode, basis?: number | null): Point[] {
  return applyComfort(points, comfortOf(points, mode, basis))
}

/** Whether the displayed series departs from reality — drives the flip animation and the badge. */
export function isComforted(points: Point[], mode: ComfortMode, basis?: number | null): boolean {
  return comfortOf(points, mode, basis).kind !== 'none'
}

/**
 * The distortion in force, in one sentence, in the units it was performed in.
 *
 * The mode badge names the genre; this names the operation. A chart that has been lifted
 * $47.20 has not been mirrored, and the app does not get to describe it as if it had.
 */
export function describeComfort(c: Comfort): string | null {
  switch (c.kind) {
    case 'none':
      return null
    case 'reflect':
      return `Mirrored about ${fmtMoney(c.anchor)}. Every move is real; every direction is inverted.`
    case 'shift':
      return `Lifted ${fmtMoney(c.delta)} to clear what you paid. Nothing is mirrored, and the axis moved with it, so the picture is unchanged and only the numbers are wrong.`
    case 'ascend':
      return c.lift > 0
        ? `Rebuilt from damped moves so it only climbs, then lifted ${fmtMoney(c.lift)} past your cost.`
        : 'Rebuilt from damped moves so it only climbs. This is not a price history.'
  }
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
