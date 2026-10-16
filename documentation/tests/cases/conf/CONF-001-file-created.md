# CONF-001 — [Config][File] First launch -> app-config.json is created in Application Support

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`config.rs`](../../../../src-tauri/src/config.rs) |
| Feature | [App configuration](../../../docs/features/07-app-config.md) |

## Purpose

The config lives outside the bundle, under the identifier-derived directory.

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

## Steps

1. Launch the app.
2. Run `ls ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/`.

## Expected result

- `app-config.json` is listed.

## Automated by

| Test | File |
|---|---|
| `First launch -> app-config.json is created in Application Support` | [`e2e/specs/config.e2e.ts`](../../../../e2e/specs/config.e2e.ts) |

## Related

- Feature: [App configuration](../../../docs/features/07-app-config.md)
- Module: [`src-tauri/src/config.rs`](../../../../src-tauri/src/config.rs)
- Catalog: [CONF-001](../../catalog.md)
- Former checklist ID: C1
