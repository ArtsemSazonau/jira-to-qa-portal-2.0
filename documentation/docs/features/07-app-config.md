# 7. App configuration

Non-secret preferences that survive restarts, stored as JSON outside the app bundle.

## Location and shape

```
~/Library/Application Support/dev.sazonau.jira-to-qa-portal/app-config.json
```

```json
{
  "autostart_enabled": false,
  "first_close_notice_shown": false,
  "first_run_prompt_shown": false
}
```

All three default to `false`. The directory comes from Tauri's `app_config_dir()`, so it follows the
bundle identifier and is correct on every platform without special-casing.

| Field | Meaning |
|---|---|
| `autostart_enabled` | The stored launch-at-login preference. Reconciled against the OS on startup — see [launch at login](04-launch-at-login.md#reconciliation-the-os-is-the-source-of-truth). |
| `first_close_notice_shown` | The "still running in the menu bar" notice has fired. |
| `first_run_prompt_shown` | The launch-at-login offer has fired. |

## Secrets do not go here

Jira API tokens, the QA Portal login and LLM keys belong in the macOS Keychain via `keyring-rs`
(PLAN.md §2). That is not implemented yet — and when it is, it gets its own module. This file is
plain JSON in a user-readable directory; treat everything in it as public.

## Failure behaviour

Startup must never abort because config could not be read.

| Situation | Behaviour |
|---|---|
| File does not exist | Not an error. `try_load` returns `Ok(None)`, which the app reads as a fresh install. |
| File is corrupt | Logged at `warn`, defaults used. A bad hand-edit cannot stop the app starting. |
| Unknown keys present | Ignored. A file written by a newer build still loads. |
| Known keys missing | Filled from defaults (`#[serde(default)]`). |
| Write fails | Logged at `error`. Losing a preference is bad; failing a window close over it is worse. |

The `Ok(None)` vs `Ok(Some(all-false))` distinction is load-bearing, not pedantry: autostart
reconciliation behaves differently on a fresh install than on a stored explicit "off". `load()` is
the convenience wrapper that flattens both to defaults; `try_load()` is what `setup` uses.

## Writes are atomic

`save` writes to a sibling `.json.tmp` and renames. An interrupted write cannot leave a half-written
file that the next startup would report as corrupt. A test asserts no temp file is left behind.

`save` also creates the parent directory, so a first write on a fresh machine works with no setup.

## Runtime state is separate

The config holds what must survive a restart. Facts that only matter while the app runs —
`window_visible`, `tray_available`, `is_quitting` — live in `AppState` as atomics, never on disk.

They are atomics rather than fields behind the config mutex because they are read on the event-loop
thread on every window event; a lock there would put file I/O in the path of a close.

`update_config` skips the write entirely when the edit changed nothing, so a no-op does not create
the file or churn the disk.

## Why not `tauri-plugin-store`

PLAN.md §2 names `tauri-plugin-store`. **This is a deliberate deviation.**

The spec requires a unit test for "reading with no store present returns the documented default
(off)". A `tauri-plugin-store` store is reached through `AppHandle`, so that test would need
`tauri::test::mock_app` and the `tauri` `test` feature. With a plain serde struct it is a ten-line
test against a tempdir.

Three booleans do not justify a plugin. When the sync schedule and platform mappings land — richer
data, more writers, a reason to want the plugin's change notifications — swapping `config.rs` is a
contained change: nothing outside it sees more than `load` and `save`.

## Resetting to a fresh-install state

```bash
rm ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
rm ~/Library/LaunchAgents/jira-to-qa-portal.plist
```

The first resets both one-time notices and the stored autostart preference; the second removes the
OS registration, so reconciliation does not immediately re-adopt it.

## Implementation

`src-tauri/src/config.rs` — the struct, `try_load`, `load`, `save`, `config_path`.
`src-tauri/src/lifecycle/mod.rs` — `AppState`, which owns the in-memory copy and the write path.

## Tests

| Test | File |
|---|---|
| `default_is_all_off` | `config.rs` |
| `reading_with_no_store_present_returns_the_default` | `config.rs` |
| `writing_then_reading_returns_the_same_value` | `config.rs` |
| `save_creates_missing_parent_directories` | `config.rs` |
| `save_leaves_no_temp_file_behind` | `config.rs` |
| `a_corrupt_file_is_an_error_for_try_load_but_defaults_for_load` | `config.rs` |
| `unknown_and_missing_keys_do_not_break_the_read` | `config.rs` |
| `config_path_appends_the_file_name` | `config.rs` |
| `updating_the_config_writes_it_to_disk` | `lifecycle/mod.rs` |
| `an_update_that_changes_nothing_does_not_touch_the_file` | `lifecycle/mod.rs` |
| `snapshot_reflects_visibility_and_quit_flags` | `lifecycle/mod.rs` |
| `the_toggle_round_trips_through_the_config_file` | `tests/lifecycle_policy.rs` |
