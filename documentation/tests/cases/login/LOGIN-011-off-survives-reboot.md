# LOGIN-011 — [Launch at login][Login] Reboot after turning it off -> the app does not start

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

The off state must hold across a login, not only within the session.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- LOGIN-010 has just turned the toggle off.

## Steps

1. Reboot, or log out and back in.
2. Look at the menu bar.

## Expected result

- The app's tray icon does not appear.

## Automated by

Nothing yet.

## Why manual

Needs a real login cycle.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-011](../../catalog.md)
- Former checklist ID: A11
