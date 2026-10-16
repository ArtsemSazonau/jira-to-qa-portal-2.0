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

PLAN.md §2 originally named `tauri-plugin-store`. **This is a deliberate deviation.**

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

Every case for this feature is in the test catalog — the [`CONF` cases](../../tests/catalog.md#config--conf). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [CONF-001](../../tests/cases/conf/CONF-001-file-created.md) | First launch -> app-config.json is created in Application Support | automated | e2e |
| [CONF-002](../../tests/cases/conf/CONF-002-toggle-persisted.md) | Toggle autostart on and quit -> the file has "autostart_enabled": true | automated | unit, e2e |
| [CONF-003](../../tests/cases/conf/CONF-003-corrupt-file.md) | Corrupt the file and relaunch -> app starts with defaults and logs a parse warning | automated | unit, e2e |
| [CONF-004](../../tests/cases/conf/CONF-004-deleted-file.md) | Delete the file and relaunch -> app starts and the file is recreated | automated | unit, e2e |
| [CONF-005](../../tests/cases/conf/CONF-005-unknown-key.md) | Add an unknown key by hand and relaunch -> app starts and ignores it | automated | unit, e2e |
| [CONF-006](../../tests/cases/conf/CONF-006-no-temp-file.md) | Launch and toggle several times -> no .json.tmp left in the config dir | automated | unit, e2e |
| [CONF-007](../../tests/cases/conf/CONF-007-read-only-dir.md) | Make the config dir read-only and toggle -> the toggle still works and the log carries "could not persist config" | automated | unit, e2e |
| CONF-008 | An update that changes nothing -> the file is not written | automated | unit |
| CONF-009 | No stored values -> every setting is off | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

