import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import type { Point, Range } from '../lib/types'
import { changeOf, comfortSeries, isComforted, type ComfortMode } from '../lib/flip'
import { areaPath, lerp, lerpArray, linePath, niceTicks, project } from '../lib/geometry'
import { useSize, prefersReducedMotion } from '../lib/useSize'
import { fmtAxisTime, fmtPrice } from '../lib/format'

const UP = '#21c97f'
const DOWN = '#f2555a'

/** How long the honest chart is allowed to exist before the app catches itself. */
const CAUGHT_ITSELF_MS = 420

const PAD = { top: 14, right: 54, bottom: 22, left: 4 }

type Props = {
  points: Point[]
  mode: ComfortMode
  range: Range
  height?: number
  /** Reports whether the truth is currently on screen, so the header can follow along. */
  onRevealChange?: (revealed: boolean) => void
}

export function Chart({ points, mode, range, height = 320, onRevealChange }: Props) {
  const [ref, size] = useSize<HTMLDivElement>()
  const w = size.w
  const h = height

  const display = useMemo(() => comfortSeries(points, mode), [points, mode])
  const comforted = useMemo(() => isComforted(points, mode), [points, mode])

  const plot = useMemo(
    () => ({ x: PAD.left, y: PAD.top, w: Math.max(w - PAD.left - PAD.right, 1), h: h - PAD.top - PAD.bottom }),
    [w, h],
  )
  const baseline = plot.y + plot.h

  const honest = useMemo(() => project(points, plot), [points, plot])
  const shown = useMemo(() => project(display, plot), [display, plot])

  /** 0 = the comforting picture, 1 = what actually happened. */
  const t = useMotionValue(comforted ? 1 : 0)
  const [held, setHeld] = useState(false)
  const [truthOnScreen, setTruthOnScreen] = useState(comforted)
  const introRan = useRef(false)

  // The load beat: draw the truth, sit with it for a moment, then flip away from it.
  useEffect(() => {
    introRan.current = false
    if (!comforted) {
      t.set(0)
      setTruthOnScreen(false)
      return
    }
    if (prefersReducedMotion()) {
      t.set(0)
      setTruthOnScreen(false)
      return
    }
    t.set(1)
    setTruthOnScreen(true)
    const timer = setTimeout(() => {
      introRan.current = true
      animate(t, 0, { type: 'spring', stiffness: 90, damping: 15, restDelta: 0.001 })
    }, CAUGHT_ITSELF_MS)
    return () => clearTimeout(timer)
  }, [points, mode, comforted, t])

  // Press-and-hold: reality, for exactly as long as you can stand to hold it.
  useEffect(() => {
    if (!comforted) return
    if (held) {
      animate(t, 1, { type: 'spring', stiffness: 260, damping: 26 })
    } else if (introRan.current) {
      animate(t, 0, { type: 'spring', stiffness: 180, damping: 22 })
    }
  }, [held, comforted, t])

  useMotionValueEvent(t, 'change', (v) => {
    const truth = v > 0.5
    setTruthOnScreen((prev) => (prev === truth ? prev : truth))
  })

  useEffect(() => onRevealChange?.(truthOnScreen), [truthOnScreen, onRevealChange])

  const lineD = useTransform(t, (v) => linePath(shown.xs, lerpArray(shown.ys, honest.ys, v)))
  const areaD = useTransform(t, (v) => areaPath(shown.xs, lerpArray(shown.ys, honest.ys, v), baseline))

  const shownUp = changeOf(display).abs >= 0
  const honestUp = changeOf(points).abs >= 0
  const stroke = useTransform(t, [0, 1], [shownUp ? UP : DOWN, honestUp ? UP : DOWN])

  const endY = useTransform(t, (v) => {
    const i = shown.ys.length - 1
    return lerp(shown.ys[i], honest.ys[i], v)
  })

  // Axis labels belong to whichever version is on screen; they swap at the midpoint
  // of the flip, while the chart is edge-on and flat.
  const axisSeries = truthOnScreen ? honest : shown
  const axisPoints = truthOnScreen ? points : display
  const ticks = niceTicks(axisSeries.min, axisSeries.max, 4)
  const yOf = (v: number) => plot.y + plot.h - ((v - axisSeries.min) / (axisSeries.max - axisSeries.min)) * plot.h

  const xTicks = useMemo(() => {
    const n = points.length
    if (n < 2) return []
    const count = w < 420 ? 3 : 5
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (n - 1))
      return { x: shown.xs[idx] ?? 0, label: fmtAxisTime(points[idx].t, range) }
    })
  }, [points, shown.xs, range, w])

  const openY = yOf(axisPoints[0]?.p ?? 0)
  const holdHandlers = comforted
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
          } catch {
            /* synthetic or already-released pointer */
          }
          setHeld(true)
        },
        onPointerUp: () => setHeld(false),
        onPointerCancel: () => setHeld(false),
        onPointerLeave: () => setHeld(false),
      }
    : {}

  const real = changeOf(points)

  return (
    <div
      ref={ref}
      className="relative w-full no-select touch-none"
      style={{ height: h }}
      {...holdHandlers}
    >
      {w > 0 && (
        <svg width={w} height={h} className="block overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <motion.stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <motion.stop offset="55%" stopColor={stroke} stopOpacity={0.07} />
              <motion.stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={plot.x} x2={plot.x + plot.w} y1={yOf(v)} y2={yOf(v)} stroke="#1e242b" strokeWidth={1} />
              <text
                x={w - PAD.right + 10}
                y={yOf(v) + 4}
                className="tnum"
                fill="#6b7784"
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {fmtPrice(v)}
              </text>
            </g>
          ))}

          <line
            x1={plot.x}
            x2={plot.x + plot.w}
            y1={openY}
            y2={openY}
            stroke="#2b333c"
            strokeWidth={1}
            strokeDasharray="2 4"
          />

          <motion.path d={areaD} fill="url(#fill)" />
          <motion.path
            d={lineD}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <motion.circle cx={shown.xs[shown.xs.length - 1]} cy={endY} r={9} fill={stroke} opacity={0.16}>
            <animate attributeName="r" values="7;13;7" dur="2.4s" repeatCount="indefinite" />
          </motion.circle>
          <motion.circle cx={shown.xs[shown.xs.length - 1]} cy={endY} r={3.5} fill={stroke} />

          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={h - 4}
              fill="#4b5661"
              fontSize={10.5}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            >
              {tick.label}
            </text>
          ))}
        </svg>
      )}

      {/* Assistive technology gets the real numbers. The joke is visual only. */}
      <p className="sr-only">
        {`Actual price history, unmodified: opened at ${fmtPrice(real.from)}, last ${fmtPrice(real.to)}, a real change of ${real.pct >= 0 ? 'up' : 'down'} ${Math.abs(real.pct).toFixed(2)} percent. The chart above may be displaying a mirrored version of this data.`}
      </p>
    </div>
  )
}
