import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../state/store'
import { useQuotes } from '../lib/useQuote'
import type { Point, Quote } from '../lib/types'
import { changeOf, comfortSeries, isComforted } from '../lib/flip'
import { fmtMoney, fmtPrice } from '../lib/format'
import { Sparkline } from '../components/Sparkline'
import { Button, ChangeBadge, Card, SectionLabel, SimulatedChip, Skeleton } from '../components/ui'
import { useHold } from '../lib/useHold'
import { source } from '../lib/data'

/** Sum of shares times price at each index, over the shortest series present. */
function byIndex(quotes: Quote[], shares: Record<string, number>): Point[] {
  const n = Math.min(...quotes.map((q) => q.points.length))
  if (!Number.isFinite(n) || n < 2) return []
  const tails = quotes.map((q) => q.points.slice(-n))
  return Array.from({ length: n }, (_, i) => ({
    t: tails[0][i].t,
    p: tails.reduce((sum, pts, k) => sum + pts[i].p * (shares[quotes[k].ticker] ?? 0), 0),
  }))
}

/**
 * Total portfolio value over time.
 *
 * Real symbols come back on the exchange's own bar grid, so the honest way to add them up
 * is by timestamp. Index alignment silently shifts a symbol that halted, listed late or
 * simply returned one bar fewer. Timestamps only line up when every series came from the
 * same place, though, so a portfolio mixing fetched and simulated quotes falls back to
 * index alignment rather than collapsing to an empty intersection.
 */
function portfolioSeries(quotes: Quote[], shares: Record<string, number>): Point[] {
  if (!quotes.length) return []

  const shortest = Math.min(...quotes.map((q) => q.points.length))
  const maps = quotes.map((q) => new Map(q.points.map(({ t, p }) => [t, p])))
  const shared = quotes[0].points.map((d) => d.t).filter((t) => maps.every((m) => m.has(t)))

  if (shared.length < 2 || shared.length < shortest / 2) return byIndex(quotes, shares)

  return shared.map((t) => ({
    t,
    p: maps.reduce((sum, m, k) => sum + (m.get(t) ?? 0) * (shares[quotes[k].ticker] ?? 0), 0),
  }))
}

export function Portfolio({ onReveal }: { onReveal: (v: boolean) => void }) {
  const { holdings, mode, go } = useStore()
  const tickers = useMemo(() => holdings.map((h) => h.ticker), [holdings])
  const { quotes, loading } = useQuotes(tickers, '1D')

  const shares = useMemo(() => Object.fromEntries(holdings.map((h) => [h.ticker, h.shares])), [holdings])

  const total = useMemo(() => portfolioSeries(quotes, shares), [quotes, shares])
  const totalShown = useMemo(() => comfortSeries(total, mode), [total, mode])
  const totalComforted = isComforted(total, mode)

  const { held: totalHeld, handlers: totalHold } = useHold()
  /** Latched by the button, so the flip is repeatable without holding anything down. */
  const [totalFlipped, setTotalFlipped] = useState(false)
  const [revealAll, setRevealAll] = useState(false)
  const [rowHeld, setRowHeld] = useState<string | null>(null)

  const totalTruth = (totalHeld || totalFlipped) && totalComforted
  const revealing = totalTruth || ((rowHeld !== null || revealAll) && quotes.some((q) => isComforted(q.points, mode)))

  // Keep the header badge in sync with whatever gesture is happening.
  useEffect(() => onReveal(revealing), [revealing, onReveal])

  const series = totalTruth ? total : totalShown
  const shownChange = changeOf(series)
  const value = series[series.length - 1]?.p ?? 0

  const rows = useMemo(() => {
    const enriched = quotes.map((q) => {
      const display = comfortSeries(q.points, mode)
      return { quote: q, display, change: changeOf(display), real: changeOf(q.points) }
    })
    return enriched.sort((a, b) => b.change.pct - a.change.pct)
  }, [quotes, mode])

  const substituted = useMemo(() => quotes.filter((q) => q.substituted).map((q) => q.ticker), [quotes])
  const anyComforted = useMemo(() => quotes.some((q) => isComforted(q.points, mode)), [quotes, mode])
  const onRowHold = useCallback((ticker: string, held: boolean) => setRowHeld(held ? ticker : null), [])

  if (loading && !quotes.length) return <PortfolioSkeleton />

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      {/* The screen's own heading. The two section labels below it are h2s, so the
          document outline is complete without repeating "Portfolio" on screen. */}
      <h1 className="sr-only">Your portfolio</h1>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
        <section className="min-w-0">
          <SectionLabel>{totalTruth ? 'Actual portfolio value' : 'Portfolio value'}</SectionLabel>

          <Card className="p-6 no-select" {...totalHold}>
            {/* Position only, never opacity: a stalled animation must not be able to hide
                the figure this whole screen exists to show. */}
            <motion.p
              key={String(totalTruth)}
              initial={{ y: 5 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.18 }}
              className="tnum font-mono text-[36px] leading-none font-semibold tracking-tight text-pbx-white"
            >
              {fmtMoney(value)}
            </motion.p>

            <div className="mt-3.5 flex items-center gap-2">
              <ChangeBadge pct={shownChange.pct} abs={shownChange.abs} size="lg" />
              <span className="text-[13px] text-pbx-400">today</span>
            </div>

            {totalComforted ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  variant={totalFlipped ? 'primary' : 'secondary'}
                  onClick={() => setTotalFlipped((v) => !v)}
                  aria-pressed={totalFlipped}
                  className="px-3"
                >
                  {totalFlipped ? 'Back to comfort' : 'Show the real total'}
                </Button>
                <span className="text-[12px] text-pbx-500">or press and hold</span>
              </div>
            ) : (
              <p className="mt-5 text-[12.5px] text-pbx-500">
                Up today. Nothing needed adjusting.
              </p>
            )}

            {substituted.length > 0 && (
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-pbx-800 pt-4 text-[12px] leading-relaxed text-warn-400">
                <SimulatedChip />
                <span>
                  This total includes invented prices for {substituted.join(', ')}. Real data could not be
                  fetched.
                </span>
              </p>
            )}
          </Card>

          <p className="mt-3 text-[11.5px] leading-relaxed text-pbx-500">
            {source.real
              ? `Real companies, real prices from ${source.label}, drawn dishonestly.`
              : 'Simulated prices for fictional companies.'}{' '}
            Every figure here may be a mirror image of a loss. Not financial advice.
          </p>
        </section>

        <section className="min-w-0">
          <SectionLabel
            aside={
              anyComforted ? (
                <button
                  onClick={() => setRevealAll((v) => !v)}
                  aria-pressed={revealAll}
                  className={`min-h-11 px-2 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors ${
                    revealAll ? 'text-down-400' : 'text-pbx-400 hover:text-pbx-white'
                  }`}
                >
                  {revealAll ? 'Hide reality' : 'Reveal all'}
                </button>
              ) : (
                <span className="text-[11px] tracking-[0.12em] text-pbx-500 uppercase">All up today</span>
              )
            }
          >
            Holdings
          </SectionLabel>

          <Card className="divide-y divide-pbx-800">
            {rows.map(({ quote, display, change, real }) => (
              <Row
                key={quote.ticker}
                quote={quote}
                shares={shares[quote.ticker] ?? 0}
                displayChange={change}
                realChange={real}
                display={display}
                mode={mode}
                forceReveal={revealAll}
                onOpen={() => go({ name: 'detail', ticker: quote.ticker })}
                onHold={onRowHold}
              />
            ))}
          </Card>

          <p className="mt-3 text-[11.5px] text-pbx-500">
            Sorted best first, which is itself part of the joke. Tap a row to open it, or press and hold to
            see the truth.
          </p>
        </section>
      </div>
    </div>
  )
}

function Row({
  quote,
  shares,
  display,
  displayChange,
  realChange,
  mode,
  forceReveal,
  onOpen,
  onHold,
}: {
  quote: Quote
  shares: number
  display: Point[]
  displayChange: { pct: number; abs: number }
  realChange: { pct: number; abs: number }
  mode: ReturnType<typeof useStore>['mode']
  forceReveal: boolean
  onOpen: () => void
  onHold: (ticker: string, held: boolean) => void
}) {
  const { held: isHeld, handlers } = useHold(onOpen)
  const comforted = isComforted(quote.points, mode)
  const revealing = (isHeld || forceReveal) && comforted

  useEffect(() => onHold(quote.ticker, isHeld && comforted), [isHeld, comforted, onHold, quote.ticker])

  const last = revealing ? quote.points[quote.points.length - 1].p : (display[display.length - 1]?.p ?? 0)
  const change = revealing ? realChange : displayChange

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${quote.ticker}, ${quote.name}. Real change today: ${realChange.pct >= 0 ? 'up' : 'down'} ${Math.abs(realChange.pct).toFixed(2)} percent.${
        quote.substituted ? ' Simulated data: real prices were unavailable.' : ''
      }`}
      className={`flex min-h-16 cursor-pointer items-center gap-4 px-4 py-3.5 no-select transition-colors ${
        isHeld ? 'bg-pbx-800' : 'hover:bg-pbx-800/60'
      }`}
      {...handlers}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold text-pbx-white">{quote.ticker}</span>
          <span className="hidden truncate text-[12.5px] text-pbx-400 sm:inline">{quote.name}</span>
          {quote.substituted && <SimulatedChip />}
        </div>
        <span className="text-[12px] text-pbx-500">
          {shares} {shares === 1 ? 'share' : 'shares'}
        </span>
      </div>

      <Sparkline points={quote.points} mode={mode} reveal={isHeld || forceReveal} />

      <div className="flex w-[104px] flex-col items-end gap-1">
        <span className="tnum font-mono text-[15px] text-pbx-white">{fmtPrice(last)}</span>
        <ChangeBadge pct={change.pct} abs={change.abs} size="sm" showAbs={false} />
      </div>
    </div>
  )
}

function PortfolioSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      {/* The screen's own heading. The two section labels below it are h2s, so the
          document outline is complete without repeating "Portfolio" on screen. */}
      <h1 className="sr-only">Your portfolio</h1>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
        <div>
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-[196px] w-full" />
        </div>
        <div>
          <Skeleton className="mb-3 h-3 w-20" />
          <div className="space-y-px">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">Loading holdings.</p>
    </div>
  )
}
