/**
 * Typed wrappers over the Rust `#[tauri::command]`s in
 * `src-tauri/src/ipc_commands.rs`.
 *
 * Everything crossing the boundary goes through this module — components never
 * call `invoke` directly. That keeps the command names in one place and gives
 * tests a single thing to mock.
 *
 * The UI deliberately does not use the autostart, notification or window plugin
 * JS APIs. Rust owns those, which is why `src-tauri/capabilities/default.json`
 * needs nothing beyond `core:default`.
 */
import { invoke } from '@tauri-apps/api/core'

/** Whether the app is registered to launch at login, as the OS reports it. */
export function getAutostartEnabled(): Promise<boolean> {
  return invoke<boolean>('get_autostart_enabled')
}

/** Register or unregister the login item. Rejects with a message on failure. */
export function setAutostartEnabled(enabled: boolean): Promise<void> {
  return invoke<void>('set_autostart_enabled', { enabled })
}

/**
 * Whether a tray icon exists. When it does not, closing the window quits
 * instead of hiding — there would be no way back in otherwise.
 */
export function getTrayAvailable(): Promise<boolean> {
  return invoke<boolean>('get_tray_available')
}

/** Hide the window to the menu bar, exactly as the close button does. */
export function hideMainWindow(): Promise<void> {
  return invoke<void>('hide_main_window')
}

/** Show and focus the window. */
export function showMainWindow(): Promise<void> {
  return invoke<void>('show_main_window')
}
