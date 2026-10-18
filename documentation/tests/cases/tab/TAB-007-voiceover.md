# TAB-007 — [Window tabs][Accessibility] Move through the tabs with VoiceOver on -> each announced as a tab with its name, selected state and position

| | |
|---|---|
| Status | `manual` |
| Levels | manual |
| Module | [`components/Tabs.tsx`](../../../../ui/src/components/Tabs.tsx) |
| Feature | [Window tabs](../../../docs/features/09-window-tabs.md) |

## Purpose

Screen-reader users must know they are in a tab list, which tab is selected and how many there are.

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

1. Turn VoiceOver on (⌘F5).
2. Move the VoiceOver cursor to the **Settings** tab.
3. Press Right arrow three times, listening after each press.
4. Turn VoiceOver off.

## Expected result

- The first announcement is a tab named *Settings*, selected, 1 of 4.
- Each Right arrow selects the next tab and announces it the same way: *QA Portal sync* 2 of 4,
  *Timesheet* 3 of 4, *GitHub jobs* 4 of 4.
- The panel content that VoiceOver reaches next belongs to the selected tab.

## Automated by

None: what VoiceOver announces needs a person listening. The roles, `aria-selected` and the
panel labelling it relies on are asserted by [TAB-006](../../catalog.md) in
[`ui/src/components/Tabs.test.tsx`](../../../../ui/src/components/Tabs.test.tsx), and axe runs on every
tab ([TAB-012](../../catalog.md)).

## Related

- Feature: [Window tabs](../../../docs/features/09-window-tabs.md)
- Module: [`ui/src/components/Tabs.tsx`](../../../../ui/src/components/Tabs.tsx)
- Catalog: [TAB-007](../../catalog.md)
- Change: [add-window-tabs](../../../../openspec/changes/add-window-tabs/proposal.md)
