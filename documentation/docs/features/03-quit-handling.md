# 3. Quit handling

⌘Q, the app menu's Quit, the tray's Quit and a Quit AppleEvent all really exit. Only the close
button and ⌘W hide. Getting this wrong makes the app unquittable, which is the single worst outcome
this feature could produce.

## The trap

On macOS, ⌘Q closes the application's windows on its way out. A naive implementation —
"`CloseRequested` → `prevent_close()` → hide" — therefore intercepts the shutdown too, and the app
can never be quit.

## The fix: event ordering

macOS fires `RunEvent::ExitRequested` **before** any window receives `CloseRequested`. That single
ordering fact is what the implementation rests on:

```
⌘Q  ─▶ RunEvent::ExitRequested ─▶ is_quitting = true ─▶ (never prevented)
                                          │
                                          ▼
       WindowEvent::CloseRequested ─▶ decide() sees is_quitting ─▶ AllowClose
                                          │
                                          ▼
                                    process exits
```

- **`RunEvent::ExitRequested` is never prevented.** It sets `is_quitting` in the managed state and
  lets the exit through. This is the one place in the app that knows a real quit is underway.
- **`WindowEvent::CloseRequested`** asks `decide()`, which returns `AllowClose` when `is_quitting` is
  set and `HideToTray` otherwise.
- **The tray's Quit** calls `app.exit(0)`, which routes through `ExitRequested` and hits exactly the
  same path — one code path, not two.
- **⌘Q and the app menu's Quit** reach `ExitRequested` natively. Nothing was added for them.
- **The "last window closed" exit path** is never reached, because the window is never actually
  closed while hiding.

`ExitRequested` is deliberately never prevented. An app that cannot be quit is worse than one that
quits mid-task. When the scheduler lands, a sync-in-progress check hooks in here — that is the
intended extension point, and it should ask rather than refuse.

## Clean teardown

Selecting Quit leaves no orphan process and no tray icon. Verify with
[performance scenario 7](../../tests/performance.md#7-launchquit-cycle-test-20-iterations), which
runs 20 launch/quit cycles and checks for residual processes and leaked file descriptors — including
the WebKit helpers, which are launched by launchd and so do **not** appear as children in a `ps`
tree.

## Implementation

| Piece | File |
|---|---|
| `Trigger::AppQuit`, `Trigger::TrayQuit` → `Action::Exit` | `src-tauri/src/lifecycle/policy.rs` |
| `ExitRequested` → `begin_quit()` | `src-tauri/src/lib.rs` — `on_run_event` |
| `Action::Exit` → `app.exit(0)` | `src-tauri/src/lifecycle/macos.rs` — `apply` |
| Tray menu `quit` id → `Action::Exit` | `src-tauri/src/lifecycle/policy.rs` — `map_menu_event` |

`is_quitting` lives in `AppState` as an `AtomicBool` rather than behind the config mutex: it is read
on the event-loop thread on every window event, and a lock there would put config I/O in the path of
a close.

## If the ordering ever changes

The `is_quitting` flag depends on `ExitRequested` firing before `CloseRequested`. If a future Tauri
or macOS release reverses that, the symptom is unmistakable: ⌘Q hides the window instead of quitting.

The fallback is to stop relying on ordering and check whether the quit originated from the app menu.
The test `cmd_q_quits_even_though_macos_closes_the_window_on_the_way_out` documents the assumption
explicitly, so it is findable.

## Tests

| Test | File |
|---|---|
| `quit_triggers_exit_regardless_of_window_state` | `policy.rs` |
| `quit_exits_even_when_the_tray_is_unavailable` | `policy.rs` |
| `close_while_quitting_is_allowed_through` | `policy.rs` |
| `the_quit_menu_id_maps_to_the_app_exit_action` | `policy.rs` |
| `cmd_q_quits_even_though_macos_closes_the_window_on_the_way_out` | `tests/lifecycle_policy.rs` |
| `the_tray_quit_item_follows_the_same_path_as_cmd_q` | `tests/lifecycle_policy.rs` |
| `no_trigger_from_outside_can_produce_an_exit_without_a_quit` | `tests/lifecycle_policy.rs` |

That last one is the inverse guard: it asserts that no external trigger — a close, a tray click, a
second launch, a reopen — can ever produce an `Exit` on its own.

Manual checks are in
[the functional checklist](../../tests/functional-checklist.md#module-librs--quit-paths).
