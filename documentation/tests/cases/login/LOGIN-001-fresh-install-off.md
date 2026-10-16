# LOGIN-001 — [Launch at login][Fresh install] First launch -> the toggle reads off and no plist exists

| | |
|---|---|
| Status | `automated` |
| Levels | unit, component, e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A fresh install must not enrol itself at login.

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

## Steps

1. Run `open -a "/Applications/jira-to-qa-portal.app"`.
2. Look at the **Launch at login** switch.
3. Run `ls ~/Library/LaunchAgents | grep -i qa-portal`.

## Expected result

- The switch is off.
- `ls` finds no `jira-to-qa-portal.plist`.

## Automated by

| Test | File |
|---|---|
| `a_fresh_install_with_no_registration_is_off` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `autostart_across_a_fresh_install_opt_in_and_restart` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `renders off when the app is not registered` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `Fresh install, first launch -> the toggle reads off and no plist exists` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-001](../../catalog.md)
- Former checklist ID: A1
