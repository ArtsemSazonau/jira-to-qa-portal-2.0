# LOGIN-006 — [Launch at login][Restart] Quit and relaunch with the toggle on -> still on, exactly one plist

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

Reconciliation at startup must not register a duplicate when both sides already agree.

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

1. Quit the app (tray → Quit).
2. Relaunch it with `open -a "/Applications/jira-to-qa-portal.app"`.
3. Run `ls ~/Library/LaunchAgents | grep -i qa-portal`.

## Expected result

- The switch reads on.
- Exactly one plist is listed.

## Automated by

| Test | File |
|---|---|
| `agreement_needs_no_correction_in_either_direction` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `reconciliation_never_asks_to_register_what_is_already_registered` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `autostart_across_a_fresh_install_opt_in_and_restart` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Quit and relaunch with the toggle on -> still on, exactly one plist` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-006](../../catalog.md)
- Former checklist ID: A6
