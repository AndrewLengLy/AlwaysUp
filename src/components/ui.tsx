import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fmtPct, fmtSigned } from '../lib/format'

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

/** Non-dismissible. It is on every screen, at all times, by design. */
export function ParodyBadge({ revealing }: { revealing: boolean }) {
  return (
    <motion.div
      key={revealing ? 'real' : 'parody'}
      // Position only. The badge is non-dismissible, so nothing about it may depend
      // on an animation having run.
      initial={{ y: 6 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.16 }}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase ${
        revealing
          ? 'border-down-500/50 bg-down-500/10 text-down-400'
          : 'border-pbx-700 bg-pbx-800 text-pbx-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 ${revealing ? 'bg-down-500' : 'bg-pbx-500'}`} />
      {revealing ? (
        'Showing reality'
      ) : (
        <>
          {/* The badge never disappears; on a narrow screen it only gets shorter. */}
          <span className="sm:hidden">Parody</span>
          <span className="hidden sm:inline">Parody. Values may be inverted</span>
        </>
      )}
    </motion.div>
  )
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
