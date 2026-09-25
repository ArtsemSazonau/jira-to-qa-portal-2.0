//! Pure lifecycle decision logic. **No Tauri types may be imported here.**
//!
//! Everything that *decides* what should happen to the window lives in this
//! module as a function over plain values; everything that *touches* an
//! `AppHandle` or a `WebviewWindow` lives in [`super::macos`] and does no
//! branching. That split is what makes the behaviour testable without a live
//! window or `tauri::test::mock_app`.
//!
//! If you are tempted to add an `if` to the adapter, add it here instead and
//! give it a test.

/// Menu item id for the tray's "show the window" entry.
pub const MENU_ID_SHOW: &str = "show";
/// Menu item id for the tray's "quit" entry.
pub const MENU_ID_QUIT: &str = "quit";

/// Command-line flag the login-item registration passes, so a launch by macOS
/// at login can be told apart from the user double-clicking the app.
pub const HIDDEN_LAUNCH_FLAG: &str = "--hidden";

/// The tray menu, in display order. `None` is a separator.
///
/// Kept here rather than in `tray.rs` so the menu's shape is asserted by a unit
/// test without building a real `Menu`.
pub const TRAY_MENU_ITEMS: &[Option<(&str, &str)>] = &[
    Some((MENU_ID_SHOW, "Show Window")),
    None,
    Some((MENU_ID_QUIT, "Quit")),
];

/// Something happened that might change window visibility or end the process.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Trigger {
    /// The red close button or ⌘W.
    WindowCloseRequested,
    /// The tray menu's Quit item.
    TrayQuit,
    /// ⌘Q, the app menu's Quit, or a Quit AppleEvent — i.e. `RunEvent::ExitRequested`.
    AppQuit,
    /// The tray menu's Show Window item, or a click on the tray icon.
    TrayShowRequested,
    /// `tauri-plugin-single-instance` saw the binary launched again.
    SecondInstanceLaunched,
    /// macOS `applicationShouldHandleReopen` — Finder/Spotlight/Dock activation
    /// of an already-running app. Does *not* start a second process, so the
    /// single-instance callback never fires for it.
    Reopen { has_visible_windows: bool },
}

/// Runtime facts the decision depends on. Plain booleans on purpose.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct LifecycleState {
    pub window_visible: bool,
    /// False when tray creation failed. Without a tray there is no way back
    /// into an app that has hidden itself, so this flag turns hide-to-tray off.
    pub tray_available: bool,
    /// Set once a real quit is underway, so the close that macOS sends on the
    /// way out is not mistaken for the user clicking the close button.
    pub is_quitting: bool,
}

/// What the adapter should do. Executed by [`super::macos::apply`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    /// Hide the window and drop to `Accessory` — no Dock icon, no ⌘-Tab entry.
    HideToTray,
    /// Let the close go through as a normal window close.
    AllowClose,
    /// End the process.
    Exit,
    /// Return to `Regular`, show the window, focus it.
    ShowAndFocus,
    /// Window is already up; just bring it forward.
    FocusOnly,
    Nothing,
}

/// The single decision function. Every lifecycle event routes through here.
pub fn decide(trigger: Trigger, state: LifecycleState) -> Action {
    match trigger {
        Trigger::TrayQuit | Trigger::AppQuit => Action::Exit,

        Trigger::WindowCloseRequested => {
            if state.is_quitting {
                // macOS closes windows on its way out of ⌘Q. Letting this
                // through is what keeps the app quittable.
                Action::AllowClose
            } else if !state.tray_available {
                // Hiding now would strand the user: no tray icon to click and,
                // once Accessory, no Dock icon either.
                //
                // So the close goes through — but it also ends the process.
                // Tauri does not exit when the last window closes, and a closed
                // window is destroyed rather than hidden, so simply allowing
                // the close would leave a live process with no window and no
                // way to make another. Quitting is the honest single-window
                // behaviour, and ⌘Q reaches the same place.
                Action::Exit
            } else if state.window_visible {
                Action::HideToTray
            } else {
                Action::Nothing
            }
        }

        Trigger::TrayShowRequested | Trigger::SecondInstanceLaunched => {
            if state.window_visible {
                Action::FocusOnly
            } else {
                Action::ShowAndFocus
            }
        }

        // `has_visible_windows` is Cocoa's view, which can disagree with ours
        // after a hide; trust it only when our own state agrees.
        Trigger::Reopen {
            has_visible_windows,
        } => {
            if has_visible_windows && state.window_visible {
                Action::FocusOnly
            } else {
                Action::ShowAndFocus
            }
        }
    }
}

/// Map a tray menu item id to the action it performs.
///
/// Returns `None` for an id the menu does not define, so an unexpected event
/// is ignored rather than mis-handled.
pub fn map_menu_event(id: &str) -> Option<Action> {
    match id {
        MENU_ID_QUIT => Some(Action::Exit),
        MENU_ID_SHOW => Some(Action::ShowAndFocus),
        _ => None,
    }
}

/// The ids the tray menu is expected to contain, in order.
pub fn tray_menu_item_ids() -> Vec<&'static str> {
    TRAY_MENU_ITEMS
        .iter()
        .filter_map(|item| item.map(|(id, _)| id))
        .collect()
}

/// Which side of an autostart disagreement wins, and what to write where.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AutostartResolution {
    /// What the UI toggle should show.
    pub effective: bool,
    /// Rewrite the stored preference to this value. `None` leaves it alone.
    pub persist: Option<bool>,
    /// Change the OS registration to this value. `None` leaves it alone.
    pub apply_to_os: Option<bool>,
}

/// Reconcile the stored preference against what macOS actually has registered.
///
/// The OS is the source of truth for anything the user could have changed
/// behind the app's back (System Settings → Login Items), because the spec
/// requires the toggle to reflect reality rather than a stale stored value.
/// The one exception is a stored opt-in whose registration has vanished — a
/// LaunchAgent plist pointing at a path that no longer exists, say, after the
/// app was moved into `/Applications`. That is re-asserted, not silently
/// dropped.
///
/// `stored` is `None` on a fresh install, before any config file exists.
pub fn reconcile_autostart(stored: Option<bool>, os_registered: bool) -> AutostartResolution {
    match stored {
        // Fresh install: adopt whatever the OS says and write it down. With no
        // registration that is the documented default, off.
        None => AutostartResolution {
            effective: os_registered,
            persist: Some(os_registered),
            apply_to_os: None,
        },

        Some(stored) if stored == os_registered => AutostartResolution {
            effective: stored,
            persist: None,
            apply_to_os: None,
        },

        // Registered behind our back (e.g. added manually in System Settings).
        Some(false) => AutostartResolution {
            effective: true,
            persist: Some(true),
            apply_to_os: None,
        },

        // Opted in, but the registration is gone. Put it back.
        Some(true) => AutostartResolution {
            effective: true,
            persist: None,
            apply_to_os: Some(true),
        },
    }
}

/// The one-time "the app is still running in the menu bar" notice.
pub fn should_show_first_close_notice(already_shown: bool) -> bool {
    !already_shown
}

/// The one-time launch-at-login offer.
///
/// Suppressed when autostart is already on: there is nothing to offer, and on a
/// login-item launch the notification would fire every single login.
pub fn should_show_first_run_prompt(already_shown: bool, autostart_enabled: bool) -> bool {
    !already_shown && !autostart_enabled
}

/// Whether this process was started by the login item rather than by the user.
///
/// Detected from the argument the LaunchAgent registration adds, so a manual
/// launch (which has no such argument) still opens the window.
pub fn launched_hidden<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == HIDDEN_LAUNCH_FLAG)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn visible() -> LifecycleState {
        LifecycleState {
            window_visible: true,
            tray_available: true,
            is_quitting: false,
        }
    }

    fn hidden() -> LifecycleState {
        LifecycleState {
            window_visible: false,
            ..visible()
        }
    }

    // --- window close handler ------------------------------------------------

    #[test]
    fn close_on_a_visible_window_hides_it() {
        assert_eq!(
            decide(Trigger::WindowCloseRequested, visible()),
            Action::HideToTray
        );
    }

    #[test]
    fn close_while_quitting_is_allowed_through() {
        // ⌘Q reaches ExitRequested first, which sets is_quitting; the close macOS
        // then sends must not be turned back into a hide, or the app never quits.
        let state = LifecycleState {
            is_quitting: true,
            ..visible()
        };
        assert_eq!(
            decide(Trigger::WindowCloseRequested, state),
            Action::AllowClose
        );
    }

    #[test]
    fn close_without_a_tray_quits_rather_than_hiding() {
        let state = LifecycleState {
            tray_available: false,
            ..visible()
        };
        assert_eq!(decide(Trigger::WindowCloseRequested, state), Action::Exit);
    }

    #[test]
    fn a_tray_failure_never_produces_a_hide() {
        // The failure this guards: hidden + Accessory + no tray icon leaves no
        // way back into the app at all.
        for window_visible in [true, false] {
            for is_quitting in [true, false] {
                let state = LifecycleState {
                    tray_available: false,
                    window_visible,
                    is_quitting,
                };
                assert_ne!(
                    decide(Trigger::WindowCloseRequested, state),
                    Action::HideToTray,
                    "{state:?}"
                );
            }
        }
    }

    #[test]
    fn close_on_an_already_hidden_window_does_nothing() {
        assert_eq!(decide(Trigger::WindowCloseRequested, hidden()), Action::Nothing);
    }

    #[test]
    fn quit_triggers_exit_regardless_of_window_state() {
        for state in [visible(), hidden()] {
            assert_eq!(decide(Trigger::TrayQuit, state), Action::Exit);
            assert_eq!(decide(Trigger::AppQuit, state), Action::Exit);
        }
    }

    #[test]
    fn quit_exits_even_when_the_tray_is_unavailable() {
        let state = LifecycleState {
            tray_available: false,
            ..visible()
        };
        assert_eq!(decide(Trigger::TrayQuit, state), Action::Exit);
    }

    // --- activation / show logic --------------------------------------------

    #[test]
    fn showing_a_hidden_window_resolves_to_show_and_focus() {
        assert_eq!(
            decide(Trigger::TrayShowRequested, hidden()),
            Action::ShowAndFocus
        );
    }

    #[test]
    fn showing_an_already_visible_window_resolves_to_focus_only() {
        assert_eq!(decide(Trigger::TrayShowRequested, visible()), Action::FocusOnly);
    }

    #[test]
    fn repeated_show_requests_never_ask_for_more_than_a_focus() {
        // Guards the "double show" edge case: no action in the sequence creates
        // a window, and the second one degrades to a focus.
        assert_eq!(
            decide(Trigger::TrayShowRequested, hidden()),
            Action::ShowAndFocus
        );
        assert_eq!(decide(Trigger::TrayShowRequested, visible()), Action::FocusOnly);
        assert_eq!(
            decide(Trigger::SecondInstanceLaunched, visible()),
            Action::FocusOnly
        );
    }

    #[test]
    fn a_second_instance_reveals_the_hidden_window() {
        assert_eq!(
            decide(Trigger::SecondInstanceLaunched, hidden()),
            Action::ShowAndFocus
        );
    }

    #[test]
    fn reopen_shows_the_window_when_it_is_hidden() {
        let trigger = Trigger::Reopen {
            has_visible_windows: false,
        };
        assert_eq!(decide(trigger, hidden()), Action::ShowAndFocus);
    }

    #[test]
    fn reopen_focuses_when_the_window_is_already_up() {
        let trigger = Trigger::Reopen {
            has_visible_windows: true,
        };
        assert_eq!(decide(trigger, visible()), Action::FocusOnly);
    }

    #[test]
    fn reopen_shows_when_cocoa_and_our_own_state_disagree() {
        // Cocoa can still count the hidden window as visible; our state wins.
        let trigger = Trigger::Reopen {
            has_visible_windows: true,
        };
        assert_eq!(decide(trigger, hidden()), Action::ShowAndFocus);
    }

    // --- tray menu -----------------------------------------------------------

    #[test]
    fn tray_menu_contains_exactly_the_expected_ids() {
        assert_eq!(tray_menu_item_ids(), vec![MENU_ID_SHOW, MENU_ID_QUIT]);
    }

    #[test]
    fn the_quit_menu_id_maps_to_the_app_exit_action() {
        assert_eq!(map_menu_event(MENU_ID_QUIT), Some(Action::Exit));
    }

    #[test]
    fn the_show_menu_id_maps_to_the_show_action() {
        assert_eq!(map_menu_event(MENU_ID_SHOW), Some(Action::ShowAndFocus));
    }

    #[test]
    fn an_unknown_menu_id_maps_to_nothing() {
        assert_eq!(map_menu_event("run-now"), None);
    }

    #[test]
    fn every_menu_label_is_non_empty() {
        for (id, label) in TRAY_MENU_ITEMS.iter().flatten() {
            assert!(!label.is_empty(), "menu item {id} has no label");
        }
    }

    // --- autostart reconciliation -------------------------------------------

    #[test]
    fn a_fresh_install_with_no_registration_is_off() {
        let resolved = reconcile_autostart(None, false);
        assert_eq!(
            resolved,
            AutostartResolution {
                effective: false,
                persist: Some(false),
                apply_to_os: None,
            }
        );
    }

    #[test]
    fn a_fresh_install_adopts_an_existing_registration() {
        let resolved = reconcile_autostart(None, true);
        assert!(resolved.effective);
        assert_eq!(resolved.persist, Some(true));
        assert_eq!(resolved.apply_to_os, None);
    }

    #[test]
    fn agreement_needs_no_correction_in_either_direction() {
        for value in [true, false] {
            let resolved = reconcile_autostart(Some(value), value);
            assert_eq!(
                resolved,
                AutostartResolution {
                    effective: value,
                    persist: None,
                    apply_to_os: None,
                },
                "stored and os both {value}"
            );
        }
    }

    #[test]
    fn registered_behind_our_back_wins_over_a_stored_off() {
        // Checklist 14: the user adds the app in System Settings while the
        // toggle is off. The toggle must not keep claiming "off".
        let resolved = reconcile_autostart(Some(false), true);
        assert!(resolved.effective);
        assert_eq!(resolved.persist, Some(true));
        assert_eq!(resolved.apply_to_os, None, "must not unregister the user's own entry");
    }

    #[test]
    fn a_stored_opt_in_with_a_vanished_registration_is_re_asserted() {
        let resolved = reconcile_autostart(Some(true), false);
        assert!(resolved.effective);
        assert_eq!(resolved.apply_to_os, Some(true));
        assert_eq!(resolved.persist, None, "the stored value is already correct");
    }

    #[test]
    fn reconciliation_never_asks_to_register_what_is_already_registered() {
        for stored in [None, Some(true), Some(false)] {
            let resolved = reconcile_autostart(stored, true);
            assert_eq!(
                resolved.apply_to_os, None,
                "stored {stored:?} would double-register"
            );
        }
    }

    // --- one-time notices ----------------------------------------------------

    #[test]
    fn the_first_close_notice_shows_once() {
        assert!(should_show_first_close_notice(false));
        assert!(!should_show_first_close_notice(true));
    }

    #[test]
    fn the_first_run_prompt_shows_once_and_only_when_autostart_is_off() {
        assert!(should_show_first_run_prompt(false, false));
        assert!(!should_show_first_run_prompt(true, false));
        assert!(!should_show_first_run_prompt(false, true));
        assert!(!should_show_first_run_prompt(true, true));
    }

    // --- launch mode ---------------------------------------------------------

    #[test]
    fn the_hidden_flag_marks_a_login_item_launch() {
        assert!(launched_hidden(["/Applications/app", HIDDEN_LAUNCH_FLAG]));
    }

    #[test]
    fn a_manual_launch_has_no_hidden_flag() {
        assert!(!launched_hidden(["/Applications/app"]));
        assert!(!launched_hidden(Vec::<String>::new()));
    }

    #[test]
    fn a_similar_looking_argument_does_not_count() {
        assert!(!launched_hidden(["/Applications/app", "--hidden-extra"]));
        assert!(!launched_hidden(["/Applications/app", "hidden"]));
    }
}
