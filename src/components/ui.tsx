import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fmtPct, fmtSigned } from '../lib/format'

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
  const cls = up ? 'text-up-400' : 'text-down-500'
  const text = size === 'lg' ? 'text-[17px]' : size === 'sm' ? 'text-[12.5px]' : 'text-[14px]'

  return (
    <span className={`tnum inline-flex items-center gap-1.5 font-medium ${cls} ${text}`}>
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
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.16 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase ${
        revealing
          ? 'border-down-500/40 bg-down-500/10 text-down-500'
          : 'border-ink-600 bg-ink-800 text-ink-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${revealing ? 'bg-down-500' : 'bg-ink-400'}`} />
      {revealing ? (
        'Showing reality'
      ) : (
        <>
          {/* The badge never disappears; on a narrow screen it only gets shorter. */}
          <span className="sm:hidden">Parody · inverted</span>
          <span className="hidden sm:inline">Parody · values may be inverted</span>
        </>
      )}
    </motion.div>
  )
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`rounded-2xl border border-ink-700 bg-ink-900 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] tracking-wide text-ink-400 uppercase">{label}</span>
      <span className="tnum text-[15px] text-ink-200">{value}</span>
    </div>
  )
}
