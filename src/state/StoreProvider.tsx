import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Ctx, clean, load, save, seed, type Persisted, type Store, type View } from './store'

/**
 * Lives apart from the store it provides so that `store.ts` exports no components: a file
 * mixing the two loses Fast Refresh, and editing the shape of the store is exactly when
 * you least want a full reload.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)
  const [view, go] = useState<View>({ name: 'portfolio' })

  useEffect(() => save(state), [state])

  const value = useMemo<Store>(
    () => ({
      ...state,
      view,
      go,
      setMode: (mode) => setState((s) => ({ ...s, mode })),
      acknowledge: () => setState((s) => ({ ...s, acknowledged: true })),
      addHolding: (ticker, shares, basis) =>
        setState((s) => {
          const t = ticker.trim().toUpperCase()
          if (!t || s.holdings.some((h) => h.ticker === t)) return s
          return { ...s, holdings: [...s.holdings, clean({ ticker: t, shares: shares > 0 ? shares : 1, basis })] }
        }),
      updateHolding: (ticker, patch) =>
        setState((s) => ({
          ...s,
          holdings: s.holdings.map((h) => (h.ticker === ticker ? clean({ ...h, ...patch }) : h)),
        })),
      removeHolding: (ticker) =>
        setState((s) => ({ ...s, holdings: s.holdings.filter((h) => h.ticker !== ticker) })),
      reset: () => setState(seed()),
    }),
    [state, view],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
