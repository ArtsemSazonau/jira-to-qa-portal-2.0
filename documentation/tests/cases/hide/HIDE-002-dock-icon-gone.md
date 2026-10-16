# HIDE-002 — [Hide to tray][Activation policy] After a hide -> Dock icon gone, app absent from ⌘-Tab

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## Purpose

Hiding drops the app to `ActivationPolicy::Accessory`. A hidden app that keeps its Dock icon looks like a hung one.

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

1. Click the red close button.
2. Look at the Dock.
3. Hold ⌘ and press Tab.

## Expected result

- The app's Dock icon is **gone**.
- The app is **not** in the ⌘-Tab switcher.

## Automated by

| Test | File |
|---|---|
| `Click the close button -> hidden, no Dock icon, tray kept, process alive` | [`e2e/specs/hide.e2e.ts`](../../../../e2e/specs/hide.e2e.ts) |

## Related

- Feature: [Hide to tray](../../../docs/features/02-hide-to-tray.md)
- Module: [`src-tauri/src/lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs)
- Catalog: [HIDE-002](../../catalog.md)
- Former checklist ID: H2
