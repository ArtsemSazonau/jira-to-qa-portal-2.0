# TRAY-010 — [OS tray][Fallback] Tray creation fails -> app still starts, logs the fallback, window warns that closing quits

| | |
|---|---|
| Status | `partial` |
| Levels | unit, component, flow, manual |
| Module | [`tray.rs`](../../../../src-tauri/src/tray.rs) |
| Feature | [Tray icon and menu](../../../docs/features/01-tray-icon.md) |

## Purpose

Without a tray there is no way back into a hidden `Accessory` app. Hide-to-tray must turn itself off, and the window must say so, rather than strand the user.

## Preconditions

- A development checkout. This case edits a source file and must be reverted afterwards. (The icon is embedded at compile time with `include_image!`, so renaming the asset breaks the build rather than the tray; forcing the error is the way in.)

## Steps

1. Make the first line of `create()` in `src-tauri/src/tray.rs` `return Err(tauri::Error::AssetNotFound("forced by TRAY-010".into()));`.
2. Run `npm run tauri dev`.
3. Read the log, then look at the window.
4. Click the red close button.
5. Revert the edit: `git checkout src-tauri/src/tray.rs`.

## Expected result

- The app starts.
- The log carries `could not create the tray icon: … Hide-to-tray is disabled; closing the window will quit the app.`
- The window shows the alert *The menu bar icon could not be created, so closing this window quits the app instead of hiding it*, and no **Hide to menu bar** button.
- Closing the window quits the app.

## Automated by

| Test | File |
|---|---|
| `close_without_a_tray_quits_rather_than_hiding` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `a_tray_failure_never_produces_a_hide` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `a_fresh_state_assumes_no_tray_until_one_is_registered` | [`src-tauri/src/lifecycle/mod.rs`](../../../../src-tauri/src/lifecycle/mod.rs) |
| `without_a_tray_the_app_never_hides_itself_out_of_reach` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `without_a_tray_nothing_hides` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `warns that closing quits when the tray could not be created` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `warns that closing quits, and offers no hide button, when there is no tray` | [`ui/flows/settings.flow.ts`](../../../../ui/flows/settings.flow.ts) |

## Manual remainder

The decision (close → `Exit` without a tray) and the window's warning are automated. The real failure path through `tray::install` needs a deliberately broken build, so it stays manual.

## Related

- Feature: [Tray icon and menu](../../../docs/features/01-tray-icon.md)
- Module: [`src-tauri/src/tray.rs`](../../../../src-tauri/src/tray.rs)
- Catalog: [TRAY-010](../../catalog.md)
- Former checklist ID: T10
