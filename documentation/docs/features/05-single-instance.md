# 5. Single instance and reopen

Launching the app while it is already running focuses the existing instance. It never starts a second
process competing for the same tray slot and login item, and never opens a second window.

## Two different paths, both needed

This is the part that is easy to get wrong. macOS handles "launch an app that is already running" in
two entirely different ways depending on how it was launched:

| How it is launched | What macOS does | What the app sees |
|---|---|---|
| Finder, Spotlight, Dock, `open -a` | **Activates the running process.** No second process starts. | `RunEvent::Reopen { has_visible_windows }` |
| Running the binary directly (`./app`, the dev loop) | Actually starts a second process. | `tauri-plugin-single-instance` callback in the *first* process |

`tauri-plugin-single-instance` alone is not enough: for the common case — a user double-clicking the
app in Finder while it sits hidden in the menu bar — its callback **never fires**, because there is no
second process for it to detect. Without the `Reopen` handler, that case silently does nothing.

Both are wired. Both route to the same decision.

## Behaviour

- Window hidden, app relaunched from Finder/Spotlight → the window appears, focused.
- Window already visible, app relaunched → it comes forward. Nothing is recreated.
- Binary launched directly while an instance runs → the second process exits; the first reveals its
  window.
- No second tray icon ever appears.

## Implementation

`tauri-plugin-single-instance` is registered **first**, before every other plugin, as its
documentation requires — it has to claim the lock before anything else touches the runtime.

```rust
// lib.rs
.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
    let Some(state) = snapshot(app) else { return };
    apply(app, decide(Trigger::SecondInstanceLaunched, state));
}))
```

```rust
// lib.rs — on_run_event
RunEvent::Reopen { has_visible_windows, .. } => {
    apply(app, decide(Trigger::Reopen { has_visible_windows }, state));
}
```

Both resolve to `ShowAndFocus` when the window is hidden, and `FocusOnly` when it is already up —
which is what guarantees no duplicate window, because neither action can construct one.

### Cocoa's view can disagree with ours

`has_visible_windows` is Cocoa's opinion, and it can still count a hidden window. The decision trusts
it only when the app's own `window_visible` agrees:

```rust
if has_visible_windows && state.window_visible { FocusOnly } else { ShowAndFocus }
```

Getting this backwards produces the worst possible symptom — clicking the app does nothing at all,
and the app looks dead. The test `reopen_shows_when_cocoa_and_our_own_state_disagree` pins it.

### Events before setup

Both handlers read the managed `AppState`, which only exists after `setup` has run. They go through a
`snapshot()` helper that returns `None` and logs rather than panicking if an event somehow arrives in
that gap.

## Tests

Every case for this feature is in the test catalog — the [`INST` cases](../../tests/catalog.md#single-instance--inst). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [INST-001](../../tests/cases/inst/INST-001-finder-reopen-hidden.md) | Launch from Finder while running hidden -> the existing window appears, focused | partial | unit, e2e, manual |
| [INST-002](../../tests/cases/inst/INST-002-one-process-one-icon.md) | After a Finder relaunch -> exactly one tray icon and one process | automated | e2e |
| [INST-003](../../tests/cases/inst/INST-003-spotlight-reopen-visible.md) | Launch from Spotlight while visible -> the existing window comes forward, no second window | partial | unit, e2e, manual |
| [INST-004](../../tests/cases/inst/INST-004-open-a-hidden.md) | open -a while hidden -> the window appears | automated | e2e |
| [INST-005](../../tests/cases/inst/INST-005-second-process-exits.md) | Run the binary directly while an instance runs -> the second exits, the first reveals its window | automated | unit, e2e |
| [INST-006](../../tests/cases/inst/INST-006-rapid-relaunch.md) | Relaunch from Finder 5 times quickly -> still one window and one tray icon | partial | e2e, manual |
| INST-007 | Cocoa says a window is visible but ours is hidden -> the window is shown | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

