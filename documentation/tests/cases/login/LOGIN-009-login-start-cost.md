# LOGIN-009 — [Launch at login][Login] Time a login start -> app ready without visibly delaying login

| | |
|---|---|
| Status | `manual` |
| Levels | manual, perf |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A background app must not slow down the user's login.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- LOGIN-007 has just started the app at login.

## Steps

1. Run `ps -o pid,lstart,etime -p "$(pgrep -f 'jira-to-qa-portal.app/Contents/MacOS' | head -1)"`.
2. Click the tray icon.

## Expected result

- The tray menu responds at once.
- Login was not visibly delayed. Record `lstart` and the time you finished logging in (see PERF-008).

## Automated by

Nothing yet.

## Why manual

Needs a real login cycle and a person to judge the delay.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-009](../../catalog.md)
- Former checklist ID: A9
