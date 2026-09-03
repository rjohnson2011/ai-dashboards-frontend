import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DayDetail from './DayDetail'

const groups = [
  { pr: 7, repo: 'vets-api', title: 'Fix claim status', url: 'https://va.ghe.com/dsva/vets-api/pull/7', dependabot: false,
    approvals: [{ reviewer: 'bob', at: new Date(2026, 7, 31, 9).toISOString() }] },
  { pr: 8, repo: 'vets-api', title: null, url: 'https://va.ghe.com/dsva/vets-api/pull/8', dependabot: true,
    approvals: [{ reviewer: 'carol', at: new Date(2026, 7, 31, 11).toISOString() }] },
]

describe('DayDetail', () => {
  it('lists each approved PR with its link, reviewers and a dependabot mark', () => {
    render(<DayDetail date="2026-08-31" groups={groups} onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Mon, Aug 31')
    expect(screen.getByRole('link', { name: /Fix claim status/ })).toHaveAttribute('href', 'https://va.ghe.com/dsva/vets-api/pull/7')
    expect(screen.getByRole('link', { name: /vets-api #8/ })).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getAllByText('Dependabot')).toHaveLength(1)
  })

  it('closes from the close button', async () => {
    const onClose = vi.fn()
    render(<DayDetail date="2026-08-31" groups={groups} onClose={onClose} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
