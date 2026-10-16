# HIDE-001 — [Hide to tray][Close button] Click the red close button -> the window disappears instantly, nothing lands in the Dock

| | |
|---|---|
| Status | `partial` |
| Levels | unit, e2e, manual |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

The core of the feature: closing hides rather than quits, with the instant feel of ⌘H rather than a minimise animation.

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

1. Click the red close button of the window.

## Expected result

- The window disappears at once.
- There is no minimise animation and nothing is added to the Dock.

## Automated by

| Test | File |
|---|---|
| `close_on_a_visible_window_hides_it` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `Click the close button -> hidden, no Dock icon, tray kept, process alive` | [`e2e/specs/hide.e2e.ts`](../../../../e2e/specs/hide.e2e.ts) |

## Manual remainder

The e2e spec asserts the hide through the snapshot, the window count and the activation policy. That it happens instantly, with no minimise animation, is judged by eye.

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-001](../../catalog.md)
- Former checklist ID: H1
