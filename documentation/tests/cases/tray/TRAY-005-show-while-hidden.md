# TRAY-005 — [OS tray][Show Window] Show Window while hidden -> the same window reappears with its prior state

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

The show path must reuse the hidden window, not build a fresh one.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```

## Steps

1. Note the state of the **Launch at login** switch, and scroll or resize the window so its state is recognisable.
2. Click the red close button. The window hides.
3. Tray icon → **Show Window**.

## Expected result

- The window reappears, focused, with the same size, position and switch state as before the hide.

## Automated by

| Test | File |
|---|---|
| `showing_a_hidden_window_resolves_to_show_and_focus` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_show_menu_id_maps_to_the_show_action` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Show Window while hidden -> the same window reappears with its prior state` | [`e2e/specs/tray.e2e.ts`](../../../../e2e/specs/tray.e2e.ts) |

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [TRAY-005](../../catalog.md)
- Former checklist ID: T5
