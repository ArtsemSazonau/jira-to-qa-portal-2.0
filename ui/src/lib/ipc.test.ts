/**
 * The wrappers are thin, but the command names and argument shapes have to
 * match `src-tauri/src/ipc_commands.rs` exactly — a typo there fails only at
 * runtime, in the built app. These tests pin both sides of that contract.
 *
 * Tauri's `invoke` converts camelCase JS arguments to the snake_case the Rust
 * command expects, so the argument key here is `enabled`, matching the Rust
 * parameter name.
 */
import { invoke } from '@tauri-apps/api/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAutostartEnabled,
  getTrayAvailable,
  hideMainWindow,
  setAutostartEnabled,
  showMainWindow,
} from './ipc'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockedInvoke = vi.mocked(invoke)

beforeEach(() => {
  vi.clearAllMocks()
  mockedInvoke.mockResolvedValue(undefined)
})

describe('ipc wrappers', () => {
  it('reads the autostart state with no arguments', async () => {
    mockedInvoke.mockResolvedValue(true)

    await expect(getAutostartEnabled()).resolves.toBe(true)
    expect(mockedInvoke).toHaveBeenCalledExactlyOnceWith('get_autostart_enabled')
  })

  it('passes the new value when setting autostart', async () => {
    await setAutostartEnabled(true)
    expect(mockedInvoke).toHaveBeenCalledExactlyOnceWith('set_autostart_enabled', {
      enabled: true,
    })

    mockedInvoke.mockClear()
    await setAutostartEnabled(false)
    expect(mockedInvoke).toHaveBeenCalledExactlyOnceWith('set_autostart_enabled', {
      enabled: false,
    })
  })

  it('propagates a rejection from the backend', async () => {
    mockedInvoke.mockRejectedValue('could not write the LaunchAgent plist')

    await expect(setAutostartEnabled(true)).rejects.toBe(
      'could not write the LaunchAgent plist',
    )
  })

  it('reads tray availability', async () => {
    mockedInvoke.mockResolvedValue(false)

    await expect(getTrayAvailable()).resolves.toBe(false)
    expect(mockedInvoke).toHaveBeenCalledExactlyOnceWith('get_tray_available')
  })

  it('calls the window commands by their registered names', async () => {
    await hideMainWindow()
    expect(mockedInvoke).toHaveBeenCalledWith('hide_main_window')

    await showMainWindow()
    expect(mockedInvoke).toHaveBeenCalledWith('show_main_window')
  })
})
