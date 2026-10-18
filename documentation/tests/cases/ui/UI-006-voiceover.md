# UI-006 — [Settings UI][Accessibility] Focus the switch with VoiceOver on -> announced as a switch named "Launch at login" with its state

| | |
|---|---|
| Status | `partial` |
| Levels | component, manual |
| Module | [`views/SettingsView.tsx`](../../../../ui/src/views/SettingsView.tsx) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

Screen-reader users must get the control's role, name and state.

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

1. Turn VoiceOver on (⌘F5).
2. Move the VoiceOver cursor to the switch.
3. Turn VoiceOver off.

## Expected result

- VoiceOver announces a switch named *Launch at login* with its on/off state.

## Automated by

| Test | File |
|---|---|
| `exposes the toggle as a switch named "Launch at login" with its state` | [`ui/src/App.a11y.test.tsx`](../../../../ui/src/App.a11y.test.tsx) |
| `has no axe violations once loaded` | [`ui/src/App.a11y.test.tsx`](../../../../ui/src/App.a11y.test.tsx) |

## Manual remainder

The role (`switch`), the accessible name and the checked state are asserted in jsdom, and axe finds no label or ARIA violations. What VoiceOver actually announces needs a person listening.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/views/SettingsView.tsx`](../../../../ui/src/views/SettingsView.tsx)
- Catalog: [UI-006](../../catalog.md)
- Former checklist ID: U6
