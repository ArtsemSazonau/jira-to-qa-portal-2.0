# HIDE-009 — [Hide to tray][Rapid cycles] Hide then show 5 times quickly -> never more than one window, always focused in front

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

Back-to-back show requests must degrade to a focus, never create a window.

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

1. Five times in quick succession: click the red close button, then tray icon → **Show Window**.
2. Open the app's **Window** menu, or Mission Control.

## Expected result

- There is exactly one app window.
- After the last show, the window is focused and in front.

## Automated by

| Test | File |
|---|---|
| `repeated_show_requests_never_ask_for_more_than_a_focus` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `a_show_request_never_does_more_than_show_and_focus` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Hide then show 5 times quickly -> never more than one window, always focused in front` | [`e2e/specs/hide.e2e.ts`](../../../../e2e/specs/hide.e2e.ts) |

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-009](../../catalog.md)
- Former checklist ID: H9
