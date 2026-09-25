//! The `invoke()` surface the UI calls.
//!
//! Every window, activation-policy and autostart operation happens in Rust, so
//! the frontend never touches a plugin's JS API. That is why
//! `capabilities/default.json` needs no `core:window:allow-*`,
//! `core:app:allow-set-dock-visibility`, `autostart:allow-*` or
//! `notification:*` entries — `#[tauri::command]`s of our own are not gated by
//! plugin ACLs. Keep new functionality on this side of the boundary and the
//! capability file stays as small as it is.

use tauri::{AppHandle, State};

use crate::autostart;
use crate::lifecycle::policy::{decide, Action, Trigger};
use crate::lifecycle::AppState;

/// Execute a decided action on the current platform.
///
/// The `#[cfg]` lives here rather than in every command so that adding a
/// Windows or Linux adapter is a one-line change.
#[allow(unused_variables)]
fn apply(app: &AppHandle, action: Action) {
    #[cfg(target_os = "macos")]
    crate::lifecycle::macos::apply(app, action);
}

/// Current launch-at-login state, as the OS reports it.
///
/// Reads the real registration rather than the stored preference, so a change
/// made in System Settings while the app was open is reflected the next time
/// the UI asks.
#[tauri::command]
pub fn get_autostart_enabled(app: AppHandle, state: State<'_, AppState>) -> bool {
    autostart::os_registered(&app).unwrap_or_else(|| state.config().autostart_enabled)
}

/// Turn launch-at-login on or off.
#[tauri::command]
pub fn set_autostart_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    autostart::set_enabled(&app, enabled)
}

/// Show and focus the window. The UI cannot reach this while hidden, but it
/// gives the window a way to raise itself and keeps the show path in one place.
#[tauri::command]
pub fn show_main_window(app: AppHandle, state: State<'_, AppState>) {
    apply(&app, decide(Trigger::TrayShowRequested, state.snapshot()));
}

/// Hide the window to the menu bar, as if the close button had been clicked —
/// including the one-time notice and the drop to `Accessory`.
///
/// Only ever hides. The close button's decision also covers "no tray, so quit
/// instead", and a button labelled *Hide to menu bar* must never quit the app.
#[tauri::command]
pub fn hide_main_window(app: AppHandle, state: State<'_, AppState>) {
    let action = decide(Trigger::WindowCloseRequested, state.snapshot());
    if action == Action::HideToTray {
        apply(&app, action);
    } else {
        log::warn!("hide_main_window ignored: nothing to hide ({action:?})");
    }
}

/// Whether hide-to-tray is active. The UI uses it to explain that the close
/// button quits instead of hiding when the tray could not be created.
#[tauri::command]
pub fn get_tray_available(state: State<'_, AppState>) -> bool {
    state.snapshot().tray_available
}
