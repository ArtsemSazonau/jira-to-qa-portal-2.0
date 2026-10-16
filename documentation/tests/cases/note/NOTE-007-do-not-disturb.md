# NOTE-007 — [Notifications][Degrade] Trigger a notice with Do Not Disturb on -> no hang or crash, hide still works, a warn in the log

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

A notification macOS refuses must never block a hide or abort startup.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Fresh-install state: no config file and no login item.

  ```bash
  osascript -e 'tell application "jira-to-qa-portal" to quit'
  rm -f ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
  rm -f ~/Library/LaunchAgents/jira-to-qa-portal.plist
  ```
- Focus → Do Not Disturb is on.
- Watch the log: `log stream --predicate 'process == "app"'` in a second terminal.

## Steps

1. Launch the app.
2. Click the red close button.

## Expected result

- The window hides normally.
- The app does not hang or crash.
- If delivery failed, the log carries a `could not show the … notification` warning.

## Automated by

Nothing yet.

## Why manual

Needs the system's Focus mode.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-007](../../catalog.md)
- Former checklist ID: N7
