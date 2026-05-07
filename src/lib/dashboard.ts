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
