# NOTE-003 — [Notifications][First close] Close the window a second time -> no notification

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`notify.rs`](../../../../src-tauri/src/notify.rs) |
| Feature | [One-time notifications](../../../docs/features/06-notifications.md) |

## Purpose

A notice on every close would be noise.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- NOTE-002 has just run.

## Steps

1. Tray → **Show Window**.
2. Click the red close button again.

## Expected result

- No notification appears.

## Automated by

| Test | File |
|---|---|
| `the_first_close_notice_shows_once` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_one_time_notices_stop_after_their_flag_is_persisted` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Close the window a second time -> no repeat` | [`e2e/specs/notices.e2e.ts`](../../../../e2e/specs/notices.e2e.ts) |

## Manual remainder

The e2e spec asserts nothing is re-recorded on the second close. That no banner appears is checked by eye.

## Related

- Feature: [One-time notifications](../../../docs/features/06-notifications.md)
- Module: [`src-tauri/src/notify.rs`](../../../../src-tauri/src/notify.rs)
- Catalog: [NOTE-003](../../catalog.md)
- Former checklist ID: N3
