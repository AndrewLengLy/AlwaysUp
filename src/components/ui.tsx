import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cents, fmtPct, fmtSigned } from '../lib/format'
import type { ComfortMode, Distortion } from '../lib/flip'

/**
 * Square panels and hairline rules, as on andrewlengly.com. The panel is a shade off the
 * cream ground, so it reads as paper on paper.
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`border border-line bg-panel ${className}`} {...rest}>
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
  const up = cents(abs) >= 0
  const cls = up ? 'text-up' : 'text-down'
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
 *
 * Which means it has to name the operation and not the setting. Comfort mode has three
 * of them — a chart can be mirrored, moved bodily up the axis, or left alone because
 * nothing on it was a loss — and a badge reading "Mirrored" over a chart that was lifted
 * is exactly the kind of approximate disclosure this was built to replace. The screens
 * report what they actually did.
 */
export function ModeBadge({
  mode,
  revealing,
  distortion = 'none',
}: {
  mode: ComfortMode
  revealing: boolean
  distortion?: Distortion
}) {
  const state = revealing ? REVEALED : badgeFor(mode, distortion)

  return (
    <motion.div
      key={state.label}
      // Position only. The badge is non-dismissible, so nothing about it may depend
      // on an animation having run.
      initial={{ y: 6 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.16 }}
      title={state.detail}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-pixel tracking-[0.06em] whitespace-nowrap uppercase ${
        revealing
          ? 'border-down/50 bg-down/10 text-down'
          : 'border-line-strong bg-line text-muted'
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

function badgeFor(mode: ComfortMode, distortion: Distortion): BadgeState {
  if (mode !== 'comfort') return BADGE[mode]
  if (distortion === 'reflect') return MIRRORED
  if (distortion === 'shift') return LIFTED
  return IDLE
}

const REVEALED: BadgeState = {
  label: 'Showing reality',
  detail: 'The real price action, unaltered.',
  dot: 'bg-down',
}

const MIRRORED: BadgeState = {
  label: 'Mirrored',
  detail:
    'A losing chart is reflected — about the price you paid when the position is underwater, about the opening price otherwise — so a fall is drawn as a rise. Figures shown may be the exact opposite of what happened.',
  dot: 'bg-up',
}

const LIFTED: BadgeState = {
  label: 'Lifted',
  detail:
    'A chart a mirror cannot rescue — a green day on a position that is still underwater — has been moved bodily up the price axis to clear what you paid. Its shape is untouched and every price on it is wrong by the same amount.',
  dot: 'bg-up',
}

const IDLE: BadgeState = {
  label: 'Comfort',
  detail: 'Comfort mode is on. Nothing on this screen is a loss, so nothing has been altered.',
  dot: 'bg-faint',
}

const BADGE: Record<Exclude<ComfortMode, 'comfort'>, BadgeState> = {
  honest: {
    label: 'Honest',
    detail: 'Charts are drawn as they happened. Nothing is altered.',
    dot: 'bg-faint',
  },
  delulu: {
    label: 'Delulu',
    detail: 'Every chart is rebuilt to climb, and lifted past what you paid if it has to be. What is drawn did not happen.',
    dot: 'bg-up',
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
      className={`inline-flex items-center gap-1 border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-[10px] font-pixel tracking-[0.06em] whitespace-nowrap text-warn uppercase ${className}`}
    >
      <span className="h-1 w-1 bg-warn" />
      Simulated
    </span>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-pixel tracking-[0.06em] text-muted uppercase">{label}</span>
      <span className="tnum font-mono text-[16px] text-ink">{value}</span>
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
      ? 'bg-up-deep text-ground hover:bg-up dark:bg-up dark:hover:bg-up-deep'
      : variant === 'ghost'
        ? 'border border-transparent text-muted hover:border-line-strong hover:text-ink'
        : 'border border-line-strong text-ink hover:border-faint hover:bg-line'

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
      className={`animate-pulse bg-line ${className}`}
    />
  )
}

/** Section label. Keeps the heading rhythm identical across screens. */
export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="text-[22px] leading-tight font-semibold text-ink sm:text-[26px]">
        <span className="bracket">[</span>
        {children}
        <span className="bracket">]</span>
      </h2>
      {aside}
    </div>
  )
}
