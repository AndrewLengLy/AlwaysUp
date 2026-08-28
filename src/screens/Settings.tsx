import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { COMFORT_MODES } from '../lib/flip'
import type { Holding } from '../lib/types'
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

/**
 * Ticker lookup by name or symbol — nobody remembers that Alphabet is GOOGL and GOOG.
 *
 * Hits are stored with the query that produced them and matched against the current one
 * during render, which both drops a slow response that lost the race to a newer keystroke
 * and clears the list on a query too short to search, without a second render to do it.
 */
function useSearch(query: string) {
  const q = query.trim()
  const [result, setResult] = useState<{ q: string; hits: Hit[] } | null>(null)

  useEffect(() => {
    if (q.length < 2) return
    let live = true
    const timer = setTimeout(() => {
      source.search(q).then((hits) => {
        if (live) setResult({ q, hits: hits.slice(0, 6) })
      })
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [q])

  return result?.q === q ? result.hits : []
}

const NUMERIC = 'tnum w-[86px] shrink-0 border border-pbx-700 bg-pbx-panel min-h-11 px-2.5 py-2.5 text-right font-mono text-[13.5px] text-pbx-white placeholder:font-sans placeholder:text-[12.5px] placeholder:text-pbx-500 focus:border-pbx-600 focus:outline-none'

export function Settings() {
  const { mode, setMode, holdings, addHolding, updateHolding, removeHolding, reset } = useStore()
  const [query, setQuery] = useState('')
  const [shares, setShares] = useState('10')
  const [cost, setCost] = useState('')
  const hits = useSearch(query)

  const add = (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    const basis = Number(cost)
    addHolding(t, Number(shares) || 1, Number.isFinite(basis) && basis > 0 ? basis : undefined)
    setQuery('')
    setShares('10')
    setCost('')
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
        <div className="flex items-center gap-3 bg-pbx-800/40 px-4 py-2 text-[10.5px] tracking-[0.14em] text-pbx-500 uppercase">
          <span className="flex-1">Symbol</span>
          <span className="w-[86px] text-right">Shares</span>
          <span className="w-[86px] text-right">Avg cost</span>
          <span className="w-[64px]" />
        </div>
        {holdings.map((h) => (
          <HoldingRow
            key={h.ticker}
            holding={h}
            name={nameFor(h.ticker)}
            onUpdate={(patch) => updateHolding(h.ticker, patch)}
            onRemove={() => removeHolding(h.ticker)}
          />
        ))}
        {!holdings.length && (
          <p className="px-4 py-6 text-center text-[13px] text-pbx-400">
            An empty portfolio has never lost a cent.
          </p>
        )}
      </Card>

      <p className="mb-4 text-[12px] leading-relaxed text-pbx-500">
        Average cost is what the comfort transform anchors on: underwater, the chart is mirrored about
        the price you paid rather than about the open, so the loss comes back as a gain of exactly the
        same size. Leave it blank and the app can only comfort you about today.
        {source.real && (
          <>
            {' '}
            The entry prices in the starting portfolio are invented, and the market prices they are
            measured against are real — replace them with what you actually paid, or the return is
            fiction with a real chart attached.
          </>
        )}
      </p>

      <form onSubmit={submit} className="mb-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={source.real ? 'Ticker or company name' : 'TICKER'}
            aria-label="Ticker or company name"
            className="min-w-[140px] flex-1 border border-pbx-700 bg-pbx-panel min-h-11 px-3 py-2.5 text-[14px] text-pbx-white placeholder:text-pbx-400 focus:border-pbx-600 focus:outline-none"
          />
          <input
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Shares"
            aria-label="Shares"
            inputMode="numeric"
            className={NUMERIC}
          />
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="Avg cost"
            aria-label="Average cost per share, optional"
            inputMode="decimal"
            className={NUMERIC}
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
            ? `Real prices for real companies, from ${source.label}.`
            : 'Running on simulated prices for fictional companies. Unset VITE_DATA_SOURCE to pull real prices instead.'}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-pbx-400">
          {source.real
            ? 'When a symbol cannot be fetched, its prices are simulated and labelled as such wherever they appear.'
            : 'Any ticker you type gets a stable invented price history, and the demo portfolio buys it a year ago at the price the simulator says it traded at then.'}
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

/**
 * Shares and average cost are edited in place.
 *
 * Local text state rather than a controlled number: a half-typed "1." or a briefly empty
 * field is a normal thing to pass through on the way to a real number, and neither should
 * be pushed into the portfolio. Valid input commits as you type, and blur decides what an
 * empty field meant — a cleared cost unsets it, a cleared share count reverts.
 */
function HoldingRow({
  holding,
  name,
  onUpdate,
  onRemove,
}: {
  holding: Holding
  name: string
  onUpdate: (patch: Partial<Omit<Holding, 'ticker'>>) => void
  onRemove: () => void
}) {
  const [shares, setShares] = useState(String(holding.shares))
  const [cost, setCost] = useState(holding.basis === undefined ? '' : String(holding.basis))

  const commitShares = (raw: string) => {
    setShares(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0) onUpdate({ shares: n })
  }

  const commitCost = (raw: string) => {
    setCost(raw)
    const n = Number(raw)
    if (raw === '') onUpdate({ basis: undefined })
    else if (Number.isFinite(n) && n > 0) onUpdate({ basis: n })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-pbx-white">{holding.ticker}</span>
        {/* Two number fields and a Remove button leave a phone no room for a company
            name, and three truncated characters of one are worse than none. */}
        {name && <span className="hidden truncate text-[12px] text-pbx-400 sm:block">{name}</span>}
      </span>
      <input
        value={shares}
        onChange={(e) => commitShares(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={() => shares === '' && setShares(String(holding.shares))}
        aria-label={`Shares of ${holding.ticker}`}
        inputMode="numeric"
        className={NUMERIC}
      />
      <input
        value={cost}
        onChange={(e) => commitCost(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="Not set"
        aria-label={`Average cost per share for ${holding.ticker}`}
        inputMode="decimal"
        className={NUMERIC}
      />
      <button
        onClick={onRemove}
        className="min-h-11 w-[64px] shrink-0 text-[12.5px] text-pbx-400 transition-colors hover:bg-pbx-800 hover:text-down-400"
      >
        Remove
      </button>
    </div>
  )
}
