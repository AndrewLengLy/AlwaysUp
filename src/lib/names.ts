/**
 * Ticker → company name, learned from whatever quotes have already resolved and kept in
 * localStorage. Settings lists holdings without fetching them, and inventing a plausible
 * name for a real ticker ("AAPL Holdings") is exactly the kind of fiction this app is
 * careful not to mix with real symbols. Unknown means unknown: callers get undefined and
 * show the bare ticker.
 */

const KEY = 'alwaysup.names.v1'

const names = new Map<string, string>(load())

function load(): [string, string][] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? Object.entries(JSON.parse(raw) as Record<string, string>) : []
  } catch {
    return []
  }
}

export function rememberName(ticker: string, name: string) {
  if (!name || name === ticker || names.get(ticker) === name) return
  names.set(ticker, name)
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(names)))
  } catch {
    /* persistence is a convenience; the session still has the map */
  }
}

export function knownName(ticker: string): string | undefined {
  return names.get(ticker)
}
