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

// Some failing checks are review-related chicken-and-egg signals — they fail
// because there's no review yet. They shouldn't block "Ready for Review".
const REVIEW_RELATED_CHECKS = new Set([
  'Pull Request Ready for Review',
  'Danger',
  'Status Checks',
  'Get PR data',
  'Get PR Data',
  'Check Workflow Statuses',
])

// Matches "Backend Approval / Succeed if backend approval is confirmed",
// "Require backend-r…", and similar review-gate checks.
function isBackendReviewGate(name: string): boolean {
  const n = name.toLowerCase()
  return (
    n.includes('backend approval') ||
    n.includes('succeed if backend') ||
    n.includes('backend review') ||
    n.includes('require backend')
  )
}

export function hasNonReviewFailingChecks(pr: PullRequest): boolean {
  if (!pr.failing_checks || pr.failing_checks.length === 0) return false
  return pr.failing_checks.some(check => {
    const name = check.name || ''
    if (isBackendReviewGate(name)) return false
    if (REVIEW_RELATED_CHECKS.has(name)) return false
    if (name.includes('Get PR Data')) return false
    return true
  })
}

// Filtering helpers shared across dashboard variants.

function authorHasRespondedToChanges(pr: PullRequest): boolean {
  return (
    pr.changes_requested_info?.status === 'new_commit_from_author' ||
    pr.changes_requested_info?.status === 'new_comment_from_author'
  )
}

function hasUnresolvedChangesRequested(pr: PullRequest): boolean {
  return !!(
    pr.approval_summary?.changes_requested_count &&
    pr.approval_summary.changes_requested_count > 0 &&
    !authorHasRespondedToChanges(pr)
  )
}

function needsTeamApproval(pr: PullRequest): boolean {
  if (!pr.labels?.includes('waiting-for-team-approval')) return false
  const hasNonBackendApproval =
    !!pr.approval_summary &&
    pr.approval_summary.approved_count > 0 &&
    !!pr.approval_summary.approved_users?.some(u => !BACKEND_REVIEWERS.includes(u))
  return !hasNonBackendApproval
}

export function isReadyForReview(pr: PullRequest): boolean {
  // Hard exclusions
  if (pr.draft) return false
  if (pr.author === 'dependabot[bot]') return false
  if (isTrulyExemptFromBackendReview(pr)) return false
  if (pr.backend_approval_status === 'approved') return false
  if (pr.approval_summary?.approved_users?.some(u => BACKEND_REVIEWERS.includes(u))) return false
  if (needsTeamApproval(pr)) return false

  // Real CI failures (not the "backend review required" chicken-and-egg)
  // belong in Failing CI.
  if (pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) return false

  // Unresolved changes-requested → Awaiting Changes, not Ready.
  // (Once the author commits or comments after, the PR comes back here.)
  if (hasUnresolvedChangesRequested(pr)) return false

  // Inclusion criteria — any of:
  // 1. Non-backend team has approved
  const hasNonBackendApproval = !!(
    pr.approval_summary &&
    pr.approval_summary.approved_count > 0 &&
    pr.approval_summary.approved_users?.some(u => !BACKEND_REVIEWERS.includes(u))
  )
  if (hasNonBackendApproval) return true

  // 2. Author is themselves a backend reviewer (auto-ready)
  if (BACKEND_REVIEWERS.includes(pr.author)) return true

  // 3. Backend flagged as ready for review (with approvals)
  if (pr.ready_for_backend_review && pr.approval_summary && pr.approval_summary.approved_count > 0) {
    return true
  }

  // 4. Author responded to a previous changes-request — needs re-review
  if (authorHasRespondedToChanges(pr)) return true

  // 5. Non-vets-api repos (platform-atlas, vets-api-mockdata) only land in
  //    Ready once CI is green AND someone has at least commented or
  //    requested changes — i.e., there's evidence a reviewer engaged.
  //    A bare PR with no signal isn't "ready", it's just open.
  const isNonVetsApi =
    pr.repository_name === 'platform-atlas' || pr.repository_name === 'vets-api-mockdata'
  if (isNonVetsApi && pr.ci_status === 'success') {
    const hasReviewerSignal = !!(
      pr.approval_summary &&
      (pr.approval_summary.approved_count > 0 ||
        pr.approval_summary.changes_requested_count > 0 ||
        (pr.approval_summary.commented_users?.length ?? 0) > 0)
    )
    if (hasReviewerSignal) return true
  }

  return false
}

export function isAwaitingAuthorChanges(pr: PullRequest): boolean {
  if (pr.draft) return false
  if (isTrulyExemptFromBackendReview(pr)) return false
  // True meaning: a backend reviewer requested changes, and the author
  // hasn't responded yet (no new commit or comment from them since).
  if (!hasUnresolvedChangesRequested(pr)) return false
  // Only count if a backend reviewer was the one requesting changes.
  const blamedBackendReviewer = pr.approval_summary?.changes_requested_users?.some(u =>
    BACKEND_REVIEWERS.includes(u)
  )
  if (blamedBackendReviewer) return true
  // Fallback to the server-side flag for non-backend reviewer cases.
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
