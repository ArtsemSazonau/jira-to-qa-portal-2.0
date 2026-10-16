# UI-004 — [Settings UI][Layout] Resize the window narrow -> no horizontal overflow

| | |
|---|---|
| Status | `partial` |
| Levels | flow, manual |
| Module | [`App.css`](../../../../ui/src/App.css) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

The panel must stay usable at small window widths.

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

1. Drag the window's edge until it is as narrow as it goes.

## Expected result

- No horizontal scrollbar appears and no content is cut off.

## Automated by

| Test | File |
|---|---|
| `fits a 360 px wide window with no horizontal overflow` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |

## Manual remainder

The flow asserts no horizontal overflow at 360 px in WebKit. Dragging the real window narrower still is checked by hand.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.css`](../../../../ui/src/App.css)
- Catalog: [UI-004](../../catalog.md)
- Former checklist ID: U4
