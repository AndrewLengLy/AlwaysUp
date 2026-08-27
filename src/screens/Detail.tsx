import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useStore } from '../state/store'
import { useQuote } from '../lib/useQuote'
import { RANGES, type Range } from '../lib/types'
import { changeOf, comfortSeries, extentOf, isComforted } from '../lib/flip'
import { lerp } from '../lib/geometry'
import { fmtPct, fmtPrice, fmtSigned, fmtVolume, RANGE_LABEL } from '../lib/format'
import { Chart } from '../components/Chart'
import { Confetti } from '../components/Confetti'
import { Card, SectionLabel, SimulatedChip, Skeleton, Stat } from '../components/ui'
import { source } from '../lib/data'

const REASSURANCE = [
  'Nothing but altitude today.',
  'Your position is thriving.',
  'Steady climb. As expected.',
  'Another constructive session.',
  'Momentum remains intact.',
]

const UP = '#4ade9b'
const DOWN = '#ff8085'

export function Detail({ ticker, onReveal }: { ticker: string; onReveal: (v: boolean) => void }) {
  const { mode, go } = useStore()
  const [range, setRange] = useState<Range>('1D')
  const { quote, loading } = useQuote(ticker, range)
  const [revealed, setRevealed] = useState(false)
  const [burst, setBurst] = useState(0)

  /** 0 = the comforting picture, 1 = what actually happened. The chart drives it; the
   *  figures above the chart read it, so every number moves with the line. */
  const t = useMotionValue(0)

  const handleReveal = useCallback((v: boolean) => setRevealed(v), [])
  useEffect(() => onReveal(revealed), [revealed, onReveal])

  const display = useMemo(() => (quote ? comfortSeries(quote.points, mode) : []), [quote, mode])
  const comforted = quote ? isComforted(quote.points, mode) : false

  // Delulu mode: every load is a new all-time high, because it structurally has to be.
  useEffect(() => {
    if (mode === 'delulu' && quote) setBurst((n) => n + 1)
  }, [mode, quote, range])

  const shownChange = useMemo(() => changeOf(display), [display])
  const realChange = useMemo(() => (quote ? changeOf(quote.points) : shownChange), [quote, shownChange])
  const shownLast = display.length ? display[display.length - 1].p : 0
  const realLast = quote?.points.length ? quote.points[quote.points.length - 1].p : 0

  const price = useTransform(t, (v) => fmtPrice(lerp(shownLast, realLast, v)))
  const pct = useTransform(t, (v) => fmtPct(lerp(shownChange.pct, realChange.pct, v)))
  const abs = useTransform(t, (v) => fmtSigned(lerp(shownChange.abs, realChange.abs, v)))
  const tone = useTransform(t, (v) => {
    const value = lerp(shownChange.abs, realChange.abs, v)
    return value >= 0 ? UP : DOWN
  })

  if (loading || !quote) return <DetailSkeleton />

  const shownPoints = revealed ? quote.points : display
  const { min, max } = extentOf(shownPoints)
  const reassurance = REASSURANCE[ticker.charCodeAt(0) % REASSURANCE.length]

  return (
    <div className="relative mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <Confetti trigger={burst} />

      <button
        onClick={() => go({ name: 'portfolio' })}
        className="mb-6 -ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] text-pbx-400 transition-colors hover:text-pbx-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M8.5 3 4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All holdings
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h1 className="text-[30px] leading-none font-semibold tracking-tight text-pbx-white">{quote.ticker}</h1>
            <span className="truncate text-[14px] text-pbx-400">{quote.name}</span>
            {quote.substituted && <SimulatedChip />}
          </div>

          <motion.p
            className="tnum font-mono text-[44px] leading-none font-semibold tracking-tight text-pbx-white"
            aria-hidden="true"
          >
            {price}
          </motion.p>

          <div className="mt-3 flex flex-wrap items-center gap-2.5" aria-hidden="true">
            <motion.span className="tnum inline-flex items-center gap-2 font-mono text-[16px] font-medium" style={{ color: tone }}>
              <motion.span>{abs}</motion.span>
              <motion.span className="opacity-75">{pct}</motion.span>
            </motion.span>
            <span className="text-[13px] text-pbx-400">{RANGE_LABEL[range]}</span>
          </div>

          {/* The figures above animate, which screen readers should not have to follow. */}
          <p className="sr-only">
            {`${quote.ticker}, ${quote.name}. Real price ${fmtPrice(realLast)}, a real change of ${realChange.pct >= 0 ? 'up' : 'down'} ${Math.abs(realChange.pct).toFixed(2)} percent ${RANGE_LABEL[range]}.`}
          </p>

          <div className="mt-7">
            <Chart points={quote.points} mode={mode} range={range} t={t} onRevealChange={handleReveal} />
          </div>

          <div className="mt-3 flex items-center gap-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={r === range}
                className={`min-h-11 flex-1 text-[12.5px] font-medium transition-colors ${
                  r === range
                    ? 'border border-pbx-600 bg-pbx-800 text-pbx-white'
                    : 'border border-transparent text-pbx-400 hover:border-pbx-800 hover:text-pbx-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <aside className="min-w-0 space-y-6">
          <div>
            <SectionLabel>{revealed ? 'As it happened' : 'As drawn'}</SectionLabel>
            <Card className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-1">
              <Stat label="Open" value={fmtPrice(shownPoints[0].p)} />
              <Stat label="High" value={fmtPrice(max)} />
              <Stat label="Low" value={fmtPrice(min)} />
              <Stat label="Volume" value={fmtVolume(quote.volume)} />
            </Card>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-pbx-500">
              High and low come from the chart as drawn, so in comfort mode they are swapped.
            </p>
          </div>

          {!revealed && comforted && (
            <p className="border-l border-up-600 pl-3 text-[13px] text-pbx-200 italic">{reassurance}</p>
          )}
        </aside>
      </div>

      <p className="mt-10 max-w-3xl text-[12px] leading-relaxed text-pbx-500">
        {quote.substituted
          ? `Real prices for ${quote.ticker} could not be fetched, so this price history is simulated. It is an invented series under a real ticker, and it is not what happened.`
          : source.real
            ? `Real price history from ${source.label}, drawn dishonestly.`
            : 'Simulated price history for a fictional company.'}{' '}
        Not financial advice, and not a basis for any decision.
      </p>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <Skeleton className="mb-6 h-4 w-24" />
      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div>
          <Skeleton className="mb-3 h-7 w-40" />
          <Skeleton className="mb-4 h-11 w-56" />
          <Skeleton className="h-[340px] w-full" />
          <Skeleton className="mt-3 h-[86px] w-full" />
        </div>
        <Skeleton className="hidden h-52 w-full lg:block" />
      </div>
      <p className="sr-only">Loading price history.</p>
    </div>
  )
}
