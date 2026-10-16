# LOGIN-012 — [Launch at login][Reconcile] Added in System Settings while the toggle is off, then restart -> toggle reads on

| | |
|---|---|
| Status | `partial` |
| Levels | unit, component, e2e, manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

The toggle must reflect what the OS really has, not a stale stored value.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The toggle is off.

## Steps

1. System Settings → General → Login Items & Extensions → add the app with **+** under *Open at Login*.
2. Quit and relaunch the app.

## Expected result

- The switch reads on.

## Automated by

| Test | File |
|---|---|
| `registered_behind_our_back_wins_over_a_stored_off` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `autostart_reflects_a_login_item_added_in_system_settings` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `reflects the real registration state rather than a default` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `Login item added outside the app while the toggle is off, then restart -> toggle reads on` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Manual remainder

The e2e spec writes the login item itself, behind the app's back, and asserts the toggle and stored setting follow it. Adding the item through System Settings, as a user would, is checked by hand.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-012](../../catalog.md)
- Former checklist ID: A12
