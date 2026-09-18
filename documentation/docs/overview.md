# Implemented features — overview

Everything the app does today, as of the macOS app lifecycle feature. Each entry links to its own
document; this page is the index and the summary.

Scope is **macOS only**. Every platform-specific call sits behind `#[cfg(target_os = "macos")]` so
Windows and Linux are additive work rather than a rewrite.

| # | Feature | What it gives the user | Detail |
|---|---|---|---|
| 1 | [Tray icon and menu](features/01-tray-icon.md) | A menu bar icon that is always present while the app runs, with **Show Window** and **Quit**. | [→](features/01-tray-icon.md) |
| 2 | [Hide to tray](features/02-hide-to-tray.md) | Closing the window hides it instead of quitting; the process keeps running in the background. | [→](features/02-hide-to-tray.md) |
| 3 | [Quit handling](features/03-quit-handling.md) | ⌘Q, the app menu and the tray's Quit all really exit, cleanly, with no orphan processes. | [→](features/03-quit-handling.md) |
| 4 | [Launch at login](features/04-launch-at-login.md) | A persisted toggle that registers the app as a macOS login item, starting hidden. | [→](features/04-launch-at-login.md) |
| 5 | [Single instance and reopen](features/05-single-instance.md) | Launching the app again focuses the running one instead of starting a second. | [→](features/05-single-instance.md) |
| 6 | [One-time notifications](features/06-notifications.md) | Two informational notices: "still running in the menu bar", and the launch-at-login offer. | [→](features/06-notifications.md) |
| 7 | [App configuration](features/07-app-config.md) | Preferences that survive restarts, stored as JSON outside the bundle. | [→](features/07-app-config.md) |
| 8 | [Settings UI](features/08-settings-ui.md) | The window: the launch-at-login toggle and the hide affordance. | [→](features/08-settings-ui.md) |

## How they fit together

```
                    ┌──────────────────────────────┐
   close button ───▶│                              │
   ⌘W          ───▶ │                              │──▶ HideToTray  ─▶ hide + Accessory + notice
   tray: Quit  ───▶ │   policy::decide(trigger,    │──▶ Exit        ─▶ app.exit(0)
   ⌘Q          ───▶ │                  state)      │──▶ ShowAndFocus─▶ Regular + show + focus
   tray: Show  ───▶ │                              │──▶ FocusOnly   ─▶ focus
   2nd launch  ───▶ │   pure, no Tauri types       │──▶ AllowClose  ─▶ (do not interfere)
   Cocoa reopen───▶ │                              │──▶ Nothing
                    └──────────────────────────────┘
                                   │
                            reads LifecycleState
                     { window_visible, tray_available, is_quitting }
```

Every lifecycle event in the app routes through that one function. Adding a behaviour means adding
an `Action`; adding an event means adding a `Trigger`. Nothing else branches.

## The three rules the implementation follows

1. **Decisions are pure.** `lifecycle/policy.rs` imports no Tauri types, so the behaviour is
   unit-tested without a window. `lifecycle/macos.rs` executes and never branches.
2. **Rust owns every privileged operation.** The UI calls only our own `#[tauri::command]`s, never a
   plugin's JS API, which is why `capabilities/default.json` still grants only `core:default`.
3. **Degradation is explicit.** A tray that fails to create, a notification that will not deliver, a
   config file that cannot be read — each has a defined fallback, and none of them can stop the app
   from starting or block a window close.

## Not implemented yet

Tracked in [PLAN.md §4](../../PLAN.md#4-фичи):

- Credential storage (`keyring-rs` → macOS Keychain)
- Jira REST client and ticket fetching
- The QA Portal Playwright sidecar and the sync itself
- The scheduler (`tokio-cron-scheduler`) — this feature exists to give it a process to live in
- Manual "Run now" from the tray, sync status and log viewing
- LLM report generation (Ollama)

## Test coverage

| Kind | Where | Count |
|---|---|---|
| Rust unit (pure policy, config, state) | `src-tauri/src/**/mod tests` | 42 |
| Rust integration (public API, whole scenarios) | `src-tauri/tests/lifecycle_policy.rs` | 15 |
| UI (IPC wrappers, settings panel) | `ui/src/**/*.test.{ts,tsx}` | 14 |
| Manual (menu bar, Dock, reboot, appearance) | [../tests/functional-checklist.md](../tests/functional-checklist.md) | 47 checks |
| Performance / load / stability | [../tests/performance.md](../tests/performance.md) | 10 scenarios |
