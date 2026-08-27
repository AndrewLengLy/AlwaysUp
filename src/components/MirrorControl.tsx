import { useState } from 'react'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import { Button } from './ui'

/**
 * The flip, made repeatable and inspectable.
 *
 * The original app flipped once on load and let you peek by holding a finger down. That
 * hides the one idea the whole thing is built on. This puts the transform on a track you
 * can drag: park it half way and the chart sits flat, with the real line and the
 * comforting line both visible on either side of the axis they are mirrored about.
 *
 * It is a real range input, so arrow keys, Home, End and screen readers work without any
 * of it being reimplemented.
 */
export function MirrorControl({
  t,
  onScrub,
  onFlip,
  disabled,
  reason,
}: {
  t: MotionValue<number>
  onScrub: (v: number) => void
  onFlip: () => void
  disabled: boolean
  reason: string
}) {
  const [pct, setPct] = useState(() => Math.round(t.get() * 100))
  useMotionValueEvent(t, 'change', (v) => setPct(Math.round(Math.min(1, Math.max(0, v)) * 100)))

  if (disabled) {
    return (
      <p className="border border-pbx-800 bg-pbx-panel px-4 py-3 text-[13px] text-pbx-400">{reason}</p>
    )
  }

  const state =
    pct <= 2 ? 'Comforting version' : pct >= 98 ? 'What actually happened' : `Mid flip, ${pct}% of the way to reality`

  return (
    <div className="border border-pbx-800 bg-pbx-panel">
      <div className="flex items-center gap-4 px-4 pt-3">
        <span className="text-[10.5px] font-semibold tracking-[0.16em] text-pbx-400 uppercase">Mirror</span>
        <span aria-live="polite" className="flex-1 truncate text-right text-[12.5px] text-pbx-200">
          {state}
        </span>
      </div>

      <div className="flex items-center gap-3 px-4">
        <span aria-hidden="true" className="shrink-0 text-[11px] font-medium text-up-400">
          Comfort
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onScrub(Number(e.target.value) / 100)}
          className="scrub min-w-0 flex-1"
          aria-label="Reveal the real chart"
          aria-valuetext={state}
        />
        <span aria-hidden="true" className="shrink-0 text-[11px] font-medium text-down-400">
          Reality
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-pbx-800 px-4 py-2.5">
        <Button variant="secondary" onClick={onFlip} className="px-3">
          <FlipGlyph />
          Flip it
        </Button>
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-pbx-400">
          Drag the track, or press and hold the chart. Flip it as many times as you like.
        </p>
      </div>
    </div>
  )
}

function FlipGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 4.5h11M12.5 4.5 10 2M1.5 9.5h11M1.5 9.5 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
