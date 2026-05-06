import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  GitPullRequest,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Sun,
  Moon,
  BarChart3,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react'
import { authService } from './services/auth'
import { subscribeToPullRequests } from './services/actionCable'
import { useTheme } from './contexts/ThemeContext'
import UserMenu from './components/UserMenu'
import {
  type PullRequest,
  type ApiResponse,
  BACKEND_REVIEWERS,
  isReadyForReview,
  isAwaitingAuthorChanges,
  isFinishedUnmerged,
  hasFailingCi,
  isDependabot,
  isTrulyExemptFromBackendReview,
} from './types/pull-request'
import { displayUser, isGhostUser } from './lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const seconds = Math.max(1, Math.floor((Date.now() - d) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

function nameFromHandle(handle: string): string {
  if (!handle) return ''
  if (isGhostUser(handle)) return '?'
  const parts = handle.split(/[-_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return handle.slice(0, 2).toUpperCase()
}

function colorForHandle(handle: string): string {
  let hash = 0
  for (let i = 0; i < handle.length; i++) hash = handle.charCodeAt(i) + ((hash << 5) - hash)
  const palette = [
    'bg-teal-600',
    'bg-sky-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-fuchsia-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-cyan-600',
  ]
  return palette[Math.abs(hash) % palette.length]
}

// ─── components ───────────────────────────────────────────────────────────

interface ReviewerBadge {
  user: string
  state: 'approved' | 'changes_requested' | 'commented'
}

function ReviewerAvatars({ badges }: { badges: ReviewerBadge[] }) {
  if (badges.length === 0) {
    return <span className="text-xs text-zinc-600">—</span>
  }

  const visible = badges.slice(0, 4)
  const overflow = badges.length - visible.length

  return (
    <div className="flex -space-x-1.5">
      {visible.map(({ user, state }) => {
        const ring =
          state === 'approved'
            ? 'ring-2 ring-emerald-400/80'
            : state === 'changes_requested'
              ? 'ring-2 ring-rose-400/80'
              : 'ring-2 ring-zinc-500/60'
        return (
          <div
            key={user + state}
            className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium text-white border border-zinc-900 ${colorForHandle(user)} ${ring}`}
            title={`${displayUser(user)} · ${state.replace('_', ' ')}`}
          >
            {nameFromHandle(user)}
          </div>
        )
      })}
      {overflow > 0 && (
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-300 border border-zinc-900">
          +{overflow}
        </div>
      )}
    </div>
  )
}

function StatusPill({ pr }: { pr: PullRequest }) {
  // Priority order: failures > changes requested > pending CI > ready > approved
  if (pr.draft) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
        Draft
      </span>
    )
  }

  const failingCount = pr.failed_checks || 0
  if (failingCount > 0 && hasFailingCi(pr)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/80 px-2 py-0.5 text-[11px] font-medium text-rose-300 ring-1 ring-rose-900/60">
        <AlertTriangle className="h-3 w-3" />
        {failingCount} failing
      </span>
    )
  }

  const changesRequested = pr.approval_summary?.changes_requested_count || 0
  if (
    changesRequested > 0 &&
    pr.changes_requested_info?.status !== 'new_commit_from_author' &&
    pr.changes_requested_info?.status !== 'new_comment_from_author'
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-amber-900/60">
        Changes requested
      </span>
    )
  }

  if (pr.ci_status === 'pending' || (pr.pending_checks ?? 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300 ring-1 ring-zinc-700">
        <Clock className="h-3 w-3" />
        CI pending
      </span>
    )
  }

  if (isFinishedUnmerged(pr)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-900/60">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    )
  }

  if (isReadyForReview(pr)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-950/80 px-2 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-sky-900/60">
        <Sparkles className="h-3 w-3" />
        Ready
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
      Open
    </span>
  )
}

function reviewerBadgesFor(pr: PullRequest): ReviewerBadge[] {
  const summary = pr.approval_summary
  if (!summary) return []
  const badges: ReviewerBadge[] = []
  summary.approved_users?.forEach(u => badges.push({ user: u, state: 'approved' }))
  summary.changes_requested_users?.forEach(u => badges.push({ user: u, state: 'changes_requested' }))
  summary.commented_users?.forEach(u => {
    if (!badges.find(b => b.user === u)) badges.push({ user: u, state: 'commented' })
  })
  return badges
}

// ─── filters ─────────────────────────────────────────────────────────────

type FilterKey = 'ready' | 'awaiting' | 'dependabot' | 'failing' | 'drafts' | 'approved' | 'all'

interface FilterDef {
  key: FilterKey
  label: string
  description: string
  predicate: (pr: PullRequest) => boolean
}

const FILTERS: FilterDef[] = [
  {
    key: 'ready',
    label: 'Ready for review',
    description: 'Team-approved and waiting on backend review',
    predicate: isReadyForReview,
  },
  {
    key: 'awaiting',
    label: 'Awaiting author',
    description: 'Reviewer requested changes',
    predicate: isAwaitingAuthorChanges,
  },
  {
    key: 'failing',
    label: 'Failing CI',
    description: 'CI checks failing',
    predicate: pr => hasFailingCi(pr) && !pr.draft,
  },
  {
    key: 'drafts',
    label: 'Drafts',
    description: 'Still being worked on',
    predicate: pr => pr.draft,
  },
  {
    key: 'dependabot',
    label: 'Dependabot',
    description: 'Automated dependency updates',
    predicate: isDependabot,
  },
  {
    key: 'approved',
    label: 'Approved · unmerged',
    description: 'Backend-approved, ready to merge',
    predicate: isFinishedUnmerged,
  },
  {
    key: 'all',
    label: 'All open',
    description: 'Every open PR',
    predicate: pr => pr.state === 'open',
  },
]

// ─── component ───────────────────────────────────────────────────────────

export default function RedesignedDashboard() {
  const { theme, toggleTheme } = useTheme()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [groupByRepo, setGroupByRepo] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const lastUpdatedRef = useRef<string | null>(null)

  const fetchPRs = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reviews`,
        { headers: { ...authService.getAuthHeaders() }, signal: controller.signal }
      )
      clearTimeout(timeout)
      if (response.status === 401 || response.status === 403) {
        authService.logout()
        return
      }
      if (!response.ok) throw new Error('Failed to fetch')
      const data: ApiResponse = await response.json()
      setIsUpdating(data.updating || false)
      if (!isPolling || data.last_updated !== lastUpdatedRef.current) {
        const all = [...(data.pull_requests || []), ...(data.approved_pull_requests || [])]
        setPullRequests(all)
        lastUpdatedRef.current = data.last_updated
        setLastUpdated(data.last_updated)
      }
      setError(null)
    } catch (err) {
      if (!isPolling) {
        setError(err instanceof Error ? err.message : 'Could not load PRs')
      }
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPRs(false)
  }, [fetchPRs])

  useEffect(() => {
    const interval = isUpdating ? 5000 : 60000
    const timer = setInterval(() => fetchPRs(true), interval)
    return () => clearInterval(timer)
  }, [fetchPRs, isUpdating])

  useEffect(() => {
    return subscribeToPullRequests(() => fetchPRs(true))
  }, [fetchPRs])

  // Counts
  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      ready: 0,
      awaiting: 0,
      failing: 0,
      drafts: 0,
      dependabot: 0,
      approved: 0,
      all: 0,
    }
    for (const pr of pullRequests) {
      for (const f of FILTERS) {
        if (f.predicate(pr)) base[f.key]++
      }
    }
    return base
  }, [pullRequests])

  // Filtered list
  const filtered = useMemo(() => {
    const filterDef = FILTERS.find(f => f.key === activeFilter)!
    let list = pullRequests.filter(filterDef.predicate)

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        pr =>
          pr.title.toLowerCase().includes(q) ||
          pr.author.toLowerCase().includes(q) ||
          String(pr.number).includes(q) ||
          (pr.repository_name || '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return list
  }, [pullRequests, activeFilter, searchTerm])

  const grouped = useMemo(() => {
    if (!groupByRepo) return { __ungrouped: filtered }
    const out: Record<string, PullRequest[]> = {}
    for (const pr of filtered) {
      const key = pr.repository_name || 'unknown'
      ;(out[key] ||= []).push(pr)
    }
    return out
  }, [filtered, groupByRepo])

  const heroCount = counts.ready

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <div className="text-zinc-500">Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-3 p-6">
        <div className="text-rose-400">{error}</div>
        <button onClick={() => fetchPRs(false)} className="rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* ─── header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <GitPullRequest className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-sm font-semibold tracking-tight">PR Dashboard</span>
            <span className="ml-2 hidden sm:inline rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/30">
              Redesign
            </span>
          </div>

          <Link to="/sprint-metrics" className="ml-2 hidden md:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            <BarChart3 className="h-3.5 w-3.5" />
            Sprint metrics
          </Link>

          <Link to="/dashboard" className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to old design
          </Link>

          {lastUpdated && (
            <span
              className="hidden lg:inline text-xs text-zinc-500"
              title={absoluteTime(lastUpdated)}
            >
              Updated {timeAgo(lastUpdated)} ago
            </span>
          )}

          <button
            onClick={() => fetchPRs(false)}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleTheme}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>

          <UserMenu />
        </div>
      </header>

      {/* ─── content ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero card */}
        <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-6">
          <button
            onClick={() => setActiveFilter('ready')}
            className={`group relative overflow-hidden rounded-2xl border text-left p-6 transition-all ${
              activeFilter === 'ready'
                ? 'bg-gradient-to-br from-sky-950 via-sky-900/40 to-zinc-950 border-sky-700/60'
                : 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-300/90">
                <Sparkles className="h-4 w-4" />
                Needs your review
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-6xl font-light tracking-tight tabular-nums">{heroCount}</span>
                <span className="text-sm text-zinc-400">
                  {heroCount === 1 ? 'pull request' : 'pull requests'} ready for backend review
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-sky-400/80 group-hover:text-sky-300">
                Review now
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </button>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Backlog at a glance</div>
            <dl className="mt-4 grid grid-cols-2 gap-y-3">
              <dt className="text-xs text-zinc-400">Awaiting author</dt>
              <dd className="text-right text-sm tabular-nums text-zinc-200">{counts.awaiting}</dd>
              <dt className="text-xs text-zinc-400">Failing CI</dt>
              <dd className="text-right text-sm tabular-nums text-rose-300">{counts.failing}</dd>
              <dt className="text-xs text-zinc-400">Approved · unmerged</dt>
              <dd className="text-right text-sm tabular-nums text-emerald-300">{counts.approved}</dd>
              <dt className="text-xs text-zinc-400">Drafts</dt>
              <dd className="text-right text-sm tabular-nums text-zinc-200">{counts.drafts}</dd>
              <dt className="text-xs text-zinc-400">Dependabot</dt>
              <dd className="text-right text-sm tabular-nums text-zinc-200">{counts.dependabot}</dd>
              <dt className="text-xs text-zinc-400 border-t border-zinc-800 pt-2">All open</dt>
              <dd className="text-right text-sm tabular-nums text-zinc-300 border-t border-zinc-800 pt-2">{counts.all}</dd>
            </dl>
          </div>
        </section>

        {/* Filter chips */}
        <section className="mb-4 flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key
            const count = counts[f.key]
            const intent =
              f.key === 'failing'
                ? 'rose'
                : f.key === 'approved'
                  ? 'emerald'
                  : f.key === 'ready'
                    ? 'sky'
                    : 'zinc'
            const activeClass: Record<string, string> = {
              sky: 'bg-sky-500/15 text-sky-200 ring-sky-500/40',
              rose: 'bg-rose-500/15 text-rose-200 ring-rose-500/40',
              emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/40',
              zinc: 'bg-zinc-200 text-zinc-900 ring-zinc-200',
            }
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                  isActive
                    ? activeClass[intent]
                    : 'bg-zinc-900 text-zinc-400 ring-zinc-800 hover:text-zinc-200 hover:ring-zinc-700'
                }`}
                title={f.description}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    isActive ? 'bg-black/20' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </section>

        {/* Table controls */}
        <section className="mb-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search PRs by title, author, repo, number…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-9 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setGroupByRepo(g => !g)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              groupByRepo
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 ring-1 ring-zinc-800 hover:ring-zinc-700'
            }`}
          >
            Group by repo
          </button>
        </section>

        {/* Table */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState filterKey={activeFilter} hasSearch={!!searchTerm} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-14 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 w-[44%]">Pull request</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reviewers</th>
                    <th className="px-4 py-3 text-right">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([repo, prs]) => (
                    <RowGroup key={repo} repo={repo} prs={prs} groupByRepo={groupByRepo} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-xs text-zinc-600">
          {filtered.length} of {pullRequests.length} open PRs · vets-api · vets-api-mockdata · platform-atlas
        </p>
      </main>
    </div>
  )
}

function RowGroup({
  repo,
  prs,
  groupByRepo,
}: {
  repo: string
  prs: PullRequest[]
  groupByRepo: boolean
}) {
  return (
    <>
      {groupByRepo && repo !== '__ungrouped' && (
        <tr className="bg-zinc-950/50 border-y border-zinc-800">
          <td colSpan={4} className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {repo}
            <span className="ml-2 text-zinc-600">·</span>
            <span className="ml-2 text-zinc-600 normal-case tracking-normal">{prs.length}</span>
          </td>
        </tr>
      )}
      {prs.map(pr => (
        <PrRow key={pr.id} pr={pr} />
      ))}
    </>
  )
}

function PrRow({ pr }: { pr: PullRequest }) {
  const exempt = isTrulyExemptFromBackendReview(pr)
  const reviewers = reviewerBadgesFor(pr)

  return (
    <tr
      className="group border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40 transition-colors cursor-pointer"
      onClick={() => window.open(pr.url, '_blank', 'noopener,noreferrer')}
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] text-zinc-500 shrink-0">#{pr.number}</span>
              <span className="text-zinc-500 text-xs shrink-0">{pr.repository_name}</span>
              {pr.draft && (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 shrink-0">
                  draft
                </span>
              )}
              {exempt && (
                <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 ring-1 ring-cyan-900/60 shrink-0">
                  exempt
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0 mt-0.5">
              <span className="truncate font-medium text-zinc-100 group-hover:text-white transition-colors">
                {pr.title}
              </span>
              <ArrowUpRight className="h-3 w-3 text-zinc-700 group-hover:text-zinc-400 shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-1.5 min-w-0">
              <div
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white ${colorForHandle(pr.author)} shrink-0`}
              >
                {nameFromHandle(pr.author)}
              </div>
              <span className="text-xs text-zinc-500 truncate">
                {displayUser(pr.author)}
              </span>
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 align-top">
        <StatusPill pr={pr} />
        {pr.changes_requested_info?.message && (
          <div className="mt-1 text-[11px] text-zinc-500 line-clamp-1">
            {pr.changes_requested_info.message}
          </div>
        )}
      </td>

      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <ReviewerAvatars badges={reviewers} />
          {pr.approval_summary?.approved_users?.some(u => BACKEND_REVIEWERS.includes(u)) && (
            <span title="Backend reviewer approved">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </span>
          )}
        </div>
      </td>

      <td
        className="px-4 py-3 align-top text-right"
        title={`Created ${absoluteTime(pr.created_at)}\nUpdated ${absoluteTime(pr.updated_at)}`}
      >
        <div className="text-xs text-zinc-300 tabular-nums">{timeAgo(pr.updated_at)} ago</div>
        <div className="text-[10px] text-zinc-600 tabular-nums">opened {timeAgo(pr.created_at)} ago</div>
      </td>
    </tr>
  )
}

function EmptyState({ filterKey, hasSearch }: { filterKey: FilterKey; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="text-zinc-300">No matches</div>
        <div className="mt-1 text-xs text-zinc-500">Try a different search term</div>
      </div>
    )
  }
  const messages: Record<FilterKey, { title: string; sub: string }> = {
    ready: { title: 'All caught up', sub: 'No PRs are waiting for backend review right now.' },
    awaiting: { title: 'Nothing parked', sub: 'Every reviewed PR has had a follow-up.' },
    failing: { title: 'Green across the board', sub: 'No PRs have failing CI.' },
    drafts: { title: 'No drafts', sub: 'Nobody is mid-flight on a PR.' },
    dependabot: { title: 'No automated PRs', sub: 'Dependabot has nothing open.' },
    approved: { title: 'No backlog', sub: 'No backend-approved PRs sitting unmerged.' },
    all: { title: 'No open PRs', sub: 'All repositories are clear.' },
  }
  const m = messages[filterKey]
  return (
    <div className="px-6 py-16 text-center">
      <div className="text-zinc-300">{m.title}</div>
      <div className="mt-1 text-xs text-zinc-500">{m.sub}</div>
    </div>
  )
}
