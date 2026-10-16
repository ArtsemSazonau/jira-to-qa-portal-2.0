# INST-004 — [Single instance][Reopen] open -a while hidden -> the window appears

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

`open -a` is the scriptable equivalent of a Finder launch and drives the same `Reopen` path.

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

1. Run `open -a "/Applications/jira-to-qa-portal.app"`.

## Expected result

- The window appears and is focused.

## Automated by

| Test | File |
|---|---|
| `open -a while hidden -> the existing window appears, one process, one icon` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-004](../../catalog.md)
- Former checklist ID: S4
