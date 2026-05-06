export interface CheckRun {
  name: string
  status: string
  url: string
  description?: string
  required?: boolean
}

export interface PullRequest {
  id: number
  number: number
  title: string
  author: string
  created_at: string
  updated_at: string
  url: string
  state: string
  draft: boolean
  mergeable?: boolean
  additions?: number
  deletions?: number
  changed_files?: number
  ci_status: string
  failing_checks: CheckRun[]
  total_checks: number
  successful_checks: number
  failed_checks: number
  pending_checks?: number
  backend_approval_status: string
  ready_for_backend_review: boolean
  approval_summary?: {
    status: string
    approved_count: number
    changes_requested_count: number
    pending_count: number
    approved_users: string[]
    changes_requested_users: string[]
    commented_users: string[]
    pending_users: string[]
    pending_teams: string[]
  }
  labels?: string[]
  repository_name?: string
  repository_owner?: string
  awaiting_author_changes?: boolean
  changes_requested_info?: {
    status: string
    message: string
    backend_commenter?: string
    backend_comment_at?: string
    author_comment_at?: string
    backend_reviewer?: string
    dismissed_at?: string
  } | null
  latest_reviewer_activity?: {
    message: string
    user: string
    type: string
    reviewer_type: string
    timestamp: string
    preview?: string
    url?: string
  } | null
}

export interface ApiResponse {
  pull_requests: PullRequest[]
  approved_pull_requests: PullRequest[]
  count: number
  approved_count: number
  repository: string
  last_updated: string
  updating: boolean
  rate_limit?: {
    remaining: number
    limit: number
    resets_at: string
  }
}

// GHE handles for the backend-review-group team. Synced manually with
// https://va.ghe.com/orgs/software/teams/backend-review-group/members
export const BACKEND_REVIEWERS = [
  'Lindsey-Hattamer',
  'Rebecca-Tolmach',
  'STEVEN-CUMMING',
  'Joseph-Weissman',
  'Jennica-Stiehl',
  'CURT-BONADE',
  'Craig-Donavin',
  'RYAN-JOHNSON26',
  'Rachal-Cassity',
]

// PRs with this label are correctly labeled as exempt UNLESS they have a
// Lighthouse team indicator (claimsApi). Lighthouse teams were removed from
// the exemption list on Dec 1, 2025 per PR #25353.
const LIGHTHOUSE_LABELS = ['claimsApi']

export function isTrulyExemptFromBackendReview(pr: PullRequest): boolean {
  if (!pr.labels || !pr.labels.includes('exempt-be-review')) return false
  if (pr.labels.some(label => LIGHTHOUSE_LABELS.includes(label))) return false
  return true
}

// Filtering helpers shared across dashboard variants.

export function isReadyForReview(pr: PullRequest): boolean {
  if (pr.draft) return false
  if (pr.author === 'dependabot[bot]') return false
  if (isTrulyExemptFromBackendReview(pr)) return false
  if (pr.backend_approval_status === 'approved') return false
  if (pr.approval_summary?.approved_users?.some(u => BACKEND_REVIEWERS.includes(u))) return false

  // Has team approval (non-backend) and isn't blocked
  const hasNonBackendApproval = !!(
    pr.approval_summary &&
    pr.approval_summary.approved_count > 0 &&
    pr.approval_summary.approved_users?.some(u => !BACKEND_REVIEWERS.includes(u))
  )
  const isNonVetsApi =
    pr.repository_name === 'platform-atlas' || pr.repository_name === 'vets-api-mockdata'
  const blockingChangesRequested = !!(
    pr.approval_summary?.changes_requested_count &&
    pr.approval_summary.changes_requested_count > 0 &&
    pr.changes_requested_info?.status !== 'new_commit_from_author' &&
    pr.changes_requested_info?.status !== 'new_comment_from_author'
  )
  if (blockingChangesRequested) return false

  return hasNonBackendApproval || (isNonVetsApi && pr.ci_status !== 'success')
}

export function isAwaitingAuthorChanges(pr: PullRequest): boolean {
  if (pr.draft) return false
  return !!pr.awaiting_author_changes
}

export function isFinishedUnmerged(pr: PullRequest): boolean {
  return pr.backend_approval_status === 'approved' && pr.state === 'open'
}

export function hasFailingCi(pr: PullRequest): boolean {
  return pr.ci_status === 'failure'
}

export function isDependabot(pr: PullRequest): boolean {
  return pr.author === 'dependabot[bot]'
}

export function repoFullName(pr: PullRequest): string {
  return `${pr.repository_owner}/${pr.repository_name}`
}
