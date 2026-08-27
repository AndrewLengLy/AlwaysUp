import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../state/store'
import { useQuote } from '../lib/useQuote'
import { RANGES, type Range } from '../lib/types'
import { changeOf, comfortSeries, extentOf, isComforted } from '../lib/flip'
import { fmtPrice, fmtVolume, RANGE_LABEL } from '../lib/format'
import { Chart } from '../components/Chart'
import { Confetti } from '../components/Confetti'
import { ChangeBadge, Card, Stat } from '../components/ui'

const REASSURANCE = [
  'Nothing but altitude today.',
  'Your position is thriving.',
  'Steady climb. As expected.',
  'Another constructive session.',
  'Momentum remains intact.',
]

export function Detail({ ticker, onReveal }: { ticker: string; onReveal: (v: boolean) => void }) {
  const { mode, go } = useStore()
  const [range, setRange] = useState<Range>('1D')
  const { quote, loading } = useQuote(ticker, range)
  const [revealed, setRevealed] = useState(false)
  const [burst, setBurst] = useState(0)

  const handleReveal = useCallback((v: boolean) => setRevealed(v), [])
  useEffect(() => onReveal(revealed), [revealed, onReveal])

  const display = useMemo(() => (quote ? comfortSeries(quote.points, mode) : []), [quote, mode])
  const comforted = quote ? isComforted(quote.points, mode) : false

  // Delulu mode: every load is a new all-time high, because it structurally has to be.
  useEffect(() => {
    if (mode === 'delulu' && quote) setBurst((n) => n + 1)
  }, [mode, quote, range])

  if (loading || !quote) {
    return <div className="px-5 py-20 text-center text-sm text-ink-400">Composing an encouraging picture…</div>
  }

  const shownPoints = revealed ? quote.points : display
  const change = changeOf(shownPoints)
  const last = shownPoints[shownPoints.length - 1].p
  const { min, max } = extentOf(shownPoints)
  const reassurance = REASSURANCE[ticker.charCodeAt(0) % REASSURANCE.length]

  return (
    <div className="relative mx-auto w-full max-w-2xl px-5 pb-24">
      <Confetti trigger={burst} />

      <button
        onClick={() => go({ name: 'portfolio' })}
        className="mb-5 -ml-1 flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] text-ink-400 transition hover:text-ink-200"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M8.5 3 4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Portfolio
      </button>

      <div className="mb-1 flex items-baseline gap-2.5">
        <h1 className="text-[26px] font-semibold tracking-tight text-white">{quote.ticker}</h1>
        <span className="truncate text-[14px] text-ink-400">{quote.name}</span>
      </div>

      <motion.p
        key={`${revealed}-${last.toFixed(2)}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="tnum text-[40px] leading-none font-semibold tracking-tight text-white"
      >
        {fmtPrice(last)}
      </motion.p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <ChangeBadge pct={change.pct} abs={change.abs} size="lg" />
        <span className="text-[13px] text-ink-400">{RANGE_LABEL[range]}</span>
      </div>

      <div className="mt-6">
        <Chart points={quote.points} mode={mode} range={range} onRevealChange={handleReveal} />
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-xl py-2 text-[12.5px] font-medium transition ${
              r === range ? 'bg-ink-700 text-white' : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-[12.5px] text-ink-400">
        {comforted
          ? revealed
            ? 'This is what actually happened. Let go whenever you like.'
            : 'Press and hold the chart to see what actually happened.'
          : `No adjustment was necessary ${RANGE_LABEL[range]}.`}
      </p>

      <Card className="mt-5 grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
        <Stat label="Open" value={fmtPrice(shownPoints[0].p)} />
        <Stat label="High" value={fmtPrice(max)} />
        <Stat label="Low" value={fmtPrice(min)} />
        <Stat label="Volume" value={fmtVolume(quote.volume)} />
      </Card>

      {!revealed && comforted && (
        <p className="mt-5 text-center text-[13px] text-ink-300 italic">{reassurance}</p>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-ink-400">
        {quote.source === 'mock'
          ? 'Simulated price history for a fictional company.'
          : 'Live price history, displayed dishonestly.'}{' '}
        High and low are taken from the chart as drawn, so in comfort mode they are swapped. Not
        financial advice, not market data, not a basis for any decision.
      </p>
    </div>
  )
}
