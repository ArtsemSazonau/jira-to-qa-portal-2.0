# NOTE-001 — [Notifications][First run] Fresh install, first launch -> a notification offers launch at login

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

The opt-in is offered once, so a user who wants login starts can find it.

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
- Notifications are allowed for the app (System Settings → Notifications).

## Steps

1. Run `open -a "/Applications/jira-to-qa-portal.app"`.

## Expected result

- A notification titled *Start QA Portal Sync at login?* appears.

## Automated by

| Test | File |
|---|---|
| `the_first_run_prompt_shows_once_and_only_when_autostart_is_off` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Fresh install, first launch -> the launch-at-login offer is shown once` | [`e2e/specs/notices.e2e.ts`](../../../../e2e/specs/notices.e2e.ts) |

## Manual remainder

The e2e spec asserts the offer was made and recorded (its flag flips on the first launch). Whether macOS actually shows the banner needs eyes.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-001](../../catalog.md)
- Former checklist ID: N1
