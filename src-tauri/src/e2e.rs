//! Test-only IPC commands. Compiled only with `--features e2e` (`npm run build:e2e`), so neither a
//! release build nor `tauri dev` contains them; `npm run test:release` checks the release binary for
//! their names.
//!
//! Every test-only command lives here, is named `e2e_*`, and is registered only in the test build's
//! `invoke_handler` list in `lib.rs`. The IPC contract test enforces both.

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::autostart;
use crate::config::AppConfig;
use crate::lifecycle::{AppState, MAIN_WINDOW};

/// What the core believes, from [`AppState`] — the inputs `policy::decide` sees.
#[derive(Debug, Serialize)]
pub struct CoreBelief {
    pub window_visible: bool,
    pub tray_available: bool,
    pub is_quitting: bool,
}

/// What the platform reports, asked independently of [`AppState`].
#[derive(Debug, Serialize)]
pub struct PlatformReality {
    /// `None` when the window does not exist or cannot answer.
    pub window_visible: Option<bool>,
    pub tray_exists: bool,
}

/// The core's state, for a test to assert rather than infer from pixels.
///
/// Belief and reality are reported side by side, so a test can fail on a divergence between them —
/// the core thinking the window is hidden while it is on screen, say.
#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub pid: u32,
    pub core: CoreBelief,
    pub platform: PlatformReality,
    pub config: AppConfig,
    pub config_path: String,
    /// The OS login-item registration; `None` when the plugin cannot answer.
    pub login_item_registered: Option<bool>,
}

#[tauri::command]
pub fn e2e_snapshot(app: AppHandle, state: State<'_, AppState>) -> Snapshot {
    let belief = state.snapshot();

    #[cfg(target_os = "macos")]
    let tray_exists = app.tray_by_id(crate::tray::TRAY_ID).is_some();
    #[cfg(not(target_os = "macos"))]
    let tray_exists = false;

    Snapshot {
        pid: std::process::id(),
        core: CoreBelief {
            window_visible: belief.window_visible,
            tray_available: belief.tray_available,
            is_quitting: belief.is_quitting,
        },
        platform: PlatformReality {
            window_visible: app
                .get_webview_window(MAIN_WINDOW)
                .and_then(|window| window.is_visible().ok()),
            tray_exists,
        },
        config: state.config(),
        config_path: state.config_path().display().to_string(),
        login_item_registered: autostart::os_registered(&app),
    }
}
