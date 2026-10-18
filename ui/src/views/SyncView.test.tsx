/**
 * The QA Portal sync tab (spec `sync-status-view`), rendered with the sample data and with edge
 * cases passed through its `data` prop.
 */
import { render, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { PLATFORMS } from '../domain/platforms'
import { SAMPLE_SYNC, type SyncSnapshot } from '../fixtures/sample-data'
import { SyncView } from './SyncView'

const fact = (name: string) => screen.getByText(name, { selector: 'dt' }).nextElementSibling!
const table = () => screen.getByRole('table', { name: /bugs per platform and severity/i })
const row = (name: string) => within(table()).getByRole('row', { name: new RegExp(`^${name}\\b`) })
const cells = (name: string) => within(row(name)).getAllByRole('cell').map((cell) => cell.textContent)

describe('QA Portal sync tab', () => {
  it('[SYNC-003] says it shows sample data and that the sync is not wired yet', () => {
    render(<SyncView />)

    expect(screen.getByText(/^Sample data: the sync is not wired yet/)).toBeVisible()
  })

  it('[SYNC-005] shows the status, the last sync with its outcome, and the next sync', () => {
    render(<SyncView />)

    expect(fact('Status')).toHaveTextContent('Idle')
    expect(fact('Last sync')).toHaveTextContent('Fri 16 Oct, 09:00, succeeded')
    expect(fact('Next sync')).toHaveTextContent('Mon 19 Oct, 09:00')
  })

  it('[SYNC-005] says Never and Not scheduled when there was no sync and none is planned', () => {
    render(<SyncView data={{ ...SAMPLE_SYNC, status: 'failed', lastSync: null, nextSync: null }} />)

    expect(fact('Status')).toHaveTextContent('Failed')
    expect(fact('Last sync')).toHaveTextContent('Never')
    expect(fact('Next sync')).toHaveTextContent('Not scheduled')
  })

  it('[SYNC-006] shows Run now disabled with its reason, and a Dry run option', () => {
    render(<SyncView />)

    const run = screen.getByRole('button', { name: 'Run now' })
    expect(run).toBeDisabled()
    expect(run).toHaveAccessibleDescription(/not wired yet/i)
    expect(screen.getByRole('checkbox', { name: 'Dry run' })).toBeEnabled()
  })

  it('[SYNC-007] lists the five steps in order, each with its outcome in words', () => {
    const steps: SyncSnapshot['steps'] = [
      { step: 'Jira', outcome: 'done' },
      { step: 'Group', outcome: 'done' },
      { step: 'Portal login', outcome: 'failed' },
      { step: 'Update', outcome: 'not run' },
      { step: 'Verify', outcome: 'skipped' },
    ]
    render(<SyncView data={{ ...SAMPLE_SYNC, steps }} />)

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent?.slice(1))).toEqual([
      'Jira: done',
      'Group: done',
      'Portal login: failed',
      'Update: not run',
      'Verify: skipped',
    ])
  })
})

describe('synced counts', () => {
  it('[SYNC-001] has a row per platform in platform order, then a Total row', () => {
    render(<SyncView />)

    const headers = within(table()).getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(headers).toEqual([...PLATFORMS.map((p) => p.label), 'Total'])
    expect(within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Platform',
      'Blocker',
      'Critical',
      'Major',
      'Minor',
      'Trivial',
      'Total',
    ])
  })

  it('[SYNC-001] totals each row, each column and the whole table', () => {
    render(<SyncView data={{ ...SAMPLE_SYNC, previousCounts: null }} />)

    expect(cells('Android mobile')).toEqual(['0', '2', '5', '3', '1', '11'])
    expect(cells('Total')).toEqual(['1', '4', '18', '12', '3', '38'])
  })

  it('[SYNC-002] shows a signed delta where a count moved, and none where it did not', () => {
    render(<SyncView />)

    // Android major rose 4 -> 5; iOS critical fell 2 -> 1; Android TV is unchanged.
    expect(cells('Android mobile')[2]).toBe('5+1')
    expect(cells('iOS mobile')[1]).toBe('1−1')
    expect(cells('Android TV')).toEqual(['0', '0', '2', '1', '1', '4'])
  })

  it('[SYNC-008] warns how many tickets were skipped for an unknown platform', () => {
    const { rerender } = render(<SyncView />)
    expect(screen.getByText('3 tickets were skipped because their platform is not recognised.')).toBeVisible()

    rerender(<SyncView data={{ ...SAMPLE_SYNC, skippedTickets: 1 }} />)
    expect(screen.getByText('1 ticket was skipped because its platform is not recognised.')).toBeVisible()

    rerender(<SyncView data={{ ...SAMPLE_SYNC, skippedTickets: 0 }} />)
    expect(screen.queryByText(/skipped because/)).not.toBeInTheDocument()
  })
})

describe('report', () => {
  it('[SYNC-009] shows the report read-only, with a period choice and Generate and Copy disabled', () => {
    render(<SyncView />)

    const text = screen.getByRole('textbox', { name: 'Report text' })
    expect(text).toHaveAttribute('readonly')
    expect(text).toHaveValue(SAMPLE_SYNC.report)
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('last-week')
    for (const name of ['Generate', 'Copy']) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription(/wired yet|arrives with/i)
    }
  })

  it('[SYNC-010] has no axe violations', async () => {
    const { container } = render(<SyncView />)

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results.violations.map((v) => v.id)).toEqual([])
  })
})
