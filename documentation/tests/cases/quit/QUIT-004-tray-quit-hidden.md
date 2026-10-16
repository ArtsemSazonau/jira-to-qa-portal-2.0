# QUIT-004 — [Quit][Tray] Tray → Quit with the window hidden -> the process exits and the tray icon disappears

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## Purpose

Quitting from the background state is the common case for a menu bar app.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```
- The window is hidden: click its red close button once. The Dock icon disappears and the tray icon stays.

## Steps

1. Tray icon → **Quit**.
2. Run `pgrep -fl "qa-portal"`.

## Expected result

- The process exits and the tray icon disappears.
- `pgrep` prints nothing.

## Automated by

| Test | File |
|---|---|
| `quit_triggers_exit_regardless_of_window_state` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_tray_quit_item_follows_the_same_path_as_cmd_q` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Tray → Quit with the window hidden -> the process exits and the tray icon disappears` | [`e2e/specs/quit.e2e.ts`](../../../../e2e/specs/quit.e2e.ts) |

## Related

- Feature: [Quit handling](../../../docs/features/03-quit-handling.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [QUIT-004](../../catalog.md)
- Former checklist ID: Q4
