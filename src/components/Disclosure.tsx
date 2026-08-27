import { motion } from 'framer-motion'
import { useStore } from '../state/store'

/**
 * Shown once, before anything else, and it cannot be dismissed by tapping away.
 * A comfort app that hides the fact that it is a comfort app is just a lie.
 */
export function Disclosure() {
  const { acknowledge } = useStore()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/92 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="w-full max-w-md rounded-t-3xl border border-ink-700 bg-ink-900 p-7 sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclosure-title"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-up-600/40 bg-up-600/10 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-up-400 uppercase">
          Parody
        </div>

        <h1 id="disclosure-title" className="text-2xl font-semibold tracking-tight text-white">
          This app lies to you on purpose.
        </h1>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-300">
          <p>
            AlwaysUp is a joke about the psychological cost of checking your portfolio. When a position is
            down, it mirrors the chart so the line climbs instead of falls, and keeps it green.
          </p>
          <p>
            Prices, tickers and companies here are <span className="text-ink-200">simulated and fictional</span>.
            Nothing in this app is market data, and nothing in it is financial advice. Do not make a single
            decision based on anything you see.
          </p>
          <p>
            <span className="text-ink-200">Press and hold any chart</span> to see what actually happened. Screen
            readers always get the real numbers.
          </p>
        </div>

        <button
          onClick={acknowledge}
          className="mt-7 w-full rounded-2xl bg-up-500 py-3.5 text-[15px] font-semibold text-ink-950 transition hover:bg-up-400 active:scale-[0.99]"
        >
          I understand the numbers are inverted
        </button>
      </motion.div>
    </div>
  )
}
