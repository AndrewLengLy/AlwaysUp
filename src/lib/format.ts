import type { Range } from './types'

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const fmtMoney = (n: number) => `$${money.format(n)}`
export const fmtMoney0 = (n: number) => `$${money0.format(n)}`
export const fmtPrice = (n: number) => money.format(n)

export const fmtSigned = (n: number) => `${n >= 0 ? '+' : '−'}${money.format(Math.abs(n))}`
export const fmtPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`

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
