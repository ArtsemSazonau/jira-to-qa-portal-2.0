# LOGIN-002 — [Launch at login][Toggle] Turn the toggle on -> ~/Library/LaunchAgents/jira-to-qa-portal.plist appears

| | |
|---|---|
| Status | `automated` |
| Levels | component, e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

The toggle must register a real LaunchAgent, named after `productName`, not the bundle id.

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
2. Run `ls ~/Library/LaunchAgents | grep -i qa-portal`.

## Expected result

- The switch stays on.
- `jira-to-qa-portal.plist` is listed.

## Automated by

| Test | File |
|---|---|
| `registers the login item when switched on` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `Turn the toggle on -> plist with --hidden appears, and the dev-binary warning is logged` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-002](../../catalog.md)
- Former checklist ID: A2
