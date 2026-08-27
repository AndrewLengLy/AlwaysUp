import { useState } from 'react'
import { useStore } from '../state/store'
import { COMFORT_MODES } from '../lib/flip'
import { Card } from '../components/ui'
import { LIVE_AVAILABLE } from '../lib/data'
import { FIXTURES } from '../lib/mock'

export function Settings() {
  const { mode, setMode, holdings, addHolding, removeHolding, reset } = useStore()
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('10')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim()) return
    addHolding(ticker, Number(shares) || 1)
    setTicker('')
    setShares('10')
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-24">
      <h1 className="mb-5 text-[22px] font-semibold tracking-tight text-white">Settings</h1>

      <h2 className="mb-2 px-1 text-[13px] font-medium tracking-wide text-ink-400 uppercase">
        Comfort level
      </h2>
      <div className="mb-8 space-y-2">
        {COMFORT_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
              mode === m.id
                ? 'border-up-600/60 bg-up-600/10'
                : 'border-ink-700 bg-ink-900 hover:border-ink-600'
            }`}
          >
            <span
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                mode === m.id ? 'border-up-500 bg-up-500' : 'border-ink-600'
              }`}
            >
              {mode === m.id && <span className="h-1.5 w-1.5 rounded-full bg-ink-950" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-white">{m.label}</span>
              <span className="block text-[13px] leading-relaxed text-ink-400">{m.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="mb-2 px-1 text-[13px] font-medium tracking-wide text-ink-400 uppercase">
        Holdings
      </h2>
      <Card className="mb-3 divide-y divide-ink-700 overflow-hidden">
        {holdings.map((h) => (
          <div key={h.ticker} className="flex items-center gap-3 px-4 py-3">
            <span className="w-16 text-[14px] font-semibold text-white">{h.ticker}</span>
            <span className="flex-1 truncate text-[13px] text-ink-400">
              {FIXTURES[h.ticker]?.name ?? `${h.ticker} Holdings`}
            </span>
            <span className="tnum text-[13px] text-ink-300">{h.shares}</span>
            <button
              onClick={() => removeHolding(h.ticker)}
              className="rounded-lg px-2 py-1 text-[12.5px] text-ink-400 transition hover:bg-ink-800 hover:text-down-500"
            >
              Remove
            </button>
          </div>
        ))}
        {!holdings.length && (
          <p className="px-4 py-6 text-center text-[13px] text-ink-400">
            An empty portfolio has never lost a cent.
          </p>
        )}
      </Card>

      <form onSubmit={submit} className="mb-8 flex gap-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          maxLength={6}
          className="tnum w-28 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-[14px] text-white placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
        />
        <input
          value={shares}
          onChange={(e) => setShares(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Shares"
          inputMode="numeric"
          className="tnum w-24 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-[14px] text-white placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
        />
        <button
          type="submit"
          className="flex-1 rounded-xl bg-ink-700 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-ink-600"
        >
          Add position
        </button>
      </form>

      <h2 className="mb-2 px-1 text-[13px] font-medium tracking-wide text-ink-400 uppercase">
        Data
      </h2>
      <Card className="mb-8 p-4">
        <p className="text-[13.5px] leading-relaxed text-ink-300">
          {LIVE_AVAILABLE
            ? 'Live prices are enabled. They are displayed just as dishonestly as the simulated ones.'
            : 'Running on simulated prices for fictional companies. Set VITE_ALPHAVANTAGE_KEY in a .env file to pull real prices instead.'}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
          Any ticker you type gets a stable invented price history. Nothing here is market data, and
          nothing here is financial advice.
        </p>
      </Card>

      <button
        onClick={reset}
        className="w-full rounded-xl border border-ink-700 py-3 text-[14px] text-ink-300 transition hover:border-down-500/40 hover:text-down-500"
      >
        Reset everything
      </button>
    </div>
  )
}
