import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import UserMenu from './components/UserMenu'
import { usePullRequests } from './hooks/usePullRequests'
import { timeAgo, absoluteTime } from './lib/dashboard'

import EditorialTerminal from './designs/EditorialTerminal'
import BrutalistPrint from './designs/BrutalistPrint'
import RefinedMinimal from './designs/RefinedMinimal'
import CrtConsole from './designs/CrtConsole'

interface Design {
  key: string
  label: string
  blurb: string
  Component: React.ComponentType<{ pullRequests: ReturnType<typeof usePullRequests>['pullRequests'] }>
}

const DESIGNS: Design[] = [
  {
    key: 'editorial',
    label: 'Editorial Terminal',
    blurb: 'Warm dark · Fraunces serif · earth-toned reviewer pins',
    Component: EditorialTerminal,
  },
  {
    key: 'brutalist',
    label: 'Brutalist Print',
    blurb: 'Cream paper · Archivo Black · screaming red accents',
    Component: BrutalistPrint,
  },
  {
    key: 'refined',
    label: 'Refined Minimal',
    blurb: 'White · Swiss grid · single accent · calm',
    Component: RefinedMinimal,
  },
  {
    key: 'crt',
    label: 'CRT Console',
    blurb: 'Phosphor green · scanlines · pure terminal',
    Component: CrtConsole,
  },
]

const STORAGE_KEY = 'redesign-active-key'

export default function RedesignGallery() {
  const [activeKey, setActiveKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DESIGNS[0].key
  })
  const { pullRequests, loading, error, lastUpdated, isUpdating, refresh } = usePullRequests()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeKey)
  }, [activeKey])

  // Each design's stylesheet uses !important to override the global
  // `.dark * { color: white !important }` rule from dark-mode-force-white.css.
  // No theme stripping needed.

  const active = DESIGNS.find(d => d.key === activeKey) || DESIGNS[0]
  const ActiveComponent = active.Component

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Gallery chrome — always present, neutral */}
      <div className="sticky top-0 z-50 border-b border-zinc-900 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1480px] items-center gap-4 px-5 sm:px-7">
          <span className="font-medium tracking-tight text-sm">PR Dashboard</span>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/30">
            Gallery
          </span>

          <div className="ml-2 hidden md:flex items-center gap-1 bg-zinc-900/60 rounded-md p-0.5 ring-1 ring-zinc-800">
            {DESIGNS.map(d => {
              const isActive = d.key === activeKey
              return (
                <button
                  key={d.key}
                  onClick={() => setActiveKey(d.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                  title={d.blurb}
                >
                  {d.label}
                </button>
              )
            })}
          </div>

          {/* Mobile selector */}
          <select
            value={activeKey}
            onChange={e => setActiveKey(e.target.value)}
            className="md:hidden ml-2 bg-zinc-900 border border-zinc-800 text-xs px-2 py-1 rounded text-zinc-200"
          >
            {DESIGNS.map(d => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>

          <Link
            to="/dashboard"
            className="ml-auto hidden sm:inline text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            ← Old dashboard
          </Link>

          {lastUpdated && (
            <span
              className="hidden lg:inline text-[11px] text-zinc-500 tabular-nums"
              title={absoluteTime(lastUpdated)}
            >
              Updated {timeAgo(lastUpdated)} ago
            </span>
          )}

          <button
            onClick={refresh}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>

          <UserMenu />
        </div>

        {/* Description band */}
        <div className="mx-auto max-w-[1480px] px-5 sm:px-7 pb-2.5">
          <p className="text-[11px] text-zinc-500">
            <span className="text-zinc-300">{active.label}</span>
            <span className="mx-2 text-zinc-700">·</span>
            {active.blurb}
          </p>
        </div>
      </div>

      <FontPreloader />

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-zinc-500">
          loading…
        </div>
      ) : error ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6">
          <div className="text-rose-400">{error}</div>
          <button
            onClick={refresh}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <ActiveComponent pullRequests={pullRequests} />
      )}
    </div>
  )
}

// Preload all the fonts the variants use, regardless of which is active.
// Avoids flash-of-unstyled-text when switching between them.
function FontPreloader() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=Archivo+Black&display=swap"
    />
  )
}
