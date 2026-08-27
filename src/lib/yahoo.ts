import type { DataSource, Point, Quote, Range } from './types'
import { mockQuote } from './mock'
import { knownName, rememberName } from './names'
import { readCache, writeCache } from './cache'

/**
 * Real prices for real companies, from Yahoo's chart endpoint. No key, no signup, no
 * daily request budget worth worrying about — but it sends no CORS headers, so every
 * call goes through the dev server proxy declared in vite.config.ts (`/yf`).
 *
 * Real data does not make the app more honest. The chart still flips. What it does change
 * is the cost of getting provenance wrong: a made-up chart labelled PLNGE is the joke, a
 * made-up chart labelled AAPL is just wrong. So a failure here is flagged, never hidden.
 */

const BASE = '/yf'

/** Yahoo takes a window and a bar size; the app's ranges map onto them like this. */
const WINDOW: Record<Range, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  ALL: { range: 'max', interval: '1mo' },
}

type ChartPayload = {
  chart?: {
    // Yahoo sends `result: null` alongside an error, so null is part of the contract.
    result?:
      | {
          meta?: Record<string, unknown>
          timestamp?: number[]
          indicators?: { quote?: { close?: (number | null)[] }[] }
        }[]
      | null
    error?: { description?: string; code?: string } | null
  }
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

/**
 * Pure so it can be tested against a captured payload. Exported for that reason.
 *
 * Yahoo leaves nulls in the close array wherever a bar has no trade, and those have to go
 * before the series reaches a chart: a null renders as a gap and, worse, sails through
 * `changeOf` as a zero.
 */
export function parseChart(payload: ChartPayload, ticker: string, range: Range): Quote {
  const err = payload.chart?.error
  if (err) throw new Error(err.description ?? err.code ?? 'chart error')

  const result = payload.chart?.result?.[0]
  const stamps = result?.timestamp
  const closes = result?.indicators?.quote?.[0]?.close
  if (!result || !stamps?.length || !closes?.length) throw new Error('no series in payload')

  const meta = result.meta ?? {}
  const points: Point[] = []
  for (let i = 0; i < stamps.length; i++) {
    const p = num(closes[i])
    const t = num(stamps[i])
    if (p === undefined || t === undefined) continue
    points.push({ t: t * 1000, p })
  }
  if (points.length < 2) throw new Error('not enough data')

  const prevClose = num(meta['chartPreviousClose']) ?? num(meta['previousClose']) ?? points[0].p

  /**
   * Anchor the day at the previous close rather than the opening print. Every brokerage
   * app measures "today" from yesterday's close, and the gap between the two is real
   * overnight movement that would otherwise vanish from the chart. It also puts the flip's
   * fixed point (p[0]) on the previous close, so a mirrored down day reflects the whole
   * day's move instead of only the part after the open. The prepended price is a real one
   * that really traded; only its position on the x-axis is inferred.
   */
  if (range === '1D' && Number.isFinite(prevClose) && prevClose !== points[0].p) {
    const step = points.length > 1 ? points[1].t - points[0].t : 300_000
    points.unshift({ t: points[0].t - step, p: prevClose })
  }

  const name = str(meta['longName']) ?? str(meta['shortName']) ?? ticker

  return {
    ticker: str(meta['symbol']) ?? ticker,
    name,
    range,
    points,
    prevClose,
    volume: num(meta['regularMarketVolume']) ?? 0,
    source: 'live',
  }
}

async function fetchQuote(ticker: string, range: Range): Promise<Quote> {
  const { range: r, interval } = WINDOW[range]
  const params = new URLSearchParams({ range: r, interval })
  const res = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?${params}`)

  // A 404 carries a usable description ("symbol may be delisted"), so parse before throwing on status.
  const payload = (await res.json().catch(() => null)) as ChartPayload | null
  if (!payload) throw new Error(`HTTP ${res.status}`)
  return parseChart(payload, ticker, range)
}

/**
 * Simulated data standing in for a real symbol. Carries `substituted` so the UI can say
 * so, and keeps the bare ticker rather than the simulator's invented company name.
 */
function substitute(ticker: string, range: Range): Quote {
  const quote = mockQuote(ticker, range)
  return { ...quote, name: knownName(ticker) ?? ticker, substituted: true }
}

export const yahooSource: DataSource = {
  id: 'yahoo',
  label: 'Yahoo Finance',
  real: true,

  async getQuote(ticker, range) {
    const symbol = ticker.trim().toUpperCase()
    const cached = readCache('yahoo', symbol, range)
    if (cached) return cached

    try {
      const quote = await fetchQuote(symbol, range)
      rememberName(symbol, quote.name)
      writeCache('yahoo', symbol, range, quote)
      return quote
    } catch (err) {
      console.warn(`[AlwaysUp] no real data for ${symbol} (${range}), substituting simulated:`, err)
      return substitute(symbol, range)
    }
  },

  async search(query) {
    const q = query.trim()
    if (!q) return []
    const params = new URLSearchParams({ q, quotesCount: '8', newsCount: '0' })
    try {
      const res = await fetch(`${BASE}/v1/finance/search?${params}`)
      const json = (await res.json()) as { quotes?: Record<string, unknown>[] }
      return (json.quotes ?? [])
        .filter((hit) => hit['quoteType'] === 'EQUITY' || hit['quoteType'] === 'ETF')
        .map((hit) => ({
          ticker: str(hit['symbol']) ?? '',
          name: str(hit['shortname']) ?? str(hit['longname']) ?? str(hit['symbol']) ?? '',
        }))
        .filter((hit) => hit.ticker)
    } catch {
      return []
    }
  },
}
