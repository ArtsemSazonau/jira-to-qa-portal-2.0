# SYS-007 — [System][Test build] Launch the test build beside the real app -> separate process, tray icon, config file and login item

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`tauri.e2e.conf.json`](../../../../src-tauri/tauri.e2e.conf.json) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

The test build must never share settings, a login item or the single-instance lock with the user's real copy of the app. Its isolation comes only from its own identifier and product name, so this checks that identity really separates all three.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- From the repo root, build the test variant: `npm run build:e2e`. It lands at `src-tauri/target/debug/bundle/macos/jira-to-qa-portal-e2e.app`.
- Record the real app's state: `ls -l ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/ ~/Library/LaunchAgents/ | tee /tmp/real-before.txt`.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```

## Steps

1. Run `open src-tauri/target/debug/bundle/macos/jira-to-qa-portal-e2e.app`.
2. Run `pgrep -fl "MacOS/app"`.
3. Look at the menu bar, and at the real app's window.
4. In the test build's window — titled **QA Portal Sync — TEST BUILD**, not the real app's *QA Portal Sync* — turn **Launch at login** on.
5. Run `ls ~/Library/LaunchAgents | grep -i qa-portal` and `ls ~/Library/Application\ Support/ | grep -i qa-portal`.
6. Turn **Launch at login** off again in the TEST BUILD window, then quit the test build: its menu bar menu is the one whose app menu reads *jira-to-qa-portal-e2e*.
7. Run `ls -l ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/ ~/Library/LaunchAgents/ > /tmp/real-after.txt; diff /tmp/real-before.txt /tmp/real-after.txt`.
8. Clean up: `rm -rf ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal.e2e`.

## Expected result

- Two processes: one under `jira-to-qa-portal.app`, one under `jira-to-qa-portal-e2e.app`. The test build did not exit in favour of the real app.
- Two tray icons. The real app's window was not shown, focused or otherwise changed by the launch.
- With the toggle on, `jira-to-qa-portal-e2e.plist` exists beside (not instead of) any `jira-to-qa-portal.plist`.
- The test build's config is under `dev.sazonau.jira-to-qa-portal.e2e/`, not the real app's directory.
- `diff` prints nothing that belongs to the real app: its config file and login item are unchanged.

## Automated by

Nothing yet.

## Why manual

Needs both apps running side by side and a person to watch the real one. The harness relies on this isolation rather than re-checking it on every run.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/tauri.e2e.conf.json`](../../../../src-tauri/tauri.e2e.conf.json)
- Catalog: [SYS-007](../../catalog.md)
