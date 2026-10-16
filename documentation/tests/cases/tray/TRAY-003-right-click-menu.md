# TRAY-003 — [OS tray][Menu] Right-click the icon -> the same menu opens

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

Users reach for either button. `show_menu_on_left_click(true)` makes both open the same menu.

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

1. Right-click the tray icon.

## Expected result

- The same menu as TRAY-002 opens: **Show Window**, a separator, **Quit**.

## Automated by

| Test | File |
|---|---|
| `Right-click the icon -> the same menu opens` | [`e2e/specs/tray.e2e.ts`](../../../../e2e/specs/tray.e2e.ts) |

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [TRAY-003](../../catalog.md)
- Former checklist ID: T3
