import type { DataSource, Point, Quote, Range } from './types'
import { mockQuote, mockSource } from './mock'

/**
 * Optional live adapter (Alpha Vantage). Enabled only when VITE_ALPHAVANTAGE_KEY is set;
 * the free tier is roughly 25 requests a day, so any failure — missing key, rate limit,
 * unknown symbol — falls back to the simulated source rather than showing an error state.
 *
 * Real prices do not make the app more honest. The chart still flips.
 */

const KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY as string | undefined
export const LIVE_AVAILABLE = Boolean(KEY)

const TAIL: Record<Range, number> = { '1D': 79, '1W': 6, '1M': 23, '3M': 66, '1Y': 253, ALL: 5000 }

function parse(json: Record<string, unknown>, range: Range): Point[] {
  const key = Object.keys(json).find((k) => k.startsWith('Time Series'))
  if (!key) throw new Error(String(json['Note'] ?? json['Error Message'] ?? json['Information'] ?? 'unexpected payload'))
  const table = json[key] as Record<string, Record<string, string>>
  const points = Object.entries(table)
    .map(([stamp, row]) => ({
      t: Date.parse(stamp.includes(':') ? stamp.replace(' ', 'T') : stamp),
      p: Number(row['4. close']),
    }))
    .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.p))
    .sort((a, b) => a.t - b.t)

  if (points.length < 2) throw new Error('not enough data')

  if (range === '1D') {
    // Trim to the final session only.
    const lastDay = new Date(points[points.length - 1].t).toDateString()
    const session = points.filter((d) => new Date(d.t).toDateString() === lastDay)
    return session.length >= 2 ? session : points.slice(-TAIL['1D'])
  }
  return points.slice(-TAIL[range])
}

async function fetchQuote(ticker: string, range: Range): Promise<Quote> {
  const fn = range === '1D' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY'
  const params = new URLSearchParams({ function: fn, symbol: ticker, apikey: KEY! })
  if (range === '1D') params.set('interval', '5min')
  else params.set('outputsize', range === '1Y' || range === 'ALL' ? 'full' : 'compact')

  const res = await fetch(`https://www.alphavantage.co/query?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const points = parse(await res.json(), range)

  return {
    ticker,
    name: ticker,
    range,
    points,
    prevClose: points[0].p,
    volume: 0,
    source: 'live',
  }
}

export const liveSource: DataSource = {
  id: 'live',
  label: 'Live',
  async getQuote(ticker, range) {
    const symbol = ticker.toUpperCase()
    if (!KEY) return mockQuote(symbol, range)
    try {
      return await fetchQuote(symbol, range)
    } catch (err) {
      console.warn(`[AlwaysUp] live quote for ${symbol} failed, using simulated data:`, err)
      return mockQuote(symbol, range)
    }
  },
  search: mockSource.search,
}
