/**
 * The tab list on its own, with plain panels. The shell's use of it — which tabs, in what order —
 * is in App.test.tsx.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs } from './Tabs'

const TABS = [
  { id: 'one', label: 'One', panel: <label>Name <input /></label> },
  { id: 'two', label: 'Two', panel: <p>Second panel</p> },
  { id: 'three', label: 'Three', panel: <p>Third panel</p> },
]

const tab = (name: string) => screen.getByRole('tab', { name })

function renderTabs() {
  render(<Tabs tabs={TABS} label="Sections" />)
}

describe('Tabs', () => {
  it('[TAB-006] exposes a labelled tab list, tabs with their selected state, and panels labelled by their tab', () => {
    renderTabs()

    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument()
    expect(tab('One')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Two')).toHaveAttribute('aria-selected', 'false')
    const panel = screen.getByRole('tabpanel', { name: 'One' })
    expect(tab('One')).toHaveAttribute('aria-controls', panel.id)
  })

  it('[TAB-003] shows only the selected panel, and a click selects another', async () => {
    renderTabs()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('One')

    await userEvent.click(tab('Three'))

    expect(tab('Three')).toHaveAttribute('aria-selected', 'true')
    expect(tab('One')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Third panel')
  })

  it('[TAB-004] moves with the arrow keys, wrapping at both ends, and focuses what it selects', async () => {
    renderTabs()
    tab('One').focus()

    await userEvent.keyboard('{ArrowLeft}')
    expect(tab('Three')).toHaveFocus()
    expect(tab('Three')).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{ArrowRight}')
    expect(tab('One')).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(tab('Two')).toHaveAttribute('aria-selected', 'true')
  })

  it('[TAB-004] jumps to the first and last tab with Home and End', async () => {
    renderTabs()
    tab('One').focus()

    await userEvent.keyboard('{End}')
    expect(tab('Three')).toHaveFocus()
    expect(tab('Three')).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Home}')
    expect(tab('One')).toHaveFocus()
  })

  it('[TAB-004] ignores other keys and keeps only the selected tab in the Tab order', async () => {
    renderTabs()
    tab('One').focus()

    await userEvent.keyboard('{ArrowDown}a')

    expect(tab('One')).toHaveAttribute('aria-selected', 'true')
    expect(tab('One')).toHaveAttribute('tabindex', '0')
    expect(tab('Two')).toHaveAttribute('tabindex', '-1')
  })

  it('[TAB-008] keeps hidden panels mounted, so typed input survives a switch', async () => {
    renderTabs()
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'kept')

    await userEvent.click(tab('Two'))
    expect(screen.getByText('Second panel', { selector: 'p' })).toBeVisible()
    expect(document.getElementById('panel-one')).toHaveAttribute('hidden')

    await userEvent.click(tab('One'))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('kept')
  })
})
