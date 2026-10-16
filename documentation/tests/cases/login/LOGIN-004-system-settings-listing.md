# LOGIN-004 — [Launch at login][System Settings] Open Login Items -> the app is listed under Allow in the Background

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

`MacosLauncher::LaunchAgent` registers a background item, not an *Open at Login* item. Users look for it in Settings.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The toggle is on.

## Steps

1. System Settings → General → Login Items & Extensions.

## Expected result

- The app is listed under **Allow in the Background**, not under *Open at Login*.

## Automated by

Nothing yet.

## Why manual

Needs System Settings and eyes.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-004](../../catalog.md)
- Former checklist ID: A4
