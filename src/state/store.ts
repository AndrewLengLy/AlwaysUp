import { createContext, useContext } from 'react'
import type { ComfortMode } from '../lib/flip'
import type { Holding } from '../lib/types'
import { defaultHoldings } from '../lib/data'

export type { Holding }

export type View = { name: 'portfolio' } | { name: 'detail'; ticker: string } | { name: 'settings' }

export type Store = {
  mode: ComfortMode
  setMode: (m: ComfortMode) => void
  holdings: Holding[]
  addHolding: (ticker: string, shares: number, basis?: number) => void
  updateHolding: (ticker: string, patch: Partial<Omit<Holding, 'ticker'>>) => void
  removeHolding: (ticker: string) => void
  view: View
  go: (v: View) => void
  acknowledged: boolean
  acknowledge: () => void
  reset: () => void
}

// Bumped for cost basis: a v2 portfolio has share counts but no entry prices, and the
// seeded one is more use with them than a stale copy of itself is.
const KEY = 'alwaysup.v3'

export type Persisted = { mode: ComfortMode; holdings: Holding[]; acknowledged: boolean }

export const seed = (): Persisted => ({
  mode: 'comfort',
  acknowledged: false,
  holdings: defaultHoldings(),
})

/** A stored basis has been through a text input and a JSON round trip. Trust none of it. */
export function clean(h: Holding): Holding {
  const basis = typeof h.basis === 'number' && Number.isFinite(h.basis) && h.basis > 0 ? h.basis : undefined
  const shares = typeof h.shares === 'number' && Number.isFinite(h.shares) && h.shares > 0 ? h.shares : 1
  return { ticker: h.ticker, shares, ...(basis === undefined ? {} : { basis }) }
}

export function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      mode: parsed.mode ?? 'comfort',
      acknowledged: Boolean(parsed.acknowledged),
      holdings:
        Array.isArray(parsed.holdings) && parsed.holdings.length
          ? parsed.holdings.map(clean)
          : seed().holdings,
    }
  } catch {
    return seed()
  }
}

export function save(state: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private browsing, incognito, a full disk — the joke survives without persistence */
  }
}

export const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}
