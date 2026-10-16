# CONF-005 — [Config][Compatibility] Add an unknown key by hand and relaunch -> app starts and ignores it

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

A file written by a newer build must still load.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The config file exists. Quit the app.

## Steps

1. Add `"sync_interval_minutes": 30,` inside the JSON object of `app-config.json`.
2. Launch the app.

## Expected result

- The app starts normally; the other settings are kept.

## Automated by

| Test | File |
|---|---|
| `unknown_and_missing_keys_do_not_break_the_read` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `Add an unknown key by hand and relaunch -> app starts and ignores it` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-005](../../catalog.md)
- Former checklist ID: C5
