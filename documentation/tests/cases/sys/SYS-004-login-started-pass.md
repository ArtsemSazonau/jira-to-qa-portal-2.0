# SYS-004 — [System][Login start] Full manual pass with the app started by the login item -> every case behaves the same once the window is shown

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

A login start begins in a different state (hidden, `Accessory`). Everything after the first show must match a manual start.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The app was started by the login item (LOGIN-007).

## Steps

1. Tray → **Show Window**.
2. Run the manual cases of the TRAY, HIDE and QUIT areas against this instance.

## Expected result

- Every case behaves as it does after a manual launch.

## Automated by

Nothing yet.

## Why manual

Needs a real login cycle and a full manual pass.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [SYS-004](../../catalog.md)
- Former checklist ID: X4
