# UI-005 — [Settings UI][Keyboard] Tab to the switch and press Space -> it toggles

| | |
|---|---|
| Status | `partial` |
| Levels | flow, manual |
| Module | [`App.tsx`](../../../../ui/src/App.tsx) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

The switch is a native checkbox, so keyboard operation should come for free; this proves it.

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
- Know your keyboard-navigation setting: macOS only moves focus to switches and buttons with plain Tab when System Settings → Keyboard → **Keyboard navigation** is on. With it off, use Option-Tab instead of Tab below.

## Steps

1. Press Tab (or Option-Tab) until the switch has a focus ring.
2. Press Space.
3. Press Space again to restore it.

## Expected result

- The switch toggles each time, and the login item follows (see LOGIN-002 / LOGIN-010).

## Automated by

| Test | File |
|---|---|
| `toggles from the keyboard, and the backend receives the change` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |

## Manual remainder

The flow moves focus with Option-Tab and toggles with Space in WebKit, and asserts the backend received the change. That the real window does the same, and that the login item follows, is checked by hand.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.tsx`](../../../../ui/src/App.tsx)
- Catalog: [UI-005](../../catalog.md)
- Former checklist ID: U5
