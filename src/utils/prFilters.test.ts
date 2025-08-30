import { describe, it, expect } from 'vitest'

// Test data
const mockPRs = [
  // PR with exempt-be-review label
  {
    id: 1,
    number: 23363,
    title: '[ID-583] - Send mhvapi-idempotency-key in prod',
    author: 'rileyanderson',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-08T10:00:00Z',
    url: 'https://github.com/org/repo/pull/23363',
    state: 'open',
    draft: false,
    ci_status: 'failure',
    failing_checks: [{ name: 'Pull Request Ready for Review', status: 'failure' }],
    total_checks: 10,
    successful_checks: 9,
    failed_checks: 1,
    backend_approval_status: 'not_approved',
    approval_summary: {
      status: 'pending',
      approved_count: 1,
      approved_users: ['joeniquette']
    },
    ready_for_backend_review: true,
    labels: ['final-review-confirmed', 'exempt-be-review']
  },
  // PR ready for review (no exempt label)
  {
    id: 2,
    number: 23364,
    title: 'Regular PR ready for review',
    author: 'developer1',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-08T10:00:00Z',
    url: 'https://github.com/org/repo/pull/23364',
    state: 'open',
    draft: false,
    ci_status: 'success',
    failing_checks: [],
    total_checks: 10,
    successful_checks: 10,
    failed_checks: 0,
    backend_approval_status: 'not_approved',
    approval_summary: {
      status: 'pending',
      approved_count: 1,
      approved_users: ['reviewer1']
    },
    ready_for_backend_review: true,
    labels: []
  },
  // Backend team member PR (should auto-qualify for ready)
  {
    id: 3,
    number: 23822,
    title: 'Replace Virtus with Vets::Model - lib/va_profile',
    author: 'stevenjcumming',
    created_at: '2025-08-27T10:00:00Z',
    updated_at: '2025-08-29T10:00:00Z',
    url: 'https://github.com/org/repo/pull/23822',
    state: 'open',
    draft: false,
    ci_status: 'pending',
    failing_checks: [],
    total_checks: 24,
    successful_checks: 23,
    failed_checks: 0,
    backend_approval_status: 'approved',
    approval_summary: {
      status: 'approved',
      approved_count: 3,
      approved_users: ['micahaspyr', 'ryan-mcneil', 'rjohnson2011']
    },
    ready_for_backend_review: true,
    labels: ['final-review-confirmed', 'exempt-be-review']
  },
  // Dependabot PR
  {
    id: 4,
    number: 23815,
    title: 'Bump rubocop from 1.79.1 to 1.80.1',
    author: 'dependabot[bot]',
    created_at: '2025-08-27T10:00:00Z',
    updated_at: '2025-08-27T10:00:00Z',
    url: 'https://github.com/org/repo/pull/23815',
    state: 'open',
    draft: false,
    ci_status: 'success',
    failing_checks: [],
    total_checks: 10,
    successful_checks: 10,
    failed_checks: 0,
    backend_approval_status: 'not_approved',
    approval_summary: {
      status: 'pending',
      approved_count: 0,
      approved_users: []
    },
    ready_for_backend_review: false,
    labels: ['dependencies']
  }
]

// Helper function to check if a PR has non-review failing checks
const hasNonReviewFailingChecks = (pr: any) => {
  return pr.failing_checks && pr.failing_checks.some((check: any) => 
    check.status === 'failure' && 
    check.name !== 'Succeed if backend approval is confirmed' &&
    check.name !== 'Succeed if frontend approval is confirmed' &&
    check.name !== 'Succeed if design system approval is confirmed'
  )
}

describe('PR Filtering Logic', () => {
  describe('Exempt BE Review filtering', () => {
    it('should include PRs with exempt-be-review label', () => {
      const filtered = mockPRs.filter(pr => 
        pr.labels && pr.labels.includes('exempt-be-review')
      )
      
      expect(filtered).toHaveLength(2)
      expect(filtered.map(pr => pr.number)).toEqual([23363, 23822])
    })
  })

  describe('Ready for Review filtering', () => {
    it('should exclude PRs with exempt-be-review label', () => {
      const filtered = mockPRs.filter(pr => 
        !pr.draft &&
        pr.backend_approval_status !== 'approved' &&
        // Exclude PRs with exempt-be-review label
        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
        // Exclude PRs with failing CI checks
        !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
        pr.ready_for_backend_review &&
        pr.author !== 'dependabot[bot]'
      )
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(23364)
      // Should NOT include PR #23363 which has exempt-be-review label
      expect(filtered.map(pr => pr.number)).not.toContain(23363)
    })

    it('should exclude PRs with failing CI', () => {
      const prWithFailingCI = {
        ...mockPRs[1],
        ci_status: 'failure',
        failing_checks: [{ name: 'Test Suite', status: 'failure' }]
      }
      
      const testPRs = [prWithFailingCI]
      const filtered = testPRs.filter(pr => 
        !pr.draft &&
        pr.backend_approval_status !== 'approved' &&
        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
        !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
        pr.ready_for_backend_review &&
        pr.author !== 'dependabot[bot]'
      )
      
      expect(filtered).toHaveLength(0)
    })
  })

  describe('Finished but Unmerged filtering', () => {
    it('should include PRs with backend approval', () => {
      const filtered = mockPRs.filter(pr => 
        pr.backend_approval_status === 'approved' && 
        pr.state === 'open'
      )
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(23822)
    })
  })

  describe('Dependabot PRs filtering', () => {
    it('should include only dependabot PRs', () => {
      const filtered = mockPRs.filter(pr => 
        pr.author === 'dependabot[bot]' &&
        pr.state === 'open'
      )
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(23815)
    })
  })

  describe('Category priority', () => {
    it('should prioritize exempt-be-review over ready for review', () => {
      const pr = mockPRs[0] // PR #23363 with exempt label
      
      // Check if it matches exempt criteria
      const isExempt = pr.labels && pr.labels.includes('exempt-be-review')
      expect(isExempt).toBe(true)
      
      // Check if it would match ready for review criteria without the exempt check
      const wouldBeReady = !pr.draft &&
        pr.backend_approval_status !== 'approved' &&
        pr.ready_for_backend_review &&
        pr.author !== 'dependabot[bot]'
      expect(wouldBeReady).toBe(true)
      
      // But it should be excluded from ready for review because of exempt label
      const isInReadyForReview = !pr.draft &&
        pr.backend_approval_status !== 'approved' &&
        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
        !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
        pr.ready_for_backend_review &&
        pr.author !== 'dependabot[bot]'
      expect(isInReadyForReview).toBe(false)
    })
  })
})