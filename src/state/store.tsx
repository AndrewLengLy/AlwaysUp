import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ComfortMode } from '../lib/flip'
import { DEFAULT_TICKERS } from '../lib/mock'

export type Holding = { ticker: string; shares: number }

export type View = { name: 'portfolio' } | { name: 'detail'; ticker: string } | { name: 'settings' }

type Store = {
  mode: ComfortMode
  setMode: (m: ComfortMode) => void
  holdings: Holding[]
  addHolding: (ticker: string, shares: number) => void
  removeHolding: (ticker: string) => void
  view: View
  go: (v: View) => void
  acknowledged: boolean
  acknowledge: () => void
  reset: () => void
}

const KEY = 'alwaysup.v1'

type Persisted = { mode: ComfortMode; holdings: Holding[]; acknowledged: boolean }

const seed = (): Persisted => ({
  mode: 'comfort',
  acknowledged: false,
  holdings: DEFAULT_TICKERS.map((ticker, i) => ({
    ticker,
    shares: [6, 120, 3, 65, 25, 11][i] ?? 10,
  })),
})

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      mode: parsed.mode ?? 'comfort',
      acknowledged: Boolean(parsed.acknowledged),
      holdings: Array.isArray(parsed.holdings) && parsed.holdings.length ? parsed.holdings : seed().holdings,
    }
  } catch {
    return seed()
  }
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)
  const [view, go] = useState<View>({ name: 'portfolio' })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private browsing, incognito, a full disk — the joke survives without persistence */
    }
  }, [state])

  const value = useMemo<Store>(
    () => ({
      ...state,
      view,
      go,
      setMode: (mode) => setState((s) => ({ ...s, mode })),
      acknowledge: () => setState((s) => ({ ...s, acknowledged: true })),
      addHolding: (ticker, shares) =>
        setState((s) => {
          const t = ticker.trim().toUpperCase()
          if (!t || s.holdings.some((h) => h.ticker === t)) return s
          return { ...s, holdings: [...s.holdings, { ticker: t, shares: shares > 0 ? shares : 1 }] }
        }),
      removeHolding: (ticker) =>
        setState((s) => ({ ...s, holdings: s.holdings.filter((h) => h.ticker !== ticker) })),
      reset: () => setState(seed()),
    }),
    [state, view],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}
