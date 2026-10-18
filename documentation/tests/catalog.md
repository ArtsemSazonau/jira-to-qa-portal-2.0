# Test catalog

Every test case the project has, by area and then feature. One row per case; a case is a behaviour a
user or a developer relies on, not a single assertion.

How to read and maintain this page — IDs, naming, statuses, tags — is in the
[strategy page](README.md#catalog-ids-names-and-tags). `npm run test:catalog` checks it against the
code; [inventory.md](inventory.md) is the generated list of every automated test and the case it
carries.

**Levels** lists every layer that covers the case: `unit`, `component`, `flow`, `e2e`, `manual`,
`perf`. **Status** is one of:

| Status | Meaning |
|---|---|
| `automated` | Fully checked by automated tests carrying the ID |
| `partial` | Automated in part; the case file states the manual remainder and why |
| `manual` | Needs a person; the case file says why |
| `planned` | Described, not yet checked by anything |

Every `manual` and `partial` case, every `e2e` case and every `perf` case has a case file.

## OS tray — `TRAY`

Feature: [Tray icon and menu](../docs/features/01-tray-icon.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| TRAY-001 | [OS tray][Icon] Launch the app -> a tray icon appears in the menu bar | e2e | automated | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-001](cases/tray/TRAY-001-icon-appears.md) |
| TRAY-002 | [OS tray][Menu] Left-click the icon -> menu shows Show Window, a separator, Quit | unit, e2e | automated | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-002](cases/tray/TRAY-002-left-click-menu.md) |
| TRAY-003 | [OS tray][Menu] Right-click the icon -> the same menu opens | e2e | automated | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-003](cases/tray/TRAY-003-right-click-menu.md) |
| TRAY-004 | [OS tray][Show Window] Show Window while the window is visible -> it comes forward, no second window | unit, e2e | automated | `lifecycle/macos.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-004](cases/tray/TRAY-004-show-while-visible.md) |
| TRAY-005 | [OS tray][Show Window] Show Window while hidden -> the same window reappears with its prior state | unit, e2e | automated | `lifecycle/macos.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-005](cases/tray/TRAY-005-show-while-hidden.md) |
| TRAY-006 | [OS tray][Appearance] Switch macOS to Dark appearance -> the icon inverts and stays legible | manual | manual | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-006](cases/tray/TRAY-006-dark-appearance.md) |
| TRAY-007 | [OS tray][Appearance] Switch back to Light appearance -> the icon stays legible | manual | manual | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-007](cases/tray/TRAY-007-light-appearance.md) |
| TRAY-008 | [OS tray][Scale] Move the window to a display with another scale factor -> the icon stays sharp | manual | manual | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-008](cases/tray/TRAY-008-scale-factor.md) |
| TRAY-009 | [OS tray][Quit] Quit the app -> the tray icon disappears immediately | e2e | automated | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-009](cases/tray/TRAY-009-icon-removed-on-quit.md) |
| TRAY-010 | [OS tray][Fallback] Tray creation fails -> app still starts, logs the fallback, window warns that closing quits | unit, component, flow, manual | partial | `tray.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | [TRAY-010](cases/tray/TRAY-010-tray-failure-fallback.md) |
| TRAY-011 | [OS tray][Menu] Menu event with an unknown id -> ignored, nothing happens | unit | automated | `lifecycle/policy.rs` | [Tray icon and menu](../docs/features/01-tray-icon.md) | — |

## Hide to tray — `HIDE`

Feature: [Hide to tray](../docs/features/02-hide-to-tray.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| HIDE-001 | [Hide to tray][Close button] Click the red close button -> the window disappears instantly, nothing lands in the Dock | unit, e2e, manual | partial | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-001](cases/hide/HIDE-001-close-button-hides.md) |
| HIDE-002 | [Hide to tray][Activation policy] After a hide -> Dock icon gone, app absent from ⌘-Tab | e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-002](cases/hide/HIDE-002-dock-icon-gone.md) |
| HIDE-003 | [Hide to tray][Tray] After a hide -> the tray icon is still present | e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-003](cases/hide/HIDE-003-tray-survives-hide.md) |
| HIDE-004 | [Hide to tray][Process] After a hide -> the process is still alive | e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-004](cases/hide/HIDE-004-process-alive.md) |
| HIDE-005 | [Hide to tray][Show] Tray Show Window after a hide -> Dock icon and ⌘-Tab entry return, window focused in front | e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-005](cases/hide/HIDE-005-show-restores-dock.md) |
| HIDE-006 | [Hide to tray][Show] Show after a hide -> the same window with its prior state, not a fresh one | unit, e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-006](cases/hide/HIDE-006-same-window-restored.md) |
| HIDE-007 | [Hide to tray][⌘W] Press ⌘W with the window focused -> it hides, the app does not quit | e2e | automated | `lib.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-007](cases/hide/HIDE-007-cmd-w-hides.md) |
| HIDE-008 | [Hide to tray][Hide button] Click "Hide to menu bar" in the window -> the window hides as with the close button | unit, component, flow, e2e | automated | `ipc_commands.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-008](cases/hide/HIDE-008-hide-button.md) |
| HIDE-009 | [Hide to tray][Rapid cycles] Hide then show 5 times quickly -> never more than one window, always focused in front | unit, e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-009](cases/hide/HIDE-009-rapid-cycles.md) |
| HIDE-010 | [Hide to tray][Webview] Hide -> the three WebKit helpers are retained, about 45 MB between them | manual, perf | manual | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-010](cases/hide/HIDE-010-webview-retained.md) |
| HIDE-011 | [Hide to tray][Hide button] Hide requested with no tray, while hidden, or while quitting -> never quits, does nothing | unit | automated | `lifecycle/policy.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | — |
| HIDE-012 | [Hide to tray][Close button] Close an already hidden window -> nothing happens | unit | automated | `lifecycle/policy.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | — |
| HIDE-013 | [Hide to tray][Pilot] Launch -> close -> tray Show Window -> toggle launch at login -> setting persisted | e2e | automated | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [HIDE-013](cases/hide/HIDE-013-pilot.md) |

## Quit — `QUIT`

Feature: [Quit handling](../docs/features/03-quit-handling.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| QUIT-001 | [Quit][⌘Q] Press ⌘Q with the window focused -> the process exits and the tray icon disappears | unit, e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-001](cases/quit/QUIT-001-cmd-q.md) |
| QUIT-002 | [Quit][App menu] App menu → Quit -> the process exits and the tray icon disappears | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-002](cases/quit/QUIT-002-app-menu-quit.md) |
| QUIT-003 | [Quit][Tray] Tray → Quit with the window visible -> the process exits and the tray icon disappears | unit, e2e | automated | `tray.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-003](cases/quit/QUIT-003-tray-quit-visible.md) |
| QUIT-004 | [Quit][Tray] Tray → Quit with the window hidden -> the process exits and the tray icon disappears | unit, e2e | automated | `tray.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-004](cases/quit/QUIT-004-tray-quit-hidden.md) |
| QUIT-005 | [Quit][AppleEvent] Send a Quit AppleEvent -> the process exits and the tray icon disappears | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-005](cases/quit/QUIT-005-quit-appleevent.md) |
| QUIT-006 | [Quit][Teardown] After any quit -> no app process remains | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-006](cases/quit/QUIT-006-no-leftover-process.md) |
| QUIT-007 | [Quit][Teardown] After any quit -> no orphaned WebKit processes | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-007](cases/quit/QUIT-007-no-orphan-webkit.md) |
| QUIT-008 | [Quit][Teardown] After any quit -> no crash report for the app | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-008](cases/quit/QUIT-008-no-crash-report.md) |
| QUIT-009 | [Quit][⌘Q] ⌘Q while the window is hidden -> the app exits cleanly | e2e | automated | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [QUIT-009](cases/quit/QUIT-009-cmd-q-hidden.md) |
| QUIT-010 | [Quit][Tray] Tray → Quit when the tray is otherwise unavailable -> still exits | unit | automated | `lifecycle/policy.rs` | [Quit handling](../docs/features/03-quit-handling.md) | — |
| QUIT-011 | [Quit][Guard] Any show, close or reopen trigger with a tray -> never exits the app | unit | automated | `lifecycle/policy.rs` | [Quit handling](../docs/features/03-quit-handling.md) | — |

## Launch at login — `LOGIN`

Feature: [Launch at login](../docs/features/04-launch-at-login.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| LOGIN-001 | [Launch at login][Fresh install] First launch -> the toggle reads off and no plist exists | unit, component, e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-001](cases/login/LOGIN-001-fresh-install-off.md) |
| LOGIN-002 | [Launch at login][Toggle] Turn the toggle on -> ~/Library/LaunchAgents/jira-to-qa-portal.plist appears | component, e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-002](cases/login/LOGIN-002-toggle-on-creates-plist.md) |
| LOGIN-003 | [Launch at login][Plist] Inspect the plist -> ProgramArguments point into /Applications and include --hidden | e2e, manual | partial | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-003](cases/login/LOGIN-003-plist-arguments.md) |
| LOGIN-004 | [Launch at login][System Settings] Open Login Items -> the app is listed under Allow in the Background | manual | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-004](cases/login/LOGIN-004-system-settings-listing.md) |
| LOGIN-005 | [Launch at login][launchd] launchctl print the job -> it is loaded | manual | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-005](cases/login/LOGIN-005-launchctl-loaded.md) |
| LOGIN-006 | [Launch at login][Restart] Quit and relaunch with the toggle on -> still on, exactly one plist | unit, e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-006](cases/login/LOGIN-006-survives-restart.md) |
| LOGIN-007 | [Launch at login][Login] Log out and back in (or reboot) -> the app starts automatically | manual | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-007](cases/login/LOGIN-007-starts-at-login.md) |
| LOGIN-008 | [Launch at login][Login] Start by the login item -> starts hidden: tray icon, no window, no Dock icon | unit, manual | partial | `lib.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-008](cases/login/LOGIN-008-starts-hidden.md) |
| LOGIN-009 | [Launch at login][Login] Time a login start -> app ready without visibly delaying login | manual, perf | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-009](cases/login/LOGIN-009-login-start-cost.md) |
| LOGIN-010 | [Launch at login][Toggle] Turn the toggle off -> the plist is removed | component, e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-010](cases/login/LOGIN-010-toggle-off-removes-plist.md) |
| LOGIN-011 | [Launch at login][Login] Reboot after turning it off -> the app does not start | manual | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-011](cases/login/LOGIN-011-off-survives-reboot.md) |
| LOGIN-012 | [Launch at login][Reconcile] Added in System Settings while the toggle is off, then restart -> toggle reads on | unit, component, e2e, manual | partial | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-012](cases/login/LOGIN-012-external-registration-wins.md) |
| LOGIN-013 | [Launch at login][Reconcile] Plist deleted by hand while on, then restart -> toggle reads on and the plist is re-created | unit, e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-013](cases/login/LOGIN-013-deleted-plist-recreated.md) |
| LOGIN-014 | [Launch at login][Dev path] Toggle on in tauri dev -> the log warns about a development binary | e2e | automated | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [LOGIN-014](cases/login/LOGIN-014-dev-path-warning.md) |
| LOGIN-015 | [Launch at login][Launch mode] Manual launch (no --hidden, or a look-alike argument) -> the window opens | unit | automated | `lifecycle/policy.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | — |
| LOGIN-016 | [Launch at login][Reconcile] Fresh install with a login item already registered -> toggle reads on, nothing re-registered | unit | automated | `lifecycle/policy.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | — |

## Single instance — `INST`

Feature: [Single instance and reopen](../docs/features/05-single-instance.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| INST-001 | [Single instance][Reopen] Launch from Finder while running hidden -> the existing window appears, focused | unit, e2e, manual | partial | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-001](cases/inst/INST-001-finder-reopen-hidden.md) |
| INST-002 | [Single instance][Reopen] After a Finder relaunch -> exactly one tray icon and one process | e2e | automated | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-002](cases/inst/INST-002-one-process-one-icon.md) |
| INST-003 | [Single instance][Reopen] Launch from Spotlight while visible -> the existing window comes forward, no second window | unit, e2e, manual | partial | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-003](cases/inst/INST-003-spotlight-reopen-visible.md) |
| INST-004 | [Single instance][Reopen] open -a while hidden -> the window appears | e2e | automated | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-004](cases/inst/INST-004-open-a-hidden.md) |
| INST-005 | [Single instance][Second process] Run the binary directly while an instance runs -> the second exits, the first reveals its window | unit, e2e | automated | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-005](cases/inst/INST-005-second-process-exits.md) |
| INST-006 | [Single instance][Rapid relaunch] Relaunch from Finder 5 times quickly -> still one window and one tray icon | e2e, manual | partial | `lib.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | [INST-006](cases/inst/INST-006-rapid-relaunch.md) |
| INST-007 | [Single instance][Reopen] Cocoa says a window is visible but ours is hidden -> the window is shown | unit | automated | `lifecycle/policy.rs` | [Single instance and reopen](../docs/features/05-single-instance.md) | — |

## Notifications — `NOTE`

Feature: [One-time notifications](../docs/features/06-notifications.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| NOTE-001 | [Notifications][First run] Fresh install, first launch -> a notification offers launch at login | unit, e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-001](cases/note/NOTE-001-first-run-prompt.md) |
| NOTE-002 | [Notifications][First close] Fresh install, first window close -> a notification says the app still runs in the menu bar | unit, e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-002](cases/note/NOTE-002-first-close-notice.md) |
| NOTE-003 | [Notifications][First close] Close the window a second time -> no notification | unit, e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-003](cases/note/NOTE-003-no-repeat-close-notice.md) |
| NOTE-004 | [Notifications][First run] Relaunch once config exists -> no first-run notification | unit, e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-004](cases/note/NOTE-004-no-repeat-first-run.md) |
| NOTE-005 | [Notifications][Reset] Delete app-config.json and relaunch -> both notices fire again | e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-005](cases/note/NOTE-005-reset-refires.md) |
| NOTE-006 | [Notifications][First run] Fresh install with autostart already registered -> the first-run prompt is skipped | unit, e2e, manual | partial | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-006](cases/note/NOTE-006-skip-when-registered.md) |
| NOTE-007 | [Notifications][Degrade] Trigger a notice with Do Not Disturb on -> no hang or crash, hide still works, a warn in the log | manual | manual | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-007](cases/note/NOTE-007-do-not-disturb.md) |
| NOTE-008 | [Notifications][Degrade] Trigger a notice with notifications denied -> no hang or crash, hide still works, a warn in the log | manual | manual | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | [NOTE-008](cases/note/NOTE-008-notifications-denied.md) |
| NOTE-009 | [Notifications][Wording] Build both notices -> non-empty texts, the close notice names the menu bar and Quit | unit | automated | `notify.rs` | [One-time notifications](../docs/features/06-notifications.md) | — |

## Config — `CONF`

Feature: [App configuration](../docs/features/07-app-config.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| CONF-001 | [Config][File] First launch -> app-config.json is created in Application Support | e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-001](cases/conf/CONF-001-file-created.md) |
| CONF-002 | [Config][Persistence] Toggle autostart on and quit -> the file has "autostart_enabled": true | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-002](cases/conf/CONF-002-toggle-persisted.md) |
| CONF-003 | [Config][Recovery] Corrupt the file and relaunch -> app starts with defaults and logs a parse warning | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-003](cases/conf/CONF-003-corrupt-file.md) |
| CONF-004 | [Config][Recovery] Delete the file and relaunch -> app starts and the file is recreated | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-004](cases/conf/CONF-004-deleted-file.md) |
| CONF-005 | [Config][Compatibility] Add an unknown key by hand and relaunch -> app starts and ignores it | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-005](cases/conf/CONF-005-unknown-key.md) |
| CONF-006 | [Config][Atomic write] Launch and toggle several times -> no .json.tmp left in the config dir | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-006](cases/conf/CONF-006-no-temp-file.md) |
| CONF-007 | [Config][Unwritable] Make the config dir read-only and toggle -> the toggle still works and the log carries "could not persist config" | unit, e2e | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | [CONF-007](cases/conf/CONF-007-read-only-dir.md) |
| CONF-008 | [Config][Persistence] An update that changes nothing -> the file is not written | unit | automated | `lifecycle/mod.rs` | [App configuration](../docs/features/07-app-config.md) | — |
| CONF-009 | [Config][Defaults] No stored values -> every setting is off | unit | automated | `config.rs` | [App configuration](../docs/features/07-app-config.md) | — |

## Settings UI — `UI`

Feature: [Settings UI](../docs/features/08-settings-ui.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| UI-001 | [Settings UI][Layout] Open the window -> heading, subtitle, tabs, Launch at login row on the Settings tab, hide button and its explanation | component, flow, manual | partial | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-001](cases/ui/UI-001-initial-render.md) |
| UI-002 | [Settings UI][Loading] Open the window -> the toggle is briefly disabled, then interactive | component, flow, manual | partial | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-002](cases/ui/UI-002-disabled-until-answered.md) |
| UI-003 | [Settings UI][Appearance] Switch macOS to Dark appearance with the window open -> colours follow, text readable, switch visible in both states | flow, manual | partial | `App.css` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-003](cases/ui/UI-003-dark-appearance.md) |
| UI-004 | [Settings UI][Layout] Resize the window narrow -> no horizontal overflow | flow, manual | partial | `App.css` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-004](cases/ui/UI-004-narrow-window.md) |
| UI-005 | [Settings UI][Keyboard] Tab to the switch and press Space -> it toggles | flow, manual | partial | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-005](cases/ui/UI-005-keyboard-toggle.md) |
| UI-006 | [Settings UI][Accessibility] Focus the switch with VoiceOver on -> announced as a switch named "Launch at login" with its state | component, manual | partial | `views/SettingsView.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-006](cases/ui/UI-006-voiceover.md) |
| UI-007 | [Settings UI][No backend] Open the frontend in a plain browser -> "desktop backend is not available" message, toggle disabled | component, flow | automated | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-007](cases/ui/UI-007-no-backend.md) |
| UI-008 | [Settings UI][Rendering] Window on a Retina display -> text and the switch are sharp | manual | manual | `App.css` | [Settings UI](../docs/features/08-settings-ui.md) | [UI-008](cases/ui/UI-008-retina.md) |
| UI-009 | [Settings UI][Errors] Registration fails -> the toggle reverts and an alert shows the message | component, flow | automated | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | — |
| UI-010 | [Settings UI][Saving] Toggle while a save is in flight -> the switch is disabled until it settles | component | automated | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | — |
| UI-011 | [Settings UI][Errors] Successful toggle after a failure -> the previous error clears | component | automated | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | — |
| UI-012 | [Settings UI][Accessibility] Render the panel -> axe finds no violations | component | automated | `App.tsx` | [Settings UI](../docs/features/08-settings-ui.md) | — |

## IPC — `IPC`

Feature: [Settings UI](../docs/features/08-settings-ui.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| IPC-001 | [IPC][Wrappers] Call each lib/ipc.ts wrapper -> it invokes the registered command name with the right arguments | component | automated | `lib/ipc.ts` | [Settings UI](../docs/features/08-settings-ui.md) | — |
| IPC-002 | [IPC][Wrappers] Backend rejects a command -> the wrapper rejects with the same message | component | automated | `lib/ipc.ts` | [Settings UI](../docs/features/08-settings-ui.md) | — |
| IPC-003 | [IPC][Contract] Compare lib/ipc.ts with the Rust handler list -> the same command names on both sides | component | automated | `lib.rs + lib/ipc.ts` | [change](../../openspec/changes/archive/2026-10-16-build-test-pyramid/proposal.md) | — |
| IPC-004 | [IPC][Contract] Compare the test-build handler list with production -> production plus e2e_* names only | component | automated | `lib.rs` | [change](../../openspec/changes/archive/2026-10-16-build-test-pyramid/proposal.md) | — |

## Window tabs — `TAB`

Feature: [Window tabs](../docs/features/09-window-tabs.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| TAB-001 | [Window tabs][Order] Open the window -> tabs Settings, QA Portal sync, Timesheet, GitHub jobs, in that order | component | automated | `App.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-002 | [Window tabs][Default] Open the window -> Settings is selected and launch at login is visible without a click | component | automated | `App.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-003 | [Window tabs][Selection] Click a tab -> it is selected and only its panel is visible | component | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-004 | [Window tabs][Keyboard] Press Left/Right on a tab -> the previous/next tab is focused and selected, wrapping; Home/End reach the ends | component, flow | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-005 | [Window tabs][Keyboard] Press Tab on the selected tab -> focus moves into its panel | flow | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-006 | [Window tabs][Accessibility] Render the tabs -> labelled tab list, tabs with their selected state, panels labelled by their tab | component | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-007 | [Window tabs][Accessibility] Move through the tabs with VoiceOver on -> each announced as a tab with its name, selected state and position | manual | manual | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | [TAB-007](cases/tab/TAB-007-voiceover.md) |
| TAB-008 | [Window tabs][Input kept] Type or toggle on a tab, switch away and back -> the input is still there and still works | component | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-009 | [Window tabs][Not persisted] Switch tabs, then reload the page -> no command reaches the core, and the page starts on Settings | component, flow | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-010 | [Window tabs][Shared] Select a tab other than Settings -> heading, hide button and its explanation still visible | component | automated | `App.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-011 | [Window tabs][Layout] Select each tab in a 360 px window -> no page overflow, every control within the window | flow | automated | `App.css` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-012 | [Window tabs][Accessibility] Select each tab -> axe finds no violations | component | automated | `App.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TAB-013 | [Window tabs][Appearance] Open each tab in Light and Dark appearance -> colours follow, text readable, matches the approved screenshots | flow, manual | partial | `App.css` | [Window tabs](../docs/features/09-window-tabs.md) | [TAB-013](cases/tab/TAB-013-appearance.md) |
| TAB-014 | [Window tabs][Built app] Open the window -> four tabs in order, Settings selected, each tab shows its own panel | e2e | automated | `components/Tabs.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | [TAB-014](cases/tab/TAB-014-built-app-tabs.md) |
| TAB-015 | [Window tabs][Built app] Visit GitHub jobs, return to Settings, toggle launch at login -> the setting is persisted | e2e | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | [TAB-015](cases/tab/TAB-015-built-app-launch-at-login.md) |

## Settings previews — `SET`

Feature: [Window tabs](../docs/features/09-window-tabs.md). Launch at login itself is covered by the
`LOGIN` and `UI` cases.

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| SET-001 | [Settings previews][Sections] Open the Settings tab -> Jira, QA Portal, Sync schedule, Timesheet and GitHub sections, each with its fields | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-002 | [Settings previews][Editable] Type, choose or select in each preview field -> the field takes the input | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-003 | [Settings previews][Not saved] Fill in credentials and edit projects -> no command reaches the core | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-004 | [Settings previews][Secrets] Type into the API token, passwords or GitHub token -> masked, no autofill | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-005 | [Settings previews][Projects] Add, edit and remove timesheet projects -> new rows default to 8 hours, 0–24 in steps of 0.5, the list may be empty | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-006 | [Settings previews][Submission] Open the Timesheet section -> weekday (default Friday), time (default 17:00) and automatic-or-reminder choice | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-007 | [Settings previews][Marking] Show an unfinished section or sample data -> marked in words ("Not wired yet", a notice), not only by colour | component | automated | `components/NotWired.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-008 | [Settings previews][Actions] Show an action that is not built -> a disabled button whose description says why | component | automated | `components/NotWired.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SET-009 | [Settings previews][Accessibility] Render the Settings tab, with projects and with none -> axe finds no violations | component | automated | `views/SettingsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |

## QA Portal sync — `SYNC`

Feature: [Window tabs](../docs/features/09-window-tabs.md). The tab shows sample data until the sync
exists.

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| SYNC-001 | [QA Portal sync][Totals] Show the counts table -> each row's Total is the sum of its counts and the Total row is the column sums | unit, component | automated | `views/SyncView.tsx + views/totals.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-002 | [QA Portal sync][Delta] A count changed since the previous sync -> the cell shows the signed change; unchanged counts show none | unit, component | automated | `views/SyncView.tsx + views/totals.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-003 | [QA Portal sync][Sample data] Open the tab -> a notice says the data is sample and the sync is not wired yet | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-004 | [QA Portal sync][Timing] Show the last and next sync -> weekday, day, month and 24-hour time | unit | automated | `views/format.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-005 | [QA Portal sync][Status] Open the tab -> status, last sync with its outcome, next sync; Never and Not scheduled when absent | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-006 | [QA Portal sync][Run] Open the tab -> Run now disabled with its reason, Dry run offered | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-007 | [QA Portal sync][Steps] Show the last run -> Jira, Group, Portal login, Update, Verify in order, each with its outcome in words | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-008 | [QA Portal sync][Skipped] The last sync skipped tickets of an unknown platform -> a warning with the count; none when zero | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-009 | [QA Portal sync][Report] Open the tab -> read-only report text, a period choice, Generate and Copy disabled with their reasons | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| SYNC-010 | [QA Portal sync][Accessibility] Render the tab -> axe finds no violations | component | automated | `views/SyncView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |

## Timesheet — `TIME`

Feature: [Window tabs](../docs/features/09-window-tabs.md). The tab shows sample data until time entry
exists.

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| TIME-001 | [Timesheet][Totals] Template of 8 and 0.5 hours a day -> each project's Total is its five days (40, 2.5), each day's Total is its projects (8.5) | unit, component | automated | `views/TimesheetView.tsx + views/totals.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-002 | [Timesheet][Week] Show the week -> Monday to Friday dates of the current week, across month ends | unit, component | automated | `views/TimesheetView.tsx + views/format.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-003 | [Timesheet][Sample data] Open the tab -> a notice says the data is sample and time entry is not wired yet | component | automated | `views/TimesheetView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-004 | [Timesheet][Empty] The template has no projects -> a message says none are configured, no grid | component | automated | `views/TimesheetView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-005 | [Timesheet][Status] Open the tab -> Draft or Submitted, and the next submission's weekday and time | component | automated | `views/TimesheetView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-006 | [Timesheet][Submit] Open the tab -> Submit disabled, described as not wired yet | component | automated | `views/TimesheetView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| TIME-007 | [Timesheet][Accessibility] Render the tab, with projects and without -> axe finds no violations | component | automated | `views/TimesheetView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |

## GitHub jobs — `GH`

Feature: [Window tabs](../docs/features/09-window-tabs.md). Branches and devices are sample data until
dispatch exists; the selection rules are real.

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| GH-001 | [GitHub jobs][Platforms] List the platforms -> Android mobile, iOS mobile, Android TV, Fire TV, Apple TV, Samsung, LG, each with a unique id | unit | automated | `domain/platforms.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-002 | [GitHub jobs][Defaults] Open the tab -> default branch, Release off, every checkbox off, no device selected | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-003 | [GitHub jobs][Columns] Check Prod env and Dev mode on one platform -> both stay checked, each unchecks alone | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-004 | [GitHub jobs][Run off] Uncheck then recheck Run on a configured platform -> its Prod env, Dev mode and devices come back | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-005 | [GitHub jobs][Run off] Change Prod env, Dev mode or a device while Run is off -> nothing changes | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-006 | [GitHub jobs][Devices] Click devices -> any number selects, a second click deselects, other platforms untouched | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-007 | [GitHub jobs][Dispatch] Read the selection to dispatch -> Run-on platforms only, in platform order, no devices meaning build only | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-008 | [GitHub jobs][All] Use the Run All checkbox -> off, mixed and on read correctly; off or mixed checks all, on unchecks all | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-009 | [GitHub jobs][All] Use the Prod env or Dev mode All -> counts and changes Run-on platforms only, disabled when none runs | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-010 | [GitHub jobs][Branch] Change the branch, and go back -> everything, Release included, is at its default each time | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-011 | [GitHub jobs][Summary] Select jobs and devices -> the Run button reads "Run 2 jobs, deploy to 3 devices", with singular, no-deployment and nothing-selected forms | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-012 | [GitHub jobs][Release] Check Release -> no other control changes | unit | automated | `views/github/selection.ts` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-013 | [GitHub jobs][Sample data] Open the tab -> a notice says branches and devices are sample data and starting jobs is not wired yet | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-014 | [GitHub jobs][Defaults] Open the tab -> default branch, All row then seven platform rows, Run enabled and off, Prod env, Dev mode, devices and their All disabled | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-015 | [GitHub jobs][Run off] Turn Run off on a configured platform -> its controls are disabled but keep their values, which return when Run is back on | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-016 | [GitHub jobs][All] Check Run on some platforms -> Run All shows mixed; Prod env All checks only those platforms | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-017 | [GitHub jobs][Devices] Click devices -> each selected one shows a check mark and a pressed state; a second click releases it | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-018 | [GitHub jobs][Branch] Pick another branch, then the first again -> Release, checkboxes and devices are back to their defaults each time | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-019 | [GitHub jobs][Release] Check Release -> its description says Android goes to Play Console; nothing else changes or is disabled | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-020 | [GitHub jobs][Summary] Select platforms and devices -> the Run button reads the jobs and devices, and stays disabled with its reason | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-021 | [GitHub jobs][Kept] Make a selection, visit another tab and return -> the selection is still there | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-022 | [GitHub jobs][Accessibility] Render the tab, empty and with a selection -> axe finds no violations | component | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |
| GH-023 | [GitHub jobs][Flow] In WebKit, choose platforms and devices by mouse and keyboard, then change the branch -> the label follows, the branch change resets, nothing reaches the core | flow | automated | `views/GitHubJobsView.tsx` | [Window tabs](../docs/features/09-window-tabs.md) | — |

## System — `SYS`

Feature: [Overview](../docs/overview.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| SYS-001 | [System][Sleep] Sleep the Mac for an hour with the app hidden, then wake -> same PID, tray responds, window shows | manual, perf | manual | `lib.rs` | [Overview](../docs/overview.md) | [SYS-001](cases/sys/SYS-001-wake-from-sleep.md) |
| SYS-002 | [System][Sleep] Read the system log after the sleep -> nothing alarming during sleep or wake | manual | manual | `lib.rs` | [Overview](../docs/overview.md) | [SYS-002](cases/sys/SYS-002-sleep-log.md) |
| SYS-003 | [System][Moved app] Move the app out of /Applications with autostart on and relaunch -> the registration is re-asserted and logged | unit, manual | partial | `autostart.rs` | [Overview](../docs/overview.md) | [SYS-003](cases/sys/SYS-003-moved-app.md) |
| SYS-004 | [System][Login start] Full manual pass with the app started by the login item -> every case behaves the same once the window is shown | manual | manual | `lib.rs` | [Overview](../docs/overview.md) | [SYS-004](cases/sys/SYS-004-login-started-pass.md) |
| SYS-005 | [System][Capabilities] Read capabilities/default.json -> only core:default, only for window main | unit | automated | `capabilities/default.json` | [Overview](../docs/overview.md) | — |
| SYS-006 | [System][Platform gating] Build the crate -> the macOS adapter is gated, the policy compiles everywhere | unit | automated | `lifecycle/` | [Overview](../docs/overview.md) | — |
| SYS-007 | [System][Test build] Launch the test build beside the real app -> separate process, tray icon, config file and login item | manual | manual | `tauri.e2e.conf.json` | [Overview](../docs/overview.md) | [SYS-007](cases/sys/SYS-007-test-build-isolation.md) |
| SYS-008 | [System][Release] Check the release build -> the e2e feature is off by default and the executable holds no e2e_snapshot or wdio code | e2e | automated | `Cargo.toml + lib.rs` | [Overview](../docs/overview.md) | [SYS-008](cases/sys/SYS-008-release-has-no-test-access.md) |
| SYS-009 | [System][Release] Launch the release bundle -> it starts, its menu bar icon appears, and Quit from the icon ends it with no leftover processes | e2e | automated | `lib.rs + tray.rs` | [Overview](../docs/overview.md) | [SYS-009](cases/sys/SYS-009-release-launch-quit.md) |
| SYS-010 | [System][Test build] A killed run left a login item behind -> the next run removes it before its first spec | e2e, manual | manual | `e2e/support/clean.ts` | [Overview](../docs/overview.md) | [SYS-010](cases/sys/SYS-010-stale-login-item-cleaned.md) |

## Performance — `PERF`

Measurements of the core process and its webview. Method, tools and pitfalls are in
[performance/README.md](performance/README.md); the results history is in
[runs/performance-results.md](runs/performance-results.md).

| ID | Case | Levels | Status | Module | Feature | File |
|---|---|---|---|---|---|---|
| PERF-001 | [Performance][Idle CPU] Hidden and untouched for 10 minutes -> CPU average about 0%, peak below 1% | perf | manual | `app` | [Overview](../docs/overview.md) | [PERF-001](cases/performance/PERF-001-idle-cpu.md) |
| PERF-002 | [Performance][Idle memory] Hidden and settled -> core footprint and dirty memory within budget of the baseline | perf | manual | `app` | [Overview](../docs/overview.md) | [PERF-002](cases/performance/PERF-002-idle-memory.md) |
| PERF-003 | [Performance][Process accounting] Hidden and settled -> four processes, total footprint about 73 MB | perf | manual | `app + WebKit` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [PERF-003](cases/performance/PERF-003-process-accounting.md) |
| PERF-004 | [Performance][Wakeups] Hidden and idle -> idle wakeups in low single digits per second, energy impact about 0 | perf | manual | `app + WebKit` | [Overview](../docs/overview.md) | [PERF-004](cases/performance/PERF-004-idle-wakeups.md) |
| PERF-005 | [Performance][Show/hide cycles] 50 verified show/hide cycles -> RSS back to baseline, leak count unchanged | perf | manual | `lifecycle/macos.rs` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [PERF-005](cases/performance/PERF-005-show-hide-cycles.md) |
| PERF-006 | [Performance][Soak] Hidden for 8 hours -> memory drift within 3%, no helper restarts | perf | manual | `app + WebKit` | [Overview](../docs/overview.md) | [PERF-006](cases/performance/PERF-006-soak.md) |
| PERF-007 | [Performance][Launch/quit cycles] 20 launch/quit cycles -> no orphans, WebKit count back to baseline | perf | manual | `lib.rs` | [Quit handling](../docs/features/03-quit-handling.md) | [PERF-007](cases/performance/PERF-007-launch-quit-cycles.md) |
| PERF-008 | [Performance][Login item] Toggle on and off, then log in -> plist correct, login not visibly delayed | perf | manual | `autostart.rs` | [Launch at login](../docs/features/04-launch-at-login.md) | [PERF-008](cases/performance/PERF-008-login-item.md) |
| PERF-009 | [Performance][Sleep] One hour asleep -> same PID, RSS stable, tray responsive | perf | manual | `app` | [Overview](../docs/overview.md) | [PERF-009](cases/performance/PERF-009-wake-from-sleep.md) |
| PERF-010 | [Performance][Frontend] Use the window, then close it -> no JS heap or DOM growth, WebContent returns to its start | perf | manual | `ui/` | [Hide to tray](../docs/features/02-hide-to-tray.md) | [PERF-010](cases/performance/PERF-010-frontend-profiling.md) |
| PERF-011 | [Performance][Reconnaissance] Instruments capture of all processes -> the misbehaving process is identified | perf | manual | `app + WebKit` | [Overview](../docs/overview.md) | [PERF-011](cases/performance/PERF-011-instruments-recon.md) |
| PERF-012 | [Performance][Deep profiling] Allocation and CPU traces -> a regression found elsewhere is attributed to code | perf | manual | `app` | [Overview](../docs/overview.md) | [PERF-012](cases/performance/PERF-012-deep-profiling.md) |
