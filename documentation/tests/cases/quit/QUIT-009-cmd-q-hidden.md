# QUIT-009 — [Quit][⌘Q] ⌘Q while the window is hidden -> the app exits cleanly

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## Purpose

A hidden `Accessory` app can still receive ⌘Q once focused. It must exit, not toggle the window.

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

1. Click the tray icon so the app becomes active (do not choose a menu item; press Escape to close the menu).
2. Press ⌘Q.
3. Run `pgrep -fl "qa-portal"`.

## Expected result

- The process exits and the tray icon disappears.
- `pgrep` prints nothing.

## Automated by

| Test | File |
|---|---|
| `⌘Q while the window is hidden -> the app exits cleanly` | [`e2e/specs/quit.e2e.ts`](../../../../e2e/specs/quit.e2e.ts) |

## Related

- Feature: [Quit handling](../../../docs/features/03-quit-handling.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [QUIT-009](../../catalog.md)
- Former checklist ID: Q9
