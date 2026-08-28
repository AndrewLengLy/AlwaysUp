import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import type { Point, Range } from '../lib/types'
import { applyComfort, changeOf, comfortOf, nextFlipTarget, type ComfortMode } from '../lib/flip'
import { areaPath, clamp01, lerp, lerpArray, linePath, niceTicks, project } from '../lib/geometry'
import { positionAt } from '../lib/position'
import { useSize, prefersReducedMotion } from '../lib/useSize'
import { fmtAxisTime, fmtPrice, fmtSigned, RANGE_LABEL } from '../lib/format'
import { MirrorControl } from './MirrorControl'

const UP = '#21c97f'
const DOWN = '#f2555a'

/** How long the honest chart is allowed to exist before the app catches itself. */
const CAUGHT_ITSELF_MS = 420

/** Below this, a press is a tap and toggles. Above it, it is a hold and reveals. */
const HOLD_MS = 200

const PAD = { top: 18, right: 58, bottom: 24, left: 4 }

/** How far outside the plot the break-even line fades out over. */
const FADE_PX = 14

/** The deliberate flip. Under-damped on purpose: it should look like it costs something. */
const FLIP_SPRING = { type: 'spring', stiffness: 130, damping: 12, restDelta: 0.0004 } as const
const SETTLE_SPRING = { type: 'spring', stiffness: 210, damping: 24 } as const

type Props = {
  points: Point[]
  mode: ComfortMode
  range: Range
  /** 0 = the comforting picture, 1 = what actually happened. Owned by the screen so the
   *  headline figures can morph in step with the line. */
  t: MotionValue<number>
  /** Average price paid per share. Anchors the comfort transform and draws break-even. */
  basis?: number | null
  shares?: number
  height?: number
  /** Reports whether the truth is currently on screen, so the header can follow along. */
  onRevealChange?: (revealed: boolean) => void
}

export function Chart({ points, mode, range, t, basis, shares = 0, height = 340, onRevealChange }: Props) {
  const [ref, size] = useSize<HTMLDivElement>()
  const w = size.w
  const h = height

  const comfort = useMemo(() => comfortOf(points, mode, basis), [points, mode, basis])
  const display = useMemo(() => applyComfort(points, comfort), [points, comfort])
  const comforted = comfort.kind !== 'none'

  /**
   * Only a reflection gets an axis drawn. Delulu rebuilds the series from damped deltas
   * and a lift moves it bodily up the axis, so neither has a line they are folded about
   * and neither gets to imply one.
   */
  const isReflection = mode === 'comfort' && comfort.kind === 'reflect'

  const plot = useMemo(
    () => ({ x: PAD.left, y: PAD.top, w: Math.max(w - PAD.left - PAD.right, 1), h: h - PAD.top - PAD.bottom }),
    [w, h],
  )
  const baseline = plot.y + plot.h
  const foldY = plot.y + plot.h / 2

  const honest = useMemo(() => project(points, plot), [points, plot])
  const shown = useMemo(() => project(display, plot), [display, plot])

  /** Where t rests when nothing is being pressed. Scrubbing moves it; holding does not. */
  const parked = useRef(0)
  const holdTimer = useRef<number | null>(null)
  const didHold = useRef(false)

  /** Where the load beat starts: on the truth, unless there is no beat to run. */
  const opensOnTruth = () => comforted && !prefersReducedMotion()

  const [truthOnScreen, setTruthOnScreen] = useState(opensOnTruth)
  /** Counts completed flips, so the end-of-flip flourish can replay. */
  const slam = useMotionValue(0)

  /**
   * A new series, or a new mode, restarts the beat below — and this has to be reset with
   * it. React's own pattern for that is an adjustment during render rather than an effect:
   * it lands before the browser paints, where an effect would let one version's axis
   * labels sit against the other version's line for a frame.
   */
  const [beat, setBeat] = useState({ points, mode, comforted })
  if (beat.points !== points || beat.mode !== mode || beat.comforted !== comforted) {
    setBeat({ points, mode, comforted })
    setTruthOnScreen(opensOnTruth())
  }

  // The load beat: draw the truth, sit with it for a moment, then flip away from it.
  useEffect(() => {
    parked.current = 0
    if (!comforted || prefersReducedMotion()) {
      t.set(0)
      return
    }
    t.set(1)
    const timer = setTimeout(() => {
      animate(t, 0, { type: 'spring', stiffness: 90, damping: 15, restDelta: 0.001 })
    }, CAUGHT_ITSELF_MS)
    return () => clearTimeout(timer)
  }, [points, mode, comforted, t])

  useMotionValueEvent(t, 'change', (v) => {
    const truth = v > 0.5
    setTruthOnScreen((prev) => (prev === truth ? prev : truth))
  })

  useEffect(() => onRevealChange?.(truthOnScreen), [truthOnScreen, onRevealChange])

  const punch = useCallback(() => {
    slam.set(0)
    animate(slam, 1, { type: 'spring', stiffness: 320, damping: 9 })
  }, [slam])

  const flip = useCallback(() => {
    if (!comforted) return
    const next = nextFlipTarget(parked.current)
    parked.current = next
    animate(t, next, { ...FLIP_SPRING, onComplete: punch })
  }, [comforted, t, punch])

  const scrub = useCallback(
    (v: number) => {
      if (!comforted) return
      parked.current = v
      t.stop()
      t.set(v)
    },
    [comforted, t],
  )

  const clearHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  /**
   * A press does two different things depending on how long it lasts: hold to peek at
   * reality for as long as you can stand it, tap to flip and leave it flipped.
   */
  const pressHandlers = comforted
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.button !== undefined && e.button !== 0) return
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
          } catch {
            /* synthetic or already-released pointer */
          }
          didHold.current = false
          holdTimer.current = window.setTimeout(() => {
            didHold.current = true
            animate(t, 1, SETTLE_SPRING)
          }, HOLD_MS)
        },
        onPointerUp: () => {
          clearHold()
          if (didHold.current) animate(t, parked.current, SETTLE_SPRING)
          else flip()
        },
        onPointerCancel: () => {
          clearHold()
          if (didHold.current) animate(t, parked.current, SETTLE_SPRING)
        },
        onPointerLeave: () => {
          clearHold()
          if (didHold.current) animate(t, parked.current, SETTLE_SPRING)
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            flip()
          }
        },
      }
    : {}

  const lineD = useTransform(t, (v) => linePath(shown.xs, lerpArray(shown.ys, honest.ys, v)))
  const areaD = useTransform(t, (v) => areaPath(shown.xs, lerpArray(shown.ys, honest.ys, v), baseline))

  const shownUp = changeOf(display).abs >= 0
  const honestUp = changeOf(points).abs >= 0
  const stroke = useTransform(t, [0, 1], [shownUp ? UP : DOWN, honestUp ? UP : DOWN])

  /** Peaks in the middle of the flip and is zero at either end. */
  const midFlip = useTransform(t, (v) => Math.sin(Math.PI * clamp01(v)))
  const ghostComfort = useTransform(midFlip, (v) => v * 0.5)
  const ghostReal = useTransform(midFlip, (v) => v * 0.5)
  const axisOpacity = useTransform(midFlip, (v) => (isReflection ? v : 0))

  /**
   * Break-even, drawn at the literal price you paid on whichever axis is on screen.
   *
   * It has to move with the flip rather than jump at the midpoint, because the two
   * versions are drawn on two different axes and the same price sits at two different
   * heights. When the transform is a reflection about your cost, the two heights average
   * to the plot's midline exactly — so at half way the price line, the reflection axis
   * and break-even all arrive in the same place, which is the whole idea in one frame.
   */
  const be = basis != null && basis > 0 ? basis : null
  const yIn = (p: { min: number; max: number }, v: number) =>
    plot.y + plot.h - ((v - p.min) / (p.max - p.min)) * plot.h
  const beShown = be === null ? 0 : yIn(shown, be)
  const beHonest = be === null ? 0 : yIn(honest, be)

  const beY = useTransform(t, (v) => lerp(beShown, beHonest, v))
  const beLabelY = useTransform(beY, (v) => v - 7)
  const beOpacity = useTransform(beY, (v) => {
    if (be === null) return 0
    const outside = Math.max(plot.y - v, v - (plot.y + plot.h), 0)
    return outside === 0 ? 1 : Math.max(0, 1 - outside / FADE_PX)
  })

  const endY = useTransform(t, (v) => {
    const i = shown.ys.length - 1
    return lerp(shown.ys[i], honest.ys[i], v)
  })
  const endR = useTransform(slam, (v) => 3.5 + Math.sin(Math.PI * clamp01(v)) * 6)

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
  const real = changeOf(points)

  /** Names the operation, not the genre, and only while the flip is in flight. */
  const foldNote =
    comfort.kind === 'reflect'
      ? comfort.anchor === be
        ? 'MIRRORED ABOUT YOUR COST'
        : 'REFLECTION AXIS'
      : comfort.kind === 'shift'
        ? 'LIFTED, NOT MIRRORED'
        : null
  const foldNoteOpacity = useTransform(midFlip, (v) => (foldNote ? Math.max(0, v * 1.4 - 0.4) : 0))

  const realPosition = be === null || shares <= 0 ? null : positionAt(real.to, shares, be)

  const reason =
    mode === 'honest'
      ? 'Honest mode. Nothing is being mirrored, so there is nothing to flip back.'
      : `Nothing to flip. Up ${RANGE_LABEL[range]}${be === null ? '' : ' and above what you paid'}, so the chart was already telling the truth.`

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        role={comforted ? 'button' : undefined}
        tabIndex={comforted ? 0 : undefined}
        aria-label={comforted ? 'Chart. Press to flip between the comforting version and what actually happened.' : undefined}
        className={`relative w-full touch-none no-select border border-pbx-800 bg-pbx-panel ${
          comforted ? 'cursor-pointer' : ''
        }`}
        style={{ height: h }}
        {...pressHandlers}
      >
        {w > 0 && (
          <svg width={w} height={h} className="block" aria-hidden="true">
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <motion.stop offset="0%" stopColor={stroke} stopOpacity={0.26} />
                <motion.stop offset="55%" stopColor={stroke} stopOpacity={0.06} />
                <motion.stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>

            {ticks.map((v) => (
              <g key={v}>
                <line x1={plot.x} x2={plot.x + plot.w} y1={yOf(v)} y2={yOf(v)} stroke="#1f1f1f" strokeWidth={1} />
                <text
                  x={w - PAD.right + 12}
                  y={yOf(v) + 4}
                  className="tnum"
                  fill="#9ca3af"
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
              stroke="#3a3a3a"
              strokeWidth={1}
              strokeDasharray="2 4"
            />

            {/* The price you paid. Drawn in both versions, so the line crosses it on the
                way back to reality instead of the number quietly changing meaning. */}
            {be !== null && (
              <motion.g style={{ opacity: beOpacity }}>
                <motion.line
                  x1={plot.x}
                  x2={plot.x + plot.w}
                  y1={beY}
                  y2={beY}
                  stroke="#7d8794"
                  strokeWidth={1}
                  strokeDasharray="6 4"
                />
                <motion.text
                  x={plot.x + plot.w - 6}
                  y={beLabelY}
                  textAnchor="end"
                  fill="#98a2b3"
                  fontSize={9.5}
                  letterSpacing={1.6}
                  fontFamily="var(--font-mono)"
                >
                  {`BREAK EVEN ${fmtPrice(be)}`}
                </motion.text>
              </motion.g>
            )}

            {/* The axis the two versions are mirrored about. Only drawn while the flip is
                in flight, and only when the transform really is a reflection. */}
            <motion.g style={{ opacity: axisOpacity }}>
              <line x1={plot.x} x2={plot.x + plot.w} y1={foldY} y2={foldY} stroke="#fafafa" strokeWidth={1} strokeDasharray="1 5" />
            </motion.g>

            {/* Both versions, held up next to each other at the moment the line is flat. */}
            <motion.path
              d={linePath(shown.xs, shown.ys)}
              fill="none"
              stroke={UP}
              strokeWidth={1.25}
              strokeDasharray="3 4"
              style={{ opacity: ghostComfort }}
            />
            <motion.path
              d={linePath(honest.xs, honest.ys)}
              fill="none"
              stroke={honestUp ? UP : DOWN}
              strokeWidth={1.25}
              strokeDasharray="3 4"
              style={{ opacity: ghostReal }}
            />

            <motion.path d={areaD} fill="url(#fill)" />
            <motion.path
              d={lineD}
              fill="none"
              stroke={stroke}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <motion.circle cx={shown.xs[shown.xs.length - 1]} cy={endY} r={9} fill={stroke} opacity={0.16} />
            <motion.circle cx={shown.xs[shown.xs.length - 1]} cy={endY} r={endR} fill={stroke} />

            <motion.text
              x={plot.x + 8}
              y={foldY - 8}
              fill="#fafafa"
              fontSize={9.5}
              letterSpacing={2.4}
              fontFamily="var(--font-mono)"
              style={{ opacity: foldNoteOpacity }}
            >
              {foldNote ?? ''}
            </motion.text>

            {xTicks.map((tick, i) => (
              <text
                key={i}
                x={tick.x + (i === 0 ? 6 : 0)}
                y={h - 7}
                fill="#808080"
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
          {realPosition &&
            ` Against a cost of ${fmtPrice(be!)} a share, the real position is ${realPosition.gain >= 0 ? 'up' : 'down'} ${fmtSigned(Math.abs(realPosition.gain))}, ${Math.abs(realPosition.pct).toFixed(2)} percent.`}
        </p>
      </div>

      <MirrorControl t={t} onScrub={scrub} onFlip={flip} disabled={!comforted} reason={reason} />
    </div>
  )
}
