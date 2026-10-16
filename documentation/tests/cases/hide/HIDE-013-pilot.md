# HIDE-013 — [Hide to tray][Pilot] Launch -> close -> tray Show Window -> toggle launch at login -> setting persisted

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

The gate for the end-to-end harness (design §6): one scenario that crosses both surfaces — the webview through the embedded WebDriver session, the close button and the menu bar icon through Appium — and asserts every step through the core state snapshot.

## Preconditions

- The test build exists: `npm run build:e2e`.
- The prerequisites are met: `npm run test:doctor` is all green.

## Steps

1. Launch the test build on a fresh install (the harness does this).
2. Check the settings switch is reachable and off (gate a).
3. Click the window's red close button (gate c).
4. Tray icon → **Show Window** (gate b).
5. Turn **Launch at login** on.
6. Read the config file and look for the login item.
7. Turn **Launch at login** off again, leaving no login item behind.

## Expected result

- At launch the snapshot reports the window visible, the tray available, autostart off.
- After the close, both the core and the platform report the window hidden; the tray is still available.
- After Show Window, both report it visible again.
- After the toggle, the stored config and the OS registration are both on, and `jira-to-qa-portal-e2e.plist` exists.
- After turning it off, the registration and the plist are gone.

## Automated by

| Test | File |
|---|---|
| `Launch -> close -> tray Show Window -> toggle launch at login -> setting persisted` | [`e2e/specs/pilot.e2e.ts`](../../../../e2e/specs/pilot.e2e.ts) |

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-013](../../catalog.md)
