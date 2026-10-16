# LOGIN-005 — [Launch at login][launchd] launchctl print the job -> it is loaded

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A plist on disk that launchd has not loaded does nothing until the next login.

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

1. Run `launchctl print "gui/$(id -u)/jira-to-qa-portal"`.

## Expected result

- The job is printed (not *Could not find service*). The label is `jira-to-qa-portal`, not the bundle id.

## Automated by

Nothing yet.

## Why manual

Needs the user's launchd domain. Kept manual: the e2e spec checks the plist, which is what decides the next login.

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-005](../../catalog.md)
- Former checklist ID: A5
