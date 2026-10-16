# QUIT-001 — [Quit][⌘Q] Press ⌘Q with the window focused -> the process exits and the tray icon disappears

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## Purpose

The single most important quit check. macOS sends `ExitRequested` before the window's `CloseRequested`; if that ordering ever breaks, ⌘Q hides instead of quitting.

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

## Steps

1. Click into the window so it has focus.
2. Press ⌘Q.
3. Run `pgrep -fl "qa-portal"`.

## Expected result

- The window closes and the tray icon disappears.
- `pgrep` prints nothing.

## Automated by

| Test | File |
|---|---|
| `close_while_quitting_is_allowed_through` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `while_quitting_a_close_is_let_through` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `cmd_q_quits_even_though_macos_closes_the_window_on_the_way_out` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Press ⌘Q with the window focused -> the process exits, nothing left, no crash` | [`e2e/specs/quit.e2e.ts`](../../../../e2e/specs/quit.e2e.ts) |

## Related

- Feature: [Quit handling](../../../docs/features/03-quit-handling.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [QUIT-001](../../catalog.md)
- Former checklist ID: Q1
