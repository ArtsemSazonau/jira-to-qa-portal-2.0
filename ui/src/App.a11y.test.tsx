/**
 * Accessibility checks of the rendered settings panel.
 *
 * axe runs in jsdom, so rules that need real layout — colour contrast above all
 * — cannot be evaluated here and are switched off. What remains covers roles,
 * names, labels and ARIA validity. The VoiceOver announcement itself stays a
 * manual case (UI-006); appearance is covered by the UI flows' screenshots.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getAutostartEnabled, getTrayAvailable } from './lib/ipc'

vi.mock('./lib/ipc', () => ({
  getAutostartEnabled: vi.fn(),
  getTrayAvailable: vi.fn(),
  setAutostartEnabled: vi.fn(),
  hideMainWindow: vi.fn(),
  showMainWindow: vi.fn(),
}))

async function violations(container: Element) {
  const results = await axe.run(container, {
    rules: {
      // Needs computed layout and colours, which jsdom does not have.
      'color-contrast': { enabled: false },
    },
  })
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(', ')})`)
}

const toggle = () => screen.getByRole('switch', { name: 'Launch at login' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('accessibility', () => {
  it('[UI-012] has no axe violations once loaded', async () => {
    vi.mocked(getAutostartEnabled).mockResolvedValue(false)
    vi.mocked(getTrayAvailable).mockResolvedValue(true)
    const { container } = render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    expect(await violations(container)).toEqual([])
  })

  it('[UI-012] has no axe violations in the tray-unavailable and no-backend states', async () => {
    vi.mocked(getAutostartEnabled).mockResolvedValue(true)
    vi.mocked(getTrayAvailable).mockResolvedValue(false)
    const first = render(<App />)
    await screen.findByRole('alert')
    expect(await violations(first.container)).toEqual([])
    first.unmount()

    vi.mocked(getAutostartEnabled).mockRejectedValue(new Error('not in Tauri'))
    vi.mocked(getTrayAvailable).mockRejectedValue(new Error('not in Tauri'))
    const second = render(<App />)
    await screen.findByRole('status')
    expect(await violations(second.container)).toEqual([])
  })

  it('[TAB-012] has no axe violations with each tab selected', async () => {
    vi.mocked(getAutostartEnabled).mockResolvedValue(false)
    vi.mocked(getTrayAvailable).mockResolvedValue(true)
    const { container } = render(<App />)
    await waitFor(() => expect(toggle()).toBeEnabled())

    for (const tab of screen.getAllByRole('tab')) {
      await userEvent.click(tab)
      expect(tab).toHaveAttribute('aria-selected', 'true')
      expect(await violations(container)).toEqual([])
    }
  })

  it('[UI-006] exposes the toggle as a switch named "Launch at login" with its state', async () => {
    vi.mocked(getAutostartEnabled).mockResolvedValue(true)
    vi.mocked(getTrayAvailable).mockResolvedValue(true)
    render(<App />)

    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toBeChecked()
    expect(toggle().tagName).toBe('INPUT')
  })
})
