# TAB-015 — [Window tabs][Built app] Visit GitHub jobs, return to Settings, toggle launch at login -> the setting is persisted

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`views/SettingsView.tsx`](../../../../ui/src/views/SettingsView.tsx) |
| Feature | [Window tabs](../../../docs/features/09-window-tabs.md) |

## Purpose

Moving the launch-at-login row into the Settings tab must not break it: the switch still reaches
the core after the user has been on another tab, and the change still lands in the config file.

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

## Steps

1. Select the **GitHub jobs** tab, then **Settings**.
2. Toggle **Launch at login**.
3. Toggle it back.

## Expected result

- After step 2 the config file's `autostart_enabled` has flipped; after step 3 it is back to its
  original value.

## Automated by

| Test | File |
|---|---|
| `Visit GitHub jobs, return to Settings, toggle launch at login -> the setting is persisted` | [`e2e/specs/tabs.e2e.ts`](../../../../e2e/specs/tabs.e2e.ts) |

## Related

- Feature: [Window tabs](../../../docs/features/09-window-tabs.md)
- Module: [`ui/src/views/SettingsView.tsx`](../../../../ui/src/views/SettingsView.tsx)
- Catalog: [TAB-015](../../catalog.md)
- Change: [add-window-tabs](../../../../openspec/changes/add-window-tabs/proposal.md)
