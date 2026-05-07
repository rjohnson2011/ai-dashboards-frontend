import {
  type PullRequest,
  isReadyForReview,
  isAwaitingAuthorChanges,
  isFinishedUnmerged,
  hasFailingCi,
  hasNonReviewFailingChecks,
  isDependabot,
  isTrulyExemptFromBackendReview,
} from '../types/pull-request'
import { isGhostUser } from './utils'

export type FilterKey =
  | 'ready'
  | 'awaiting'
  | 'failing'
  | 'drafts'
  | 'dependabot'
  | 'approved'
  | 'all'

export interface FilterDef {
  key: FilterKey
  label: string
  predicate: (pr: PullRequest) => boolean
}

// Failing CI bucket should only include PRs whose CI is failing on a
// "real" check — i.e., not just "Backend review required" or other
// review-related chicken-and-egg checks.
function isInFailingCiBucket(pr: PullRequest): boolean {
  if (pr.draft) return false
  if (pr.author === 'dependabot[bot]') return false
  if (isTrulyExemptFromBackendReview(pr)) return false
  return hasFailingCi(pr) && hasNonReviewFailingChecks(pr)
}

export const FILTERS: FilterDef[] = [
  { key: 'ready', label: 'Ready', predicate: isReadyForReview },
  { key: 'awaiting', label: 'Awaiting author', predicate: isAwaitingAuthorChanges },
  { key: 'failing', label: 'Failing CI', predicate: isInFailingCiBucket },
  { key: 'approved', label: 'Approved · unmerged', predicate: isFinishedUnmerged },
  { key: 'drafts', label: 'Drafts', predicate: pr => pr.draft },
  { key: 'dependabot', label: 'Dependabot', predicate: isDependabot },
  { key: 'all', label: 'All open', predicate: pr => pr.state === 'open' },
]

export type Status =
  | 'failing'
  | 'changes_requested'
  | 'ci_pending'
  | 'approved'
  | 'ready'
  | 'draft'
  | 'open'

export function classifyStatus(pr: PullRequest): { key: Status; label: string } {
  const failing = pr.failed_checks || 0
  const changesRequested = pr.approval_summary?.changes_requested_count || 0
  const blockingChanges =
    changesRequested > 0 &&
    pr.changes_requested_info?.status !== 'new_commit_from_author' &&
    pr.changes_requested_info?.status !== 'new_comment_from_author'

  if (pr.draft) return { key: 'draft', label: 'Draft' }
  if (failing > 0 && hasFailingCi(pr)) return { key: 'failing', label: `${failing} failing` }
  if (blockingChanges) return { key: 'changes_requested', label: 'Changes requested' }
  if (pr.ci_status === 'pending' || (pr.pending_checks ?? 0) > 0) {
    return { key: 'ci_pending', label: 'CI running' }
  }
  if (isFinishedUnmerged(pr)) return { key: 'approved', label: 'Approved' }
  if (isReadyForReview(pr)) return { key: 'ready', label: 'Ready' }
  return { key: 'open', label: 'Open' }
}

export interface ReviewerBadge {
  user: string
  state: 'approved' | 'changes_requested' | 'commented'
}

export function reviewerBadgesFor(pr: PullRequest): ReviewerBadge[] {
  const summary = pr.approval_summary
  if (!summary) return []
  const badges: ReviewerBadge[] = []
  summary.approved_users?.forEach(u => badges.push({ user: u, state: 'approved' }))
  summary.changes_requested_users?.forEach(u =>
    badges.push({ user: u, state: 'changes_requested' })
  )
  summary.commented_users?.forEach(u => {
    if (!badges.find(b => b.user === u)) badges.push({ user: u, state: 'commented' })
  })
  return badges
}

export function timeAgo(iso: string): string {
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

export function absoluteTime(iso: string): string {
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

// Group failing CI checks into a compact summary.
// "rspec / unit (4/8), rspec / unit (5/8), brakeman" → "rspec ×2 · brakeman"
export function summarizeFailingChecks(pr: PullRequest): string {
  if (!pr.failing_checks || pr.failing_checks.length === 0) return ''
  const groups: Record<string, number> = {}
  for (const check of pr.failing_checks) {
    const name = (check.name || '').trim()
    if (!name) continue
    // Strip common parametric suffixes: "(4/8)", "[node 18]", trailing numbers
    const root =
      name
        .replace(/\s*\(\d+\/\d+\)\s*/, '')
        .replace(/\s*\[[^\]]+\]\s*/, '')
        .replace(/\s*\d+$/, '')
        .trim() || name
    groups[root] = (groups[root] || 0) + 1
  }
  return Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
    .join(' · ')
}

export interface ActivitySummary {
  // Most recent event for the headline
  latestLabel: string // "Author responded" | "Backend reviewer commented" | "Approved"
  latestTimeAgo: string // "5h ago"
  // Optional rollup line
  rollup: string // "3 author · 1 BR cmt · 2 team"
}

export function summarizeActivity(
  pr: PullRequest,
  backendReviewers: string[]
): ActivitySummary {
  const latestTimeAgo = `${timeAgo(pr.updated_at)} ago`
  let latestLabel = 'updated'

  // Determine the most recent meaningful action.
  if (pr.changes_requested_info?.status === 'new_commit_from_author') {
    latestLabel = 'Author pushed commit'
  } else if (pr.changes_requested_info?.status === 'new_comment_from_author') {
    latestLabel = 'Author responded'
  } else if (pr.backend_approval_status === 'approved') {
    latestLabel = 'Backend approved'
  } else if (pr.approval_summary && pr.approval_summary.approved_count > 0) {
    const beApprover = pr.approval_summary.approved_users?.find(u =>
      backendReviewers.includes(u)
    )
    latestLabel = beApprover ? 'Backend approved' : 'Team approved'
  } else if (
    pr.approval_summary?.changes_requested_users?.some(u => backendReviewers.includes(u))
  ) {
    latestLabel = 'BR requested changes'
  } else if (pr.approval_summary?.changes_requested_count) {
    latestLabel = 'Changes requested'
  } else if (pr.latest_reviewer_activity?.type === 'comment') {
    const isBE = backendReviewers.includes(pr.latest_reviewer_activity.user)
    latestLabel = isBE ? 'BR commented' : 'Reviewer commented'
  } else if (pr.draft) {
    latestLabel = 'Draft updated'
  }

  // Build the rollup. We need counts split by author/BR/team.
  // We can only infer from approval_summary, since we don't have a full
  // per-comment timeline. Use commented_users + author = assumption.
  const commenters = pr.approval_summary?.commented_users || []
  const authorComments = commenters.filter(u => u === pr.author).length
  const beComments = commenters.filter(u => backendReviewers.includes(u) && u !== pr.author).length
  const teamComments = commenters.length - authorComments - beComments

  const parts: string[] = []
  if (authorComments) parts.push(`${authorComments} author`)
  if (beComments) parts.push(`${beComments} BR`)
  if (teamComments) parts.push(`${teamComments} team`)

  return {
    latestLabel,
    latestTimeAgo,
    rollup: parts.join(' · '),
  }
}

export function nameFromHandle(handle: string): string {
  if (!handle) return ''
  if (isGhostUser(handle)) return '?'
  const parts = handle.split(/[-_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return handle.slice(0, 2).toUpperCase()
}

export function countByFilter(prs: PullRequest[]): Record<FilterKey, number> {
  const base: Record<FilterKey, number> = {
    ready: 0,
    awaiting: 0,
    failing: 0,
    drafts: 0,
    dependabot: 0,
    approved: 0,
    all: 0,
  }
  for (const pr of prs) for (const f of FILTERS) if (f.predicate(pr)) base[f.key]++
  return base
}

export function applyFilter(
  prs: PullRequest[],
  filterKey: FilterKey,
  searchTerm: string
): PullRequest[] {
  const filterDef = FILTERS.find(f => f.key === filterKey)!
  let list = prs.filter(filterDef.predicate)
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
}
