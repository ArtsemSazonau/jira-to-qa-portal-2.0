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
  it('renders off when the app is not registered', async () => {
    backend({ autostart: false })
    render(<App />)

    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).not.toBeChecked()
  })

  it('reflects the real registration state rather than a default', async () => {
    // The user may have added the login item in System Settings; the toggle
    // must show what the OS actually has.
    backend({ autostart: true })
    render(<App />)

    await waitFor(() => expect(toggle()).toBeChecked())
    expect(mocked.getAutostartEnabled).toHaveBeenCalled()
  })

  it('registers the login item when switched on', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.getAutostartEnabled.mockResolvedValue(true)
    await userEvent.click(toggle())

    expect(mocked.setAutostartEnabled).toHaveBeenCalledExactlyOnceWith(true)
    await waitFor(() => expect(toggle()).toBeChecked())
  })

  it('removes the login item when switched off', async () => {
    backend({ autostart: true })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeChecked())

    mocked.getAutostartEnabled.mockResolvedValue(false)
    await userEvent.click(toggle())

    expect(mocked.setAutostartEnabled).toHaveBeenCalledExactlyOnceWith(false)
    await waitFor(() => expect(toggle()).not.toBeChecked())
  })

  it('reverts and explains when registration fails', async () => {
    backend({ autostart: false })
    render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    mocked.setAutostartEnabled.mockRejectedValue('permission denied')
    await userEvent.click(toggle())

    // A failed registration must not leave the toggle claiming it worked.
    await waitFor(() => expect(toggle()).not.toBeChecked())
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission denied/i)
  })

  it('is disabled until the backend has answered', () => {
    // Never-resolving promises: the toggle must not be clickable before the
    // real state is known, or the first click would write a guess.
    mocked.getAutostartEnabled.mockReturnValue(new Promise(() => {}))
    mocked.getTrayAvailable.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(toggle()).toBeDisabled()
  })

  it('explains itself when there is no backend at all', async () => {
    mocked.getAutostartEnabled.mockRejectedValue(new Error('not in Tauri'))
    mocked.getTrayAvailable.mockRejectedValue(new Error('not in Tauri'))
    render(<App />)

    expect(await screen.findByRole('status')).toHaveTextContent(/backend is not available/i)
    expect(toggle()).toBeDisabled()
  })
})

describe('hide-to-tray affordances', () => {
  it('offers a hide button and explains how to quit', async () => {
    backend({ tray: true })
    render(<App />)

    const hide = await screen.findByRole('button', { name: /hide to menu bar/i })
    await userEvent.click(hide)

    expect(mocked.hideMainWindow).toHaveBeenCalledOnce()
    expect(screen.getByText(/⌘Q/)).toBeInTheDocument()
  })

  it('warns that closing quits when the tray could not be created', async () => {
    backend({ tray: false })
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /closing this window quits the app/i,
    )
    // Offering "hide to menu bar" with no menu bar icon would strand the user.
    expect(screen.queryByRole('button', { name: /hide to menu bar/i })).not.toBeInTheDocument()
  })
})
