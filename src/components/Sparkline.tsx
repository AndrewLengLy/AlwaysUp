import { useEffect, useId, useMemo } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import type { Point } from '../lib/types'
import { changeOf, comfortSeries, isComforted, type ComfortMode } from '../lib/flip'
import { areaPath, lerpArray, linePath, project } from '../lib/geometry'

const UP = '#21c97f'
const DOWN = '#f2555a'

type Props = {
  points: Point[]
  mode: ComfortMode
  reveal?: boolean
  width?: number
  height?: number
}

export function Sparkline({ points, mode, reveal = false, width = 96, height = 36 }: Props) {
  const display = useMemo(() => comfortSeries(points, mode), [points, mode])
  const comforted = isComforted(points, mode)
  const plot = useMemo(() => ({ x: 1, y: 3, w: width - 2, h: height - 6 }), [width, height])

  const honest = useMemo(() => project(points, plot, 0.12), [points, plot])
  const shown = useMemo(() => project(display, plot, 0.12), [display, plot])

  const t = useMotionValue(0)
  useEffect(() => {
    animate(t, reveal && comforted ? 1 : 0, { type: 'spring', stiffness: 240, damping: 26 })
  }, [reveal, comforted, t])

  const lineD = useTransform(t, (v) => linePath(shown.xs, lerpArray(shown.ys, honest.ys, v)))
  const areaD = useTransform(t, (v) => areaPath(shown.xs, lerpArray(shown.ys, honest.ys, v), height))
  const gradId = `spark-${useId().replace(/:/g, '')}`

  const shownUp = changeOf(display).abs >= 0
  const honestUp = changeOf(points).abs >= 0
  const stroke = useTransform(t, [0, 1], [shownUp ? UP : DOWN, honestUp ? UP : DOWN])

  return (
    <svg width={width} height={height} aria-hidden="true" className="block shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <motion.stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
          <motion.stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path d={areaD} fill={`url(#${gradId})`} />
      <motion.path d={lineD} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
