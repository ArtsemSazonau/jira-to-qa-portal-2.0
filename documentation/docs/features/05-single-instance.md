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

| Test | File |
|---|---|
| `a_second_instance_reveals_the_hidden_window` | `policy.rs` |
| `reopen_shows_the_window_when_it_is_hidden` | `policy.rs` |
| `reopen_focuses_when_the_window_is_already_up` | `policy.rs` |
| `reopen_shows_when_cocoa_and_our_own_state_disagree` | `policy.rs` |
| `repeated_show_requests_never_ask_for_more_than_a_focus` | `policy.rs` |
| `relaunching_from_finder_reveals_the_hidden_window` | `tests/lifecycle_policy.rs` |

Manual checks are in
[the functional checklist](../../tests/functional-checklist.md#module-single-instance--reopen).
