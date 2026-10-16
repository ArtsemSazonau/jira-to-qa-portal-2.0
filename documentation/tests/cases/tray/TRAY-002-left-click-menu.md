# TRAY-002 — [OS tray][Menu] Left-click the icon -> menu shows Show Window, a separator, Quit

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

The menu is the only re-entry point once the app is in the `Accessory` activation policy, so it must offer both a way in and a way out, in a fixed order.

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

1. Left-click the tray icon.

## Expected result

- A menu opens with exactly three entries, in this order: **Show Window**, a separator, **Quit**.

## Automated by

| Test | File |
|---|---|
| `tray_menu_contains_exactly_the_expected_ids` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `every_menu_label_is_non_empty` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `the_tray_menu_offers_both_a_way_in_and_a_way_out` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Left-click the icon -> menu shows Show Window, a separator, Quit` | [`e2e/specs/tray.e2e.ts`](../../../../e2e/specs/tray.e2e.ts) |

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [TRAY-002](../../catalog.md)
- Former checklist ID: T2
