//! macOS adapter: executes the actions [`super::policy`] returns.
//!
//! Compiled only under `target_os = "macos"`. Adding Windows or Linux later
//! means adding a sibling module with the same `apply`/`show`/`hide` surface —
//! no change to the policy, and no change to the callers in `lib.rs`.
//!
//! Keep this module free of decisions. Anything shaped like `if` belongs in
//! `policy.rs`, where it can be tested without a window.

use tauri::{ActivationPolicy, AppHandle, Manager};

use super::policy::{self, Action};
use super::{AppState, MAIN_WINDOW};
use crate::notify;

/// Run an action. Errors are logged rather than propagated: none of these is
/// worth failing a window close or a tray click over, and several are expected
/// to be no-ops (hiding an already-hidden window, for instance).
pub fn apply(app: &AppHandle, action: Action) {
    match action {
        Action::HideToTray => hide(app),
        Action::ShowAndFocus => show(app),
        Action::FocusOnly => focus(app),
        Action::Exit => app.exit(0),
        // `AllowClose` and `Nothing` are decisions *not* to act — the caller
        // simply skips `prevent_close()`.
        Action::AllowClose | Action::Nothing => {}
    }
}

/// Hide the window, become a background app, and fire the one-time notice.
///
/// Order matters: hide first so the window disappears immediately (the ⌘H feel
/// the spec asks for), then drop the activation policy so the Dock icon and
/// ⌘-Tab entry go with it.
pub fn hide(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        log::warn!("no `{MAIN_WINDOW}` window to hide");
        return;
    };

    if let Err(err) = window.hide() {
        log::error!("could not hide the window: {err}");
        return;
    }

    if let Err(err) = app.set_activation_policy(ActivationPolicy::Accessory) {
        // Not fatal: the window is hidden either way, the app just keeps its
        // Dock icon.
        log::error!("could not switch to the Accessory activation policy: {err}");
    }

    let state = app.state::<AppState>();
    state.set_window_visible(false);

    if policy::should_show_first_close_notice(state.config().first_close_notice_shown) {
        notify::first_close_notice(app);
        state.update_config(|config| config.first_close_notice_shown = true);
    }
}

/// Show and focus the window.
///
/// The activation policy must return to `Regular` *before* the window is shown,
/// or an Accessory app's window can come up behind whatever is in front.
pub fn show(app: &AppHandle) {
    if let Err(err) = app.set_activation_policy(ActivationPolicy::Regular) {
        log::error!("could not switch to the Regular activation policy: {err}");
    }

    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        log::warn!("no `{MAIN_WINDOW}` window to show");
        return;
    };

    if let Err(err) = window.unminimize() {
        log::debug!("unminimize was not applicable: {err}");
    }
    if let Err(err) = window.show() {
        log::error!("could not show the window: {err}");
        return;
    }
    if let Err(err) = window.set_focus() {
        log::error!("could not focus the window: {err}");
    }

    app.state::<AppState>().set_window_visible(true);
}

/// Bring an already-visible window forward.
fn focus(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        log::warn!("no `{MAIN_WINDOW}` window to focus");
        return;
    };
    if let Err(err) = window.set_focus() {
        log::error!("could not focus the window: {err}");
    }
}

/// Start life as a background app, for a launch by the login item.
///
/// The window is configured `visible: true` so a manual launch opens normally;
/// this is the runtime path that takes it back down for a login-item launch.
pub fn start_hidden(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        if let Err(err) = window.hide() {
            log::error!("could not hide the window at startup: {err}");
        }
    }
    if let Err(err) = app.set_activation_policy(ActivationPolicy::Accessory) {
        log::error!("could not start in the Accessory activation policy: {err}");
    }
    app.state::<AppState>().set_window_visible(false);
}
