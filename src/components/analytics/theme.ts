// Sprint Analytics shares the Triage Board's palette: one violet accent for
// the series that matters (human approvals), a low-chroma slate for context
// (dependabot), all-white type with hierarchy from size and weight alone.
// Chart colors were validated against the #11151D surface with the dataviz
// palette checker (violet clears 3:1; the slate is intentionally de-emphasis).
export const A = {
  bg: '#0B0E14',
  surface: '#11151D',
  line: 'rgba(148,163,184,0.14)',
  grid: 'rgba(148,163,184,0.10)',
  text: '#FFFFFF',
  accent: '#8B7CF6',
  accentSoft: 'rgba(139,124,246,0.14)',
  muted: '#5B6473',
  mutedSoft: 'rgba(91,100,115,0.28)',
  up: '#4ADE80',
  down: '#F87171',
} as const

export const SERIES = {
  human: { label: 'Human PRs', color: A.accent },
  dependabot: { label: 'Dependabot PRs', color: A.muted },
} as const

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
