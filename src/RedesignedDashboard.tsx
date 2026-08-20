import { useState, useEffect } from 'react'
import AppHeader from './components/AppHeader'
import { usePullRequests } from './hooks/usePullRequests'

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
      <AppHeader
        variant="gallery"
        designs={DESIGNS.map(({ key, label, blurb }) => ({ key, label, blurb }))}
        activeKey={activeKey}
        onSelect={setActiveKey}
        activeBlurb={active.blurb}
        lastUpdated={lastUpdated}
      />

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
