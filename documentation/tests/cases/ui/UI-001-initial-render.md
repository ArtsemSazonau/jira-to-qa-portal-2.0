# UI-001 — [Settings UI][Layout] Open the window -> heading, subtitle, Launch at login row, hide button and its explanation

| | |
|---|---|
| Status | `partial` |
| Levels | component, flow, manual |
| Module | [`App.tsx`](../../../../ui/src/App.tsx) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

Everything the window offers is visible on open.

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

1. Look at the window.

## Expected result

- Heading *QA Portal Sync* and the subtitle.
- The **Launch at login** row with its hint and switch.
- The **Hide to menu bar** button with the hint mentioning ⌘Q.

## Automated by

| Test | File |
|---|---|
| `offers a hide button and explains how to quit` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `shows the heading, the launch-at-login row and the hide button with its hint` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |

## Manual remainder

The flow checks every element in WebKit, against the mock backend. That the real app window shows the same, in its WKWebView, is checked by hand.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.tsx`](../../../../ui/src/App.tsx)
- Catalog: [UI-001](../../catalog.md)
- Former checklist ID: U1
