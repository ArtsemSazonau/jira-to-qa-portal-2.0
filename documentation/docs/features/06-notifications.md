# 6. One-time notifications

Two native macOS notifications, each shown at most once per install. Both exist to explain something
the UI cannot: what just happened, or what the app can do.

## The two notices

### First close to tray

Fired the first time the window is hidden, immediately after it disappears.

> **Still running in the menu bar**
> QA Portal Sync keeps running so scheduled syncs can continue. Click the menu bar icon to reopen
> it, or choose Quit there to exit.

Without it, a user who clicks the close button and sees the Dock icon vanish has every reason to
believe the app quit — and no reason to look at the menu bar.

### First run

Fired once on a fresh install, during startup.

> **Start QA Portal Sync at login?**
> Turn on "Launch at login" in the app window to keep syncs running after you restart your Mac.

The spec chose an opt-in default for autostart, which is the least surprising behaviour but also
completely undiscoverable. This is the prompt that makes it discoverable.

It is **suppressed when autostart is already on** — there is nothing to offer, and without that check
a login-item launch would fire it at every single login.

## No action buttons

These are informational; the control lives in the window.

Notification action buttons need a notification delegate the plugin does not set up, and their
behaviour varies across macOS versions. A button that silently does nothing is worse than no button.

## Degrading silently

Neither notification may ever block a hide or abort startup. Every call is wrapped, and a failure is
logged and dropped:

```
WARN could not show the `Still running in the menu bar` notification: <cause>
```

This matters more than it sounds, because **notifications routinely fail in `tauri dev`**: macOS
generally requires a registered bundle identifier to deliver them, and the dev binary is unbundled.
Both notices may silently not appear there.

**Verify against a `tauri build` bundle before concluding the code is wrong.** Do Not Disturb and
denied notification permissions are the other two ordinary causes.

## Persistence

Each notice has a flag in the config file, written after it is shown:

```json
{ "first_close_notice_shown": true, "first_run_prompt_shown": true }
```

Deleting `app-config.json` resets both — see
[app configuration](07-app-config.md#resetting-to-a-fresh-install-state).

The "should this fire?" logic is pure and tested; only the delivery touches the plugin:

```rust
pub fn should_show_first_close_notice(already_shown: bool) -> bool { !already_shown }
pub fn should_show_first_run_prompt(already_shown: bool, autostart_enabled: bool) -> bool {
    !already_shown && !autostart_enabled
}
```

## Implementation

| Piece | File |
|---|---|
| Should it fire? (pure) | `src-tauri/src/lifecycle/policy.rs` |
| Delivery, message text | `src-tauri/src/notify.rs` |
| First-close trigger | `src-tauri/src/lifecycle/macos.rs` — `hide` |
| First-run trigger | `src-tauri/src/lib.rs` — `setup` |

## Tests

Every case for this feature is in the test catalog — the [`NOTE` cases](../../tests/catalog.md#notifications--note). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [NOTE-001](../../tests/cases/note/NOTE-001-first-run-prompt.md) | Fresh install, first launch -> a notification offers launch at login | partial | unit, e2e, manual |
| [NOTE-002](../../tests/cases/note/NOTE-002-first-close-notice.md) | Fresh install, first window close -> a notification says the app still runs in the menu bar | partial | unit, e2e, manual |
| [NOTE-003](../../tests/cases/note/NOTE-003-no-repeat-close-notice.md) | Close the window a second time -> no notification | partial | unit, e2e, manual |
| [NOTE-004](../../tests/cases/note/NOTE-004-no-repeat-first-run.md) | Relaunch once config exists -> no first-run notification | partial | unit, e2e, manual |
| [NOTE-005](../../tests/cases/note/NOTE-005-reset-refires.md) | Delete app-config.json and relaunch -> both notices fire again | partial | e2e, manual |
| [NOTE-006](../../tests/cases/note/NOTE-006-skip-when-registered.md) | Fresh install with autostart already registered -> the first-run prompt is skipped | partial | unit, e2e, manual |
| [NOTE-007](../../tests/cases/note/NOTE-007-do-not-disturb.md) | Trigger a notice with Do Not Disturb on -> no hang or crash, hide still works, a warn in the log | manual | manual |
| [NOTE-008](../../tests/cases/note/NOTE-008-notifications-denied.md) | Trigger a notice with notifications denied -> no hang or crash, hide still works, a warn in the log | manual | manual |
| NOTE-009 | Build both notices -> non-empty texts, the close notice names the menu bar and Quit | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

