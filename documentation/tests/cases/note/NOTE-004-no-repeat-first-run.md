# NOTE-004 — [Notifications][First run] Relaunch once config exists -> no first-run notification

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

The first-run flag must persist across restarts.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- NOTE-001 has run, so the config file exists.

## Steps

1. Quit the app.
2. Relaunch it.

## Expected result

- No *Start QA Portal Sync at login?* notification appears.

## Automated by

| Test | File |
|---|---|
| `the_first_run_prompt_shows_once_and_only_when_autostart_is_off` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Relaunch once config exists -> no first-run offer again` | [`e2e/specs/notices.e2e.ts`](../../../../e2e/specs/notices.e2e.ts) |

## Manual remainder

The e2e spec asserts the stored flags are unchanged after a relaunch. That no banner appears is checked by eye.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-004](../../catalog.md)
- Former checklist ID: N4
