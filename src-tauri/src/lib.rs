//! Builder wiring only. Decisions live in [`lifecycle::policy`], platform calls
//! in [`lifecycle::macos`].

pub mod config;
pub mod ipc_commands;
pub mod lifecycle;

#[cfg(desktop)]
pub mod autostart;
#[cfg(desktop)]
pub mod notify;
#[cfg(target_os = "macos")]
pub mod tray;

use lifecycle::policy::{self, decide, Trigger};
use lifecycle::{AppState, MAIN_WINDOW};
use tauri::{Manager, RunEvent, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            // Must be registered first, per the plugin's docs: it has to claim
            // the single-instance lock before anything else touches the
            // runtime.
            //
            // It covers launching the binary directly, which is what the dev
            // loop does. It does *not* cover relaunching an installed app from
            // Finder or Spotlight — macOS activates the running process rather
            // than starting a second one, which surfaces as `RunEvent::Reopen`
            // below.
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let Some(state) = snapshot(app) else { return };
                apply(app, decide(Trigger::SecondInstanceLaunched, state));
            }))
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(autostart::launch_args()),
            ));
    }

    builder
        .invoke_handler(tauri::generate_handler![
            ipc_commands::get_autostart_enabled,
            ipc_commands::set_autostart_enabled,
            ipc_commands::show_main_window,
            ipc_commands::hide_main_window,
            ipc_commands::get_tray_available,
        ])
        .setup(setup)
        .on_window_event(on_window_event)
        .build(tauri::generate_context!())
        .expect("error while building the tauri application")
        .run(on_run_event);
}

fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }

    let handle = app.handle().clone();

    // Config first: everything below reads it. `try_load` distinguishes "no
    // file yet" (fresh install) from "file exists" — autostart reconciliation
    // needs that difference. A corrupt file is logged and treated as fresh.
    let config_path = config::config_path(&handle.path().app_config_dir()?);
    let stored = match config::try_load(&config_path) {
        Ok(stored) => stored,
        Err(err) => {
            log::warn!("{err}; starting from defaults");
            None
        }
    };

    // A login-item launch carries `--hidden`; a manual launch does not. The
    // window is configured `visible: true`, so this is the only thing that
    // keeps a login start quiet.
    let start_hidden = policy::launched_hidden(std::env::args());

    app.manage(AppState::new(
        config_path,
        stored.unwrap_or_default(),
        !start_hidden,
    ));

    #[cfg(target_os = "macos")]
    {
        // Before anything can hide the window: `decide` needs to know whether
        // there is a tray to hide into.
        tray::install(&handle);

        if start_hidden {
            log::info!("launched by the login item; starting hidden");
            lifecycle::macos::start_hidden(&handle);
        }
    }

    #[cfg(desktop)]
    {
        let autostart_enabled =
            autostart::reconcile_at_startup(&handle, stored.map(|config| config.autostart_enabled));

        let already_prompted = stored.is_some_and(|config| config.first_run_prompt_shown);
        if policy::should_show_first_run_prompt(already_prompted, autostart_enabled) {
            notify::first_run_autostart_prompt(&handle);
            handle
                .state::<AppState>()
                .update_config(|config| config.first_run_prompt_shown = true);
        }
    }

    Ok(())
}

/// Close button and ⌘W. The only place `prevent_close` is called.
fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    if window.label() != MAIN_WINDOW {
        return;
    }

    let app = window.app_handle();
    let Some(state) = snapshot(app) else { return };
    let action = decide(Trigger::WindowCloseRequested, state);

    // `AllowClose` and `Nothing` mean "do not interfere" — during a ⌘Q, or when
    // there is no tray to hide into. Only a hide replaces the close.
    if matches!(action, policy::Action::HideToTray) {
        api.prevent_close();
    }
    apply(app, action);
}

fn on_run_event(app: &tauri::AppHandle, event: RunEvent) {
    match event {
        // ⌘Q, the app menu's Quit, a Quit AppleEvent, and the tray's `exit(0)`
        // all land here — and on macOS this fires *before* the windows get
        // their close events. Recording the quit here is what stops
        // `on_window_event` from turning the shutdown into a hide.
        //
        // Never prevented: an app that cannot be quit is worse than one that
        // quits mid-task. A sync-in-progress check is the intended future hook.
        RunEvent::ExitRequested { .. } => {
            log::info!("exit requested; shutting down");
            if let Some(state) = app.try_state::<AppState>() {
                state.begin_quit();
            }
        }

        // Finder/Spotlight/Dock activation of a process that is already
        // running. The single-instance plugin never sees this, because macOS
        // does not start a second process.
        #[cfg(target_os = "macos")]
        RunEvent::Reopen {
            has_visible_windows,
            ..
        } => {
            let Some(state) = snapshot(app) else { return };
            apply(
                app,
                decide(
                    Trigger::Reopen {
                        has_visible_windows,
                    },
                    state,
                ),
            );
        }

        _ => {}
    }
}

/// Read the lifecycle state, tolerating the window between the runtime coming
/// up and `setup` registering it. An event that arrives in that gap is dropped
/// rather than panicking on an unmanaged state.
fn snapshot(app: &tauri::AppHandle) -> Option<policy::LifecycleState> {
    match app.try_state::<AppState>() {
        Some(state) => Some(state.snapshot()),
        None => {
            log::warn!("lifecycle event before setup completed; ignoring");
            None
        }
    }
}

/// Execute a decided action on the current platform.
#[allow(unused_variables)]
fn apply(app: &tauri::AppHandle, action: policy::Action) {
    #[cfg(target_os = "macos")]
    lifecycle::macos::apply(app, action);

    // No adapter for the other platforms yet, but `Exit` still has to work so
    // the tray's Quit item is not a dead button on a future Windows build.
    #[cfg(not(target_os = "macos"))]
    if matches!(action, policy::Action::Exit) {
        app.exit(0);
    }
}
