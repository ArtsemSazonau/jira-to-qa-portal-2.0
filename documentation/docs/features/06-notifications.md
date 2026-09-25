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

| Test | File |
|---|---|
| `the_first_close_notice_shows_once` | `policy.rs` |
| `the_first_run_prompt_shows_once_and_only_when_autostart_is_off` | `policy.rs` |
| `the_one_time_notices_stop_after_their_flag_is_persisted` | `tests/lifecycle_policy.rs` |
| `the_first_run_prompt_is_skipped_when_autostart_is_already_on` | `tests/lifecycle_policy.rs` |

Delivery itself is manual —
[the functional checklist](../../tests/functional-checklist.md#module-notifyrs).
