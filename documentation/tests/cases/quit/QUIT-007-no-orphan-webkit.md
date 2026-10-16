# QUIT-007 — [Quit][Teardown] After any quit -> no orphaned WebKit processes

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## Purpose

The three WebKit helpers are launchd children, not children of `app`, so they can outlive it unnoticed.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Before launching, record the system baseline: `pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l`. Other apps keep their own helpers.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```

## Steps

1. Quit the app (any path).
2. Wait 3 seconds.
3. Run `pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l`.

## Expected result

- The count is back to the baseline recorded before launch.

## Automated by

| Test | File |
|---|---|
| `App menu → Quit -> the process exits and its WebKit helpers go with it` | [`e2e/specs/quit.e2e.ts`](../../../../e2e/specs/quit.e2e.ts) |

## Related

- Feature: [Quit handling](../../../docs/features/03-quit-handling.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [QUIT-007](../../catalog.md)
- Former checklist ID: Q7
