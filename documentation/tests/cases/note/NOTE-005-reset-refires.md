# NOTE-005 — [Notifications][Reset] Delete app-config.json and relaunch -> both notices fire again

| | |
|---|---|
| Status | `partial` |
| Levels | e2e, manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

Deleting the config is the documented way back to a fresh install, and both notices belong to that state.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Both notices have been shown before.

## Steps

1. Quit the app.
2. Run `rm ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json`.
3. Relaunch the app.
4. Click the red close button.

## Expected result

- The first-run notification appears at launch (if launch at login is off).
- The *Still running in the menu bar* notification appears at the close.

## Automated by

| Test | File |
|---|---|
| `Delete app-config.json and relaunch -> both notices fire again` | [`e2e/specs/notices.e2e.ts`](../../../../e2e/specs/notices.e2e.ts) |

## Manual remainder

The e2e spec asserts both notices are made and recorded again after the reset. The banners themselves need eyes.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-005](../../catalog.md)
- Former checklist ID: N5
