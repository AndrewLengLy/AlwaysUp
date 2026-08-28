/**
 * A position, as opposed to a session.
 *
 * The chart is about a range; this is about the whole holding — what you paid against
 * what it is worth now. It is the number the app exists to interfere with, so it is
 * derived from the *displayed* series everywhere it appears: one series on screen, and
 * every figure read off it. Nothing here knows about comfort modes.
 */
export type Lot = { shares: number; basis?: number | null }

export type Return = { cost: number; value: number; gain: number; pct: number }

export function returnOf(value: number, cost: number): Return {
  const gain = value - cost
  return { cost, value, gain, pct: cost === 0 ? 0 : (gain / cost) * 100 }
}

/** A single holding's return at a given price per share. */
export function positionAt(price: number, shares: number, basis: number): Return {
  return returnOf(price * shares, basis * shares)
}

/** A usable cost basis, or null. Zero, negative and missing all mean "not set". */
export function basisOf(lot: Lot): number | null {
  return lot.basis != null && Number.isFinite(lot.basis) && lot.basis > 0 ? lot.basis : null
}

/**
 * What a set of holdings cost in total, or null when any one of them has no basis.
 *
 * All or nothing on purpose: a total return computed over some of your holdings is not a
 * total return, and quietly reporting one would be a lie the app has not disclosed.
 */
export function totalCost(lots: Lot[]): number | null {
  let sum = 0
  for (const lot of lots) {
    const basis = basisOf(lot)
    if (basis === null) return null
    sum += lot.shares * basis
  }
  return sum
}

/** How many holdings have no cost basis, so the UI can say so instead of guessing. */
export function missingBasis(lots: Lot[]): number {
  return lots.filter((lot) => basisOf(lot) === null).length
}
