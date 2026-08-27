import type { DataSource, Point, Quote, Range } from './types'
import { mockQuote } from './mock'
import { knownName, rememberName } from './names'
import { readCache, writeCache } from './cache'

/**
 * Alpha Vantage, behind VITE_ALPHAVANTAGE_KEY. It sends CORS headers, so unlike the
 * Yahoo adapter it works from a statically deployed build with no proxy in front of it.
 * The trade is the free tier's ~25 requests a day, which a six-position portfolio spends
 * in four page loads — hence the cache, and hence Yahoo being the default.
 *
 * Note that a VITE_-prefixed variable is inlined into the client bundle at build time.
 * The key is not secret in a deployed app; treat it as public and keep it free-tier.
 */

const KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY as string | undefined
export const ALPHAVANTAGE_KEY_SET = Boolean(KEY)

const TAIL: Record<Range, number> = { '1D': 79, '1W': 6, '1M': 23, '3M': 66, '1Y': 253, ALL: 5000 }

type Row = Record<string, string>

function parse(json: Record<string, unknown>, range: Range): { points: Point[]; volume: number } {
  const key = Object.keys(json).find((k) => k.startsWith('Time Series'))
  if (!key) {
    throw new Error(
      String(json['Note'] ?? json['Error Message'] ?? json['Information'] ?? 'unexpected payload'),
    )
  }
  const table = json[key] as Record<string, Row>
  const rows = Object.entries(table)
    .map(([stamp, row]) => ({
      t: Date.parse(stamp.includes(':') ? stamp.replace(' ', 'T') : stamp),
      p: Number(row['4. close']),
      v: Number(row['5. volume'] ?? 0),
    }))
    .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.p))
    .sort((a, b) => a.t - b.t)

  if (rows.length < 2) throw new Error('not enough data')

  let slice = rows
  if (range === '1D') {
    // Trim to the final session only.
    const lastDay = new Date(rows[rows.length - 1].t).toDateString()
    const session = rows.filter((d) => new Date(d.t).toDateString() === lastDay)
    slice = session.length >= 2 ? session : rows.slice(-TAIL['1D'])
  } else {
    slice = rows.slice(-TAIL[range])
  }

  // Intraday rows carry per-bar volume, daily rows carry the whole session's.
  const volume =
    range === '1D'
      ? slice.reduce((sum, d) => sum + (Number.isFinite(d.v) ? d.v : 0), 0)
      : (slice[slice.length - 1].v ?? 0)

  return { points: slice.map(({ t, p }) => ({ t, p })), volume: Number.isFinite(volume) ? volume : 0 }
}

async function fetchQuote(ticker: string, range: Range): Promise<Quote> {
  const fn = range === '1D' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY'
  const params = new URLSearchParams({ function: fn, symbol: ticker, apikey: KEY! })
  if (range === '1D') params.set('interval', '5min')
  else params.set('outputsize', range === '1Y' || range === 'ALL' ? 'full' : 'compact')

  const res = await fetch(`https://www.alphavantage.co/query?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { points, volume } = parse(await res.json(), range)

  return {
    ticker,
    // No company name in a time-series payload, and spending a request on SYMBOL_SEARCH
    // to get one is not worth it at 25/day. Search fills the cache; until then, the ticker.
    name: knownName(ticker) ?? ticker,
    range,
    points,
    // The intraday payload has no previous close in it, so the range's own first bar is
    // the only honest anchor available here.
    prevClose: points[0].p,
    volume,
    source: 'live',
  }
}

export const alphaVantageSource: DataSource = {
  id: 'alphavantage',
  label: 'Alpha Vantage',
  real: true,

  async getQuote(ticker, range) {
    const symbol = ticker.trim().toUpperCase()
    const cached = readCache('av', symbol, range)
    if (cached) return cached

    try {
      const quote = await fetchQuote(symbol, range)
      writeCache('av', symbol, range, quote)
      return quote
    } catch (err) {
      console.warn(`[AlwaysUp] no real data for ${symbol} (${range}), substituting simulated:`, err)
      return { ...mockQuote(symbol, range), name: knownName(symbol) ?? symbol, substituted: true }
    }
  },

  async search(query) {
    const q = query.trim()
    if (!q || !KEY) return []
    const params = new URLSearchParams({ function: 'SYMBOL_SEARCH', keywords: q, apikey: KEY })
    try {
      const res = await fetch(`https://www.alphavantage.co/query?${params}`)
      const json = (await res.json()) as { bestMatches?: Row[] }
      return (json.bestMatches ?? [])
        .map((m) => ({ ticker: m['1. symbol'] ?? '', name: m['2. name'] ?? m['1. symbol'] ?? '' }))
        .filter((hit) => hit.ticker)
        .map((hit) => {
          rememberName(hit.ticker, hit.name)
          return hit
        })
    } catch {
      return []
    }
  },
}
