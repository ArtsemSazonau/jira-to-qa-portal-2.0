//! One-time informational notifications.
//!
//! Both of these must degrade silently. A notification that macOS refuses to
//! deliver — Do Not Disturb, notifications denied for the bundle, or an
//! unbundled `tauri dev` binary with no registered bundle id — is never a
//! reason to block a window hide or abort startup. Every path here logs and
//! returns.
//!
//! Action buttons are deliberately not used: they are unreliable across macOS
//! versions and need a notification delegate the plugin does not set up. These
//! are informational; the real control lives in the window.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

fn show(app: &AppHandle, title: &str, body: &str) {
    match app.notification().builder().title(title).body(body).show() {
        Ok(()) => log::debug!("shown notification: {title}"),
        // Expected in `tauri dev`: macOS generally needs a registered bundle
        // identifier to deliver notifications.
        Err(err) => log::warn!("could not show the `{title}` notification: {err}"),
    }
}

/// Fired the first time the window is hidden, so the user does not think the
/// app has quit.
pub fn first_close_notice(app: &AppHandle) {
    show(
        app,
        "Still running in the menu bar",
        "QA Portal Sync keeps running so scheduled syncs can continue. \
         Click the menu bar icon to reopen it, or choose Quit there to exit.",
    );
}

/// Fired once on a fresh install, offering the launch-at-login opt-in.
pub fn first_run_autostart_prompt(app: &AppHandle) {
    show(
        app,
        "Start QA Portal Sync at login?",
        "Turn on “Launch at login” in the app window to keep syncs running \
         after you restart your Mac.",
    );
}
