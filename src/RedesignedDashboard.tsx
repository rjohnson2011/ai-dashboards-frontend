import { useState, useEffect } from 'react'
import AppHeader from './components/AppHeader'
import { usePullRequests } from './hooks/usePullRequests'
import { authService } from './services/auth'

import TriageBoard from './designs/TriageBoard'
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
    key: 'triage',
    label: 'Triage Board',
    blurb: 'Monitoring vets-api, vets-api-mockdata, platform-atlas',
    Component: TriageBoard,
  },
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

// Per-account preference. Keyed by the signed-in user's email so two people
// sharing a browser profile don't overwrite each other's choice; the legacy
// unscoped key is read once as a fallback so existing picks survive.
const LEGACY_STORAGE_KEY = 'redesign-active-key'

function prefKeyFor(email?: string | null): string {
  return email ? `dashboard-design:${email}` : LEGACY_STORAGE_KEY
}

export default function RedesignGallery({ forceKey }: { forceKey?: string } = {}) {
  const email = authService.getUser()?.email
  const prefKey = prefKeyFor(email)

  const [activeKey, setActiveKey] = useState<string>(() => {
    // A design the user explicitly picked is their preference everywhere,
    // including / and /dashboard. `forceKey` only decides the default for
    // someone who has never chosen — so the team lands on the Triage Board
    // without overriding anyone who deliberately switched.
    const saved = localStorage.getItem(prefKey) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (saved && DESIGNS.some(d => d.key === saved)) return saved
    if (forceKey && DESIGNS.some(d => d.key === forceKey)) return forceKey
    return DESIGNS[0].key
  })
  const { pullRequests, loading, error, lastUpdated, refresh } = usePullRequests()

  useEffect(() => {
    localStorage.setItem(prefKey, activeKey)
    // Keep the legacy key in step so a sign-out/sign-in cycle (or mock mode,
    // where there is no email) still resolves to the same design.
    localStorage.setItem(LEGACY_STORAGE_KEY, activeKey)
  }, [prefKey, activeKey])

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
        primaryKey={DESIGNS[0].key}
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
