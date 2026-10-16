# INST-002 — [Single instance][Reopen] After a Finder relaunch -> exactly one tray icon and one process

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

A second process would mean a second tray icon and a split config.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- INST-001 has just run.

## Steps

1. Run `pgrep -fl "jira-to-qa-portal.app/Contents/MacOS"`.
2. Look at the menu bar.

## Expected result

- `pgrep` prints one line.
- There is one tray icon.

## Automated by

| Test | File |
|---|---|
| `open -a while hidden -> the existing window appears, one process, one icon` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-002](../../catalog.md)
- Former checklist ID: S2
