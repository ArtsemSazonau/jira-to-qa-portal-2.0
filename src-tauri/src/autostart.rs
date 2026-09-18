//! Launch at login.
//!
//! Uses `tauri-plugin-autostart` with [`MacosLauncher::LaunchAgent`], which
//! writes `~/Library/LaunchAgents/<bundle-id>.plist`. That mechanism needs no
//! Automation permission prompt; the entry shows up under System Settings →
//! General → Login Items & Extensions → **Allow in the Background** (not *Open
//! at Login*, which is where the AppleScript launcher would put it).
//!
//! The registration carries [`HIDDEN_LAUNCH_FLAG`], so a login-item launch can
//! be told apart from a manual one and start without showing the window.

use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::lifecycle::policy::{self, HIDDEN_LAUNCH_FLAG};
use crate::lifecycle::AppState;

/// Read the real OS registration state.
///
/// Returns `None` when the plugin cannot answer, which is treated as "unknown"
/// rather than "not registered" — guessing `false` there would make the app
/// re-register on every launch.
pub fn os_registered(app: &AppHandle) -> Option<bool> {
    match app.autolaunch().is_enabled() {
        Ok(enabled) => Some(enabled),
        Err(err) => {
            log::error!("could not read the login-item registration: {err}");
            None
        }
    }
}

/// Register or unregister the login item.
pub fn set_os_registered(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };

    result.map_err(|err| {
        log::error!("could not set the login item to {enabled}: {err}");
        err.to_string()
    })?;

    log::info!("login item {}", if enabled { "registered" } else { "removed" });
    warn_if_dev_path();
    Ok(())
}

/// Set the toggle: change the OS registration, then persist the preference.
///
/// The preference is only written once the OS call has succeeded, so a failed
/// registration cannot leave the stored value claiming something that is not
/// true.
pub fn set_enabled(app: &AppHandle, enabled: bool) -> Result<(), String> {
    set_os_registered(app, enabled)?;
    app.state::<AppState>()
        .update_config(|config| config.autostart_enabled = enabled);
    Ok(())
}

/// Bring the stored preference and the OS registration back into agreement at
/// startup, and return what the UI toggle should show.
///
/// `stored` is `None` on a fresh install — see
/// [`policy::reconcile_autostart`] for which side wins in each case.
pub fn reconcile_at_startup(app: &AppHandle, stored: Option<bool>) -> bool {
    let Some(registered) = os_registered(app) else {
        // Cannot see the OS state; trust what was stored and change nothing.
        return stored.unwrap_or(false);
    };

    let resolved = policy::reconcile_autostart(stored, registered);

    if let Some(target) = resolved.apply_to_os {
        log::info!("re-asserting the login item registration as {target}");
        let _ = set_os_registered(app, target);
    }
    if let Some(value) = resolved.persist {
        app.state::<AppState>()
            .update_config(|config| config.autostart_enabled = value);
    }

    resolved.effective
}

/// The argument list the plugin registers with the login item.
pub fn launch_args() -> Vec<&'static str> {
    vec![HIDDEN_LAUNCH_FLAG]
}

/// Warn when the registered path points at a dev build.
///
/// A `target/debug` path in the plist survives `cargo clean` and then silently
/// fails at login. Making that loud in the log is the cheapest guard.
fn warn_if_dev_path() {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let path = exe.display().to_string();
    if path.contains("/target/debug/") || path.contains("/target/release/") {
        log::warn!(
            "registered a login item for a development binary at {path}; \
             it will break as soon as the build directory changes. \
             Test autostart against a bundle installed in /Applications."
        );
    }
}
