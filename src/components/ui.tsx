import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fmtPct, fmtSigned } from '../lib/format'
import type { ComfortMode } from '../lib/flip'

/**
 * Sharp corners throughout. The Parabox mark is a broken square with hard corners, and
 * the app is a chart tool, so square panels and hairline rules do more work here than
 * rounded cards would.
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`border border-pbx-800 bg-pbx-panel ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function ChangeBadge({
  pct,
  abs,
  size = 'md',
  showAbs = true,
}: {
  pct: number
  abs: number
  size?: 'sm' | 'md' | 'lg'
  showAbs?: boolean
}) {
  const up = abs >= 0
  const cls = up ? 'text-up-400' : 'text-down-400'
  const text = size === 'lg' ? 'text-[17px]' : size === 'sm' ? 'text-[12.5px]' : 'text-[14px]'

  return (
    <span className={`tnum inline-flex items-center gap-1.5 font-mono font-medium ${cls} ${text}`}>
      <Arrow up={up} />
      {showAbs && <span>{fmtSigned(abs)}</span>}
      <span className={showAbs ? 'opacity-75' : ''}>{fmtPct(pct)}</span>
    </span>
  )
}

function Arrow({ up }: { up: boolean }) {
  return (
    <motion.svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      animate={{ rotate: up ? 0 : 180 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="M5 0.6 L9.4 8.4 H0.6 Z" fill="currentColor" />
    </motion.svg>
  )
}

/**
 * What the app is doing to the chart, right now, in every screenshot.
 *
 * This replaced a "PARODY" sticker. Naming the distortion discloses more than naming
 * the genre does: "Mirrored" tells you the specific thing being done to the numbers,
 * where "Parody" only asks you to take the app's word for it. It is also in character,
 * which the sticker never was, so it can stay up permanently without the app having to
 * break stride to apologise for itself. Non-dismissible, in every mode.
 */
export function ModeBadge({ mode, revealing }: { mode: ComfortMode; revealing: boolean }) {
  const state = revealing ? REVEALED : BADGE[mode]

  return (
    <motion.div
      key={state.label}
      // Position only. The badge is non-dismissible, so nothing about it may depend
      // on an animation having run.
      initial={{ y: 6 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.16 }}
      title={state.detail}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase ${
        revealing
          ? 'border-down-500/50 bg-down-500/10 text-down-400'
          : 'border-pbx-700 bg-pbx-800 text-pbx-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 ${state.dot}`} />
      {state.label}
      {/* The badge is terse on screen and explicit to a screen reader. Both are honest;
          only one of them has to fit in a header. */}
      <span className="sr-only normal-case">. {state.detail}</span>
    </motion.div>
  )
}

type BadgeState = { label: string; detail: string; dot: string }

const REVEALED: BadgeState = {
  label: 'Showing reality',
  detail: 'The real price action, unaltered.',
  dot: 'bg-down-500',
}

const BADGE: Record<ComfortMode, BadgeState> = {
  honest: {
    label: 'Honest',
    detail: 'Charts are drawn as they happened. Nothing is altered.',
    dot: 'bg-pbx-500',
  },
  comfort: {
    label: 'Mirrored',
    detail:
      'Losing charts are reflected about the opening price, so a fall is drawn as a rise. Figures shown may be the exact opposite of what happened.',
    dot: 'bg-up-500',
  },
  delulu: {
    label: 'Delulu',
    detail: 'Every chart is rebuilt to climb. What is drawn did not happen.',
    dot: 'bg-up-500',
  },
}

/**
 * Marks a series that was invented because the real one could not be fetched.
 *
 * The comfort flip is a lie the app advertises, explains and lets you undo. Simulated
 * data wearing a real company's ticker is not that. It is a claim about the world that
 * happens to be false, so it never ships unlabelled, in any comfort mode.
 */
export function SimulatedChip({ className = '' }: { className?: string }) {
  return (
    <span
      title="Real market data was unavailable for this symbol. The prices shown are simulated."
      className={`inline-flex items-center gap-1 border border-warn-500/50 bg-warn-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-warn-400 uppercase ${className}`}
    >
      <span className="h-1 w-1 bg-warn-500" />
      Simulated
    </span>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] tracking-[0.14em] text-pbx-400 uppercase">{label}</span>
      <span className="tnum font-mono text-[16px] text-pbx-white">{value}</span>
    </div>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

/** Minimum 44px tall so it stays a real touch target on a phone. */
export function Button({ variant = 'secondary', className = '', children, ...rest }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-pbx-white text-pbx-black hover:bg-pbx-200'
      : variant === 'ghost'
        ? 'border border-transparent text-pbx-400 hover:border-pbx-700 hover:text-pbx-white'
        : 'border border-pbx-700 text-pbx-white hover:border-pbx-500 hover:bg-pbx-800'

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-pbx-800 ${className}`}
    />
  )
}

/** Section label. Keeps the heading rhythm identical across screens. */
export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-semibold tracking-[0.16em] text-pbx-400 uppercase">{children}</h2>
      {aside}
    </div>
  )
}
