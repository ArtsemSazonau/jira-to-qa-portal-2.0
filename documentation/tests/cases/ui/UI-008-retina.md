# UI-008 — [Settings UI][Rendering] Window on a Retina display -> text and the switch are sharp

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`App.css`](../../../../ui/src/App.css) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

Blurry text usually means a scaling bug in the webview setup.

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
- A Retina (2×) display.

## Steps

1. Look closely at the heading, the hint text and the switch.

## Expected result

- Text and the switch are crisp, not blurry.

## Automated by

Nothing yet.

## Why manual

Judging sharpness needs eyes.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.css`](../../../../ui/src/App.css)
- Catalog: [UI-008](../../catalog.md)
- Former checklist ID: U8
