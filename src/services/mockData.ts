// Mock /api/v1/reviews payload for local dev. Used when VITE_USE_MOCK_DATA=true
// (or in dev mode by default). Lets us iterate on the UI without the real
// API + Google auth.

import type { ApiResponse, PullRequest } from '../types/pull-request'

const MOCK_BACKEND_REVIEWERS = [
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

interface MockSeed {
  number: number
  repo: 'vets-api' | 'platform-atlas' | 'vets-api-mockdata'
  title: string
  author: string
  bucket:
    | 'ready'
    | 'failing'
    | 'awaiting'
    | 'approved'
    | 'draft'
    | 'dependabot'
    | 'exempt'
    | 'commented'
  approvedBy?: string[]
  changesRequestedBy?: string[]
  commentedBy?: string[]
  authorResponded?: 'commit' | 'comment'
  ciFailingChecks?: { name: string }[] // present means ci_status = failure
  ciPending?: boolean
  hoursOpen?: number
  hoursSinceUpdate?: number
  labels?: string[]
}

const seeds: MockSeed[] = [
  // ─── Ready for review (45) ─────────────────────────────────────────
  {
    number: 28115,
    repo: 'vets-api',
    title: 'Add Datadog metrics collection to Poll Pega Status Job',
    author: 'Stephen-Willis4',
    bucket: 'ready',
    approvedBy: ['Stephen-Willis4', 'Brandon-Reed3'],
    commentedBy: ['Brandon-Reed3'],
    hoursOpen: 16,
    hoursSinceUpdate: 1,
  },
  {
    number: 27677,
    repo: 'vets-api',
    title: 'add new integration for 1010d enhanced flow',
    author: 'Kyle-Brost',
    bucket: 'ready',
    changesRequestedBy: ['Rachal-Cassity'],
    commentedBy: ['Kyle-Brost', 'Copilot'],
    authorResponded: 'comment',
    hoursOpen: 27 * 24,
    hoursSinceUpdate: 5,
  },
  {
    number: 28097,
    repo: 'vets-api',
    title: 'arc/josh_rep_id_to_rep_number',
    author: 'Joshua-Drumm',
    bucket: 'ready',
    approvedBy: ['Silvio-Luthi'],
    hoursOpen: 8,
    hoursSinceUpdate: 2,
  },
  {
    number: 28099,
    repo: 'vets-api',
    title: 'update disability name validation',
    author: 'Siddhartha-Lamsal',
    bucket: 'ready',
    approvedBy: ['Lakshmi-Iyer'],
    hoursOpen: 30,
    hoursSinceUpdate: 4,
  },
  {
    number: 28102,
    repo: 'platform-atlas',
    title: 'Document oncall rotation schedule v2',
    author: 'Emerald-Sargent',
    bucket: 'ready',
    hoursOpen: 18,
    hoursSinceUpdate: 0.5,
  },
  // ─── Failing CI ────────────────────────────────────────────────────
  {
    number: 27969,
    repo: 'vets-api',
    title: '#140006 Adding cst_letters_content_updates flag and new benefit letter overrides',
    author: 'Liana-Fleming',
    bucket: 'failing',
    approvedBy: ['Joshua-Drumm'],
    commentedBy: ['RANDI-MAYS', 'copilot-pull-request-reviewer'],
    ciFailingChecks: [{ name: 'rspec / unit (4/8)' }],
    hoursOpen: 8 * 24,
    hoursSinceUpdate: 8,
  },
  {
    number: 27971,
    repo: 'vets-api',
    title: 'Exclude orgs from deactivated rep memberships behind individual_access flag',
    author: 'Emmerson-Hinkle',
    bucket: 'failing',
    changesRequestedBy: ['Rachal-Cassity'],
    ciFailingChecks: [
      { name: 'rspec / unit (3/8)' },
      { name: 'lint' },
      { name: 'rspec / unit (5/8)' },
      { name: 'rspec / unit (6/8)' },
      { name: 'brakeman' },
      { name: 'rspec / unit (7/8)' },
      { name: 'rspec / unit (8/8)' },
    ],
    hoursOpen: 8 * 24,
    hoursSinceUpdate: 6,
  },
  {
    number: 28112,
    repo: 'vets-api',
    title: '141512/associated charge items',
    author: 'Rebecca-Weir',
    bucket: 'failing',
    commentedBy: ['Daniel-Drumm'],
    ciFailingChecks: [{ name: 'rspec / unit (1/8)' }],
    hoursOpen: 10,
    hoursSinceUpdate: 7,
  },
  {
    number: 28113,
    repo: 'vets-api',
    title: 'RES-21386/add case manager to vre case details',
    author: 'Jeffrey-Marks',
    bucket: 'failing',
    commentedBy: ['Taras-Kurilo'],
    ciFailingChecks: [{ name: 'rspec / unit (2/8)' }],
    hoursOpen: 9,
    hoursSinceUpdate: 9,
  },
  // ─── Awaiting author ──────────────────────────────────────────────
  {
    number: 27855,
    repo: 'vets-api',
    title: 'Refactor mobile auth flow for biometric fallback',
    author: 'Daniel-Zhdanov',
    bucket: 'awaiting',
    changesRequestedBy: ['Joseph-Weissman'],
    commentedBy: ['Joseph-Weissman'],
    hoursOpen: 4 * 24,
    hoursSinceUpdate: 14,
  },
  {
    number: 27890,
    repo: 'vets-api',
    title: 'Add disability_compensation_form schema validation',
    author: 'Adam-Antonioli',
    bucket: 'awaiting',
    changesRequestedBy: ['Rachal-Cassity'],
    hoursOpen: 6 * 24,
    hoursSinceUpdate: 36,
  },
  // ─── Approved · unmerged ──────────────────────────────────────────
  {
    number: 28040,
    repo: 'vets-api',
    title: 'Add Datadog metrics collection to Poll Pega Status Job',
    author: 'Stephen-Willis4',
    bucket: 'approved',
    approvedBy: ['Rachal-Cassity', 'Stephen-Willis4'],
    commentedBy: ['Brandon-Reed3'],
    labels: ['final-review-confirmed'],
    hoursOpen: 36,
    hoursSinceUpdate: 0.5,
  },
  {
    number: 28055,
    repo: 'vets-api',
    title: 'Bump rspec-rails to 7.0',
    author: 'Calvin-Costa',
    bucket: 'approved',
    approvedBy: ['Joseph-Weissman'],
    hoursOpen: 24,
    hoursSinceUpdate: 3,
  },
  {
    number: 28072,
    repo: 'vets-api',
    title: 'Refactor SSL verify in octokit and omniauth',
    author: 'Bradley-Bergeron',
    bucket: 'approved',
    approvedBy: ['Lindsey-Hattamer'],
    hoursOpen: 48,
    hoursSinceUpdate: 12,
  },
  // ─── Drafts ───────────────────────────────────────────────────────
  {
    number: 28118,
    repo: 'vets-api',
    title: 'WIP: Refactor user verification to use shared service',
    author: 'Alex-Castillo2',
    bucket: 'draft',
    hoursOpen: 3,
    hoursSinceUpdate: 1,
  },
  {
    number: 28119,
    repo: 'vets-api',
    title: '[WIP] Backfill historical claim status',
    author: 'Catalina-Espinoza',
    bucket: 'draft',
    hoursOpen: 12,
    hoursSinceUpdate: 6,
  },
  // ─── Dependabot ───────────────────────────────────────────────────
  {
    number: 28100,
    repo: 'vets-api',
    title: 'Bump faraday from 2.10.1 to 2.11.0',
    author: 'dependabot[bot]',
    bucket: 'dependabot',
    hoursOpen: 24,
    hoursSinceUpdate: 24,
  },
  {
    number: 28110,
    repo: 'vets-api',
    title: 'Bump nokogiri from 1.16.5 to 1.17.0',
    author: 'dependabot[bot]',
    bucket: 'dependabot',
    hoursOpen: 18,
    hoursSinceUpdate: 18,
  },
  // ─── Exempt ───────────────────────────────────────────────────────
  {
    number: 27800,
    repo: 'vets-api',
    title: 'Update OneLogin SSL cert rotation script',
    author: 'BRYAN-ALEXANDER',
    bucket: 'exempt',
    labels: ['exempt-be-review'],
    hoursOpen: 48,
    hoursSinceUpdate: 4,
  },
  // ─── A few more open ones for volume ──────────────────────────────
  {
    number: 28105,
    repo: 'vets-api',
    title: 'Migrate logging away from deprecated Sidekiq logger API',
    author: 'Daniel-Gading',
    bucket: 'commented',
    commentedBy: ['Lindsey-Hattamer', 'Joseph-Weissman'],
    ciPending: true,
    hoursOpen: 20,
    hoursSinceUpdate: 2,
  },
  {
    number: 27750,
    repo: 'vets-api',
    title: 'Document new EDIPI lookup path for VBA partners',
    author: 'Kenneth-Santiago',
    bucket: 'commented',
    commentedBy: ['Liana-Fleming'],
    ciPending: true,
    hoursOpen: 12 * 24,
    hoursSinceUpdate: 60,
  },
  {
    number: 27680,
    repo: 'vets-api-mockdata',
    title: 'Add fixture for new Pega 1010d response shape',
    author: 'Alvaro-Escobar',
    bucket: 'ready',
    approvedBy: ['Brandon-Reed3'],
    hoursOpen: 5 * 24,
    hoursSinceUpdate: 5,
  },
  {
    number: 28001,
    repo: 'platform-atlas',
    title: 'Document new identity proofing flow',
    author: 'Adrian-Rollett',
    bucket: 'failing',
    ciFailingChecks: [{ name: 'docs build' }],
    hoursOpen: 5 * 24,
    hoursSinceUpdate: 25,
  },
]

// Inflate to ~50 ready items so the hero count looks realistic.
function inflate(): MockSeed[] {
  const inflated: MockSeed[] = [...seeds]
  const padCount = 40
  const filler: MockSeed[] = Array.from({ length: padCount }, (_, i) => ({
    number: 27500 + i,
    repo: 'vets-api',
    title: [
      'Refactor mailer service to use Active Job',
      'Add metrics for daily form submission counts',
      'Update CSP header for new analytics provider',
      'Fix ICN lookup for users with secondary IDs',
      'Migrate appeals job to background worker',
      'Add VA Profile address verification',
      'Document new feature toggle pattern',
      'Bump rubocop to 1.65',
      'Add specs for ClaimsApi::ServiceObject',
      'Trim claim status webhook payload',
    ][i % 10],
    author: [
      'Alastair-Dawson',
      'Amaar-Fazlani',
      'BELLE-POOPONGPANIT',
      'Brandon-Reed3',
      'CARLOS-FELIXACEVEDO',
      'DEREK-DYER',
      'Dominic-Padula',
      'STEVEN-LONG1',
      'Alicia-Perry3',
      'Catalina-Espinoza',
    ][i % 10],
    bucket: 'ready',
    approvedBy: ['Brandon-Reed3'],
    hoursOpen: 8 + i * 4,
    hoursSinceUpdate: 1 + i,
  }))
  return [...inflated, ...filler]
}

function makePr(seed: MockSeed, idx: number): PullRequest {
  const updated = new Date(Date.now() - (seed.hoursSinceUpdate ?? 1) * 3600 * 1000).toISOString()
  const created = new Date(Date.now() - (seed.hoursOpen ?? 24) * 3600 * 1000).toISOString()

  const approvedUsers = seed.approvedBy ?? []
  const changesRequestedUsers = seed.changesRequestedBy ?? []
  const commentedUsers = seed.commentedBy ?? []

  const failingChecks = seed.ciFailingChecks ?? []
  const ciStatus = failingChecks.length > 0 ? 'failure' : seed.ciPending ? 'pending' : 'success'
  const failed = failingChecks.length
  const total = ciStatus === 'success' ? 30 : ciStatus === 'pending' ? 30 : 30
  const successful = total - failed - (seed.ciPending ? 1 : 0)
  const pending = seed.ciPending ? 1 : 0

  const isBackendApproved =
    seed.bucket === 'approved' || approvedUsers.some(u => MOCK_BACKEND_REVIEWERS.includes(u))

  const blamedByBackend = changesRequestedUsers.some(u => MOCK_BACKEND_REVIEWERS.includes(u))
  const authorResponded = !!seed.authorResponded

  let crStatus: string | null = null
  if (changesRequestedUsers.length > 0) {
    if (seed.authorResponded === 'commit') crStatus = 'new_commit_from_author'
    else if (seed.authorResponded === 'comment') crStatus = 'new_comment_from_author'
    else crStatus = 'unresolved'
  }

  return {
    id: idx + 1,
    number: seed.number,
    title: seed.title,
    author: seed.author,
    created_at: created,
    updated_at: updated,
    url: `https://va.ghe.com/software/${seed.repo}/pull/${seed.number}`,
    state: 'open',
    draft: seed.bucket === 'draft',
    ci_status: ciStatus,
    failing_checks: failingChecks.map(c => ({ name: c.name, status: 'failure', url: '#' })),
    total_checks: total,
    successful_checks: successful,
    failed_checks: failed,
    pending_checks: pending,
    backend_approval_status: isBackendApproved ? 'approved' : 'not_approved',
    ready_for_backend_review: seed.bucket === 'ready' || seed.bucket === 'approved',
    awaiting_author_changes: blamedByBackend && !authorResponded,
    approval_summary: {
      status: approvedUsers.length > 0 ? 'approved' : changesRequestedUsers.length > 0 ? 'changes_requested' : 'pending',
      approved_count: approvedUsers.length,
      changes_requested_count: changesRequestedUsers.length,
      pending_count: 0,
      approved_users: approvedUsers,
      changes_requested_users: changesRequestedUsers,
      commented_users: commentedUsers,
      pending_users: [],
      pending_teams: [],
    },
    labels: seed.labels ?? [],
    repository_name: seed.repo,
    repository_owner: 'software',
    changes_requested_info: crStatus
      ? {
          status: crStatus,
          message: 'Reviewer asked to extract the helper into a service object.',
          backend_reviewer: changesRequestedUsers[0],
          backend_comment_at: created,
        }
      : null,
    latest_reviewer_activity: commentedUsers[0]
      ? {
          message: `${commentedUsers[0]} commented`,
          user: commentedUsers[0],
          type: 'comment',
          reviewer_type: MOCK_BACKEND_REVIEWERS.includes(commentedUsers[0]) ? 'backend' : 'team',
          timestamp: updated,
          preview: 'Looks good — left a few inline notes.',
          url: '#',
        }
      : null,
  }
}

export function mockApiResponse(): ApiResponse {
  const all = inflate().map(makePr)
  // Split the list the same way the real API does: open vs approved
  const open = all.filter(pr => pr.backend_approval_status !== 'approved')
  const approved = all.filter(pr => pr.backend_approval_status === 'approved')
  return {
    pull_requests: open,
    approved_pull_requests: approved,
    count: open.length,
    approved_count: approved.length,
    repository: 'All repositories',
    last_updated: new Date(Date.now() - 3 * 60_000).toISOString(),
    updating: false,
  }
}

// Mock /api/v1/reviews/reviewer_activity payload for local design work.
// Deterministic (seeded) so screenshots are reproducible run to run.
export function mockReviewerActivity() {
  const reviewers = ['rjohnson', 'cdonavin', 'jweissman', 'amartinez', 'lchen', 'dpatel', 'skim', 'tnguyen']
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const now = Date.now()
  const events: Array<{ reviewer: string; at: string; dependabot: boolean; pr: number; repo: string }> = []
  let pr = 24000
  for (let day = 89; day >= 0; day--) {
    const date = new Date(now - day * 86_400_000)
    const weekday = date.getDay()
    const weekend = weekday === 0 || weekday === 6
    const volume = weekend ? 1 : 6 + Math.floor(rand() * 6) + (weekday === 2 ? 3 : 0)
    for (let i = 0; i < volume; i++) {
      const reviewer = reviewers[Math.floor(Math.pow(rand(), 1.6) * reviewers.length)]
      const hour = 9 + Math.floor(rand() * 9)
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, Math.floor(rand() * 60))
      if (at.getTime() > now) continue
      events.push({ reviewer, at: at.toISOString(), dependabot: rand() < 0.3, pr: pr++, repo: 'vets-api' })
    }
  }
  const counts = (since: number, dependabot: boolean | null) => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (new Date(e.at).getTime() < since) continue
      if (dependabot !== null && e.dependabot !== dependabot) continue
      map.set(e.reviewer, (map.get(e.reviewer) ?? 0) + 1)
    }
    return [...map.entries()].map(([reviewer, count]) => ({ reviewer, count })).sort((a, b) => b.count - a.count)
  }
  const windows = (dependabot: boolean | null) => ({
    day: counts(now - 86_400_000, dependabot),
    week: counts(now - 7 * 86_400_000, dependabot),
    month: counts(now - 30 * 86_400_000, dependabot),
    ytd: counts(new Date(new Date().getFullYear(), 0, 1).getTime(), dependabot),
  })
  return {
    scopes: { all: windows(null), human: windows(false), dependabot: windows(true) },
    events,
    backend_members: reviewers.slice(0, 6),
    generated_at: new Date(now).toISOString(),
  }
}
