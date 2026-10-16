# SYS-002 — [System][Sleep] Read the system log after the sleep -> nothing alarming during sleep or wake

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

Errors around sleep and wake would not be visible otherwise.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- SYS-001 has just run.

## Steps

1. Run `log show --predicate 'process == "app"' --last 2h --style compact`.

## Expected result

- No errors, panics or repeated warnings around the sleep and wake times.

## Automated by

Nothing yet.

## Why manual

Needs a person to read the log after a real sleep.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [SYS-002](../../catalog.md)
- Former checklist ID: X2
