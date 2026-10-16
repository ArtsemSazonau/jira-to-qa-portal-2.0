# QUIT-008 — [Quit][Teardown] After any quit -> no crash report for the app

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## Purpose

A quit that panics on the way out still looks like a quit from the outside.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Note the newest file in `~/Library/Logs/DiagnosticReports/`.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```

## Steps

1. Quit the app (any path).
2. Open Console.app → Crash Reports, or run `ls -t ~/Library/Logs/DiagnosticReports | head`.

## Expected result

- There is no new crash report for `app` or `jira-to-qa-portal`.

## Automated by

| Test | File |
|---|---|
| `Press ⌘Q with the window focused -> the process exits, nothing left, no crash` | [`e2e/specs/quit.e2e.ts`](../../../../e2e/specs/quit.e2e.ts) |

## Related

- Feature: [Quit handling](../../../docs/features/03-quit-handling.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [QUIT-008](../../catalog.md)
- Former checklist ID: Q8
