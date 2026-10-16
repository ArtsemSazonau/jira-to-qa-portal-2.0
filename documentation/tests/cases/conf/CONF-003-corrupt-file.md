# CONF-003 — [Config][Recovery] Corrupt the file and relaunch -> app starts with defaults and logs a parse warning

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

A bad hand-edit must never stop the app from starting.

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
- Watch the log as in NOTE-007.

## Steps

1. Run `echo "{" > ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json`.
2. Launch the app.

## Expected result

- The app starts with defaults (toggle reflects the OS registration).
- The log carries a `config parse error at …; starting from defaults` warning.

## Automated by

| Test | File |
|---|---|
| `a_corrupt_file_is_an_error_for_try_load_but_defaults_for_load` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `Corrupt the file and relaunch -> app starts with defaults and logs a parse warning` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-003](../../catalog.md)
- Former checklist ID: C3
