# HIDE-010 — [Hide to tray][Webview] Hide -> the three WebKit helpers are retained, about 45 MB between them

| | |
|---|---|
| Status | `manual` |
| Levels | manual, perf |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

Records the documented cost of hiding rather than destroying the window. The planned destroy-on-close change is gated on this number.

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

1. Click the red close button and wait 30 seconds.
2. Run `ps -ax | grep WebContent | grep -v grep`.
3. Measure the helpers as in PERF-003.

## Expected result

- Three WebKit helpers (WebContent, GPU, Networking) belonging to the app are still alive.
- Their combined footprint is about 45 MB. Record the number.

## Automated by

Nothing yet.

## Why manual

A measurement on a running bundle. See PERF-003 for the procedure.

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-010](../../catalog.md)
- Former checklist ID: H10
