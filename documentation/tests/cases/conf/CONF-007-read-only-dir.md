# CONF-007 — [Config][Unwritable] Make the config dir read-only and toggle -> the toggle still works and the log carries "could not persist config"

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

Losing a preference is better than a crash, and the OS registration must not depend on the file.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```
- Watch the log as in NOTE-007.

## Steps

1. Run `chmod a-w ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal`.
2. Toggle **Launch at login**.
3. Run `chmod u+w ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal` to restore it.

## Expected result

- The switch changes and the plist is created or removed accordingly.
- The log carries `could not persist config: …`.
- The app does not crash.

## Automated by

| Test | File |
|---|---|
| `saving_into_an_unwritable_directory_fails_cleanly` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `Make the config dir read-only and toggle -> the toggle still works and the log says "could not persist config"` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-007](../../catalog.md)
- Former checklist ID: C7
