import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReviewerMetrics from './ReviewerMetrics'

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString()

const payload = {
  scopes: {
    all: { day: [], week: [{ reviewer: 'bob', count: 4 }, { reviewer: 'carol', count: 3 }], month: [], ytd: [] },
    human: { day: [], week: [{ reviewer: 'bob', count: 4 }, { reviewer: 'carol', count: 1 }], month: [{ reviewer: 'bob', count: 4 }], ytd: [{ reviewer: 'bob', count: 40 }] },
    dependabot: { day: [], week: [{ reviewer: 'carol', count: 2 }], month: [{ reviewer: 'carol', count: 2 }], ytd: [] },
  },
  events: [
    { reviewer: 'bob', at: iso(1), dependabot: false, pr: 1, repo: 'vets-api' },
    { reviewer: 'bob', at: iso(2), dependabot: false, pr: 2, repo: 'vets-api' },
    { reviewer: 'bob', at: iso(3), dependabot: false, pr: 3, repo: 'vets-api' },
    { reviewer: 'bob', at: iso(4), dependabot: false, pr: 4, repo: 'vets-api' },
    { reviewer: 'carol', at: iso(1), dependabot: true, pr: 5, repo: 'vets-api' },
    { reviewer: 'carol', at: iso(2), dependabot: true, pr: 6, repo: 'vets-api' },
  ],
  backend_members: ['bob', 'carol'],
  generated_at: iso(0),
}

describe('ReviewerMetrics page', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(payload), { status: 200 })
  )
  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('api_session_token', 'pcr_test')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('leads with the 30-day approval count and lists reviewers on the leaderboard', async () => {
    render(
      <MemoryRouter>
        <ReviewerMetrics />
      </MemoryRouter>
    )
    expect(await screen.findByText('Sprint Analytics', { selector: 'h1' })).toBeInTheDocument()
    // Hero figure: six approvals in the last 30 days.
    await waitFor(() => expect(screen.getByTestId('hero-count')).toHaveTextContent('6'))
    const board = screen.getByTestId('leaderboard')
    expect(board).toHaveTextContent('bob')
    expect(board).toHaveTextContent('carol')
    // Weekday heatmap lists the same reviewers.
    expect(screen.getByTestId('heatmap')).toHaveTextContent('bob')
  })

  it('requests only the backend review group by default', async () => {
    render(
      <MemoryRouter>
        <ReviewerMetrics />
      </MemoryRouter>
    )
    await screen.findByTestId('hero-count')
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('backend_only=true')
    expect(url).toContain('events_days=90')
  })

  it('refetches a year of events when the pulse range is set to Year', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ReviewerMetrics />
      </MemoryRouter>
    )
    await screen.findByTestId('hero-count')
    await user.click(screen.getByRole('tab', { name: 'Year' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(String(fetchMock.mock.calls[1][0])).toContain('events_days=366')
  })
})
