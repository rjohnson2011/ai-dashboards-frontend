import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppHeader from './AppHeader'

const designs = [
  { key: 'triage', label: 'Triage Board', blurb: 'main board' },
  { key: 'editorial', label: 'Editorial Terminal', blurb: 'warm dark' },
  { key: 'brutalist', label: 'Brutalist Print' },
  { key: 'refined', label: 'Refined Minimal' },
  { key: 'crt', label: 'CRT Console' },
]

function renderGallery(activeKey = 'triage') {
  const onSelect = vi.fn()
  render(
    <MemoryRouter>
      <AppHeader
        variant="gallery"
        designs={designs}
        primaryKey="triage"
        activeKey={activeKey}
        onSelect={onSelect}
      />
    </MemoryRouter>
  )
  return onSelect
}

describe('AppHeader gallery variant', () => {
  it('shows Triage Board as the main view with a Sprint Analytics link', () => {
    renderGallery()
    expect(screen.getByRole('button', { name: 'Triage Board' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Sprint Analytics' })).toHaveAttribute('href', '/sprint-metrics')
  })

  it('lists the other views in the Other Views menu and reports a pick', async () => {
    const user = userEvent.setup()
    const onSelect = renderGallery()
    await user.click(screen.getByRole('button', { name: /other views/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByText('Triage Board')).toBeNull()
    for (const label of ['Editorial Terminal', 'Brutalist Print', 'Refined Minimal', 'CRT Console']) {
      expect(within(menu).getByText(label)).toBeInTheDocument()
    }
    await user.click(within(menu).getByText('CRT Console'))
    expect(onSelect).toHaveBeenCalledWith('crt')
  })

  it('offers the classic table from the Other Views menu', async () => {
    const user = userEvent.setup()
    renderGallery()
    await user.click(screen.getByRole('button', { name: /other views/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /classic table/i })).toBeInTheDocument()
  })

  it('returns to Triage Board from the main button', async () => {
    const user = userEvent.setup()
    const onSelect = renderGallery('crt')
    expect(screen.getByRole('button', { name: 'Triage Board' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Triage Board' }))
    expect(onSelect).toHaveBeenCalledWith('triage')
  })
})

describe('AppHeader classic variant', () => {
  it('links to Sprint Analytics', () => {
    render(
      <MemoryRouter>
        <AppHeader variant="classic" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Sprint Analytics' })).toHaveAttribute('href', '/sprint-metrics')
  })
})
