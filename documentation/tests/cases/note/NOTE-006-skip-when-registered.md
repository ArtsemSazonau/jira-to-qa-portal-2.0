# NOTE-006 — [Notifications][First run] Fresh install with autostart already registered -> the first-run prompt is skipped

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

Offering what is already on is noise, and on a login-item start it would fire at every login.

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
- A login item for the app already exists: launch once, turn the toggle on, quit, then delete only `app-config.json`.

## Steps

1. Relaunch the app.

## Expected result

- No first-run notification appears.
- The toggle reads on.

## Automated by

| Test | File |
|---|---|
| `the_first_run_prompt_shows_once_and_only_when_autostart_is_off` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_first_run_prompt_is_skipped_when_autostart_is_already_on` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Fresh install with autostart already registered -> the first-run offer is skipped` | [`e2e/specs/notices.e2e.ts`](../../../../e2e/specs/notices.e2e.ts) |

## Manual remainder

The e2e spec asserts the offer is not recorded when a login item already exists. That no banner appears is checked by eye.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-006](../../catalog.md)
- Former checklist ID: N6
