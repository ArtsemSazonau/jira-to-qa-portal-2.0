# INST-001 — [Single instance][Reopen] Launch from Finder while running hidden -> the existing window appears, focused

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

macOS activates an already-running app instead of starting a second process. That arrives as `RunEvent::Reopen`, a different path from the single-instance plugin.

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

1. In Finder, open `/Applications` and double-click `jira-to-qa-portal`.

## Expected result

- The existing window appears and is focused.

## Automated by

| Test | File |
|---|---|
| `reopen_shows_the_window_when_it_is_hidden` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `relaunching_from_finder_reveals_the_hidden_window` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `open -a while hidden -> the existing window appears, one process, one icon` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Manual remainder

The e2e spec drives the same Launch Services path with open -a and asserts the window, one process and one icon. A literal double-click in Finder is checked by hand.

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-001](../../catalog.md)
- Former checklist ID: S1
