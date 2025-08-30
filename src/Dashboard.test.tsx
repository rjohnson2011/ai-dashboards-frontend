import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

// Mock auth service
vi.mock('./services/auth', () => ({
  authService: {
    getAuthHeaders: () => ({ 'Authorization': 'Bearer test-token' }),
    isAuthenticated: () => true
  }
}))

// Mock data
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

// Mock fetch
global.fetch = vi.fn()

const mockApiResponse = {
  pull_requests: mockPRs,
  approved_pull_requests: [],
  count: mockPRs.length,
  approved_count: 0,
  last_updated: '2025-08-29T10:00:00Z',
  repository: { name: 'vets-api', owner: 'department-of-veterans-affairs' }
}

describe('Dashboard PR Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/repositories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            repositories: [{
              name: 'vets-api',
              owner: 'department-of-veterans-affairs',
              pull_request_count: 100
            }]
          })
        })
      }
      if (url.includes('/api/v1/reviews')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockApiResponse
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  const renderDashboard = () => {
    return render(
      <BrowserRouter initialEntries={['/vets-api']}>
        <Dashboard />
      </BrowserRouter>
    )
  }

  it('should filter PRs with exempt-be-review label into Exempt BE Review category', async () => {
    renderDashboard()
    
    // Wait for data to load
    await screen.findByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    
    // Click on Exempt BE Review card
    const exemptCard = screen.getByText('Exempt BE Review').closest('[data-slot="card"]')
    expect(exemptCard).toBeTruthy()
    fireEvent.click(exemptCard!)
    
    // Should show PR #23363
    expect(screen.getByText('[ID-583] - Send mhvapi-idempotency-key in prod')).toBeTruthy()
    
    // Should also show PR #23822 which has exempt label
    expect(screen.getByText('Replace Virtus with Vets::Model - lib/va_profile')).toBeTruthy()
  })

  it('should NOT show exempt PRs in Ready for Review category', async () => {
    renderDashboard()
    
    await screen.findByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    
    // Click on Ready for Review card
    const readyCard = screen.getByText('Ready for Review').closest('[data-slot="card"]')
    fireEvent.click(readyCard!)
    
    // Should show regular PR without exempt label
    expect(screen.getByText('Regular PR ready for review')).toBeTruthy()
    
    // Should NOT show PR #23363 which has exempt-be-review label
    const exemptPRTitle = screen.queryByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    expect(exemptPRTitle).toBeNull()
  })

  it('should show backend team member PRs in Finished but Unmerged when approved', async () => {
    renderDashboard()
    
    await screen.findByText('Replace Virtus with Vets::Model - lib/va_profile')
    
    // Click on Finished but Unmerged card
    const finishedCard = screen.getByText('Finished but Unmerged').closest('[data-slot="card"]')
    fireEvent.click(finishedCard!)
    
    // Should show PR #23822 which has backend approval
    expect(screen.getByText('Replace Virtus with Vets::Model - lib/va_profile')).toBeTruthy()
  })

  it('should show Dependabot PRs in Dependabot category', async () => {
    renderDashboard()
    
    await screen.findByText('Bump rubocop from 1.79.1 to 1.80.1')
    
    // Click on Dependabot PRs card
    const dependabotCard = screen.getByText('Dependabot PRs').closest('[data-slot="card"]')
    fireEvent.click(dependabotCard!)
    
    // Should show Dependabot PR
    expect(screen.getByText('Bump rubocop from 1.79.1 to 1.80.1')).toBeTruthy()
  })

  it('should count PRs correctly in each category', async () => {
    renderDashboard()
    
    await screen.findByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    
    // Check counts in each card
    const exemptCard = screen.getByText('Exempt BE Review').closest('[data-slot="card"]')
    expect(exemptCard?.textContent).toContain('2') // PR #23363 and #23822
    
    const readyCard = screen.getByText('Ready for Review').closest('[data-slot="card"]')
    expect(readyCard?.textContent).toContain('1') // Only PR #23364
    
    const finishedCard = screen.getByText('Finished but Unmerged').closest('[data-slot="card"]')
    expect(finishedCard?.textContent).toContain('1') // PR #23822
    
    const dependabotCard = screen.getByText('Dependabot PRs').closest('[data-slot="card"]')
    expect(dependabotCard?.textContent).toContain('1') // PR #23815
  })
})

describe('Dashboard PR Filtering Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle PRs with multiple conflicting states correctly', async () => {
    const conflictingPR = {
      ...mockPRs[0],
      // Has exempt label but also failing CI and backend approval
      ci_status: 'failure',
      backend_approval_status: 'approved',
      labels: ['exempt-be-review', 'test-failure']
    }
    
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/repositories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            repositories: [{
              name: 'vets-api',
              owner: 'department-of-veterans-affairs',
              pull_request_count: 100
            }]
          })
        })
      }
      if (url.includes('/api/v1/reviews')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...mockApiResponse,
            pull_requests: [conflictingPR]
          })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(
      <BrowserRouter initialEntries={['/vets-api']}>
        <Dashboard />
      </BrowserRouter>
    )
    
    await screen.findByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    
    // Should appear in Exempt BE Review (takes priority)
    const exemptCard = screen.getByText('Exempt BE Review').closest('[data-slot="card"]')
    fireEvent.click(exemptCard!)
    expect(screen.getByText('[ID-583] - Send mhvapi-idempotency-key in prod')).toBeTruthy()
    
    // Should NOT appear in Failing CI
    const failingCard = screen.getByText('Failing CI').closest('[data-slot="card"]')
    fireEvent.click(failingCard!)
    const prInFailing = screen.queryByText('[ID-583] - Send mhvapi-idempotency-key in prod')
    expect(prInFailing).toBeNull()
  })
})