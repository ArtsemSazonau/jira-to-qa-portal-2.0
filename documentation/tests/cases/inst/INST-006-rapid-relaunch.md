# INST-006 — [Single instance][Rapid relaunch] Relaunch from Finder 5 times quickly -> still one window and one tray icon

| | |
|---|---|
| Status | `partial` |
| Levels | e2e, manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

Back-to-back activations must not race into a second window or icon.

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

1. Double-click the app in Finder five times in quick succession.
2. Run `pgrep -fl "jira-to-qa-portal.app/Contents/MacOS"` and look at the menu bar and the Window menu.

## Expected result

- One process, one tray icon, one window.

## Automated by

| Test | File |
|---|---|
| `Relaunch 5 times quickly -> still one window and one tray icon` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Manual remainder

The e2e spec relaunches five times in quick succession with open -a. Five fast double-clicks in Finder are checked by hand.

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-006](../../catalog.md)
- Former checklist ID: S6
