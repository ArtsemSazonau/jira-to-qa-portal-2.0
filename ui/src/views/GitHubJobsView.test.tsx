/**
 * The GitHub jobs tab's wiring of the selection rules (spec `project-ci-jobs`). The rules themselves
 * are tested without rendering in github/selection.test.ts; these check that the view shows them.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { PLATFORMS } from '../domain/platforms'
import { SAMPLE_CI } from '../fixtures/sample-data'
import { GitHubJobsView } from './GitHubJobsView'

vi.mock('../lib/ipc', () => ({
  getAutostartEnabled: vi.fn().mockResolvedValue(false),
  getTrayAvailable: vi.fn().mockResolvedValue(true),
  setAutostartEnabled: vi.fn(),
  hideMainWindow: vi.fn(),
  showMainWindow: vi.fn(),
}))

const box = (column: string, platform: string) => screen.getByRole('checkbox', { name: `${column} ${platform}` })
const all = (column: string) => screen.getByRole('checkbox', { name: `${column}, all platforms` })
const devices = (platform: string) => within(screen.getByRole('group', { name: `${platform} devices` }))
const chip = (platform: string, device: string) => devices(platform).getByRole('button', { name: device })
const release = () => screen.getByRole('checkbox', { name: 'Release' })
const branch = () => screen.getByRole('combobox', { name: 'Branch' })
const runButton = () => screen.getByRole('button', { name: /^Run \d|^No platform selected/ })

describe('GitHub jobs tab', () => {
  it('[GH-013] says branches and devices are sample data and that starting jobs is not wired yet', () => {
    render(<GitHubJobsView />)

    expect(screen.getByText(/^Sample data: branches and devices are examples/)).toBeVisible()
  })

  it('[GH-014] starts on the default branch with every control off and Run the only enabled column', () => {
    render(<GitHubJobsView />)

    expect(branch()).toHaveValue(SAMPLE_CI.defaultBranch)
    expect(release()).not.toBeChecked()
    const rowHeaders = screen.getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(rowHeaders).toEqual(['All', ...PLATFORMS.map((p) => p.label)])
    for (const { label } of PLATFORMS) {
      expect(box('Run', label)).toBeEnabled()
      expect(box('Run', label)).not.toBeChecked()
      expect(box('Prod env', label)).toBeDisabled()
      expect(box('Dev mode', label)).toBeDisabled()
      for (const device of devices(label).getAllByRole('button')) {
        expect(device).toHaveAttribute('aria-pressed', 'false')
        expect(device).toBeDisabled()
      }
    }
    expect(all('Run')).toBeEnabled()
    expect(all('Prod env')).toBeDisabled()
    expect(all('Dev mode')).toBeDisabled()
  })

  it('[GH-015] disables a platform\'s other controls while Run is off, and restores their values when it is back on', async () => {
    render(<GitHubJobsView />)
    await userEvent.click(box('Run', 'Android mobile'))
    await userEvent.click(box('Prod env', 'Android mobile'))
    await userEvent.click(chip('Android mobile', 'Pixel 7'))

    await userEvent.click(box('Run', 'Android mobile'))
    expect(box('Prod env', 'Android mobile')).toBeDisabled()
    expect(box('Prod env', 'Android mobile')).toBeChecked()
    expect(chip('Android mobile', 'Pixel 7')).toBeDisabled()
    expect(runButton()).toHaveTextContent('No platform selected')

    await userEvent.click(box('Run', 'Android mobile'))
    expect(box('Prod env', 'Android mobile')).toBeEnabled()
    expect(box('Prod env', 'Android mobile')).toBeChecked()
    expect(chip('Android mobile', 'Pixel 7')).toHaveAttribute('aria-pressed', 'true')
  })

  it('[GH-016] shows a mixed All, and Prod env All changes only Run-on platforms', async () => {
    render(<GitHubJobsView />)
    await userEvent.click(box('Run', 'Android mobile'))
    await userEvent.click(box('Run', 'iOS mobile'))

    expect((all('Run') as HTMLInputElement).indeterminate).toBe(true)
    expect(all('Run')).toBePartiallyChecked()
    expect(all('Prod env')).toBeEnabled()

    await userEvent.click(all('Prod env'))
    expect(box('Prod env', 'Android mobile')).toBeChecked()
    expect(box('Prod env', 'iOS mobile')).toBeChecked()
    expect(box('Prod env', 'LG')).not.toBeChecked()
    expect(all('Prod env')).toBeChecked()

    await userEvent.click(all('Run'))
    expect((all('Run') as HTMLInputElement).indeterminate).toBe(false)
    for (const { label } of PLATFORMS) expect(box('Run', label)).toBeChecked()
  })

  it('[GH-017] marks a selected device with a check and a pressed state, any number of them', async () => {
    render(<GitHubJobsView />)
    await userEvent.click(box('Run', 'iOS mobile'))

    await userEvent.click(chip('iOS mobile', 'iPhone 15'))
    await userEvent.click(chip('iOS mobile', 'iPad Air'))

    expect(chip('iOS mobile', 'iPhone 15')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('iOS mobile', 'iPhone 15')).toHaveTextContent('✓')
    expect(chip('iOS mobile', 'iPhone SE')).toHaveAttribute('aria-pressed', 'false')
    expect(chip('iOS mobile', 'iPhone SE')).not.toHaveTextContent('✓')

    await userEvent.click(chip('iOS mobile', 'iPhone 15'))
    expect(chip('iOS mobile', 'iPhone 15')).toHaveAttribute('aria-pressed', 'false')
  })

  it('[GH-018] resets everything, Release included, when the branch changes, and restores nothing on return', async () => {
    render(<GitHubJobsView />)
    await userEvent.click(release())
    await userEvent.click(box('Run', 'iOS mobile'))
    await userEvent.click(chip('iOS mobile', 'iPhone 15'))

    await userEvent.selectOptions(branch(), 'develop')
    expect(branch()).toHaveValue('develop')
    expect(release()).not.toBeChecked()
    expect(box('Run', 'iOS mobile')).not.toBeChecked()
    expect(chip('iOS mobile', 'iPhone 15')).toHaveAttribute('aria-pressed', 'false')

    await userEvent.selectOptions(branch(), 'main')
    expect(box('Run', 'iOS mobile')).not.toBeChecked()
  })

  it('[GH-019] describes Release as applying to all platforms, and checking it changes nothing else', async () => {
    render(<GitHubJobsView />)
    await userEvent.click(box('Run', 'Android mobile'))

    await userEvent.click(release())

    expect(release()).toBeChecked()
    expect(release()).toHaveAccessibleDescription(/Android builds go to Play Console instead of a local build/)
    expect(box('Run', 'Android mobile')).toBeChecked()
    expect(chip('Android mobile', 'Pixel 7')).toBeEnabled()
  })

  it('[GH-020] labels the Run button with jobs and devices, and keeps it disabled with its reason', async () => {
    render(<GitHubJobsView />)
    expect(runButton()).toHaveTextContent('No platform selected')
    expect(runButton()).toBeDisabled()
    expect(runButton()).toHaveAccessibleDescription(/at least one platform/)

    await userEvent.click(box('Run', 'Android mobile'))
    expect(runButton()).toHaveTextContent('Run 1 job, no deployment')

    await userEvent.click(chip('Android mobile', 'Pixel 7'))
    await userEvent.click(box('Run', 'iOS mobile'))
    await userEvent.click(chip('iOS mobile', 'iPhone 15'))
    await userEvent.click(chip('iOS mobile', 'iPad Air'))

    expect(runButton()).toHaveTextContent('Run 2 jobs, deploy to 3 devices')
    expect(runButton()).toBeDisabled()
    expect(runButton()).toHaveAccessibleDescription('Starting jobs is not wired yet.')
  })

  it('[GH-021] keeps the selection while the user visits another tab', async () => {
    render(<App />)
    await screen.findByRole('switch', { name: 'Launch at login' })
    await userEvent.click(screen.getByRole('tab', { name: 'GitHub jobs' }))
    await userEvent.click(box('Run', 'Apple TV'))

    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('tab', { name: 'GitHub jobs' }))

    expect(box('Run', 'Apple TV')).toBeChecked()
  })

  it('[GH-022] has no axe violations, with nothing selected and with a selection', async () => {
    const { container } = render(<GitHubJobsView />)
    const run = async () =>
      (await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => v.id)

    expect(await run()).toEqual([])
    await userEvent.click(box('Run', 'Android mobile'))
    await userEvent.click(chip('Android mobile', 'Pixel 7'))
    await userEvent.click(box('Run', 'LG'))
    expect(await run()).toEqual([])
  })
})
