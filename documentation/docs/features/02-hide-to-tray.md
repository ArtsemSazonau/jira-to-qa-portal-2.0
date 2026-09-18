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

No. Tauri does not tear down the WKWebView when a window is hidden, so the WebKit content and
networking helper processes stay alive and keep their memory. That is a known, measured cost rather
than a bug — record it with
[the process accounting step](../../tests/performance.md#3-process-accounting) and treat a large
number as a follow-up item, not a blocker.

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
