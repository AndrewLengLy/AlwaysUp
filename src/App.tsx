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
    <header className="sticky top-0 z-30 border-b border-pbx-800 bg-pbx-black/90 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3 sm:px-8">
        <button
          onClick={() => go({ name: 'portfolio' })}
          className="flex min-h-11 items-center gap-2.5 text-[15px] font-semibold tracking-tight text-pbx-white"
        >
          <Mark />
          AlwaysUp
        </button>

        <div className="flex-1" />

        {mode !== 'comfort' && (
          <span className="hidden text-[10.5px] tracking-[0.16em] text-pbx-400 uppercase sm:inline">
            {label} mode
          </span>
        )}
        <ParodyBadge revealing={revealing} />

        <button
          onClick={() => go({ name: 'settings' })}
          aria-label="Settings"
          aria-current={view.name === 'settings' ? 'page' : undefined}
          className={`flex min-h-11 min-w-11 items-center justify-center transition-colors ${
            view.name === 'settings' ? 'text-pbx-white' : 'text-pbx-400 hover:text-pbx-white'
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
      </nav>

      {mode !== 'comfort' && (
        <div className="mx-auto w-full max-w-5xl px-5 pb-2 sm:hidden sm:px-8">
          <span className="text-[10.5px] tracking-[0.16em] text-pbx-400 uppercase">{label} mode</span>
        </div>
      )}
    </header>
  )
}

/** The chart-line mark: a climb that is not necessarily a climb. */
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 13.5 6 8.5l3.2 3 5-7.2" stroke="#21c97f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.6 4.3h3.6v3.6" stroke="#21c97f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Shell() {
  const { view, acknowledged } = useStore()
  const [revealing, setRevealing] = useState(false)
  const onReveal = useCallback((v: boolean) => setRevealing(v), [])

  const key = view.name === 'detail' ? `detail:${view.ticker}` : view.name

  return (
    <div className="min-h-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-pbx-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-pbx-black"
      >
        Skip to content
      </a>

      <Header revealing={revealing} />

      <main id="main" className="pt-8 sm:pt-12">
        {/* Keyed remount gives each screen a fresh entrance. The content is never gated
            on opacity: a stalled animation must not be able to hide the whole app. */}
        <motion.div key={key} initial={{ y: 6 }} animate={{ y: 0 }} transition={{ duration: 0.18 }}>
          {view.name === 'portfolio' && <Portfolio onReveal={onReveal} />}
          {view.name === 'detail' && <Detail ticker={view.ticker} onReveal={onReveal} />}
          {view.name === 'settings' && <Settings />}
        </motion.div>
      </main>

      <footer className="border-t border-pbx-800">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
          <p className="text-[11.5px] leading-relaxed text-pbx-500">
            AlwaysUp is a parody. It mirrors losing charts on purpose and tells you so on every screen.
            Nothing here is investment advice or a basis for any decision.
          </p>
        </div>
      </footer>

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
