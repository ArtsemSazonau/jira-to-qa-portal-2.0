# TRAY-001 — [OS tray][Icon] Launch the app -> a tray icon appears in the menu bar

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

The tray icon is the only way back into the app once the window is hidden. If it does not appear, hide-to-tray strands the user.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Fresh-install state: no config file and no login item.

  ```bash
  osascript -e 'tell application "jira-to-qa-portal" to quit'
  rm -f ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
  rm -f ~/Library/LaunchAgents/jira-to-qa-portal.plist
  ```

## Steps

1. Run `open -a "/Applications/jira-to-qa-portal.app"`.
2. Look at the right-hand side of the menu bar.

## Expected result

- A monochrome tray icon appears in the menu bar within a few seconds of launch.
- Hovering it shows the tooltip *QA Portal Sync*.

## Automated by

| Test | File |
|---|---|
| `Launch the app -> a tray icon appears in the menu bar` | [`e2e/specs/tray.e2e.ts`](../../../../e2e/specs/tray.e2e.ts) |

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [TRAY-001](../../catalog.md)
- Former checklist ID: T1
