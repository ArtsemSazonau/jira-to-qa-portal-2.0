# SYS-003 — [System][Moved app] Move the app out of /Applications with autostart on and relaunch -> the registration is re-asserted and logged

| | |
|---|---|
| Status | `partial` |
| Levels | unit, manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

A moved app leaves a plist pointing at the old path. The stored opt-in must re-register at the new one.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The toggle is on. Quit the app.
- Watch the log as in NOTE-007.

## Steps

1. Move `/Applications/jira-to-qa-portal.app` to `~/Desktop/`.
2. Launch it from `~/Desktop`.
3. Run `plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist`.
4. Move the app back to `/Applications` and relaunch it from there.

## Expected result

- The log carries `re-asserting the login item registration as true` (or the registration already points at the new path).
- The plist points at the `~/Desktop` copy while it runs from there.

## Automated by

| Test | File |
|---|---|
| `a_stored_opt_in_with_a_vanished_registration_is_re_asserted` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |

## Manual remainder

The decision is automated. The real move and the log line are checked by hand.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [SYS-003](../../catalog.md)
- Former checklist ID: X3
