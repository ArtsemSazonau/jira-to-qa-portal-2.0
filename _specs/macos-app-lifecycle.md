# Spec for macos-app-lifecycle

branch: claude/feature/macos-app-lifecycle
figma_component (if used): n/a

## Summary

Give the Tauri shell its macOS-only desktop lifecycle behaviour, so the app can live in the
background between scheduled syncs instead of being a window the user must keep open. This is
the first slice of the PLAN.md MVP item "Сворачивание в трей, автозапуск при логине ОС"
([PLAN.md §4](../PLAN.md#4-фичи)), and it lands before any sync/scheduler logic exists — the
scheduler will later plug into the same always-running process this feature keeps alive.

Scope is **macOS only**. Windows and Linux are explicitly out of scope for this branch; where a
platform-specific API is needed, the implementation should be behind a `#[cfg(target_os = "macos")]`
boundary (or the Tauri plugin's own platform handling) so adding the other platforms later is
additive and does not require rewriting this code. The current state is the hello-world skeleton in
[src-tauri/src/lib.rs](../src-tauri/src/lib.rs) — no tray, no plugins beyond `tauri-plugin-log`, no
window event handling.

Four behaviours are in scope:

1. **Autostart on login** — the app registers itself to launch when the user logs into macOS.
   Registration is a user-facing toggle, not a hard-coded install-time side effect: the app must not
   silently enrol itself without the setting being on, and the toggle state must survive restarts.
   The default for a fresh install should be **off** until the user opts in (see Open Questions).
2. **Dock icon visible** — the app shows in the Dock as a regular macOS app (activation policy
   `Regular`, not `Accessory`) while it has a visible window, so ⌘-Tab and Dock click behave the way
   users expect from a normal app. It is not a menu-bar-only utility.
3. **Close hides, does not quit** — clicking the window's red close button (and ⌘W) hides the window;
   the process keeps running with its tray icon so scheduled work can continue. Re-opening happens
   via the tray icon or the Dock icon. This is the macOS-idiomatic behaviour and it must not be
   confused with ⌘Q, which still quits.
4. **Tray quit** — a tray icon is present whenever the app runs, and its menu (macOS shows the menu
   on both left and right click for a status item) contains a **Quit** item that terminates the
   process cleanly. The tray menu is intentionally minimal for this branch: Quit only, with room to
   add "Run now / Settings / Logs" later as PLAN.md §3 describes for `tray.rs`.

Implementation should follow the module layout PLAN.md already commits to: tray wiring in
`src-tauri/src/tray.rs`, autostart via `tauri-plugin-autostart`, the autostart preference persisted
as non-secret config via `tauri-plugin-store` (PLAN.md §2), and window-event handling in the builder
setup in `lib.rs`. The UI side is a single toggle — it does not need its own view yet; it can sit in
whatever the current `ui/src` entry renders, to be folded into `Settings.tsx` when that view exists.
Adding these plugins requires new entries in [src-tauri/capabilities/default.json](../src-tauri/capabilities/default.json),
which currently grants only `core:default`.

## Possible Edge Cases

- **Quit vs. hide ambiguity.** ⌘Q, the tray Quit item, and `Application > Quit` from the menu bar
  must all really exit. Only the red close button and ⌘W hide. A "hide" path must not leave the
  process in a state where the user believes the app is closed and nothing in the Dock or tray says
  otherwise.
- **Last window closed.** On macOS, Tauri/Cocoa may treat "all windows closed" as a reason to exit
  the run loop. Since the app has exactly one window today, hiding it must not trip any
  exit-on-last-window-closed path.
- **Dock icon click with no visible window.** After the window is hidden, clicking the Dock icon
  (the Cocoa "reopen" event) must show and focus the existing window rather than doing nothing or
  spawning a second window.
- **Double show.** Tray click and Dock click in quick succession, or repeated tray clicks, must not
  create duplicate windows or leave the window visible-but-unfocused behind other apps.
- **Tray icon fails to register.** If the tray item cannot be created (asset missing, API error), the
  app must not silently become unquittable-and-invisible. Failure should be logged and the window
  should remain a normal closable window.
- **Autostart toggled while the app is not the installed copy.** Running from `target/debug` in dev,
  the registered login item points at a path that may not exist later. Dev builds should either skip
  real registration or make it obvious in logs that a dev path was registered.
- **Autostart already registered externally.** The user may have added the app to Login Items
  manually in System Settings. The toggle must read actual current state on startup rather than
  assuming its stored value is the truth, and reconcile (or at minimum not double-register).
- **Store not yet created on first run.** Reading the autostart preference before the store file
  exists must fall back to the default rather than erroring out of `setup`.
- **Quit during work.** Once the scheduler exists, Quit could fire mid-sync. For this branch the
  requirement is only that Quit performs an orderly shutdown path that a future sync-in-progress
  check can hook into — not that it implements that check.
- **Tray icon in dark/light menu bar and on Retina.** The tray asset must be legible in both menu-bar
  appearances; a full-colour app icon scaled down usually is not. A template image is the macOS norm.
- **Multiple instances.** Launching the app while a hidden instance is already running should focus
  the existing one, not start a second process competing for the same tray slot and login item.
- **Login-item launch behaviour.** When macOS starts the app at login, showing a full window every
  time is intrusive; the intended behaviour is to start with the window hidden (see Open Questions).

## Acceptance Criteria

**Autostart**

- The app exposes a persisted user-facing setting that enables/disables "Launch at login".
- Turning it on registers the app as a macOS login item; turning it off removes it.
- The setting's stored value survives an app restart and an OS reboot.
- On startup the app reads the real registration state and presents the toggle consistently with it.
- A fresh install does not register autostart until the user enables it.

**Dock**

- The app appears in the Dock while running with a visible window, with the app icon from
  `src-tauri/icons/`, and is reachable via ⌘-Tab.
- Clicking the Dock icon when the window is hidden shows and focuses the existing window.
- No second window is ever created by Dock or tray activation.

**Close-to-tray**

- Clicking the window close button hides the window and the process continues running.
- The tray icon remains present after the window is hidden.
- Showing the window again restores it with its prior state, not as a freshly constructed window.
- ⌘Q quits the process rather than hiding it.

**Tray**

- A tray icon is created at startup and visible in the macOS menu bar.
- The tray menu contains a **Quit** item.
- Selecting Quit terminates the process: no orphan process remains, and the tray icon disappears.
- Tray creation failure is logged through the existing `tauri-plugin-log` sink and does not panic.

**General**

- All four behaviours are macOS-gated so that a future Windows/Linux build compiles without
  reworking this code.
- Capability/permission entries required by the new plugins are added to
  `src-tauri/capabilities/default.json`.
- `npm run tauri dev` and `npm run tauri build` both succeed with the new plugins in place.

## Open Questions

- **Default autostart state on fresh install** — spec assumes **off** until the user opts in, which
  is the least surprising. Confirm, since a sync tool arguably wants to be on by default. - confirm. Use general macos guidline style. by default is off and prompt to enable it.
- **Window visibility when launched by the login item** — assumed: start hidden (tray only), since
  the point of autostart is background syncing. Needs confirmation; if it should show, that is a
  different startup path than a manual launch. - hidden
- **Hide vs. minimise semantics** — assumed: hide the window entirely (disappears from the window
  list, Dock icon stays). Alternative is minimise-to-Dock, which leaves a Dock thumbnail. - the analog Cmd + H behavior on mac
- **Dock icon when no window is visible** — assumed: the app stays a `Regular` app and keeps its Dock
  icon even while hidden, because the user asked for the Dock icon explicitly. The alternative
  (switching to `Accessory` so it becomes tray-only while hidden) is quieter but makes the app
  unreachable from the Dock. Confirm which is wanted. - Accessory
- **First-close discoverability** — should the first close-to-tray show a one-time notification
  explaining the app is still running? Out of scope as specified, but worth a decision. - show
- **Tray icon asset** — no menu-bar template asset exists in `src-tauri/icons/` today. Needs either a
  new monochrome template image or an explicit decision to reuse the app icon for now. - create new monochrome icon
- **Single-instance enforcement** — `tauri-plugin-single-instance` is not in PLAN.md's stack table.
  Adding it here would cleanly solve the "launch while hidden" case; confirm whether to pull it in
  now or defer. - add plugin to solve the possible issue and follow clear behavior

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the
following cases, without going to heavy. Rust-side unit tests belong with the Rust code
(`src-tauri/src/.../mod tests` or `src-tauri/tests/`); any UI-side test for the toggle belongs in
`ui/`. Keep the logic under test separated from Tauri runtime calls — the point is to test decision
logic (should this event hide or quit? what does the toggle write?) without needing a live window.

### Unit tests

- **Window close handler** — given a close-requested event, the handler decides "hide" and prevents
  the default close; given a quit request, it decides "exit".
- **Activation/show logic** — given a hidden window, the show path resolves to the existing window
  handle; given an already-visible window, it resolves to focus-only. Neither path creates a window.
- **Autostart preference persistence** — writing the toggle stores the value; reading it back returns
  the same value; reading with no store present returns the documented default (off).
- **Autostart state reconciliation** — when the stored preference and the actual OS registration
  disagree, the resolver returns the expected reconciled state (one test per direction).
- **Tray menu construction** — the built menu contains exactly the expected item ids, including a
  `quit` id, and the quit handler maps to the app-exit action.
- **Tray creation failure** — a failing tray-setup path returns an error that is logged and does not
  propagate as a panic out of setup.
- **Platform gating** — the macOS-specific module is compiled/exported only under the macOS cfg (a
  compile-level assertion is enough; no need for cross-platform CI here).

### Manual test checklist (macOS)

Run against a `npm run tauri build` release bundle installed in `/Applications`, not a dev build —
login items and Dock behaviour differ for dev binaries.

1. Launch the app. Verify: window opens, Dock icon present, tray icon present in the menu bar.
2. ⌘-Tab to another app and back. Verify the app is in the ⌘-Tab switcher and returns to front.
3. Click the red close button. Verify: window disappears, Dock icon still present, tray icon still
   present, and the process is still alive (`ps`/Activity Monitor).
4. Click the Dock icon. Verify the same window reappears, focused, with prior state intact.
5. Close again, then click the tray icon. Verify the window reappears — and that no second window
   was created (check the Window menu / Mission Control).
6. Press ⌘W with the window focused. Verify it hides (same as close), not quits.
7. Press ⌘Q. Verify the process exits and the tray icon disappears.
8. Relaunch. Open the tray menu (left click and right click). Verify **Quit** is present in both.
9. Select **Quit** from the tray menu. Verify clean exit: no tray icon, no process in Activity
   Monitor, no crash log in Console.
10. Enable the "Launch at login" toggle. Verify the app appears under
    System Settings → General → Login Items & Extensions → Open at Login.
11. Reboot (or log out and back in). Verify the app starts automatically and in the expected
    visibility state (per the Open Question — hidden with tray icon, if that is confirmed).
12. Disable the toggle. Verify the entry disappears from Login Items, then reboot and verify the app
    does not start.
13. Toggle on, quit the app, relaunch. Verify the toggle still reads "on" without re-registering a
    duplicate login item.
14. Manually add the app to Login Items in System Settings while the toggle is off, then restart the
    app. Verify the toggle reflects reality rather than showing a stale "off".
15. With the app running and hidden, launch it again from Finder/Spotlight. Verify the existing
    instance is focused and no second tray icon appears.
16. Switch macOS between Light and Dark appearance. Verify the tray icon stays legible in both.
17. Launch on an external display / different scale factor. Verify the tray icon is not blurry.

### Performance, memory and long-running process checks

The PLAN.md goal is a near-idle background process (§1: "Минимальная нагрузка на систему в фоне").
These checks establish the baseline *before* the scheduler and sidecar exist, so later features can
be measured as deltas against recorded numbers. Record every measurement in the PR description.

- **Idle CPU baseline** — with the window hidden, sample CPU over 10 minutes (Activity Monitor or
  `top -pid`). Expectation: effectively 0% average, with no periodic wake spikes. Record the number.
- **Idle RSS baseline** — record resident memory immediately after launch with the window hidden.
  Record the number; this is the figure future features must be compared against.
- **8-hour soak (hidden)** — leave the app hidden for a full working day, sampling RSS at start, +1h,
  +4h and +8h. Expectation: RSS is flat; a monotonic upward trend is a leak and blocks the feature.
- **Show/hide cycle leak test** — show and hide the window 50 times in a row, then compare RSS to the
  pre-cycle baseline after a settle period. Expectation: returns to roughly baseline. A step up per
  cycle means the window or its webview is being recreated rather than reused.
- **Webview process accounting** — confirm how many processes the app owns when hidden (main + any
  WebKit content/networking processes) and whether hiding releases or retains them. Record the
  process list; if hiding retains a full webview, note it as a known cost with a follow-up item.
- **Wake-from-sleep** — put the Mac to sleep with the app hidden for at least an hour, wake it, and
  verify the app is still alive, the tray icon still responds, and the window still shows correctly.
- **Login-start cost** — measure time from login to the app being ready (tray icon responsive) and
  confirm it does not visibly delay the login sequence.
- **Clean teardown** — after Quit, verify zero residual processes and no leaked file descriptors or
  helper processes left behind (`lsof`/`ps` check), repeated across 5 launch-quit cycles.
