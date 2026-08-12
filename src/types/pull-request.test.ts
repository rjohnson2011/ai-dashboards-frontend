import { describe, it, expect } from 'vitest'
import { hasPendingTeamReview, isFinishedUnmerged } from './pull-request'
import type { PullRequest } from './pull-request'

// Minimal PR shaped like the API payload — only the fields these predicates read.
const base = (over: Partial<PullRequest> = {}): PullRequest =>
  ({
    number: 1,
    title: 't',
    author: 'a',
    state: 'open',
    draft: false,
    ci_status: 'success',
    backend_approval_status: 'approved',
    repository_name: 'vets-api',
    labels: [],
    failing_checks: [],
    pending_reviewers: [],
    pending_teams: [],
    ...over,
  }) as unknown as PullRequest

describe('hasPendingTeamReview', () => {
  it('is true when a codeowner team is still pending (PR #29601)', () => {
    expect(hasPendingTeamReview(base({ pending_teams: ['benefits-non-disability'] }))).toBe(true)
  })

  it('is true when an individual reviewer is still pending', () => {
    expect(hasPendingTeamReview(base({ pending_reviewers: ['Jennica-Stiehl'] }))).toBe(true)
  })

  it('is false when nothing is pending', () => {
    expect(hasPendingTeamReview(base())).toBe(false)
  })

  it('is false when the fields are absent from the payload', () => {
    expect(
      hasPendingTeamReview(base({ pending_reviewers: undefined, pending_teams: undefined })),
    ).toBe(false)
  })
})

describe('isFinishedUnmerged', () => {
  it('excludes a PR still blocked on a pending codeowner (PR #29601 today)', () => {
    expect(isFinishedUnmerged(base({ pending_teams: ['benefits-non-disability'] }))).toBe(false)
  })

  it('includes it once the codeowner approves (PR #29601 after approval)', () => {
    expect(isFinishedUnmerged(base({ pending_teams: [] }))).toBe(true)
  })

  it('still excludes PRs with failing CI and no backend approval (#29631/#29627)', () => {
    expect(
      isFinishedUnmerged(base({ ci_status: 'failure', backend_approval_status: 'not_approved' })),
    ).toBe(false)
  })
})
