# CONF-006 — [Config][Atomic write] Launch and toggle several times -> no .json.tmp left in the config dir

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

Writes go through a temp file and a rename. A leftover temp file means a write was interrupted or the rename failed.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.

## Steps

1. Launch, toggle the switch, and quit, three times.
2. Run `ls -a ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/`.

## Expected result

- Only `app-config.json` is listed; no `app-config.json.tmp`.

## Automated by

| Test | File |
|---|---|
| `save_leaves_no_temp_file_behind` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `Launch and toggle several times -> no .json.tmp left in the config dir` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-006](../../catalog.md)
- Former checklist ID: C6
