import type { Range } from './types'

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const fmtMoney = (n: number) => `$${money.format(n)}`
export const fmtMoney0 = (n: number) => `$${money0.format(n)}`
export const fmtPrice = (n: number) => money.format(n)

/**
 * Rounded to the precision it will be displayed at.
 *
 * The sign has to be decided on the number that gets printed, not on the one behind it:
 * park a flip exactly half way and the change lands on a floating-point hair below zero,
 * which reads as a red "−0.00" next to a green "+0.00" of the same quantity. Rounding
 * first also collapses -0 into a value that compares as positive, so zero is written the
 * one way everywhere.
 */
export const cents = (n: number) => Math.round(n * 100) / 100

export const fmtSigned = (n: number) => {
  const v = cents(n)
  return `${v >= 0 ? '+' : '−'}${money.format(Math.abs(v))}`
}

/**
 * A position for a sentence that has already said which way it went in words.
 *
 * The direction word and the figure beside it must not be able to disagree, so the figure
 * carries no sign: the word says which way, the number says how far. Both are read off
 * the same rounded value, for the reason `cents` gives — a loss too small to survive
 * rounding reads as "up 0.00" rather than as "down" something that prints as nothing.
 */
export const fmtSpokenReturn = (gain: number, pct: number) => {
  const g = cents(gain)
  return `${g >= 0 ? 'up' : 'down'} ${fmtPrice(Math.abs(g))}, ${Math.abs(cents(pct)).toFixed(2)} percent`
}

export const fmtPct = (n: number) => {
  const v = cents(n)
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`
}

export function fmtVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

export function fmtAxisTime(t: number, range: Range): string {
  const d = new Date(t)
  if (range === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (range === '1W' || range === '1M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (range === '3M' || range === '1Y') return d.toLocaleDateString('en-US', { month: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export const RANGE_LABEL: Record<Range, string> = {
  '1D': 'today',
  '1W': 'this week',
  '1M': 'this month',
  '3M': 'this quarter',
  '1Y': 'this year',
  ALL: 'all time',
}
