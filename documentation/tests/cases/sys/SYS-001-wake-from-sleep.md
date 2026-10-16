# SYS-001 — [System][Sleep] Sleep the Mac for an hour with the app hidden, then wake -> same PID, tray responds, window shows

| | |
|---|---|
| Status | `manual` |
| Levels | manual, perf |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

The app is meant to run for weeks, across sleep cycles.

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
- The window is hidden: click its red close button once. The Dock icon disappears and the tray icon stays.

## Steps

1. Run `ps -o pid,etime,rss= -p "$APP_PID"` and note the output.
2. Run `sudo pmset sleepnow`.
3. Wake the Mac at least an hour later.
4. Run `ps -o pid,etime,rss= -p "$APP_PID"` again.
5. Tray → **Show Window**.

## Expected result

- Same PID; `etime` spans the sleep; RSS not materially higher.
- The tray responds and the window shows correctly.

## Automated by

Nothing yet.

## Why manual

Needs an hour of real sleep. See PERF-009 for the measurement.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [SYS-001](../../catalog.md)
- Former checklist ID: X1
