# UI-003 — [Settings UI][Appearance] Switch macOS to Dark appearance with the window open -> colours follow, text readable, switch visible in both states

| | |
|---|---|
| Status | `partial` |
| Levels | flow, manual |
| Module | [`App.css`](../../../../ui/src/App.css) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

The window follows the system appearance through the colour tokens in `index.css`.

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

1. System Settings → Appearance → **Dark**.
2. Toggle the switch on and off.
3. Switch back to **Light**.

## Expected result

- Colours change with the appearance.
- All text stays readable.
- The switch is visible in both its on and off states in both appearances.

## Automated by

| Test | File |
|---|---|
| `matches the approved light-appearance screenshots, switch off and on` | [`ui/flows/appearance.flow.ts`](../../../../ui/flows/appearance.flow.ts) |
| `matches the approved dark-appearance screenshots, switch off and on` | [`ui/flows/appearance.flow.ts`](../../../../ui/flows/appearance.flow.ts) |

## Manual remainder

The flows compare light and dark renders, switch off and on, against approved screenshot baselines, so a change is caught. Judging that a baseline is readable — and approving a new one — needs eyes, as does the real window following a live appearance switch.

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.css`](../../../../ui/src/App.css)
- Catalog: [UI-003](../../catalog.md)
- Former checklist ID: U3
