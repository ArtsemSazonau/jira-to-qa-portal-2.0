/**
 * The Timesheet tab (spec `timesheet-view`), rendered with the sample week and with edge cases passed
 * through its `data` prop.
 */
import { render, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { SAMPLE_TIMESHEET } from '../fixtures/sample-data'
import { TimesheetView } from './TimesheetView'

const table = () => screen.getByRole('table', { name: 'Hours per project and day' })
const cells = (name: string) =>
  within(within(table()).getByRole('row', { name: new RegExp(`^${name}\\b`) }))
    .getAllByRole('cell')
    .map((cell) => cell.textContent)
const fact = (name: string) => screen.getByText(name, { selector: 'dt' }).nextElementSibling!

describe('Timesheet tab', () => {
  it('[TIME-003] says it shows sample data and that time entry is not wired yet', () => {
    render(<TimesheetView />)

    expect(screen.getByText(/^Sample data: time entry is not wired yet/)).toBeVisible()
  })

  it('[TIME-002] heads the week with its dates and has a column per weekday', () => {
    render(<TimesheetView />)

    expect(screen.getByRole('heading', { name: 'Week of Mon 12 Oct – Fri 16 Oct' })).toBeVisible()
    expect(within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Project',
      'Mon 12 Oct',
      'Tue 13 Oct',
      'Wed 14 Oct',
      'Thu 15 Oct',
      'Fri 16 Oct',
      'Total',
    ])
  })

  it('[TIME-001] applies 8 and 0.5 hours a day: projects total 40 and 2.5, each day 8.5', () => {
    render(<TimesheetView />)

    expect(cells('Project A')).toEqual(['8', '8', '8', '8', '8', '40'])
    expect(cells('Project B')).toEqual(['0.5', '0.5', '0.5', '0.5', '0.5', '2.5'])
    expect(cells('Total')).toEqual(['8.5', '8.5', '8.5', '8.5', '8.5', '42.5'])
  })

  it('[TIME-004] says no projects are configured, and shows no grid, when the template is empty', () => {
    render(<TimesheetView data={{ ...SAMPLE_TIMESHEET, projects: [] }} />)

    expect(screen.getByText(/no projects are configured/i)).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('[TIME-005] shows the week as a draft with the next submission\'s weekday and time', () => {
    const { rerender } = render(<TimesheetView />)

    expect(fact('Status')).toHaveTextContent('Draft')
    expect(fact('Next submission')).toHaveTextContent('Fri 16 Oct, 17:00')

    rerender(<TimesheetView data={{ ...SAMPLE_TIMESHEET, status: 'submitted' }} />)
    expect(fact('Status')).toHaveTextContent('Submitted')
  })

  it('[TIME-006] shows Submit disabled, described as not wired yet', () => {
    render(<TimesheetView />)

    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAccessibleDescription('Time entry is not wired yet.')
  })

  it('[TIME-007] has no axe violations, with projects and without', async () => {
    const run = async (container: HTMLElement) =>
      (await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => v.id)

    const first = render(<TimesheetView />)
    expect(await run(first.container)).toEqual([])
    first.unmount()

    const empty = render(<TimesheetView data={{ ...SAMPLE_TIMESHEET, projects: [] }} />)
    expect(await run(empty.container)).toEqual([])
  })
})
