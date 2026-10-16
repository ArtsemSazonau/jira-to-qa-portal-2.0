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
//!
//! The wording is built by pure functions, so a copy-edit that changes what the
//! user reads shows up as a failing test rather than silently.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// A notification's title and body.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Notice {
    pub title: &'static str,
    pub body: &'static str,
}

/// Shown the first time the window is hidden, so the user does not think the
/// app has quit.
pub fn first_close_text() -> Notice {
    Notice {
        title: "Still running in the menu bar",
        body: "QA Portal Sync keeps running so scheduled syncs can continue. \
               Click the menu bar icon to reopen it, or choose Quit there to exit.",
    }
}

/// Shown once on a fresh install, offering the launch-at-login opt-in.
pub fn first_run_text() -> Notice {
    Notice {
        title: "Start QA Portal Sync at login?",
        body: "Turn on “Launch at login” in the app window to keep syncs running \
               after you restart your Mac.",
    }
}

fn show(app: &AppHandle, notice: Notice) {
    let Notice { title, body } = notice;
    match app.notification().builder().title(title).body(body).show() {
        Ok(()) => log::debug!("shown notification: {title}"),
        // Expected in `tauri dev`: macOS generally needs a registered bundle
        // identifier to deliver notifications.
        Err(err) => log::warn!("could not show the `{title}` notification: {err}"),
    }
}

/// Fired the first time the window is hidden.
pub fn first_close_notice(app: &AppHandle) {
    show(app, first_close_text());
}

/// Fired once on a fresh install.
pub fn first_run_autostart_prompt(app: &AppHandle) {
    show(app, first_run_text());
}

#[cfg(test)]
mod tests {
    use super::*;

    // case: NOTE-009
    #[test]
    fn every_notice_has_a_title_and_a_body() {
        for notice in [first_close_text(), first_run_text()] {
            assert!(!notice.title.trim().is_empty(), "{notice:?}");
            assert!(!notice.body.trim().is_empty(), "{notice:?}");
        }
    }

    // case: NOTE-009
    #[test]
    fn the_close_notice_says_where_the_app_went_and_how_to_quit() {
        // Its whole job: the user closed the window and must not think the app
        // quit, nor be left without a way to quit it.
        let notice = first_close_text();
        assert!(notice.title.contains("menu bar"), "{notice:?}");
        assert!(notice.body.contains("menu bar icon"), "{notice:?}");
        assert!(notice.body.contains("Quit"), "{notice:?}");
    }

    // case: NOTE-009
    #[test]
    fn the_first_run_prompt_names_the_setting_it_offers() {
        let notice = first_run_text();
        assert!(notice.body.contains("Launch at login"), "{notice:?}");
    }
}
