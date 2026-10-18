# TAB-013 — [Window tabs][Appearance] Open each tab in Light and Dark appearance -> colours follow, text readable, matches the approved screenshots

| | |
|---|---|
| Status | `partial` |
| Levels | flow, manual |
| Module | [`App.css`](../../../../ui/src/App.css) |
| Feature | [Window tabs](../../../docs/features/09-window-tabs.md) |

## Purpose

Every tab — its preview badges, tables, checkboxes and device buttons — must stay readable in both
appearances. The Settings tab is covered by [UI-003](../ui/UI-003-dark-appearance.md).

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

1. System Settings → Appearance → **Light**.
2. Open **QA Portal sync**, **Timesheet** and **GitHub jobs** in turn.
3. On GitHub jobs, check Run for one platform and select one of its devices.
4. System Settings → Appearance → **Dark**, and repeat steps 2–3.

## Expected result

- Colours change with the appearance.
- All text is readable, including the "Not wired yet" badges, the muted preview labels and the
  deltas in the sync table.
- A selected device button shows its check mark and is distinguishable from an unselected one in
  both appearances; disabled controls look disabled.

## Automated by

| Test | File |
|---|---|
| `matches the approved light-appearance screenshots of every other tab` | [`ui/flows/appearance.flow.ts`](../../../../ui/flows/appearance.flow.ts) |
| `matches the approved dark-appearance screenshots of every other tab` | [`ui/flows/appearance.flow.ts`](../../../../ui/flows/appearance.flow.ts) |

## Manual remainder

The flows compare each tab's light and dark render against approved baselines, so a change is
caught. Judging that a baseline is readable — and approving a new one — needs eyes, as does the
real window following a live appearance switch.

## Related

- Feature: [Window tabs](../../../docs/features/09-window-tabs.md)
- Module: [`ui/src/App.css`](../../../../ui/src/App.css)
- Catalog: [TAB-013](../../catalog.md)
- Change: [add-window-tabs](../../../../openspec/changes/archive/2026-10-18-add-window-tabs/proposal.md)
