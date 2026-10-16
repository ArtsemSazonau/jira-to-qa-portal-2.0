# CONF-002 — [Config][Persistence] Toggle autostart on and quit -> the file has "autostart_enabled": true

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

Preferences must survive a restart.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- Fresh-install state: no config file and no login item.

  ```bash
  osascript -e 'tell application "jira-to-qa-portal" to quit'
  rm -f ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
  rm -f ~/Library/LaunchAgents/jira-to-qa-portal.plist
  ```
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```

## Steps

1. Turn **Launch at login** on.
2. Quit the app.
3. Run `cat ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json`.

## Expected result

- The file contains `"autostart_enabled": true`.

## Automated by

| Test | File |
|---|---|
| `writing_then_reading_returns_the_same_value` | [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs) |
| `updating_the_config_writes_it_to_disk` | [`src-tauri/src/lifecycle/mod.rs`](../../../../src-tauri/src/lifecycle/mod.rs) |
| `the_toggle_round_trips_through_the_config_file` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Toggle autostart on and quit -> the file has "autostart_enabled": true` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-002](../../catalog.md)
- Former checklist ID: C2
