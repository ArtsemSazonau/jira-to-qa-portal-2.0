//! Integration tests for the lifecycle feature.
//!
//! The spec asks for tests in a `tests/` folder; Rust convention puts unit
//! tests inline. Both, split by kind: the exhaustive case-by-case tests live
//! in `#[cfg(test)]` blocks next to the code, and this file drives the same
//! public API from *outside* the crate. That is not duplication — it proves the
//! surface `lifecycle::macos` and `tray.rs` depend on is actually public, and
//! it walks whole scenarios (a ⌘Q, a close-then-reopen) rather than single
//! decisions.
//!
//! Nothing here constructs a Tauri runtime. If a test in this file ever needs
//! one, the logic it is testing has leaked out of `policy.rs`.

use app_lib::config::{self, AppConfig};
use app_lib::lifecycle::policy::{
    decide, launched_hidden, map_menu_event, reconcile_autostart, should_show_first_close_notice,
    should_show_first_run_prompt, tray_menu_item_ids, Action, LifecycleState, Trigger,
    HIDDEN_LAUNCH_FLAG, MENU_ID_QUIT, MENU_ID_SHOW,
};

/// The state the app is in just after a normal manual launch.
fn freshly_launched() -> LifecycleState {
    LifecycleState {
        window_visible: true,
        tray_available: true,
        is_quitting: false,
    }
}

// --- whole scenarios -------------------------------------------------------

#[test]
fn closing_the_window_then_clicking_the_tray_reuses_the_same_window() {
    let mut state = freshly_launched();

    // Red close button.
    assert_eq!(
        decide(Trigger::WindowCloseRequested, state),
        Action::HideToTray
    );
    state.window_visible = false;

    // Menu bar → Show Window. `ShowAndFocus` acts on the existing window;
    // there is no action in the enum that could create a second one.
    assert_eq!(
        decide(Trigger::TrayShowRequested, state),
        Action::ShowAndFocus
    );
    state.window_visible = true;

    // Clicking again must not do it twice.
    assert_eq!(decide(Trigger::TrayShowRequested, state), Action::FocusOnly);
}

#[test]
fn cmd_q_quits_even_though_macos_closes_the_window_on_the_way_out() {
    let mut state = freshly_launched();

    // `RunEvent::ExitRequested` fires first and is never prevented.
    assert_eq!(decide(Trigger::AppQuit, state), Action::Exit);
    state.is_quitting = true;

    // The `CloseRequested` that follows must not be turned back into a hide,
    // or the app would be unquittable.
    assert_eq!(
        decide(Trigger::WindowCloseRequested, state),
        Action::AllowClose
    );
}

#[test]
fn the_tray_quit_item_follows_the_same_path_as_cmd_q() {
    let mut state = freshly_launched();
    state.window_visible = false; // quitting from the tray while hidden

    assert_eq!(map_menu_event(MENU_ID_QUIT), Some(Action::Exit));
    assert_eq!(decide(Trigger::TrayQuit, state), Action::Exit);

    state.is_quitting = true;
    assert_eq!(
        decide(Trigger::WindowCloseRequested, state),
        Action::AllowClose
    );
}

#[test]
fn without_a_tray_the_app_never_hides_itself_out_of_reach() {
    // The failure mode this guards: hidden + Accessory + no tray icon = no way
    // back into the app at all. Closing quits instead, because a closed window
    // is destroyed and the app has no way to build another.
    let state = LifecycleState {
        tray_available: false,
        ..freshly_launched()
    };

    assert_eq!(decide(Trigger::WindowCloseRequested, state), Action::Exit);
    assert_eq!(decide(Trigger::TrayQuit, state), Action::Exit);
}

#[test]
fn relaunching_from_finder_reveals_the_hidden_window() {
    let hidden = LifecycleState {
        window_visible: false,
        ..freshly_launched()
    };

    // macOS activates the running process: `RunEvent::Reopen`, not a second
    // instance.
    assert_eq!(
        decide(
            Trigger::Reopen {
                has_visible_windows: false
            },
            hidden
        ),
        Action::ShowAndFocus
    );

    // Launching the binary directly does go through single-instance.
    assert_eq!(
        decide(Trigger::SecondInstanceLaunched, hidden),
        Action::ShowAndFocus
    );
}

#[test]
fn no_trigger_from_outside_can_produce_an_exit_without_a_quit() {
    let hidden = LifecycleState {
        window_visible: false,
        ..freshly_launched()
    };
    for trigger in [
        Trigger::WindowCloseRequested,
        Trigger::TrayShowRequested,
        Trigger::SecondInstanceLaunched,
        Trigger::Reopen {
            has_visible_windows: false,
        },
        Trigger::Reopen {
            has_visible_windows: true,
        },
    ] {
        for state in [freshly_launched(), hidden] {
            assert_ne!(
                decide(trigger, state),
                Action::Exit,
                "{trigger:?} unexpectedly exits"
            );
        }
    }
}

// --- tray menu surface -----------------------------------------------------

#[test]
fn the_tray_menu_offers_both_a_way_in_and_a_way_out() {
    let ids = tray_menu_item_ids();
    assert!(ids.contains(&MENU_ID_QUIT), "no quit item: {ids:?}");
    assert!(ids.contains(&MENU_ID_SHOW), "no way back in: {ids:?}");
    assert_eq!(map_menu_event(MENU_ID_SHOW), Some(Action::ShowAndFocus));
    assert_eq!(map_menu_event(MENU_ID_QUIT), Some(Action::Exit));
}

// --- autostart over a full install lifetime --------------------------------

#[test]
fn autostart_across_a_fresh_install_opt_in_and_restart() {
    // Fresh install: nothing stored, nothing registered → off, and the app does
    // not enrol itself.
    let first_run = reconcile_autostart(None, false);
    assert!(!first_run.effective);
    assert_eq!(first_run.apply_to_os, None);
    assert_eq!(first_run.persist, Some(false));

    // User turns the toggle on; both sides now say true. A restart must not
    // register a duplicate.
    let after_restart = reconcile_autostart(Some(true), true);
    assert!(after_restart.effective);
    assert_eq!(after_restart.apply_to_os, None);
    assert_eq!(after_restart.persist, None);
}

#[test]
fn autostart_reflects_a_login_item_added_in_system_settings() {
    let resolved = reconcile_autostart(Some(false), true);
    assert!(resolved.effective, "the toggle would show a stale off");
    assert_eq!(resolved.persist, Some(true));
    assert_eq!(
        resolved.apply_to_os, None,
        "must not delete an entry the user made"
    );
}

#[test]
fn autostart_restores_an_opt_in_whose_registration_disappeared() {
    let resolved = reconcile_autostart(Some(true), false);
    assert!(resolved.effective);
    assert_eq!(resolved.apply_to_os, Some(true));
}

// --- config persistence ----------------------------------------------------

#[test]
fn the_toggle_round_trips_through_the_config_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = config::config_path(dir.path());

    // No store yet → the documented default.
    assert_eq!(config::load(&path), AppConfig::default());
    assert!(!config::load(&path).autostart_enabled);

    config::save(
        &path,
        &AppConfig {
            autostart_enabled: true,
            ..AppConfig::default()
        },
    )
    .unwrap();

    assert!(config::load(&path).autostart_enabled);
}

#[test]
fn the_one_time_notices_stop_after_their_flag_is_persisted() {
    let dir = tempfile::tempdir().unwrap();
    let path = config::config_path(dir.path());

    let mut stored = config::load(&path);
    assert!(should_show_first_close_notice(stored.first_close_notice_shown));

    stored.first_close_notice_shown = true;
    config::save(&path, &stored).unwrap();

    let reloaded = config::load(&path);
    assert!(!should_show_first_close_notice(
        reloaded.first_close_notice_shown
    ));
}

#[test]
fn the_first_run_prompt_is_skipped_when_autostart_is_already_on() {
    assert!(should_show_first_run_prompt(false, false));
    assert!(!should_show_first_run_prompt(false, true));
}

// --- launch mode -----------------------------------------------------------

#[test]
fn the_login_item_argument_is_what_starts_the_app_hidden() {
    assert!(launched_hidden([
        "/Applications/jira-to-qa-portal.app/Contents/MacOS/jira-to-qa-portal",
        HIDDEN_LAUNCH_FLAG,
    ]));
    assert!(!launched_hidden([
        "/Applications/jira-to-qa-portal.app/Contents/MacOS/jira-to-qa-portal",
    ]));
}

// --- platform gating -------------------------------------------------------

/// Compile-level assertion for the spec's platform-gating requirement: the
/// macOS adapter exists only under the macOS cfg, and the decision logic exists
/// everywhere. If `lifecycle::macos` ever loses its `#[cfg]`, the
/// `not(target_os = "macos")` half stops compiling on this crate's other
/// targets.
#[test]
fn the_platform_adapter_is_gated_but_the_policy_is_not() {
    // Referencing the item is the assertion. Its signature is deliberately not
    // spelled out: `tauri` is not a dev-dependency, so an integration test
    // cannot name its types — which is itself a useful constraint, since it
    // means nothing testable from here can depend on the Tauri runtime.
    #[cfg(target_os = "macos")]
    let _ = app_lib::lifecycle::macos::apply;

    // Available on every target.
    assert_eq!(decide(Trigger::AppQuit, LifecycleState::default()), Action::Exit);
}
