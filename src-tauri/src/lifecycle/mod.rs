//! Window/process lifecycle: what hides, what quits, and what brings the app back.
//!
//! - [`policy`] decides (pure, no Tauri types, fully unit-tested).
//! - [`macos`] executes (thin, platform-gated, no branching worth testing).
//!
//! [`AppState`] is the bridge: the managed state both sides read, holding the
//! runtime booleans and the on-disk config.

pub mod policy;

#[cfg(target_os = "macos")]
pub mod macos;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::config::{self, AppConfig};
use policy::LifecycleState;

/// Label of the single window, from `tauri.conf.json`. The window has no
/// explicit `label` there, so Tauri names it `main`.
pub const MAIN_WINDOW: &str = "main";

/// Everything the lifecycle handlers need, registered with `app.manage()`.
///
/// Runtime facts are atomics rather than living behind the config mutex: they
/// are read on the event-loop thread on every window event, and a lock there
/// would put config I/O in the path of a close.
pub struct AppState {
    window_visible: AtomicBool,
    tray_available: AtomicBool,
    is_quitting: AtomicBool,
    config_path: PathBuf,
    config: Mutex<AppConfig>,
}

impl AppState {
    pub fn new(config_path: PathBuf, config: AppConfig, window_visible: bool) -> Self {
        Self {
            window_visible: AtomicBool::new(window_visible),
            // Assume no tray until one is built; the fallback is the safe side.
            tray_available: AtomicBool::new(false),
            is_quitting: AtomicBool::new(false),
            config_path,
            config: Mutex::new(config),
        }
    }

    /// The plain-value view [`policy::decide`] takes.
    pub fn snapshot(&self) -> LifecycleState {
        LifecycleState {
            window_visible: self.window_visible.load(Ordering::SeqCst),
            tray_available: self.tray_available.load(Ordering::SeqCst),
            is_quitting: self.is_quitting.load(Ordering::SeqCst),
        }
    }

    pub fn set_window_visible(&self, visible: bool) {
        self.window_visible.store(visible, Ordering::SeqCst);
    }

    pub fn window_visible(&self) -> bool {
        self.window_visible.load(Ordering::SeqCst)
    }

    pub fn set_tray_available(&self, available: bool) {
        self.tray_available.store(available, Ordering::SeqCst);
    }

    /// Marks a real quit as underway. Called from `RunEvent::ExitRequested`,
    /// which macOS fires *before* the windows get their close events.
    pub fn begin_quit(&self) {
        self.is_quitting.store(true, Ordering::SeqCst);
    }

    pub fn config(&self) -> AppConfig {
        *self.config.lock().expect("config mutex poisoned")
    }

    /// Mutate the config and write it out.
    ///
    /// A write failure is logged, not propagated: losing a preference is worse
    /// UX than a stale file, but neither is worth failing a window close over.
    pub fn update_config<F: FnOnce(&mut AppConfig)>(&self, edit: F) {
        let mut guard = self.config.lock().expect("config mutex poisoned");
        let before = *guard;
        edit(&mut guard);
        if *guard == before {
            return;
        }
        if let Err(err) = config::save(&self.config_path, &guard) {
            log::error!("could not persist config: {err}");
        }
    }

    pub fn config_path(&self) -> &PathBuf {
        &self.config_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn state(dir: &std::path::Path) -> AppState {
        AppState::new(config::config_path(dir), AppConfig::default(), true)
    }

    #[test]
    fn a_fresh_state_assumes_no_tray_until_one_is_registered() {
        let dir = tempdir().unwrap();
        let state = state(dir.path());

        assert!(!state.snapshot().tray_available);
        state.set_tray_available(true);
        assert!(state.snapshot().tray_available);
    }

    #[test]
    fn snapshot_reflects_visibility_and_quit_flags() {
        let dir = tempdir().unwrap();
        let state = state(dir.path());

        assert!(state.snapshot().window_visible);
        assert!(!state.snapshot().is_quitting);

        state.set_window_visible(false);
        state.begin_quit();

        let snapshot = state.snapshot();
        assert!(!snapshot.window_visible);
        assert!(snapshot.is_quitting);
    }

    #[test]
    fn updating_the_config_writes_it_to_disk() {
        let dir = tempdir().unwrap();
        let state = state(dir.path());

        state.update_config(|config| config.autostart_enabled = true);

        assert!(state.config().autostart_enabled);
        assert_eq!(
            config::try_load(state.config_path()).unwrap().unwrap(),
            AppConfig {
                autostart_enabled: true,
                ..AppConfig::default()
            }
        );
    }

    #[test]
    fn an_update_that_changes_nothing_does_not_touch_the_file() {
        let dir = tempdir().unwrap();
        let state = state(dir.path());

        state.update_config(|config| config.autostart_enabled = false);

        assert_eq!(
            config::try_load(state.config_path()).unwrap(),
            None,
            "a no-op update should not create the file"
        );
    }
}
