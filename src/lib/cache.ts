import type { Quote, Range } from './types'

/**
 * A quote cache with a per-range TTL. Intraday data moves; a decade of monthly closes
 * does not. Without this, every navigation between the portfolio and a detail screen
 * refetches every symbol, which is rude to a free endpoint and slow to look at.
 *
 * sessionStorage rather than localStorage on purpose: a cached price should not outlive
 * the tab and reappear tomorrow as if it were current.
 */

const TTL: Record<Range, number> = {
  '1D': 60_000,
  '1W': 5 * 60_000,
  '1M': 30 * 60_000,
  '3M': 60 * 60_000,
  '1Y': 6 * 60 * 60_000,
  ALL: 12 * 60 * 60_000,
}

const PREFIX = 'alwaysup.quote.'

type Entry = { at: number; quote: Quote }

const memory = new Map<string, Entry>()

const keyFor = (source: string, ticker: string, range: Range) => `${source}:${ticker}:${range}`

export function readCache(source: string, ticker: string, range: Range): Quote | null {
  const key = keyFor(source, ticker, range)
  let entry = memory.get(key)

  if (!entry) {
    try {
      const raw = sessionStorage.getItem(PREFIX + key)
      if (raw) {
        entry = JSON.parse(raw) as Entry
        memory.set(key, entry)
      }
    } catch {
      /* no session storage, or a half-written entry: treat as a miss */
    }
  }

  if (!entry) return null
  if (Date.now() - entry.at > TTL[range]) {
    memory.delete(key)
    try {
      sessionStorage.removeItem(PREFIX + key)
    } catch {
      /* nothing to clean up */
    }
    return null
  }
  return entry.quote
}

export function writeCache(source: string, ticker: string, range: Range, quote: Quote) {
  const key = keyFor(source, ticker, range)
  const entry: Entry = { at: Date.now(), quote }
  memory.set(key, entry)
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    /* quota, private browsing: the in-memory map still does the job for this session */
  }
}
