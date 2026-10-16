# HIDE-008 — [Hide to tray][Hide button] Click "Hide to menu bar" in the window -> the window hides as with the close button

| | |
|---|---|
| Status | `automated` |
| Levels | unit, component, flow, e2e |
| Module | [`ipc_commands.rs`](../../../../src-tauri/src/ipc_commands.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

The in-window button is the discoverable way to hide. It must take the same path as the close button.

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

1. Click **Hide to menu bar** in the window.

## Expected result

- The window hides exactly as in HIDE-001; the Dock icon goes; the tray icon stays.

## Automated by

| Test | File |
|---|---|
| `asks the backend to hide the window when the hide button is clicked` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `asks the backend to hide when the hide button is clicked` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |
| `the_hide_button_hides_a_visible_window` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Click "Hide to menu bar" in the window -> the window hides as with the close button` | [`e2e/specs/hide.e2e.ts`](../../../../e2e/specs/hide.e2e.ts) |

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/ipc_commands.rs`](../../../../src-tauri/src/ipc_commands.rs)
- Catalog: [HIDE-008](../../catalog.md)
- Former checklist ID: H8
