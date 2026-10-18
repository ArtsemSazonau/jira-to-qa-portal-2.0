# TAB-014 — [Window tabs][Built app] Open the window -> four tabs in order, Settings selected, each tab shows its own panel

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`components/Tabs.tsx`](../../../../ui/src/components/Tabs.tsx) |
| Feature | [Window tabs](../../../docs/features/09-window-tabs.md) |

## Purpose

The tabs are checked in jsdom and in Playwright's WebKit; this confirms the app's own WKWebView
renders and switches them the same way.

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

1. Look at the tab row under the heading.
2. Click **QA Portal sync**, **Timesheet**, **GitHub jobs**, then **Settings**.

## Expected result

- The tabs read Settings, QA Portal sync, Timesheet, GitHub jobs, with Settings selected on open.
- Each click selects that tab and shows its panel only.

## Automated by

| Test | File |
|---|---|
| `Open the window -> four tabs in order, Settings selected, each tab shows its own panel` | [`e2e/specs/tabs.e2e.ts`](../../../../e2e/specs/tabs.e2e.ts) |

## Related

- Feature: [Window tabs](../../../docs/features/09-window-tabs.md)
- Module: [`ui/src/components/Tabs.tsx`](../../../../ui/src/components/Tabs.tsx)
- Catalog: [TAB-014](../../catalog.md)
- Change: [add-window-tabs](../../../../openspec/changes/add-window-tabs/proposal.md)
