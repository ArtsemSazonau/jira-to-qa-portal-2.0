# LOGIN-013 — [Launch at login][Reconcile] Plist deleted by hand while on, then restart -> toggle reads on and the plist is re-created

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A stored opt-in whose registration vanished (say, after the app moved) is re-asserted, not silently dropped.

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

1. Quit the app.
2. Run `rm ~/Library/LaunchAgents/jira-to-qa-portal.plist`.
3. Relaunch the app.
4. Run `ls ~/Library/LaunchAgents | grep -i qa-portal`.

## Expected result

- The switch reads on.
- The plist is back.

## Automated by

| Test | File |
|---|---|
| `a_stored_opt_in_with_a_vanished_registration_is_re_asserted` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `autostart_restores_an_opt_in_whose_registration_disappeared` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Plist deleted while the toggle is on, then restart -> toggle reads on and the plist is re-created` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-013](../../catalog.md)
- Former checklist ID: A13
