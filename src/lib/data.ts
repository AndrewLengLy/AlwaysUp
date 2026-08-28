import type { DataSource, Holding } from './types'
import { DEMO_TICKERS, mockQuote, mockSource } from './mock'
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
 *
 * The share counts and the entry prices are both invented, and the entry prices are the
 * ones worth saying so about: the market prices they get measured against are real, so a
 * demo position's profit or loss is a real comparison against a purchase that never
 * happened. They are set the way the simulator's fixtures are — to exercise the cases —
 * so some of the portfolio is underwater and some of it is not, and all three comfort
 * transforms have something to do out of the box. Settings says they are made up, and one
 * edit replaces any of them with what you actually paid.
 */
const REAL_HOLDINGS: Holding[] = [
  { ticker: 'AAPL', shares: 25, basis: 342.0 },
  { ticker: 'MSFT', shares: 12, basis: 468.0 },
  { ticker: 'NVDA', shares: 40, basis: 268.0 },
  { ticker: 'TSLA', shares: 18, basis: 305.0 },
  { ticker: 'KO', shares: 120, basis: 96.4 },
  { ticker: 'SPY', shares: 8, basis: 705.0 },
]

const DEMO_SHARES = [6, 120, 3, 65, 25, 11]

/**
 * The simulated portfolio buys a year ago, at the price the simulator says was trading
 * then. Nothing here is real in the first place, so the entry price may as well come out
 * of the same fiction as the chart and be consistent with it.
 */
const demoHoldings = (): Holding[] =>
  DEMO_TICKERS.map((ticker, i) => ({
    ticker,
    shares: DEMO_SHARES[i] ?? 10,
    basis: Math.round(mockQuote(ticker, '1Y').points[0].p * 100) / 100,
  }))

export const defaultHoldings = (): Holding[] =>
  source.real ? REAL_HOLDINGS.map((h) => ({ ...h })) : demoHoldings()
