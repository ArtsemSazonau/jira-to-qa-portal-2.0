# UI-002 — [Settings UI][Loading] Open the window -> the toggle is briefly disabled, then interactive

| | |
|---|---|
| Status | `partial` |
| Levels | component, flow, manual |
| Module | [`App.tsx`](../../../../ui/src/App.tsx) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

Clicking before the real state is known would write a guess.

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

1. Watch the switch as the window opens.

## Expected result

- The switch becomes interactive within a moment and shows the real state.

## Automated by

| Test | File |
|---|---|
| `is disabled until the backend has answered` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `renders off when the app is not registered` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `keeps the switch disabled until the backend has answered` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |

## Manual remainder

Both states are automated, in jsdom and in WebKit with a slow scripted backend. The real backend's timing in the app window is checked by hand.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.tsx`](../../../../ui/src/App.tsx)
- Catalog: [UI-002](../../catalog.md)
- Former checklist ID: U2
