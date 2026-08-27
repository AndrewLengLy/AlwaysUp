import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { COMFORT_MODES } from '../lib/flip'
import { Card } from '../components/ui'
import { source } from '../lib/data'
import { FIXTURES } from '../lib/mock'
import { knownName, rememberName } from '../lib/names'

/**
 * A holding's company name, or nothing. Real tickers are never given the simulator's
 * invented "<TICKER> Holdings" label. An unknown name shows as blank rather than as a
 * company that does not exist.
 */
function nameFor(ticker: string): string {
  if (!source.real) return FIXTURES[ticker]?.name ?? `${ticker} Holdings`
  return knownName(ticker) ?? ''
}

type Hit = { ticker: string; name: string }

/** Ticker lookup by name or symbol — nobody remembers that Alphabet is GOOGL and GOOG. */
function useSearch(query: string) {
  const [hits, setHits] = useState<Hit[]>([])
  const seq = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const mine = ++seq.current
    const timer = setTimeout(() => {
      source.search(q).then((results) => {
        // Ignore a slow response that lost the race to a newer keystroke.
        if (seq.current === mine) setHits(results.slice(0, 6))
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return hits
}

export function Settings() {
  const { mode, setMode, holdings, addHolding, removeHolding, reset } = useStore()
  const [query, setQuery] = useState('')
  const [shares, setShares] = useState('10')
  const hits = useSearch(query)

  const add = (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    addHolding(t, Number(shares) || 1)
    setQuery('')
    setShares('10')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Enter takes the top search result when there is one, so typing a company name works.
    const top = hits[0]
    if (top && !/^[A-Z.-]{1,6}$/.test(query.trim().toUpperCase())) {
      rememberName(top.ticker, top.name)
      add(top.ticker)
      return
    }
    add(query)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <h1 className="mb-8 text-[26px] font-semibold tracking-tight text-pbx-white">Settings</h1>

      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-pbx-400 uppercase">
        Comfort level
      </h2>
      <div className="mb-8 space-y-2">
        {COMFORT_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex w-full items-start gap-3.5 border p-4 text-left transition ${
              mode === m.id
                ? 'border-up-600 bg-up-600/10'
                : 'border-pbx-700 bg-pbx-panel hover:border-pbx-600'
            }`}
          >
            <span
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                mode === m.id ? 'border-up-500 bg-up-500' : 'border-pbx-600'
              }`}
            >
              {mode === m.id && <span className="h-1.5 w-1.5 rounded-full bg-pbx-black" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-pbx-white">{m.label}</span>
              <span className="block text-[13px] leading-relaxed text-pbx-400">{m.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-pbx-400 uppercase">
        Holdings
      </h2>
      <Card className="mb-3 divide-y divide-pbx-800 overflow-hidden">
        {holdings.map((h) => (
          <div key={h.ticker} className="flex items-center gap-3 px-4 py-3">
            <span className="w-16 shrink-0 text-[14px] font-semibold text-pbx-white">{h.ticker}</span>
            <span className="flex-1 truncate text-[13px] text-pbx-400">{nameFor(h.ticker)}</span>
            <span className="tnum font-mono text-[13px] text-pbx-200">{h.shares}</span>
            <button
              onClick={() => removeHolding(h.ticker)}
              className="min-h-11 px-2.5 text-[12.5px] text-pbx-400 transition-colors hover:bg-pbx-800 hover:text-down-400"
            >
              Remove
            </button>
          </div>
        ))}
        {!holdings.length && (
          <p className="px-4 py-6 text-center text-[13px] text-pbx-400">
            An empty portfolio has never lost a cent.
          </p>
        )}
      </Card>

      <form onSubmit={submit} className="mb-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={source.real ? 'Ticker or company name' : 'TICKER'}
            aria-label="Ticker or company name"
            className="min-w-0 flex-1 border border-pbx-700 bg-pbx-panel min-h-11 px-3 py-2.5 text-[14px] text-pbx-white placeholder:text-pbx-400 focus:border-pbx-600 focus:outline-none"
          />
          <input
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Shares"
            aria-label="Shares"
            inputMode="numeric"
            className="tnum w-24 shrink-0 border border-pbx-700 bg-pbx-panel min-h-11 px-3 py-2.5 text-[14px] text-pbx-white placeholder:text-pbx-400 focus:border-pbx-600 focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 bg-pbx-white px-4 py-2.5 text-[14px] font-medium text-pbx-black transition-colors hover:bg-pbx-200"
          >
            Add
          </button>
        </div>

        {hits.length > 0 && (
          <Card className="mt-2 divide-y divide-pbx-800 overflow-hidden">
            {hits.map((hit) => (
              <button
                key={hit.ticker}
                type="button"
                onClick={() => {
                  rememberName(hit.ticker, hit.name)
                  add(hit.ticker)
                }}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-pbx-800"
              >
                <span className="w-16 shrink-0 text-[13.5px] font-semibold text-pbx-white">{hit.ticker}</span>
                <span className="flex-1 truncate text-[13px] text-pbx-400">{hit.name}</span>
              </button>
            ))}
          </Card>
        )}
      </form>

      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-pbx-400 uppercase">
        Data
      </h2>
      <Card className="mb-8 p-4">
        <p className="text-[13.5px] leading-relaxed text-pbx-200">
          {source.real
            ? `Real prices for real companies, from ${source.label}. They are displayed just as dishonestly as simulated ones.`
            : 'Running on simulated prices for fictional companies. Unset VITE_DATA_SOURCE to pull real prices instead.'}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-pbx-400">
          {source.real
            ? 'When a symbol cannot be fetched, its prices are simulated and labelled as such wherever they appear. Real or not, nothing here is investment advice or a basis for any decision.'
            : 'Any ticker you type gets a stable invented price history. Nothing here is market data, and nothing here is financial advice.'}
        </p>
      </Card>

      <button
        onClick={reset}
        className="min-h-12 w-full border border-pbx-700 py-3 text-[14px] text-pbx-200 transition hover:border-down-500/60 hover:text-down-400"
      >
        Reset everything
      </button>
    </div>
  )
}
