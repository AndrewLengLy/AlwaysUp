import type { DataSource } from './types'
import { DEMO_TICKERS, mockSource } from './mock'
import { yahooSource } from './yahoo'
import { alphaVantageSource, ALPHAVANTAGE_KEY_SET } from './alphavantage'

/**
 * Which market data the app runs on. Override with VITE_DATA_SOURCE=yahoo|alphavantage|mock.
 *
 * Yahoo is the default because it needs no key and no signup, at the cost of requiring the
 * dev-server proxy (see vite.config.ts) — a statically hosted build has nothing to proxy
 * through, so use Alpha Vantage there. `mock` restores the original fictional-ticker demo.
 */
const CHOICE = (import.meta.env.VITE_DATA_SOURCE as string | undefined)?.trim().toLowerCase()

function pick(): DataSource {
  if (CHOICE === 'mock') return mockSource
  if (CHOICE === 'alphavantage') return alphaVantageSource
  if (CHOICE === 'yahoo') return yahooSource
  return ALPHAVANTAGE_KEY_SET ? alphaVantageSource : yahooSource
}

export const source = pick()

/** True when the tickers on screen are real companies, which changes what the UI may claim. */
export const REAL_DATA = source.real

/**
 * A starting portfolio spread across volatility profiles rather than across outcomes: with
 * real companies nobody gets to choose which ones are down today, so the set is picked to
 * make sure the chart has something to do either way — a mega cap, two high-beta names, a
 * low-volatility staple, and a broad index that mostly refuses to move.
 */
const REAL_HOLDINGS = [
  { ticker: 'AAPL', shares: 25 },
  { ticker: 'MSFT', shares: 12 },
  { ticker: 'NVDA', shares: 40 },
  { ticker: 'TSLA', shares: 18 },
  { ticker: 'KO', shares: 120 },
  { ticker: 'SPY', shares: 8 },
]

const DEMO_HOLDINGS = DEMO_TICKERS.map((ticker, i) => ({
  ticker,
  shares: [6, 120, 3, 65, 25, 11][i] ?? 10,
}))

export const defaultHoldings = () => (source.real ? REAL_HOLDINGS : DEMO_HOLDINGS).map((h) => ({ ...h }))
