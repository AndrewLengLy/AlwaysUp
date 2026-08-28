import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { useStore } from '../state/store'
import { useQuote } from '../lib/useQuote'
import { RANGES, type Range } from '../lib/types'
import {
  applyComfort,
  changeOf,
  comfortOf,
  describeComfort,
  extentOf,
  type Comfort,
  type Distortion,
} from '../lib/flip'
import { basisOf, positionAt } from '../lib/position'
import { lerp } from '../lib/geometry'
import { cents, fmtMoney, fmtPct, fmtPrice, fmtSigned, fmtVolume, RANGE_LABEL } from '../lib/format'
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

/** Hoisted so the memo below has a stable identity while the quote is still loading. */
const NOTHING: Comfort = { kind: 'none' }

export function Detail({
  ticker,
  onReveal,
}: {
  ticker: string
  onReveal: (revealing: boolean, distortion: Distortion) => void
}) {
  const { mode, go, holdings } = useStore()
  const [range, setRange] = useState<Range>('1D')
  const { quote, loading } = useQuote(ticker, range)
  const [revealed, setRevealed] = useState(false)

  // Pulled out as plain numbers: everything downstream keys off these two, and a lookup
  // result carried through a dozen memos is a needlessly fragile dependency.
  const { shares, basis } = useMemo(() => {
    const holding = holdings.find((h) => h.ticker === ticker)
    return { shares: holding?.shares ?? 0, basis: holding ? basisOf(holding) : null }
  }, [holdings, ticker])

  /** 0 = the comforting picture, 1 = what actually happened. The chart drives it; the
   *  figures above the chart read it, so every number moves with the line. */
  const t = useMotionValue(0)

  const handleReveal = useCallback((v: boolean) => setRevealed(v), [])

  const comfort = useMemo(
    () => (quote ? comfortOf(quote.points, mode, basis) : NOTHING),
    [quote, mode, basis],
  )
  const display = useMemo(() => (quote ? applyComfort(quote.points, comfort) : []), [quote, comfort])
  const comforted = comfort.kind !== 'none'

  useEffect(() => onReveal(revealed, comfort.kind), [revealed, comfort.kind, onReveal])

  // Delulu mode: every chart you open is a new all-time high, because it structurally
  // has to be. Named after the chart rather than counted, so it needs no state of its own.
  const burst = mode === 'delulu' && quote ? `${ticker}:${range}` : null

  const shownChange = useMemo(() => changeOf(display), [display])
  const realChange = useMemo(() => (quote ? changeOf(quote.points) : shownChange), [quote, shownChange])
  const shownLast = display.length ? display[display.length - 1].p : 0
  const realLast = quote?.points.length ? quote.points[quote.points.length - 1].p : 0

  const price = useTransform(t, (v) => fmtPrice(lerp(shownLast, realLast, v)))
  const pct = useTransform(t, (v) => fmtPct(lerp(shownChange.pct, realChange.pct, v)))
  const abs = useTransform(t, (v) => fmtSigned(lerp(shownChange.abs, realChange.abs, v)))
  const tone = useTransform(t, (v) => (cents(lerp(shownChange.abs, realChange.abs, v)) >= 0 ? UP : DOWN))

  // The position rolls with the chart for the same reason the price does: it is read off
  // whichever series is on screen, so the two can never disagree about what you own.
  const shownPos = basis === null ? null : positionAt(shownLast, shares, basis)
  const realPos = basis === null ? null : positionAt(realLast, shares, basis)
  const posValue = useTransform(t, (v) => fmtMoney(lerp(shownPos?.value ?? 0, realPos?.value ?? 0, v)))
  const posGain = useTransform(t, (v) => fmtSigned(lerp(shownPos?.gain ?? 0, realPos?.gain ?? 0, v)))
  const posPct = useTransform(t, (v) =>
    fmtPct(realPos ? (lerp(shownPos!.gain, realPos.gain, v) / realPos.cost) * 100 : 0),
  )
  const posTone = useTransform(t, (v) => (cents(lerp(shownPos?.gain ?? 0, realPos?.gain ?? 0, v)) >= 0 ? UP : DOWN))

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
            {realPos &&
              ` You hold ${shares} ${shares === 1 ? 'share' : 'shares'} at ${fmtPrice(basis!)}, so the real position is ${realPos.gain >= 0 ? 'up' : 'down'} ${fmtSigned(Math.abs(realPos.gain))}, ${Math.abs(realPos.pct).toFixed(2)} percent.`}
          </p>

          <div className="mt-7">
            <Chart
              points={quote.points}
              mode={mode}
              range={range}
              t={t}
              basis={basis}
              shares={shares}
              onRevealChange={handleReveal}
            />
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

          {/* Names the exact operation performed on the line above it. The badge names the
              mode; this names what was done to this chart, in the units it was done in. */}
          {comforted && (
            <p className="mt-3 text-[12px] leading-relaxed text-pbx-500">{describeComfort(comfort)}</p>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <div>
            <SectionLabel>{revealed ? 'Your position, really' : 'Your position'}</SectionLabel>
            <Card className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-1">
              {basis === null ? (
                <div className="col-span-2 lg:col-span-1">
                  <Stat label="Shares" value={String(shares)} />
                  <p className="mt-3 text-[12px] leading-relaxed text-pbx-500">
                    No cost basis set, so there is nothing to measure this against. Add what you paid in
                    Settings and the chart will mirror about that price instead of the open.
                  </p>
                </div>
              ) : (
                <>
                  <Stat label="Shares" value={String(shares)} />
                  <Stat label="Avg cost" value={fmtPrice(basis)} />
                  <MotionStat label="Market value" value={posValue} />
                  <div className="flex flex-col gap-1.5" aria-hidden="true">
                    <span className="text-[10.5px] tracking-[0.14em] text-pbx-400 uppercase">Total return</span>
                    <motion.span
                      className="tnum inline-flex items-baseline gap-2 font-mono text-[16px]"
                      style={{ color: posTone }}
                    >
                      <motion.span>{posGain}</motion.span>
                      <motion.span className="text-[13px] opacity-75">{posPct}</motion.span>
                    </motion.span>
                  </div>
                </>
              )}
            </Card>
            {basis !== null && (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-pbx-500">
                Read off the chart as drawn, so it flips with it. Break-even is the dashed line at{' '}
                {fmtPrice(basis)}.
              </p>
            )}
          </div>

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
            ? `Real price history from ${source.label}.`
            : 'Simulated price history for a fictional company.'}
      </p>
    </div>
  )
}

/** A Stat whose value rolls with the flip. Hidden from assistive tech, like the rest of
 *  the animated figures: the truthful version is in the summary above the chart. */
function MotionStat({ label, value }: { label: string; value: MotionValue<string> }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      <span className="text-[10.5px] tracking-[0.14em] text-pbx-400 uppercase">{label}</span>
      <motion.span className="tnum font-mono text-[16px] text-pbx-white">{value}</motion.span>
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
        <div className="hidden space-y-6 lg:block">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
      <p className="sr-only">Loading price history.</p>
    </div>
  )
}
