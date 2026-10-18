/**
 * Tests for the launch-at-login toggle.
 *
 * `./lib/ipc` is mocked rather than `@tauri-apps/api/core`, so these assert the
 * contract the component depends on — which wrapper it calls, with what — and
 * stay readable. The wrapper's own command names are covered in `ipc.test.ts`.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  getAutostartEnabled,
  getTrayAvailable,
  hideMainWindow,
  setAutostartEnabled,
} from './lib/ipc'

vi.mock('./lib/ipc', () => ({
  getAutostartEnabled: vi.fn(),
  getTrayAvailable: vi.fn(),
  setAutostartEnabled: vi.fn(),
  hideMainWindow: vi.fn(),
  showMainWindow: vi.fn(),
}))

const mocked = {
  getAutostartEnabled: vi.mocked(getAutostartEnabled),
  getTrayAvailable: vi.mocked(getTrayAvailable),
  setAutostartEnabled: vi.mocked(setAutostartEnabled),
  hideMainWindow: vi.mocked(hideMainWindow),
}

/** Backend that answers with the given state. */
function backend({ autostart = false, tray = true } = {}) {
  mocked.getAutostartEnabled.mockResolvedValue(autostart)
  mocked.getTrayAvailable.mockResolvedValue(tray)
  mocked.setAutostartEnabled.mockResolvedValue(undefined)
  mocked.hideMainWindow.mockResolvedValue(undefined)
}

const toggle = () => screen.getByRole('switch', { name: /launch at login/i })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('launch-at-login toggle', () => {
  it('[LOGIN-001, UI-002] renders off when the app is not registered', async () => {
    backend({ autostart: false })
    render(<App />)

    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).not.toBeChecked()
  })

  it('[LOGIN-012] reflects the real registration state rather than a default', async () => {
    // The user may have added the login item in System Settings; the toggle
    // must show what the OS actually has.
    backend({ autostart: true })
    render(<App />)

    await waitFor(() => expect(toggle()).toBeChecked())
    expect(mocked.getAutostartEnabled).toHaveBeenCalled()
  })

  it('[LOGIN-002] registers the login item when switched on', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.getAutostartEnabled.mockResolvedValue(true)
    await userEvent.click(toggle())

    expect(mocked.setAutostartEnabled).toHaveBeenCalledExactlyOnceWith(true)
    await waitFor(() => expect(toggle()).toBeChecked())
  })

  it('[LOGIN-010] removes the login item when switched off', async () => {
    backend({ autostart: true })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeChecked())

    mocked.getAutostartEnabled.mockResolvedValue(false)
    await userEvent.click(toggle())

    expect(mocked.setAutostartEnabled).toHaveBeenCalledExactlyOnceWith(false)
    await waitFor(() => expect(toggle()).not.toBeChecked())
  })

  it('[UI-009] reverts and explains when registration fails', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.setAutostartEnabled.mockRejectedValue('permission denied')
    await userEvent.click(toggle())

    // A failed registration must not leave the toggle claiming it worked.
    await waitFor(() => expect(toggle()).not.toBeChecked())
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission denied/i)
  })

  it('[UI-002] is disabled until the backend has answered', () => {
    // Never-resolving promises: the toggle must not be clickable before the
    // real state is known, or the first click would write a guess.
    mocked.getAutostartEnabled.mockReturnValue(new Promise(() => {}))
    mocked.getTrayAvailable.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(toggle()).toBeDisabled()
  })

  it('[UI-007] explains itself when there is no backend at all', async () => {
    mocked.getAutostartEnabled.mockRejectedValue(new Error('not in Tauri'))
    mocked.getTrayAvailable.mockRejectedValue(new Error('not in Tauri'))
    render(<App />)

    expect(await screen.findByRole('status')).toHaveTextContent(/backend is not available/i)
    expect(toggle()).toBeDisabled()
  })

  it('[UI-010] stays disabled while a save is in flight', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    // Hold the save open: a second click before it settles would race it.
    let finishSave!: () => void
    mocked.setAutostartEnabled.mockReturnValue(new Promise<void>((resolve) => (finishSave = resolve)))
    mocked.getAutostartEnabled.mockResolvedValue(true)
    await userEvent.click(toggle())

    expect(toggle()).toBeDisabled()
    finishSave()
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toBeChecked()
  })

  it('[UI-011] clears a previous error after a successful toggle', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.setAutostartEnabled.mockRejectedValueOnce('permission denied')
    await userEvent.click(toggle())
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission denied/i)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.getAutostartEnabled.mockResolvedValue(true)
    await userEvent.click(toggle())

    await waitFor(() => expect(toggle()).toBeChecked())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('tabs', () => {
  const tab = (name: string) => screen.getByRole('tab', { name })

  it('[TAB-001] offers Settings, QA Portal sync, Timesheet and GitHub jobs, in that order', async () => {
    backend()
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Settings',
      'QA Portal sync',
      'Timesheet',
      'GitHub jobs',
    ])
  })

  it('[TAB-002] opens on Settings, with launch at login visible without a click', async () => {
    backend()
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    expect(tab('Settings')).toHaveAttribute('aria-selected', 'true')
    expect(toggle()).toBeVisible()
  })

  it('[TAB-003] shows the selected tab\'s panel only', async () => {
    backend()
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    await userEvent.click(tab('Timesheet'))

    expect(tab('Timesheet')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Timesheet')
    expect(screen.getByRole('switch', { name: /launch at login/i, hidden: true })).not.toBeVisible()
  })

  it('[TAB-009] sends nothing to the core when switching tabs', async () => {
    backend()
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())
    vi.clearAllMocks()

    for (const name of ['QA Portal sync', 'Timesheet', 'GitHub jobs', 'Settings']) {
      await userEvent.click(tab(name))
    }

    for (const fn of Object.values(mocked)) expect(fn).not.toHaveBeenCalled()
  })

  it('[TAB-010] keeps the heading and the hide footer on every tab', async () => {
    backend({ tray: true })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    await userEvent.click(tab('GitHub jobs'))

    expect(screen.getByRole('heading', { level: 1, name: 'QA Portal Sync' })).toBeVisible()
    expect(screen.getByRole('button', { name: /hide to menu bar/i })).toBeVisible()
    expect(screen.getByText(/⌘Q/)).toBeVisible()
  })

  it('[TAB-008] keeps launch at login working after visiting another tab', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    await userEvent.click(tab('GitHub jobs'))
    await userEvent.click(tab('Settings'))
    mocked.getAutostartEnabled.mockResolvedValue(true)
    await userEvent.click(toggle())

    expect(mocked.setAutostartEnabled).toHaveBeenCalledExactlyOnceWith(true)
    await waitFor(() => expect(toggle()).toBeChecked())
  })
})

describe('hide-to-tray affordances', () => {
  it('[UI-001] offers a hide button and explains how to quit', async () => {
    backend({ tray: true })
    render(<App />)

    expect(await screen.findByRole('button', { name: /hide to menu bar/i })).toBeInTheDocument()
    expect(screen.getByText(/⌘Q/)).toBeInTheDocument()
  })

  it('[HIDE-008] asks the backend to hide the window when the hide button is clicked', async () => {
    backend({ tray: true })
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /hide to menu bar/i }))

    expect(mocked.hideMainWindow).toHaveBeenCalledExactlyOnceWith()
    expect(mocked.setAutostartEnabled).not.toHaveBeenCalled()
  })

  it('[TRAY-010] warns that closing quits when the tray could not be created', async () => {
    backend({ tray: false })
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /closing this window quits the app/i,
    )
    // Offering "hide to menu bar" with no menu bar icon would strand the user.
    expect(screen.queryByRole('button', { name: /hide to menu bar/i })).not.toBeInTheDocument()
  })
})
