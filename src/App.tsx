import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { StoreProvider, useStore } from './state/store'
import { Portfolio } from './screens/Portfolio'
import { Detail } from './screens/Detail'
import { Settings } from './screens/Settings'
import { Disclosure } from './components/Disclosure'
import { ParodyBadge } from './components/ui'
import { COMFORT_MODES } from './lib/flip'

function Header({ revealing }: { revealing: boolean }) {
  const { view, go, mode } = useStore()
  const label = COMFORT_MODES.find((m) => m.id === mode)?.label ?? ''

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-3.5">
        <button
          onClick={() => go({ name: 'portfolio' })}
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M2 13.5 6 8.5l3.2 3 5-7.2"
              stroke="#21c97f"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M11.6 4.3h3.6v3.6" stroke="#21c97f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          AlwaysUp
        </button>

        <div className="flex-1" />
        <ParodyBadge revealing={revealing} />

        <button
          onClick={() => go({ name: 'settings' })}
          aria-label="Settings"
          className={`rounded-lg p-1.5 transition ${
            view.name === 'settings' ? 'text-white' : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10 2.6v1.8M10 15.6v1.8M17.4 10h-1.8M4.4 10H2.6M15.2 4.8l-1.3 1.3M6.1 13.9l-1.3 1.3M15.2 15.2l-1.3-1.3M6.1 6.1 4.8 4.8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {mode !== 'comfort' && (
        <div className="mx-auto w-full max-w-2xl px-5 pb-2.5">
          <span className="text-[11px] tracking-wide text-ink-400 uppercase">{label} mode</span>
        </div>
      )}
    </header>
  )
}

function Shell() {
  const { view, acknowledged } = useStore()
  const [revealing, setRevealing] = useState(false)
  const onReveal = useCallback((v: boolean) => setRevealing(v), [])

  const key = view.name === 'detail' ? `detail:${view.ticker}` : view.name

  return (
    <div className="min-h-full">
      <Header revealing={revealing} />

      <main className="pt-5">
        {/* Keyed remount gives each screen a fresh entrance. The content is never gated
            on opacity: a stalled animation must not be able to hide the whole app. */}
        <motion.div key={key} initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.18 }}>
          {view.name === 'portfolio' && <Portfolio onReveal={onReveal} />}
          {view.name === 'detail' && <Detail ticker={view.ticker} onReveal={onReveal} />}
          {view.name === 'settings' && <Settings />}
        </motion.div>
      </main>

      {!acknowledged && <Disclosure />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
