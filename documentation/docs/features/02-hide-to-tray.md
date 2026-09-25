# 2. Hide to tray

Closing the window hides it; the process keeps running. This is what makes the app a background
service rather than something the user has to keep open — the scheduler, when it lands, lives inside
this process.

## Behaviour

Clicking the red close button or pressing ⌘W:

1. The window disappears immediately — no minimise animation, the ⌘H feel the spec asked for.
2. The app drops to `ActivationPolicy::Accessory`: **the Dock icon and the ⌘-Tab entry disappear**.
3. The process keeps running, with its menu bar icon.
4. The first time only, a notification explains that the app is still running.

Showing it again — from the tray menu, a second launch, or a Finder/Spotlight activation:

1. The activation policy returns to `Regular`.
2. The window is unminimised, shown and focused.
3. Its prior state is intact: it is the same window, never a freshly constructed one.

**Order matters in both directions.** Hiding shows the window disappearing before the Dock icon goes,
which reads as instant. Showing flips the policy *before* `show()`, because an `Accessory` app's
window can otherwise come up behind whatever is in front.

## Why the Dock icon goes away

This was an explicit decision, taken from the spec's open questions: `Accessory` while hidden, rather
than staying a `Regular` app with a Dock icon.

The consequence is that **the tray icon is the only way back in**. That single fact drives the
failure handling below, and it is why the tray menu carries a Show Window item rather than relying on
a click.

`skipTaskbar` does nothing on macOS; the activation policy is the only mechanism.

## When there is no tray

If the tray icon could not be created, hiding would strand the user: no menu bar icon to click and,
once `Accessory`, no Dock icon either.

So hide-to-tray turns itself off, and **the close button quits the app instead**.

That is stronger than "let the close through", and deliberately so. A closed window in Tauri is
*destroyed*, not hidden, and Tauri does not exit when the last window goes — so simply allowing the
close would leave a live process with no window and no way to build another. Quitting is the honest
behaviour for a single-window app that cannot make a second one.

`AppState.tray_available` starts as `false` and is only set true once the tray really exists, so the
safe branch is the default rather than something that has to be remembered.

## Implementation

| Piece | File |
|---|---|
| The decision | `src-tauri/src/lifecycle/policy.rs` — `decide(Trigger::WindowCloseRequested, …)` |
| The hide/show sequences | `src-tauri/src/lifecycle/macos.rs` — `hide`, `show`, `focus` |
| The event wiring | `src-tauri/src/lib.rs` — `on_window_event` |

```rust
Trigger::WindowCloseRequested => {
    if state.is_quitting      { Action::AllowClose }   // ⌘Q is underway
    else if !state.tray_available { Action::Exit }     // no way back in
    else if state.window_visible  { Action::HideToTray }
    else                          { Action::Nothing }
}
```

`on_window_event` calls `api.prevent_close()` only when the decision is `HideToTray`. Every other
outcome lets the close proceed — which is what keeps ⌘Q working, see
[quit handling](03-quit-handling.md).

## Does hiding release the webview?

No. Tauri does not tear down the WKWebView when a window is hidden, so the WebKit content, GPU and
networking helper processes stay alive and keep their memory.

Measured, with the window hidden and the app settled:

| | Footprint | Peak |
|---|---|---|
| `app` (Rust core) | 28 MB | 29 MB |
| `WebKit.WebContent` | 29 MB | 44 MB |
| `WebKit.GPU` | 11 MB | 62 MB |
| `WebKit.Networking` | 4.8 MB | 5.2 MB |
| **Total idle** | **≈ 73 MB** | |

Hiding does shrink the helpers — to roughly a third of their peak — but never frees them. **The
webview is 62% of the idle footprint**, held for as long as the app sits in the menu bar.

That is now judged too expensive for a window opened about once a day, so the intended behaviour is
to **destroy the window on close and rebuild it on show**. See
[the planned change](#planned-change-destroy-the-window-instead-of-hiding-it) below and the backlog
item in [PLAN.md](../../../PLAN.md) §4. Until that ships, the retention above is the documented
behaviour, and
[the process accounting step](../../tests/performance.md#3-process-accounting--the-webview-is-the-bigger-half)
is how it is re-measured.

## Edge cases handled

| Case | Behaviour |
|---|---|
| Close while a quit is already underway (⌘Q closes windows on its way out) | Allowed through — see [quit handling](03-quit-handling.md). |
| Close on an already-hidden window | `Nothing`. Cannot normally happen; defined so it cannot misbehave. |
| Tray click, then Dock activation, in quick succession | The second resolves to `FocusOnly`. No action in the enum can create a window. |
| Cocoa reports visible windows while our own state says hidden | Our state wins; the window is shown. |
| Hide fails | Logged; the activation policy is left alone so the app does not become a Dock-less app with a visible window. |
| Activation-policy flip fails | Logged; the window is hidden either way, the app just keeps its Dock icon. |

## Tests

| Test | File |
|---|---|
| `close_on_a_visible_window_hides_it` | `policy.rs` |
| `close_while_quitting_is_allowed_through` | `policy.rs` |
| `close_without_a_tray_quits_rather_than_hiding` | `policy.rs` |
| `a_tray_failure_never_produces_a_hide` | `policy.rs` |
| `close_on_an_already_hidden_window_does_nothing` | `policy.rs` |
| `showing_a_hidden_window_resolves_to_show_and_focus` | `policy.rs` |
| `showing_an_already_visible_window_resolves_to_focus_only` | `policy.rs` |
| `repeated_show_requests_never_ask_for_more_than_a_focus` | `policy.rs` |
| `closing_the_window_then_clicking_the_tray_reuses_the_same_window` | `tests/lifecycle_policy.rs` |
| `without_a_tray_the_app_never_hides_itself_out_of_reach` | `tests/lifecycle_policy.rs` |
| `warns that closing quits when the tray could not be created` | `ui/src/App.test.tsx` |

Manual checks are in
[the functional checklist](../../tests/functional-checklist.md#module-lifecyclemacosrs--hideshow);
the 50-cycle show/hide leak test is
[performance scenario 5](../../tests/performance.md#5-showhide-cycle-leak-test-50-cycles).

---

## Planned change: destroy the window instead of hiding it

**Not implemented.** Everything above describes current behaviour. This section is the design note
for the backlog item in [PLAN.md](../../../PLAN.md) §4, written while the measurements were fresh.

### Why

The window is expected to be opened roughly once a day. Holding 45 MB of WebKit helpers for the
other 23 hours and 59 minutes contradicts the principle the whole architecture is built on — heavy
work in short-lived processes, an idle core otherwise. Destroying on close should bring the idle
footprint from ~73 MB to ~30 MB.

A closed webview also cannot leak, which removes the entire concern behind
[performance scenario 10](../../tests/performance.md#10-frontend-profiling--the-62-nobody-was-measuring)
for the closed state. It still applies while the window is open.

### The precondition that decides whether this is worth doing

WebKit pools and caches its helper processes so a subsequent load is fast. **If they survive
`window.close()`, this change buys nothing.** Measure before writing any code:

```bash
# window open, helpers discovered as in performance.md
for p in $WK_PIDS; do ps -p $p -o pid=,comm= ; done   # three processes
# close the window, then
sleep 60
for p in $WK_PIDS; do ps -p $p -o pid=,comm= ; done   # still three? then stop here
```

### What it costs

- **Reopen is no longer instant.** Building a WKWebView, loading the bundle and mounting React
  replaces an `orderIn:`. Hundreds of milliseconds instead of none — acceptable at once a day,
  noticeable on a tray click.
- **Frontend state is discarded.** Nothing is lost today: `App.tsx` reads everything from the
  backend on mount. It matters once the report views in PLAN.md §4 land — someone reading a report,
  closing the window and reopening should not land back at the top. The right answer is likely to
  keep view state in Rust rather than to keep the webview alive.
- **Window geometry is lost** unless persisted. Every open would be a fresh 800×600 in the centre.
  `tauri-plugin-window-state` exists for this.

### Edge cases this introduces

The current design assumes the window always exists. These are the places that assumption is load-bearing:

| Case | What has to change |
|---|---|
| Tray clicked twice while the window is still being built | `WebviewWindowBuilder::build()` fails on a taken label. Needs a third state beyond visible/hidden — "creating" — or an idempotent build |
| `Action::ShowAndFocus` | [`macos.rs`](../../../src-tauri/src/lifecycle/macos.rs) currently logs a warning when `get_webview_window()` returns `None`. That becomes the construction path |
| `LifecycleState.window_visible` | One boolean is no longer enough. Either add `window_exists`, or replace both with `WindowState { Absent, Creating, Hidden, Visible }` |
| ⌘Q with no window open | `ExitRequested` still fires and sets `is_quitting`, but the `AllowClose` branch never runs — there is nothing to close. Should work; it is a new path and needs a test |
| `RunEvent::Reopen`, single instance | Both resolve to `ShowAndFocus` today, which will now sometimes mean "construct" |
| Webview construction fails | A failure mode that does not exist today. Unlike a tray failure it is recoverable — the tray is still there to try again — but it must be logged and must not leave the app wedged |
| Activation-policy ordering | `Regular` is set *before* the window appears, or it opens behind other apps. The gap between the flip and the window becoming visible gets longer |
| First-close notification | Fired from `hide()` today; moves to the close path |

The existing **"no tray → the close button quits"** rule stays correct and stays necessary. It was
written about exactly the state this change enters deliberately: a live process with no window.

### Files it would touch

| File | Change |
|---|---|
| `src-tauri/src/lifecycle/policy.rs` | Window state representation, a new `Action`, the `WindowCloseRequested` branch, tests for every new combination |
| `src-tauri/src/lifecycle/macos.rs` | `hide` becomes destroy; `show` learns to build; double-create guard |
| `src-tauri/src/lifecycle/mod.rs` | `AppState` gains the second flag or the atomic enum |
| `src-tauri/src/lib.rs` | `on_window_event` stops calling `prevent_close()` on the hide path |
| `src-tauri/src/ipc_commands.rs` | `hide_main_window` — a good moment to move its `if` into the policy, as [automation-notes](../../tests/automation-notes.md) flags |
| `src-tauri/tauri.conf.json` | The window block becomes a template for reconstruction |
| `ui/` | No change |

Tests and docs that change with it: `tests/lifecycle_policy.rs`, the H-series in the functional
checklist (H4, H5 and H6 invert), performance scenarios 3 and 5 — scenario 5 stops being "memory
returns to baseline" and becomes "reconstruction stays under N ms" — and the decisions table in
[CLAUDE.md](../../../CLAUDE.md).
