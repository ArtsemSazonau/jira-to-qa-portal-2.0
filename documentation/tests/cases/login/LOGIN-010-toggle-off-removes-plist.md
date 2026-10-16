# LOGIN-010 — [Launch at login][Toggle] Turn the toggle off -> the plist is removed

| | |
|---|---|
| Status | `automated` |
| Levels | component, e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

Turning the feature off must really unregister, since the file decides the next login.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The toggle is on.

## Steps

1. Turn **Launch at login** off.
2. Run `ls ~/Library/LaunchAgents | grep -i qa-portal`.

## Expected result

- The switch stays off.
- `ls` finds nothing.

## Automated by

| Test | File |
|---|---|
| `removes the login item when switched off` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `Turn the toggle off -> the plist is removed` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-010](../../catalog.md)
- Former checklist ID: A10
