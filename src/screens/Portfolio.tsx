import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../state/store'
import { useQuotes } from '../lib/useQuote'
import type { Point, Quote } from '../lib/types'
import { changeOf, comfortSeries, isComforted } from '../lib/flip'
import { fmtMoney, fmtPrice } from '../lib/format'
import { Sparkline } from '../components/Sparkline'
import { ChangeBadge, Card } from '../components/ui'
import { useHold } from '../lib/useHold'

/** Index-wise sum of shares × price, trimmed to the shortest series present. */
function portfolioSeries(quotes: Quote[], shares: Record<string, number>): Point[] {
  if (!quotes.length) return []
  const n = Math.min(...quotes.map((q) => q.points.length))
  if (!Number.isFinite(n) || n < 2) return []
  const tails = quotes.map((q) => q.points.slice(-n))
  return Array.from({ length: n }, (_, i) => ({
    t: tails[0][i].t,
    p: tails.reduce((sum, pts, k) => sum + pts[i].p * (shares[quotes[k].ticker] ?? 0), 0),
  }))
}

export function Portfolio({ onReveal }: { onReveal: (v: boolean) => void }) {
  const { holdings, mode, go } = useStore()
  const tickers = useMemo(() => holdings.map((h) => h.ticker), [holdings])
  const { quotes, loading } = useQuotes(tickers, '1D')

  const shares = useMemo(
    () => Object.fromEntries(holdings.map((h) => [h.ticker, h.shares])),
    [holdings],
  )

  const total = useMemo(() => portfolioSeries(quotes, shares), [quotes, shares])
  const totalShown = useMemo(() => comfortSeries(total, mode), [total, mode])

  const { held: totalHeld, handlers: totalHold } = useHold()
  const [rowHeld, setRowHeld] = useState<string | null>(null)
  const revealing = (totalHeld || rowHeld !== null) && isComforted(total, mode)

  // Keep the header badge in sync with whatever gesture is happening.
  useEffect(() => onReveal(revealing), [revealing, onReveal])

  const shownChange = changeOf(totalHeld ? total : totalShown)
  const value = totalHeld
    ? total[total.length - 1]?.p ?? 0
    : totalShown[totalShown.length - 1]?.p ?? 0

  const rows = useMemo(() => {
    const enriched = quotes.map((q) => {
      const display = comfortSeries(q.points, mode)
      return { quote: q, display, change: changeOf(display), real: changeOf(q.points) }
    })
    return enriched.sort((a, b) => b.change.pct - a.change.pct)
  }, [quotes, mode])

  if (loading && !quotes.length) {
    return <div className="px-5 py-16 text-center text-sm text-ink-400">Arranging the good news…</div>
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-24">
      <Card className="mb-4 p-6 no-select" {...totalHold}>
        <p className="text-[11px] tracking-[0.14em] text-ink-400 uppercase">
          {totalHeld ? 'Actual portfolio value' : 'Portfolio value'}
        </p>
        <motion.p
          key={String(totalHeld)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="tnum mt-1.5 text-[38px] leading-none font-semibold tracking-tight text-white"
        >
          {fmtMoney(value)}
        </motion.p>
        <div className="mt-3 flex items-center gap-2">
          <ChangeBadge pct={shownChange.pct} abs={shownChange.abs} size="lg" />
          <span className="text-[13px] text-ink-400">today</span>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-400">
          {totalHeld ? 'Release to return to comfort.' : 'Press and hold for the truth.'}
        </p>
      </Card>

      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium tracking-wide text-ink-400 uppercase">Holdings</h2>
        <span className="text-[12px] text-ink-400">Best performing first</span>
      </div>

      <Card className="divide-y divide-ink-700 overflow-hidden">
        {rows.map(({ quote, display, change, real }) => (
          <Row
            key={quote.ticker}
            quote={quote}
            shares={shares[quote.ticker] ?? 0}
            displayChange={change}
            realChange={real}
            display={display}
            mode={mode}
            onOpen={() => go({ name: 'detail', ticker: quote.ticker })}
            onHold={(h) => setRowHeld(h ? quote.ticker : null)}
            held={rowHeld === quote.ticker}
          />
        ))}
      </Card>

      <p className="mt-5 px-1 text-[12px] leading-relaxed text-ink-400">
        Simulated prices for fictional companies. Every figure on this screen may be a mirror image
        of a loss.
      </p>
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
  onOpen,
  onHold,
  held,
}: {
  quote: Quote
  shares: number
  display: Point[]
  displayChange: { pct: number; abs: number }
  realChange: { pct: number; abs: number }
  mode: ReturnType<typeof useStore>['mode']
  onOpen: () => void
  onHold: (held: boolean) => void
  held: boolean
}) {
  const { held: isHeld, handlers } = useHold(onOpen)
  const comforted = isComforted(quote.points, mode)
  const revealing = isHeld && comforted

  useEffect(() => onHold(isHeld && comforted), [isHeld, comforted, onHold])

  const last = revealing
    ? quote.points[quote.points.length - 1].p
    : display[display.length - 1]?.p ?? 0
  const change = revealing ? realChange : displayChange

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${quote.ticker}, ${quote.name}. Real change today: ${realChange.pct >= 0 ? 'up' : 'down'} ${Math.abs(realChange.pct).toFixed(2)} percent.`}
      className={`flex cursor-pointer items-center gap-4 px-4 py-3.5 no-select transition-colors ${
        held || isHeld ? 'bg-ink-850' : 'hover:bg-ink-850/60'
      }`}
      {...handlers}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-white">{quote.ticker}</span>
          <span className="hidden truncate text-[12.5px] text-ink-400 sm:inline">{quote.name}</span>
        </div>
        <span className="text-[12px] text-ink-400">
          {shares} {shares === 1 ? 'share' : 'shares'}
        </span>
      </div>

      <Sparkline points={quote.points} mode={mode} reveal={isHeld} />

      <div className="flex w-[104px] flex-col items-end gap-1">
        <span className="tnum text-[15px] text-white">{fmtPrice(last)}</span>
        <ChangeBadge pct={change.pct} abs={change.abs} size="sm" showAbs={false} />
      </div>
    </div>
  )
}
