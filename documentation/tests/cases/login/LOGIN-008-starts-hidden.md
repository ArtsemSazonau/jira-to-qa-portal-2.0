# LOGIN-008 — [Launch at login][Login] Start by the login item -> starts hidden: tray icon, no window, no Dock icon

| | |
|---|---|
| Status | `partial` |
| Levels | unit, manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A login start must be quiet. The `--hidden` argument is the only thing telling it apart from a manual launch.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- LOGIN-007 has just started the app at login.

## Steps

1. Look at the screen, the Dock and the menu bar.

## Expected result

- The tray icon is present.
- No app window is shown.
- There is no Dock icon.

## Automated by

| Test | File |
|---|---|
| `the_hidden_flag_marks_a_login_item_launch` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_login_item_argument_is_what_starts_the_app_hidden` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |

## Manual remainder

Detecting `--hidden` is automated. The real login start is checked by hand.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [LOGIN-008](../../catalog.md)
- Former checklist ID: A8
