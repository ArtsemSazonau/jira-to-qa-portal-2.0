# LOGIN-003 — [Launch at login][Plist] Inspect the plist -> ProgramArguments point into /Applications and include --hidden

| | |
|---|---|
| Status | `partial` |
| Levels | e2e, manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A plist pointing at `target/debug` breaks on the next `cargo clean`. Without `--hidden` the app would open its window at every login.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- LOGIN-002 has just turned the toggle on.

## Steps

1. Run `plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist`.

## Expected result

- `ProgramArguments` starts with `/Applications/jira-to-qa-portal.app/Contents/MacOS/app`, **not** a `target/` path.
- `ProgramArguments` includes `--hidden`.
- `RunAtLoad` is true.

## Automated by

| Test | File |
|---|---|
| `Turn the toggle on -> plist with --hidden appears, and the dev-binary warning is logged` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Manual remainder

The e2e spec asserts that ProgramArguments are the running executable plus --hidden and that RunAtLoad is true. The test build lives under target/debug/, so that the path points into /Applications for an installed bundle is checked by hand.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-003](../../catalog.md)
- Former checklist ID: A3
