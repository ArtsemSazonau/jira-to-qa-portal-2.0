# HIDE-005 — [Hide to tray][Show] Tray Show Window after a hide -> Dock icon and ⌘-Tab entry return, window focused in front

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

The show path must return to `Regular` before showing, or an `Accessory` app's window can come up behind other apps.

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
- Another app's window is in front.

## Steps

1. Tray icon → **Show Window**.
2. Look at the Dock, then press ⌘-Tab.

## Expected result

- The Dock icon is back.
- The app is back in ⌘-Tab.
- The window is focused and in front of other apps' windows.

## Automated by

| Test | File |
|---|---|
| `Tray Show Window after a hide -> Dock icon back, same window in front` | [`e2e/specs/hide.e2e.ts`](../../../../e2e/specs/hide.e2e.ts) |

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-005](../../catalog.md)
- Former checklist ID: H5
