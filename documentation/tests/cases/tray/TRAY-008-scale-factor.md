# TRAY-008 — [OS tray][Scale] Move the window to a display with another scale factor -> the icon stays sharp

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

The icon embeds a @2x asset. On a display with a different scale factor it must not be blurry or drawn twice.

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
- An external display with a different scale factor from the built-in one is connected.

## Steps

1. Drag the app window to the external display.
2. Look at the tray icon on both menu bars.

## Expected result

- The icon is sharp on both displays. It is not blurry, and it is not doubled.

## Automated by

Nothing yet.

## Why manual

Needs a second physical display and eyes.

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [TRAY-008](../../catalog.md)
- Former checklist ID: T8
