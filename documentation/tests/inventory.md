# Test inventory

**Generated** by `npm run test:catalog -- --write` from the test sources. Do not edit by hand;
`npm run test:catalog` fails when this file is out of date.

Every automated test, the file it lives in, and the [catalog](catalog.md) case it carries. A test
with no case is a helper-level check that does not map to a catalogued behaviour.

| Layer | Tests | Carrying a case |
|---|---|---|
| unit (Rust) | 56 | 54 |
| integration (Rust) | 18 | 18 |
| component (vitest) | 109 | 108 |
| flow (Playwright) | 17 | 17 |
| e2e (WebdriverIO) | 43 | 43 |
| release smoke (shell) | 7 | 6 |
| **Total** | **250** | **246** |

## `src-tauri/src/config.rs`

unit (Rust).

| Test | Cases |
|---|---|
| `default_is_all_off` | CONF-009 |
| `reading_with_no_store_present_returns_the_default` | CONF-004 |
| `writing_then_reading_returns_the_same_value` | CONF-002 |
| `save_creates_missing_parent_directories` | CONF-004 |
| `save_leaves_no_temp_file_behind` | CONF-006 |
| `a_corrupt_file_is_an_error_for_try_load_but_defaults_for_load` | CONF-003 |
| `unknown_and_missing_keys_do_not_break_the_read` | CONF-005 |
| `saving_into_an_unwritable_directory_fails_cleanly` | CONF-007 |
| `config_path_appends_the_file_name` | — |

## `src-tauri/src/lifecycle/mod.rs`

unit (Rust).

| Test | Cases |
|---|---|
| `a_fresh_state_assumes_no_tray_until_one_is_registered` | TRAY-010 |
| `snapshot_reflects_visibility_and_quit_flags` | — |
| `updating_the_config_writes_it_to_disk` | CONF-002 |
| `an_update_that_changes_nothing_does_not_touch_the_file` | CONF-008 |

## `src-tauri/src/lifecycle/policy.rs`

unit (Rust).

| Test | Cases |
|---|---|
| `close_on_a_visible_window_hides_it` | HIDE-001 |
| `close_while_quitting_is_allowed_through` | QUIT-001 |
| `close_without_a_tray_quits_rather_than_hiding` | TRAY-010 |
| `a_tray_failure_never_produces_a_hide` | TRAY-010 |
| `close_on_an_already_hidden_window_does_nothing` | HIDE-012 |
| `quit_triggers_exit_regardless_of_window_state` | QUIT-003, QUIT-004 |
| `quit_exits_even_when_the_tray_is_unavailable` | QUIT-010 |
| `the_hide_button_hides_a_visible_window` | HIDE-011 |
| `the_hide_button_does_nothing_when_already_hidden` | HIDE-011 |
| `the_hide_button_never_quits_even_without_a_tray` | HIDE-011 |
| `the_hide_button_does_nothing_while_quitting` | HIDE-011 |
| `showing_a_hidden_window_resolves_to_show_and_focus` | TRAY-005 |
| `showing_an_already_visible_window_resolves_to_focus_only` | TRAY-004 |
| `repeated_show_requests_never_ask_for_more_than_a_focus` | HIDE-009 |
| `a_second_instance_reveals_the_hidden_window` | INST-005 |
| `reopen_shows_the_window_when_it_is_hidden` | INST-001 |
| `reopen_focuses_when_the_window_is_already_up` | INST-003 |
| `reopen_shows_when_cocoa_and_our_own_state_disagree` | INST-007 |
| `tray_menu_contains_exactly_the_expected_ids` | TRAY-002 |
| `the_quit_menu_id_maps_to_the_app_exit_action` | QUIT-003 |
| `the_show_menu_id_maps_to_the_show_action` | TRAY-005 |
| `an_unknown_menu_id_maps_to_nothing` | TRAY-011 |
| `every_menu_label_is_non_empty` | TRAY-002 |
| `a_fresh_install_with_no_registration_is_off` | LOGIN-001 |
| `a_fresh_install_adopts_an_existing_registration` | LOGIN-016 |
| `agreement_needs_no_correction_in_either_direction` | LOGIN-006 |
| `registered_behind_our_back_wins_over_a_stored_off` | LOGIN-012 |
| `a_stored_opt_in_with_a_vanished_registration_is_re_asserted` | LOGIN-013, SYS-003 |
| `reconciliation_never_asks_to_register_what_is_already_registered` | LOGIN-006 |
| `the_first_close_notice_shows_once` | NOTE-002, NOTE-003 |
| `the_first_run_prompt_shows_once_and_only_when_autostart_is_off` | NOTE-001, NOTE-004, NOTE-006 |
| `the_hidden_flag_marks_a_login_item_launch` | LOGIN-008 |
| `a_manual_launch_has_no_hidden_flag` | LOGIN-015 |
| `a_similar_looking_argument_does_not_count` | LOGIN-015 |
| `without_a_tray_nothing_hides` | TRAY-010 |
| `while_quitting_a_close_is_let_through` | QUIT-001 |
| `a_quit_trigger_always_exits` | QUIT-010 |
| `only_a_quit_or_a_tray_less_close_exits` | QUIT-011 |
| `a_show_request_never_does_more_than_show_and_focus` | HIDE-009 |
| `the_hide_button_only_ever_hides_or_does_nothing` | HIDE-011 |

## `src-tauri/src/notify.rs`

unit (Rust).

| Test | Cases |
|---|---|
| `every_notice_has_a_title_and_a_body` | NOTE-009 |
| `the_close_notice_says_where_the_app_went_and_how_to_quit` | NOTE-009 |
| `the_first_run_prompt_names_the_setting_it_offers` | NOTE-009 |

## `src-tauri/tests/capabilities.rs`

integration (Rust).

| Test | Cases |
|---|---|
| `the_default_capability_grants_only_core_default` | SYS-005 |
| `the_default_capability_applies_only_to_the_main_window` | SYS-005 |
| `no_other_capability_file_exists` | SYS-005 |

## `src-tauri/tests/lifecycle_policy.rs`

integration (Rust).

| Test | Cases |
|---|---|
| `closing_the_window_then_clicking_the_tray_reuses_the_same_window` | HIDE-006 |
| `cmd_q_quits_even_though_macos_closes_the_window_on_the_way_out` | QUIT-001 |
| `the_tray_quit_item_follows_the_same_path_as_cmd_q` | QUIT-004 |
| `without_a_tray_the_app_never_hides_itself_out_of_reach` | TRAY-010 |
| `relaunching_from_finder_reveals_the_hidden_window` | INST-001, INST-005 |
| `no_trigger_from_outside_can_produce_an_exit_without_a_quit` | QUIT-011 |
| `the_tray_menu_offers_both_a_way_in_and_a_way_out` | TRAY-002 |
| `autostart_across_a_fresh_install_opt_in_and_restart` | LOGIN-001, LOGIN-006 |
| `autostart_reflects_a_login_item_added_in_system_settings` | LOGIN-012 |
| `autostart_restores_an_opt_in_whose_registration_disappeared` | LOGIN-013 |
| `the_toggle_round_trips_through_the_config_file` | CONF-002 |
| `the_one_time_notices_stop_after_their_flag_is_persisted` | NOTE-003 |
| `the_first_run_prompt_is_skipped_when_autostart_is_already_on` | NOTE-006 |
| `the_login_item_argument_is_what_starts_the_app_hidden` | LOGIN-008 |
| `the_platform_adapter_is_gated_but_the_policy_is_not` | SYS-006 |

## `ui/src/App.a11y.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[UI-012] has no axe violations once loaded` | UI-012 |
| `[UI-012] has no axe violations in the tray-unavailable and no-backend states` | UI-012 |
| `[TAB-012] has no axe violations with each tab selected` | TAB-012 |
| `[UI-006] exposes the toggle as a switch named "Launch at login" with its state` | UI-006 |

## `ui/src/App.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[LOGIN-001, UI-002] renders off when the app is not registered` | LOGIN-001, UI-002 |
| `[LOGIN-012] reflects the real registration state rather than a default` | LOGIN-012 |
| `[LOGIN-002] registers the login item when switched on` | LOGIN-002 |
| `[LOGIN-010] removes the login item when switched off` | LOGIN-010 |
| `[UI-009] reverts and explains when registration fails` | UI-009 |
| `[UI-002] is disabled until the backend has answered` | UI-002 |
| `[UI-007] explains itself when there is no backend at all` | UI-007 |
| `[UI-010] stays disabled while a save is in flight` | UI-010 |
| `[UI-011] clears a previous error after a successful toggle` | UI-011 |
| `[TAB-001] offers Settings, QA Portal sync, Timesheet and GitHub jobs, in that order` | TAB-001 |
| `[TAB-002] opens on Settings, with launch at login visible without a click` | TAB-002 |
| `[TAB-003] shows the selected tab\` | TAB-003 |
| `[TAB-009] sends nothing to the core when switching tabs` | TAB-009 |
| `[TAB-010] keeps the heading and the hide footer on every tab` | TAB-010 |
| `[TAB-008] keeps launch at login working after visiting another tab` | TAB-008 |
| `[UI-001] offers a hide button and explains how to quit` | UI-001 |
| `[HIDE-008] asks the backend to hide the window when the hide button is clicked` | HIDE-008 |
| `[TRAY-010] warns that closing quits when the tray could not be created` | TRAY-010 |

## `ui/src/components/NotWired.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[SET-007] marks a section in words, not only by colour` | SET-007 |
| `[SET-007] shows a sample-data notice as visible text` | SET-007 |
| `[SET-008] renders a pending action as a disabled button described by its reason` | SET-008 |

## `ui/src/components/Tabs.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[TAB-006] exposes a labelled tab list, tabs with their selected state, and panels labelled by their tab` | TAB-006 |
| `[TAB-003] shows only the selected panel, and a click selects another` | TAB-003 |
| `[TAB-004] moves with the arrow keys, wrapping at both ends, and focuses what it selects` | TAB-004 |
| `[TAB-004] jumps to the first and last tab with Home and End` | TAB-004 |
| `[TAB-004] ignores other keys and keeps only the selected tab in the Tab order` | TAB-004 |
| `[TAB-008] keeps hidden panels mounted, so typed input survives a switch` | TAB-008 |

## `ui/src/domain/platforms.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[GH-001] lists the seven platforms in display order` | GH-001 |
| `[GH-001] gives each platform a unique id` | GH-001 |

## `ui/src/lib/ipc.contract.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[IPC-003] has exactly one production list and one test-build list` | IPC-003 |
| `[IPC-003] registers in Rust exactly the commands the UI invokes` | IPC-003 |
| `[IPC-003] registers each command once` | IPC-003 |
| `[IPC-004] the test build registers the production list plus e2e_* commands only` | IPC-004 |
| `reads both sides the way the source writes them` | — |

## `ui/src/lib/ipc.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[IPC-001] reads the autostart state with no arguments` | IPC-001 |
| `[IPC-001] passes the new value when setting autostart` | IPC-001 |
| `[IPC-002] propagates a rejection from the backend` | IPC-002 |
| `[IPC-001] reads tray availability` | IPC-001 |
| `[IPC-001] calls the window commands by their registered names` | IPC-001 |

## `ui/src/views/format.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[SYNC-004] shows a date-time as weekday, day, month and 24-hour time` | SYNC-004 |
| `[TIME-002] lists Monday to Friday of a week, across a month end` | TIME-002 |

## `ui/src/views/github/selection.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[GH-002] starts with every checkbox off, no devices and Release off` | GH-002 |
| `[GH-003] keeps Prod env and Dev mode independent of each other` | GH-003 |
| `[GH-004] keeps a platform\` | GH-004 |
| `[GH-005] ignores Prod env, Dev mode and device changes while Run is off` | GH-005 |
| `[GH-006] toggles any number of devices, from none to all, and deselects on a second click` | GH-006 |
| `[GH-006] leaves other platforms untouched when one changes` | GH-006 |
| `[GH-007] includes only Run-on platforms and ignores the kept values of the others` | GH-007 |
| `[GH-007] dispatches a Run-on platform with no devices as build only` | GH-007 |
| `[GH-007] lists jobs in platform order, whatever order they were chosen in` | GH-007 |
| `[GH-008] reads off, mixed and on for Run` | GH-008 |
| `[GH-008] checks every platform from off or mixed, and unchecks them all from on` | GH-008 |
| `[GH-009] Prod env and Dev mode All count and change only Run-on platforms` | GH-009 |
| `[GH-009] a kept Prod env value on a Run-off platform does not count towards All` | GH-009 |
| `[GH-009] Prod env and Dev mode All are disabled when no platform runs` | GH-009 |
| `[GH-010] resets everything, Release included, when the branch changes` | GH-010 |
| `[GH-010] remembers nothing per branch: going back gives the defaults` | GH-010 |
| `[GH-012] Release changes no other value` | GH-012 |
| `[GH-011] counts jobs and devices across Run-on platforms` | GH-011 |
| `[GH-011] uses singular forms, says when nothing deploys, and when nothing is selected` | GH-011 |

## `ui/src/views/GitHubJobsView.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[GH-013] says branches and devices are sample data and that starting jobs is not wired yet` | GH-013 |
| `[GH-014] starts on the default branch with every control off and Run the only enabled column` | GH-014 |
| `[GH-015] disables a platform\` | GH-015 |
| `[GH-016] shows a mixed All, and Prod env All changes only Run-on platforms` | GH-016 |
| `[GH-017] marks a selected device with a check and a pressed state, any number of them` | GH-017 |
| `[GH-018] resets everything, Release included, when the branch changes, and restores nothing on return` | GH-018 |
| `[GH-019] describes Release as applying to all platforms, and checking it changes nothing else` | GH-019 |
| `[GH-020] labels the Run button with jobs and devices, and keeps it disabled with its reason` | GH-020 |
| `[GH-021] keeps the selection while the user visits another tab` | GH-021 |
| `[GH-022] has no axe violations, with nothing selected and with a selection` | GH-022 |

## `ui/src/views/SettingsView.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[SET-001] shows Jira, QA Portal, Sync schedule, Timesheet and GitHub, each with its fields` | SET-001 |
| `[SET-002] accepts input in every preview field` | SET-002 |
| `[SET-004] masks every secret and offers no autofill for it` | SET-004 |
| `[SET-006] offers the submission weekday, time and mode, defaulting to Friday 17:00, automatic` | SET-006 |
| `[SET-005] starts from the sample projects, and a new row has no name and 8 hours` | SET-005 |
| `[SET-005] accepts 0 to 24 hours in steps of 0.5, more than 8 without a warning` | SET-005 |
| `[SET-005] removes rows down to none, and Add project still works` | SET-005 |
| `[SET-005] keeps each remaining row\` | SET-005 |
| `[SET-007] badges every preview section, and not the launch-at-login row` | SET-007 |
| `[SET-008] disables Test connection and says the connection is not wired yet` | SET-008 |
| `[SET-009] has no axe violations, with projects and without` | SET-009 |
| `[SET-003] sends nothing to the core while the user fills in credentials` | SET-003 |
| `[TAB-008] keeps a typed value after switching to another tab and back` | TAB-008 |

## `ui/src/views/SyncView.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[SYNC-003] says it shows sample data and that the sync is not wired yet` | SYNC-003 |
| `[SYNC-005] shows the status, the last sync with its outcome, and the next sync` | SYNC-005 |
| `[SYNC-005] says Never and Not scheduled when there was no sync and none is planned` | SYNC-005 |
| `[SYNC-006] shows Run now disabled with its reason, and a Dry run option` | SYNC-006 |
| `[SYNC-007] lists the five steps in order, each with its outcome in words` | SYNC-007 |
| `[SYNC-001] has a row per platform in platform order, then a Total row` | SYNC-001 |
| `[SYNC-001] totals each row, each column and the whole table` | SYNC-001 |
| `[SYNC-002] shows a signed delta where a count moved, and none where it did not` | SYNC-002 |
| `[SYNC-008] warns how many tickets were skipped for an unknown platform` | SYNC-008 |
| `[SYNC-009] shows the report read-only, with a period choice and Generate and Copy disabled` | SYNC-009 |
| `[SYNC-010] has no axe violations` | SYNC-010 |

## `ui/src/views/TimesheetView.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[TIME-003] says it shows sample data and that time entry is not wired yet` | TIME-003 |
| `[TIME-002] heads the week with its dates and has a column per weekday` | TIME-002 |
| `[TIME-001] applies 8 and 0.5 hours a day: projects total 40 and 2.5, each day 8.5` | TIME-001 |
| `[TIME-004] says no projects are configured, and shows no grid, when the template is empty` | TIME-004 |
| `[TIME-005] shows the week as a draft with the next submission\` | TIME-005 |
| `[TIME-006] shows Submit disabled, described as not wired yet` | TIME-006 |
| `[TIME-007] has no axe violations, with projects and without` | TIME-007 |

## `ui/src/views/totals.test.ts`

component (vitest).

| Test | Cases |
|---|---|
| `[SYNC-001, TIME-001] sums a row` | SYNC-001, TIME-001 |
| `[SYNC-001, TIME-001] sums each column, and gives zeros for an empty table` | SYNC-001, TIME-001 |
| `[SYNC-002] reports a rise and a fall as signed deltas` | SYNC-002 |
| `[SYNC-002] shows no delta when the count is unchanged or has no previous value` | SYNC-002 |

## `ui/flows/appearance.flow.ts`

flow (Playwright).

| Test | Cases |
|---|---|
| `[UI-003] matches the approved light-appearance screenshots, switch off and on` | UI-003 |
| `[UI-003] matches the approved dark-appearance screenshots, switch off and on` | UI-003 |
| `[TAB-013] matches the approved light-appearance screenshots of every other tab` | TAB-013 |
| `[TAB-013] matches the approved dark-appearance screenshots of every other tab` | TAB-013 |

## `ui/flows/no-backend.flow.ts`

flow (Playwright).

| Test | Cases |
|---|---|
| `[UI-007] explains that the desktop backend is missing instead of showing a dead toggle` | UI-007 |

## `ui/flows/settings.flow.ts`

flow (Playwright).

| Test | Cases |
|---|---|
| `[UI-001] shows the heading, the launch-at-login row and the hide button with its hint` | UI-001 |
| `[UI-002] keeps the switch disabled until the backend has answered` | UI-002 |
| `[UI-004] fits a 360 px wide window with no horizontal overflow` | UI-004 |
| `[UI-005] toggles from the keyboard, and the backend receives the change` | UI-005 |
| `[UI-009] reverts the switch and shows the message when registration fails` | UI-009 |
| `[TRAY-010] warns that closing quits, and offers no hide button, when there is no tray` | TRAY-010 |
| `[HIDE-008] asks the backend to hide when the hide button is clicked` | HIDE-008 |

## `ui/flows/tabs.flow.ts`

flow (Playwright).

| Test | Cases |
|---|---|
| `[TAB-004] moves between tabs with the arrow keys, wrapping, and with Home and End` | TAB-004 |
| `[TAB-005] Tab moves focus from the selected tab into its panel` | TAB-005 |
| `[TAB-009] starts on Settings again after a reload, and switching tabs calls nothing` | TAB-009 |
| `[TAB-011] fits a 360 px wide window on every tab with no page overflow` | TAB-011 |
| `[GH-023] chooses platforms and devices with mouse and keyboard, and a branch change resets them` | GH-023 |

## `e2e/specs/config.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[CONF-001] First launch -> app-config.json is created in Application Support` | CONF-001 |
| `[CONF-002] Toggle autostart on and quit -> the file has "autostart_enabled": true` | CONF-002 |
| `[CONF-003] Corrupt the file and relaunch -> app starts with defaults and logs a parse warning` | CONF-003 |
| `[CONF-004] Delete the file and relaunch -> app starts and the file is recreated` | CONF-004 |
| `[CONF-005] Add an unknown key by hand and relaunch -> app starts and ignores it` | CONF-005 |
| `[CONF-006] Launch and toggle several times -> no .json.tmp left in the config dir` | CONF-006 |
| `[CONF-007] Make the config dir read-only and toggle -> the toggle still works and the log says "could not persist config"` | CONF-007 |

## `e2e/specs/hide.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[HIDE-001, HIDE-002, HIDE-003, HIDE-004] Click the close button -> hidden, no Dock icon, tray kept, process alive` | HIDE-001, HIDE-002, HIDE-003, HIDE-004 |
| `[HIDE-005, HIDE-006] Tray Show Window after a hide -> Dock icon back, same window in front` | HIDE-005, HIDE-006 |
| `[HIDE-007] Press ⌘W with the window focused -> it hides, the app does not quit` | HIDE-007 |
| `[HIDE-008] Click "Hide to menu bar" in the window -> the window hides as with the close button` | HIDE-008 |
| `[HIDE-009] Hide then show 5 times quickly -> never more than one window, always focused in front` | HIDE-009 |

## `e2e/specs/login-item.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[LOGIN-001] Fresh install, first launch -> the toggle reads off and no plist exists` | LOGIN-001 |
| `[LOGIN-002, LOGIN-003, LOGIN-014] Turn the toggle on -> plist with --hidden appears, and the dev-binary warning is logged` | LOGIN-002, LOGIN-003, LOGIN-014 |
| `[LOGIN-006] Quit and relaunch with the toggle on -> still on, exactly one plist` | LOGIN-006 |
| `[LOGIN-010] Turn the toggle off -> the plist is removed` | LOGIN-010 |
| `[LOGIN-012] Login item added outside the app while the toggle is off, then restart -> toggle reads on` | LOGIN-012 |
| `[LOGIN-013] Plist deleted while the toggle is on, then restart -> toggle reads on and the plist is re-created` | LOGIN-013 |

## `e2e/specs/notices.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[NOTE-001] Fresh install, first launch -> the launch-at-login offer is shown once` | NOTE-001 |
| `[NOTE-002] Fresh install, first window close -> the still-running notice is shown` | NOTE-002 |
| `[NOTE-003] Close the window a second time -> no repeat` | NOTE-003 |
| `[NOTE-004] Relaunch once config exists -> no first-run offer again` | NOTE-004 |
| `[NOTE-005] Delete app-config.json and relaunch -> both notices fire again` | NOTE-005 |
| `[NOTE-006] Fresh install with autostart already registered -> the first-run offer is skipped` | NOTE-006 |

## `e2e/specs/pilot.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[HIDE-013] Launch -> close -> tray Show Window -> toggle launch at login -> setting persisted` | HIDE-013 |

## `e2e/specs/quit.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[QUIT-001, QUIT-006, QUIT-008] Press ⌘Q with the window focused -> the process exits, nothing left, no crash` | QUIT-001, QUIT-006, QUIT-008 |
| `[QUIT-002, QUIT-007] App menu → Quit -> the process exits and its WebKit helpers go with it` | QUIT-002, QUIT-007 |
| `[QUIT-003] Tray → Quit with the window visible -> the process exits and the tray icon disappears` | QUIT-003 |
| `[QUIT-004] Tray → Quit with the window hidden -> the process exits and the tray icon disappears` | QUIT-004 |
| `[QUIT-005] Send a Quit AppleEvent -> the process exits` | QUIT-005 |
| `[QUIT-009] ⌘Q while the window is hidden -> the app exits cleanly` | QUIT-009 |

## `e2e/specs/single-instance.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[INST-001, INST-002, INST-004] open -a while hidden -> the existing window appears, one process, one icon` | INST-001, INST-002, INST-004 |
| `[INST-003] open -a while visible -> the existing window comes forward, no second window` | INST-003 |
| `[INST-005] Run the binary directly while an instance runs -> the second exits, the first reveals its window` | INST-005 |
| `[INST-006] Relaunch 5 times quickly -> still one window and one tray icon` | INST-006 |

## `e2e/specs/tabs.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[TAB-014] Open the window -> four tabs in order, Settings selected, each tab shows its own panel` | TAB-014 |
| `[TAB-015] Visit GitHub jobs, return to Settings, toggle launch at login -> the setting is persisted` | TAB-015 |

## `e2e/specs/tray.e2e.ts`

e2e (WebdriverIO).

| Test | Cases |
|---|---|
| `[TRAY-001] Launch the app -> a tray icon appears in the menu bar` | TRAY-001 |
| `[TRAY-002] Left-click the icon -> menu shows Show Window, a separator, Quit` | TRAY-002 |
| `[TRAY-003] Right-click the icon -> the same menu opens` | TRAY-003 |
| `[TRAY-004] Show Window while the window is visible -> it comes forward, no second window` | TRAY-004 |
| `[TRAY-005] Show Window while hidden -> the same window reappears with its prior state` | TRAY-005 |
| `[TRAY-009] Quit the app -> the tray icon disappears immediately` | TRAY-009 |

## `scripts/test/release-smoke.sh`

release smoke (shell).

| Test | Cases |
|---|---|
| `step_bundle_present` | — |
| `step_feature_off` | SYS-008 |
| `step_no_test_code` | SYS-008 |
| `step_launch` | SYS-009 |
| `step_tray_icon` | SYS-009 |
| `step_quit` | SYS-009 |
| `step_no_leftovers` | SYS-009 |
