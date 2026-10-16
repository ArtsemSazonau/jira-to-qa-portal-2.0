# INST-003 — [Single instance][Reopen] Launch from Spotlight while visible -> the existing window comes forward, no second window

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

Reopening a visible app must only bring it forward.

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
- Another app's window is in front.

## Steps

1. Press ⌘Space, type `jira-to-qa-portal`, press Return.
2. Open the app's **Window** menu, or Mission Control.

## Expected result

- The existing window comes to the front.
- There is exactly one app window.

## Automated by

| Test | File |
|---|---|
| `reopen_focuses_when_the_window_is_already_up` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `open -a while visible -> the existing window comes forward, no second window` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Manual remainder

The e2e spec drives the same Reopen path with open -a. Launching from Spotlight itself is checked by hand.

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-003](../../catalog.md)
- Former checklist ID: S3
