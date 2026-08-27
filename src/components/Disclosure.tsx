import { motion } from 'framer-motion'
import { useStore } from '../state/store'
import { source } from '../lib/data'

/**
 * Shown once, before anything else, and it cannot be dismissed by tapping away.
 * A comfort app that hides the fact that it is a comfort app is just a lie.
 */
export function Disclosure() {
  const { acknowledge } = useStore()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pbx-black/95 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div
        // Slides in, never fades: a disclosure that an unrun animation can leave
        // invisible is not a disclosure.
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="max-h-full w-full max-w-lg overflow-y-auto border border-pbx-700 bg-pbx-panel p-7 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclosure-title"
      >
        <div className="mb-6 inline-flex items-center gap-2 border border-warn-500/50 bg-warn-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-warn-400 uppercase">
          Parody
        </div>

        <h1 id="disclosure-title" className="text-[26px] leading-tight font-semibold tracking-tight text-pbx-white">
          This app lies to you on purpose.
        </h1>

        <MirrorDiagram />

        <div className="mt-6 space-y-3.5 text-[14.5px] leading-relaxed text-pbx-200">
          <p>
            AlwaysUp is a joke about the psychological cost of checking your portfolio. When a position is
            down, it mirrors the chart about the opening price so the line climbs instead of falls, and
            keeps it green.
          </p>
          {source.real ? (
            <p>
              The companies and prices are <span className="text-pbx-white">real</span>. What the chart does
              with them is not. Every number on screen may be the exact opposite of what happened. Nothing
              here is investment advice or a basis for a decision, least of all a decision about the
              companies it names.
            </p>
          ) : (
            <p>
              Prices, tickers and companies here are <span className="text-pbx-white">simulated and fictional</span>.
              Nothing in this app is market data, and nothing in it is financial advice. Do not make a single
              decision based on anything you see.
            </p>
          )}
          <p>
            <span className="text-pbx-white">Tap any chart to flip it back</span>, drag the mirror track to
            stop it half way, or press and hold to peek. Screen readers always get the real numbers.
          </p>
        </div>

        <button
          onClick={acknowledge}
          className="mt-8 min-h-12 w-full bg-pbx-white px-4 text-[15px] font-semibold text-pbx-black transition-colors hover:bg-pbx-200"
        >
          I understand the numbers are inverted
        </button>
      </motion.div>
    </div>
  )
}

/** The whole idea in one picture: same shape, same drama, opposite direction. */
function MirrorDiagram() {
  return (
    <svg viewBox="0 0 320 96" className="mt-6 w-full" role="img" aria-label="A falling price line and its mirrored copy, reflected about the opening price.">
      <line x1="8" y1="48" x2="312" y2="48" stroke="#3a3a3a" strokeWidth="1" strokeDasharray="2 5" />
      <path
        d="M8 48 L46 40 L84 58 L122 50 L160 70 L198 63 L236 80 L274 74 L312 88"
        fill="none"
        stroke="#f2555a"
        strokeOpacity="0.5"
        strokeWidth="1.75"
        strokeDasharray="3 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 48 L46 56 L84 38 L122 46 L160 26 L198 33 L236 16 L274 22 L312 8"
        fill="none"
        stroke="#21c97f"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="312" cy="8" r="3.5" fill="#21c97f" />
      <text x="8" y="16" fill="#808080" fontSize="8.5" letterSpacing="1.6" fontFamily="var(--font-mono)">
        WHAT YOU SEE
      </text>
      <text x="312" y="68" fill="#808080" fontSize="8.5" letterSpacing="1.6" textAnchor="end" fontFamily="var(--font-mono)">
        WHAT HAPPENED
      </text>
    </svg>
  )
}
