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
[PERF-007](../../tests/cases/performance/PERF-007-launch-quit-cycles.md), which
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

Every case for this feature is in the test catalog — the [`QUIT` cases](../../tests/catalog.md#quit--quit). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [QUIT-001](../../tests/cases/quit/QUIT-001-cmd-q.md) | Press ⌘Q with the window focused -> the process exits and the tray icon disappears | automated | unit, e2e |
| [QUIT-002](../../tests/cases/quit/QUIT-002-app-menu-quit.md) | App menu → Quit -> the process exits and the tray icon disappears | automated | e2e |
| [QUIT-003](../../tests/cases/quit/QUIT-003-tray-quit-visible.md) | Tray → Quit with the window visible -> the process exits and the tray icon disappears | automated | unit, e2e |
| [QUIT-004](../../tests/cases/quit/QUIT-004-tray-quit-hidden.md) | Tray → Quit with the window hidden -> the process exits and the tray icon disappears | automated | unit, e2e |
| [QUIT-005](../../tests/cases/quit/QUIT-005-quit-appleevent.md) | Send a Quit AppleEvent -> the process exits and the tray icon disappears | automated | e2e |
| [QUIT-006](../../tests/cases/quit/QUIT-006-no-leftover-process.md) | After any quit -> no app process remains | automated | e2e |
| [QUIT-007](../../tests/cases/quit/QUIT-007-no-orphan-webkit.md) | After any quit -> no orphaned WebKit processes | automated | e2e |
| [QUIT-008](../../tests/cases/quit/QUIT-008-no-crash-report.md) | After any quit -> no crash report for the app | automated | e2e |
| [QUIT-009](../../tests/cases/quit/QUIT-009-cmd-q-hidden.md) | ⌘Q while the window is hidden -> the app exits cleanly | automated | e2e |
| QUIT-010 | Tray → Quit when the tray is otherwise unavailable -> still exits | automated | unit |
| QUIT-011 | Any show, close or reopen trigger with a tray -> never exits the app | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

