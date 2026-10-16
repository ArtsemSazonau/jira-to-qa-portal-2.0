# CONF-004 — [Config][Recovery] Delete the file and relaunch -> app starts and the file is recreated

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

Deleting the file is the documented reset.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Quit the app.

## Steps

1. Run `rm ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json`.
2. Launch the app.
3. List the config directory.

## Expected result

- The app starts.
- `app-config.json` exists again.

## Automated by

| Test | File |
|---|---|
| `reading_with_no_store_present_returns_the_default` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `save_creates_missing_parent_directories` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `Delete the file and relaunch -> app starts and the file is recreated` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-004](../../catalog.md)
- Former checklist ID: C4
