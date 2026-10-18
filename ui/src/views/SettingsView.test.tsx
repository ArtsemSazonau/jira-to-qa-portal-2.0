/**
 * The Settings tab's preview sections (spec `settings-view`). Launch at login is covered through the
 * shell in App.test.tsx; here it is only rendered with fixed props.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as ipc from '../lib/ipc'
import { SettingsView } from './SettingsView'

vi.mock('../lib/ipc', () => ({
  getAutostartEnabled: vi.fn().mockResolvedValue(false),
  getTrayAvailable: vi.fn().mockResolvedValue(true),
  setAutostartEnabled: vi.fn(),
  hideMainWindow: vi.fn(),
  showMainWindow: vi.fn(),
}))

function renderView() {
  return render(<SettingsView launchAtLogin={{ enabled: false, disabled: false, onToggle: vi.fn() }} />)
}

const section = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) })

const SECTIONS: Record<string, string[]> = {
  Jira: ['Email', 'API token', 'Cloud ID', 'Filter ID or JQL'],
  'QA Portal': ['URL', 'Login', 'Password'],
  'Sync schedule': ['Interval, minutes', 'Cron expression'],
  Timesheet: ['Tracker URL', 'Login', 'Password', 'Submit on', 'At'],
  GitHub: ['Token', 'Repository', 'Workflow'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('preview sections', () => {
  it('[SET-001] shows Jira, QA Portal, Sync schedule, Timesheet and GitHub, each with its fields', () => {
    renderView()

    for (const [name, fields] of Object.entries(SECTIONS)) {
      for (const field of fields) {
        expect(within(section(name)).getByLabelText(field)).toBeInTheDocument()
      }
    }
    const schedule = section('Sync schedule')
    expect(within(schedule).getByRole('radio', { name: 'Every interval' })).toBeChecked()
    expect(within(schedule).getByRole('radio', { name: 'On a cron schedule' })).not.toBeChecked()
    expect(within(schedule).getByText(/^Next run: /)).toBeInTheDocument()
    expect(within(schedule).getByRole('checkbox', { name: /dry run/i })).not.toBeChecked()
  })

  it('[SET-002] accepts input in every preview field', async () => {
    renderView()

    for (const [name, fields] of Object.entries(SECTIONS)) {
      for (const field of fields) {
        const input = within(section(name)).getByLabelText(field)
        expect(input).toBeEnabled()
        if (input.tagName === 'INPUT' && ['text', 'email', 'url', 'password'].includes((input as HTMLInputElement).type)) {
          await userEvent.type(input, 'x')
          expect(input).toHaveValue('x')
        }
      }
    }
    await userEvent.selectOptions(within(section('Timesheet')).getByLabelText('Submit on'), 'Monday')
    expect(within(section('Timesheet')).getByLabelText('Submit on')).toHaveValue('Monday')
    await userEvent.click(within(section('Sync schedule')).getByRole('radio', { name: 'On a cron schedule' }))
    expect(within(section('Sync schedule')).getByRole('radio', { name: 'On a cron schedule' })).toBeChecked()
  })

  it('[SET-004] masks every secret and offers no autofill for it', () => {
    renderView()

    const secrets = [
      within(section('Jira')).getByLabelText('API token'),
      within(section('QA Portal')).getByLabelText('Password'),
      within(section('Timesheet')).getByLabelText('Password'),
      within(section('GitHub')).getByLabelText('Token'),
    ]
    for (const secret of secrets) {
      expect(secret).toHaveAttribute('type', 'password')
      expect(secret).toHaveAttribute('autocomplete', 'off')
    }
  })

  it('[SET-006] offers the submission weekday, time and mode, defaulting to Friday 17:00, automatic', () => {
    renderView()
    const timesheet = section('Timesheet')

    expect(within(timesheet).getByLabelText('Submit on')).toHaveValue('Friday')
    expect(within(timesheet).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
    ])
    expect(within(timesheet).getByLabelText('At')).toHaveValue('17:00')
    expect(within(timesheet).getByRole('radio', { name: 'Submit automatically' })).toBeChecked()
    expect(within(timesheet).getByRole('radio', { name: /remind me/i })).not.toBeChecked()
  })
})

describe('timesheet projects', () => {
  const hours = (n: number) => screen.getByRole('spinbutton', { name: `Project ${n} hours per day` })
  const name = (n: number) => screen.getByRole('textbox', { name: `Project ${n} name` })

  it('[SET-005] starts from the sample projects, and a new row has no name and 8 hours', async () => {
    renderView()
    expect(name(1)).toHaveValue('Project A')
    expect(hours(2)).toHaveValue(0.5)

    await userEvent.click(screen.getByRole('button', { name: 'Add project' }))

    expect(name(3)).toHaveValue('')
    expect(hours(3)).toHaveValue(8)
  })

  it('[SET-005] accepts 0 to 24 hours in steps of 0.5, more than 8 without a warning', async () => {
    renderView()
    const input = hours(1)

    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '24')
    expect(input).toHaveAttribute('step', '0.5')
    await userEvent.clear(input)
    await userEvent.type(input, '10')
    expect(input).toHaveValue(10)
    expect((input as HTMLInputElement).validity.valid).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('[SET-005] removes rows down to none, and Add project still works', async () => {
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Remove project 2' }))
    expect(screen.queryByRole('textbox', { name: 'Project 2 name' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove project 1' }))

    expect(screen.getByText(/no projects/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add project' }))
    expect(hours(1)).toHaveValue(8)
  })

  it('[SET-005] keeps each remaining row\'s typed values when another row is removed', async () => {
    renderView()
    await userEvent.clear(name(2))
    await userEvent.type(name(2), 'Kept')

    await userEvent.click(screen.getByRole('button', { name: 'Remove project 1' }))

    expect(name(1)).toHaveValue('Kept')
  })
})

describe('marking unfinished settings', () => {
  it('[SET-007] badges every preview section, and not the launch-at-login row', () => {
    renderView()

    for (const name of Object.keys(SECTIONS)) {
      expect(within(section(name)).getByText('Not wired yet')).toBeInTheDocument()
    }
    expect(screen.getAllByText('Not wired yet')).toHaveLength(Object.keys(SECTIONS).length)
    const launch = screen.getByRole('switch', { name: 'Launch at login' }).closest('section')!
    expect(within(launch).queryByText('Not wired yet')).not.toBeInTheDocument()
  })

  it('[SET-008] disables Test connection and says the connection is not wired yet', () => {
    renderView()

    const button = within(section('Jira')).getByRole('button', { name: 'Test connection' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(/not wired yet/i)
  })

  it('[SET-009] has no axe violations, with projects and without', async () => {
    const { container } = renderView()
    const run = async () =>
      (await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => v.id)

    expect(await run()).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'Remove project 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove project 1' }))
    expect(await run()).toEqual([])
  })
})

describe('nothing is saved', () => {
  it('[SET-003] sends nothing to the core while the user fills in credentials', async () => {
    render(<App />)
    await screen.findByRole('switch', { name: 'Launch at login' })
    vi.clearAllMocks()

    await userEvent.type(within(section('Jira')).getByLabelText('API token'), 'secret-token')
    await userEvent.type(within(section('QA Portal')).getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Add project' }))

    for (const fn of Object.values(ipc)) {
      if (vi.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled()
    }
  })

  it('[TAB-008] keeps a typed value after switching to another tab and back', async () => {
    render(<App />)
    await screen.findByRole('switch', { name: 'Launch at login' })

    await userEvent.type(within(section('Jira')).getByLabelText('Email'), 'qa@example.com')
    await userEvent.click(screen.getByRole('tab', { name: 'Timesheet' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }))

    expect(within(section('Jira')).getByLabelText('Email')).toHaveValue('qa@example.com')
  })
})
