# Plan — macOS app lifecycle (tray, autostart, hide-to-tray, quit)

Spec: [_specs/macos-app-lifecycle.md](../_specs/macos-app-lifecycle.md)
Branch: `claude/feature/macos-app-lifecycle` (spec) — currently on `tray-implementation`

## Context

The repo is still the Tauri + React hello-world scaffold: [src-tauri/src/lib.rs](../src-tauri/src/lib.rs)
is 16 lines that register `tauri-plugin-log` under `debug_assertions` and nothing else. No tray, no
window-event handling, no IPC commands, no `invoke()` anywhere in `ui/src`, and no test
infrastructure of any kind in the active project.

PLAN.md's MVP lists "Сворачивание в трей, автозапуск при логине ОС" as a required item, and the
whole v2.0 design depends on the app being a long-lived background process: the scheduler
(`tokio-cron-scheduler`) has to have a process to live inside. This feature builds that process
container first, before any sync or scheduler logic exists, so the later work has somewhere to
plug in. It also establishes the idle-cost baseline that PLAN.md §1 commits to ("минимальная
нагрузка на систему в фоне") — every later feature gets measured as a delta against numbers
recorded here.

Scope is macOS only, platform-gated so a later Windows/Linux build compiles without rework.

## Decisions locked in

These came from the spec's Open Questions, answered by the user; do not re-open them during
implementation.

| Question | Decision |
|---|---|
| Hidden state | **Tray-only.** Window hides instantly (⌘H feel, state preserved, no minimise animation) and the app flips to `ActivationPolicy::Accessory` — Dock icon and ⌘-Tab entry disappear. Showing flips back to `Regular`. |
| Way back in when hidden | **Tray icon only.** The Dock-click reopen path in the spec is dropped as a consequence of Accessory. |
| Autostart mechanism | **`MacosLauncher::LaunchAgent`** — writes `~/Library/LaunchAgents/*.plist`, no Automation prompt. Appears under System Settings → Login Items & Extensions → *Allow in the Background*, not *Open at Login*. |
| Autostart default | **Off** on fresh install. |
| Login-item launch | Starts **hidden** (tray-only, Accessory). |
| First-run autostart opt-in | **Native notification.** |
| First close-to-tray notice | **Native notification**, fired after the window hides. |
| Tray asset | **New monochrome template PNG**, `iconAsTemplate: true`. |
| Second launch | **`tauri-plugin-single-instance`** — focuses/reveals the running instance. |

### Consequence to keep in mind

Accessory-while-hidden makes the tray icon the single re-entry point. If tray creation fails there
is no way back into the app. The implementation must therefore treat tray-creation failure as a
hard fallback: log it, skip the hide-on-close behaviour entirely, and leave the window a normal
visible closable window. This is stricter than the spec's "log it and carry on".

## Verified groundwork

Facts confirmed against files on disk and the installed toolchain — these shape the steps below.

- `tauri` resolves to **2.11.5**; [src-tauri/Cargo.toml](../src-tauri/Cargo.toml) has `features = []`,
  so the **`tray-icon` cargo feature is off** and must be added. Setting `app.trayIcon` in
  `tauri.conf.json` does not enable it.
- [src-tauri/capabilities/default.json](../src-tauri/capabilities/default.json) grants only
  `core:default`. That **already includes `core:tray:default` and `core:menu:default`** (the full
  tray command surface). It does **not** include `core:window:allow-hide` / `allow-show` /
  `allow-set-focus`, nor `core:app:allow-set-dock-visibility` / `allow-app-hide` / `allow-app-show`.
- The `bundle.macOS` config schema has **no `LSUIElement` / activation-policy key**. The only
  options are a merged plist via `bundle.macOS.infoPlist`, or the runtime
  `app.set_activation_policy(...)` call. We use the runtime call, since the policy has to change
  dynamically.
- `app.trayIcon` keys: `id`, `iconPath` (required), `iconAsTemplate` (default `false`),
  `showMenuOnLeftClick` (default `true`; `menuOnLeftClick` is deprecated), `title`, `tooltip`.
  `additionalProperties: false`, so a typo is a hard config error.
- Window `skipTaskbar` is a **no-op on macOS**. Window `visible` defaults to `true`; the window has
  no `label`, so it is `"main"` and the existing capability matches.
- Only `tauri-plugin-log 2.9.1` is vendored. **autostart, notification and single-instance crates
  are not in the cargo registry cache** — adding them needs a network fetch.
- `tauri-plugin-autostart` is **2.5.1**, `MacosLauncher::{LaunchAgent, AppleScript}`, permissions
  `autostart:allow-enable` / `allow-disable` / `allow-is-enabled`.
- [src-tauri/icons/](../src-tauri/icons/) has **no monochrome menu-bar template asset** — only the
  scaffold set.
- `src-tauri/target/` is fully built (debug + release, 3.0 GB), so rebuilds are incremental and
  fast. The previously built `.app` has since been removed from `bundle/macos/`; a fresh
  `tauri build` will regenerate it.
- **No test infrastructure exists**: no `tests/` dir, no vitest/jest, no `#[cfg(test)]`, no
  `[dev-dependencies]`, no `test` script in either `package.json`. `ui/tsconfig.node.json` includes
  only `vite.config.ts`, so a vitest config file needs adding there.

### Two environment constraints

1. **cargo must run in your own terminal.** CLAUDE.md already documents this; adding three new
   plugin crates means a first-time network fetch, which is exactly the case that breaks under the
   agent sandbox.
2. **The perf tools must run in your own terminal too.** Newly confirmed: the agent sandbox denies
   `ps`, `top` and `pgrep` outright (`operation not permitted`, `sysmond service not found`). Every
   command in the testing tutorial below is written for a plain Terminal session.

---

## Architecture

### Module layout

Follows PLAN.md §3, which already names `tray.rs`, `config.rs` and `ipc_commands.rs`.

```
src-tauri/src/
├── lib.rs              # builder wiring only — plugins, setup, event handlers
├── config.rs           # non-secret app config: load/save, pure serde struct
├── lifecycle/
│   ├── mod.rs          # re-exports
│   ├── policy.rs       # PURE decision logic — the unit-tested core, no Tauri types
│   └── macos.rs        # #[cfg(target_os = "macos")] adapter: executes decisions
├── tray.rs             # tray icon + menu construction, event wiring
└── ipc_commands.rs     # #[tauri::command] bridge for the UI
```

### The testability split (most important design choice)

The spec demands unit tests for decision logic without a live window. Everything that *decides* is
a pure function over plain values; everything that *touches* `AppHandle` / `WebviewWindow` is a thin
adapter with no branching worth testing.

`lifecycle/policy.rs` holds no Tauri imports at all:

- An action enum (hide-to-tray, exit, show-and-focus, focus-only, do-nothing) that decisions return
  and the adapter executes.
- A trigger enum distinguishing window-close-requested, tray-quit, app-quit, tray-click,
  second-instance-launch, reopen.
- `decide(trigger, state) -> Action`, where `state` is a plain struct of booleans
  (`window_visible`, `tray_available`, `is_quitting`).
- `reconcile_autostart(stored: Option<bool>, os_registered: bool) -> AutostartResolution` — returns
  both the value to show in the UI and whether a corrective register/unregister is needed.
- `should_show_first_close_notice(already_shown: bool) -> bool` and the equivalent for the
  first-run autostart prompt.

`lifecycle/macos.rs` is the only place that calls `set_activation_policy`, `window.hide()`,
`window.show()`, `window.set_focus()`. It matches on the action enum and executes — no logic.

This is what makes the spec's unit-test list achievable without `tauri::test::mock_app`.

### Quit vs. hide — exact event handling

The trap: on macOS, ⌘Q closes windows on its way out, so a naive `CloseRequested` → `prevent_close()`
handler makes the app unquittable. Ordering on macOS is `RunEvent::ExitRequested` **before** windows
receive `CloseRequested`. So:

- `RunEvent::ExitRequested` — do **not** prevent it. Set `is_quitting = true` in managed state and
  let it through. This is the single place that knows a real quit is underway.
- `WindowEvent::CloseRequested` on `main` — if `is_quitting` is set, allow the close. Otherwise
  `api.prevent_close()` and run the hide-to-tray action.
- Tray **Quit** — `app.exit(0)`, which routes through `ExitRequested` and hits the same path.
- ⌘Q and the app-menu Quit — reach `ExitRequested` natively; nothing to add.
- "Last window closed" exit path — never reached, because the window is never actually closed while
  hiding.

### Hide / show sequences

Hide: `window.hide()` → `app.set_activation_policy(Accessory)` → fire the first-close notice if it
has not been shown → persist that it has.
Show: `app.set_activation_policy(Regular)` → `window.show()` → `window.unminimize()` →
`window.set_focus()`. Policy must flip *before* showing, or the window can come up behind other apps.

### Config storage — deviation from PLAN.md, flagged

PLAN.md §2 names `tauri-plugin-store` for non-secret config. **This plan uses a plain serde struct
written as JSON into `app_config_dir()` instead**, wrapped in `config.rs` behind a narrow
`load(path)` / `save(path)` interface.

Reason: the spec requires a unit test for "reading with no store present returns the documented
default (off)". With `tauri-plugin-store` the store is reached through `AppHandle`, so that test
needs a mock app and the `tauri` `test` feature. With a serde struct it is a ten-line test against a
tempdir. Three booleans do not justify a plugin. When the schedule and platform mappings land,
swapping `config.rs` to `tauri-plugin-store` is a contained change.

Persisted fields: `autostart_enabled`, `first_close_notice_shown`, `first_run_prompt_shown`.
Runtime-only state (`window_visible`, `is_quitting`, `tray_available`) lives in an `app.manage()`d
struct of atomics.

### IPC surface and capabilities

Commands in `ipc_commands.rs`: `get_autostart_enabled`, `set_autostart_enabled(bool)`,
`show_main_window`, `hide_main_window`.

**Capabilities likely need no changes at all.** Because Rust does every window, activation-policy,
autostart and notification operation internally, the UI only calls our own `#[tauri::command]`s —
which are not gated by plugin ACLs. The `core:window:allow-hide/show/set-focus`,
`core:app:allow-set-dock-visibility`, `autostart:allow-*` and `notification:*` identifiers are only
required if the frontend calls those plugin JS APIs directly. Keep it that way: it is a smaller
attack surface and less config to maintain. Add permissions only if a step actually fails on one.

---

## Implementation steps

Commit boundaries are marked. Steps flagged **[your terminal]** need network or cargo and cannot run
through the agent sandbox (CLAUDE.md documents the cargo case; `ps`/`top`/`pgrep` are also blocked).

### 1. Dependencies and build config — **[your terminal]**

[src-tauri/Cargo.toml](../src-tauri/Cargo.toml):
- `tauri = { version = "2.11.3", features = ["tray-icon", "image-png"] }` — currently `features = []`.
- Add `tauri-plugin-autostart`, `tauri-plugin-notification`, `tauri-plugin-single-instance`, each
  target-gated to `cfg(any(target_os = "macos", windows, target_os = "linux"))` per the plugin docs.
- `[dev-dependencies] tempfile` for the config tests.

[src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json):
- Add `app.trayIcon` — `iconPath` pointing at the new template asset, `iconAsTemplate: true`,
  `showMenuOnLeftClick: true` (not the deprecated `menuOnLeftClick`), a `tooltip`.
- Leave `app.windows[0].visible` at its default `true`; the hidden-at-login case is handled at
  runtime by detecting the launch argument, not by config (a config-level `visible: false` would
  also hide it on a normal manual launch).

Run `cargo fetch` once in your own terminal so the crates land in `~/.cargo`.

*Commit: "Add tray, autostart, notification and single-instance dependencies".*

### 2. Tray template icon asset

Create `src-tauri/icons/trayTemplate.png` and `trayTemplate@2x.png` — black-on-transparent,
16×16 and 32×32. macOS recolours template images automatically for light/dark menu bars, which is
why the coloured app icon cannot be reused. Reference it from `app.trayIcon.iconPath`.

*Commit: "Add monochrome menu bar tray icon".*

### 3. Pure lifecycle policy + config, with their tests

Write `src-tauri/src/lifecycle/policy.rs` and `src-tauri/src/config.rs` first, with no Tauri types,
plus their `#[cfg(test)]` tests. This is the whole unit-test surface the spec asks for and it
compiles and runs without a window.

*Commit: "Add lifecycle decision logic and app config with unit tests".*

### 4. Tray, window events, activation policy

`src-tauri/src/tray.rs` — `TrayIconBuilder` with a `Menu` containing a single `MenuItem` with id
`quit`; `on_menu_event` maps `quit` to the exit path; `on_tray_icon_event` maps a left-click to the
show action. `src-tauri/src/lifecycle/macos.rs` executes the action enum. Wire both into `lib.rs`
alongside the `RunEvent::ExitRequested` / `WindowEvent::CloseRequested` handling described above.

Tray-creation failure: log through the existing `tauri-plugin-log` sink, set `tray_available = false`
in managed state, which makes `decide()` return "allow close" instead of "hide to tray" — so the app
stays a normal closable window rather than becoming unreachable.

*Commit: "Add tray icon with quit, and hide-to-tray on window close".*

### 5. Autostart + single instance

Register `tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None)` and the single-instance
plugin (which must be registered **first**, per its docs). On startup, read the stored preference,
ask the plugin whether the OS registration actually exists, and pass both to `reconcile_autostart`.
Single-instance callback runs the show action.

Detect the login-item launch so it starts hidden: register the LaunchAgent with an extra argument
(e.g. `--hidden`) and check `std::env::args()` during setup.

**Also handle `RunEvent::Reopen`.** On macOS, relaunching an already-running app from Finder or
Spotlight does not start a second process — LaunchServices activates the existing one, so the
single-instance callback never fires. The Cocoa reopen event is what actually arrives, and Tauri v2
surfaces it as `RunEvent::Reopen { has_visible_windows, .. }`. Route it to the same show action.
Without this, manual checklist step 15 fails even though single-instance is installed. Keep the
single-instance plugin anyway — it covers launching the binary directly, which the dev loop does.

*Commit: "Add launch-at-login toggle and single-instance handling".*

### 6. Notifications

Register the notification plugin. Two triggers:
- First close-to-tray → notification saying the app keeps running in the menu bar and how to quit.
- First run → notification offering launch-at-login, pointing at the toggle in the window.

Both must degrade silently: wrap in a result check, log a failure, and **never** let a notification
error block the hide or the startup path. Desktop notification action buttons are unreliable —
these are informational, and the actual control lives in the window.

*Commit: "Add first-run and first-close notifications".*

### 7. UI toggle

[ui/src/App.tsx](../ui/src/App.tsx) is still the stock Vite demo (hero images, counter button,
Vite/React links). Replace its body with a minimal settings panel — a heading and the "Launch at
login" toggle — rather than grafting a control into demo content. Add `ui/src/lib/ipc.ts` (the name
PLAN.md §3 uses) with typed `invoke()` wrappers. Style with the existing tokens in
[ui/src/index.css](../ui/src/index.css) (`--accent`, `--accent-border`, `--border`, `--text-h`),
which already have a dark-mode block.

This is the project's first `invoke()` call — `@tauri-apps/api` is a dependency but has never been
imported.

*Commit: "Add launch-at-login toggle to the UI".*

### 8. UI test setup

Add vitest + `@testing-library/react` to [ui/package.json](../ui/package.json), a `test` script, a
`test` block in [ui/vite.config.ts](../ui/vite.config.ts), and add the config file to
`ui/tsconfig.node.json`'s `include` (it currently lists only `vite.config.ts`). Test the toggle's
rendering and that it calls the right IPC wrapper with a mocked `invoke`.

*Commit: "Add UI test setup and toggle tests".*

### 9. Reconciling the spec's "./tests folder" with Rust convention

The spec says to put tests in `./tests`. Rust convention puts unit tests inline. Do both, splitting
by kind: pure-logic unit tests stay `#[cfg(test)]` inside `policy.rs` and `config.rs`; add
`src-tauri/tests/lifecycle_policy.rs` as an integration test exercising the same public API from
outside the crate, which satisfies the spec's folder requirement and also proves the API is public
enough to be driven by the adapter.

### 10. Verification — **[your terminal]**

```bash
cd src-tauri && cargo test          # Rust unit + integration tests
cd ui && npm test                   # UI tests
npm run tauri dev                   # smoke test
npm run tauri build                 # release bundle for manual + perf testing
```

Then work through the spec's 17-step manual checklist and the performance tutorial below.

**Adjust manual checklist steps for the decisions taken:** step 4 (Dock click when hidden) no longer
applies — while hidden there is no Dock icon; replace it with "verify the Dock icon and ⌘-Tab entry
disappear on hide and return on show". Step 10 should look under *Login Items & Extensions → Allow
in the Background*, not *Open at Login*, because of the LaunchAgent mechanism.

## Risks

- **Notifications from an unbundled dev binary.** macOS notification delivery generally needs a
  registered bundle identifier. `tauri dev` runs the raw binary, so both notifications may silently
  fail in dev. Not documented in the Tauri notification docs either way — verify against a
  `tauri build` bundle before concluding the code is wrong.
- **Activation-policy flip and window ordering.** Flipping to `Regular` after `show()` can leave the
  window behind other apps. Order matters; if focus is unreliable, an explicit
  `NSApp.activate(ignoringOtherApps:)`-equivalent may be needed.
- **⌘Q event ordering.** The `is_quitting` flag depends on `ExitRequested` firing before
  `CloseRequested`. If a build shows the opposite order, the fallback is to check whether the quit
  originated from the app menu rather than relying on ordering.
- **`leaks`/`vmmap` blocked by hardened runtime.** Tauri defaults `hardenedRuntime: true`; see Step 0
  of the tutorial for the workaround.
- **AppleScript tray clicks need Accessibility permission**, and the menu-bar item index varies. The
  50-cycle load test has a manual fallback.

---

## Manual performance & load testing — tool tutorial

Run everything in your own Terminal. All tools verified present on this machine (macOS 26.6.2,
Xcode at `/Applications/Xcode.app`): `top`, `ps`, `vmmap`, `leaks`, `footprint`, `heap`, `sample`,
`spindump`, `lsof`, `powermetrics`, `xctrace`, `launchctl`, `osascript`, `log`.

Test against a **release bundle installed in `/Applications`**, not `tauri dev`. Login items, the
activation-policy flip and notifications all behave differently for an unbundled dev binary.

### Step 0 — build, install, and get a handle on the process

```bash
cd ~/Workspace/01-Projects/02-Personal/jira-to-qa-portal-2.0
npm run tauri build

# Install the bundle (path is regenerated by the build)
rm -rf "/Applications/jira-to-qa-portal.app"
cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/

open -a "/Applications/jira-to-qa-portal.app"
```

Capture the PID once and reuse it. Do this in every new shell — the PID changes on each launch:

```bash
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
echo "APP_PID=$APP_PID"
```

If that comes back empty, find the real executable name first:

```bash
ls "/Applications/jira-to-qa-portal.app/Contents/MacOS/"
pgrep -fl "qa-portal"
```

**If the debug tools refuse to attach** (`vmmap`/`leaks`/`heap` report "process is not debuggable"),
it is the hardened runtime — Tauri defaults `bundle.macOS.hardenedRuntime` to `true`. Check what the
bundle was signed with:

```bash
codesign -d --entitlements - "/Applications/jira-to-qa-portal.app" 2>&1
codesign -dv --verbose=4 "/Applications/jira-to-qa-portal.app" 2>&1 | grep -i flags
```

Fix for local measurement only — set `"hardenedRuntime": false` under `bundle.macOS` in
`tauri.conf.json`, rebuild, and revert before committing. Never ship that.

### Step 1 — idle CPU baseline (10 minutes, window hidden)

`ps -o %cpu` on macOS reports a lifetime average, not an instantaneous reading, so it hides
periodic spikes. Use `top` sampling for this one.

```bash
# 61 samples, 10s apart = 10 minutes. Window must be HIDDEN before you start.
top -pid "$APP_PID" -l 61 -s 10 -stats pid,command,cpu,mem,rsize,threads,ports \
  | awk -v pid="$APP_PID" '$1==pid {print $3}' > /tmp/idle-cpu.txt

# Average and peak
awk '{gsub(/%/,""); s+=$1; if($1>m) m=$1; n++} END {printf "avg=%.3f%%  peak=%.3f%%  samples=%d\n", s/n, m, n}' /tmp/idle-cpu.txt
```

**Pass:** average effectively 0.0%, peak below ~1%. A recurring non-zero spike means something is
polling — find it with Step 6.

### Step 2 — idle memory baseline

Three views; record all three. `rss` is what you will trend over time, `footprint` is what Activity
Monitor shows, `vmmap` tells you what is actually dirty.

```bash
# 1. Resident set size, in KB
ps -o pid=,rss=,vsz= -p "$APP_PID"

# 2. Apple's own footprint accounting (this is the "Memory" column in Activity Monitor)
footprint -p "$APP_PID"

# 3. Dirty vs clean breakdown, plus the per-region detail
vmmap --summary "$APP_PID"
vmmap "$APP_PID" | grep -E "TOTAL|MALLOC|WebKit|__DATA" | head -20
```

Record the `footprint` number and the `vmmap --summary` **dirty** total in the PR description.
Those two are the baseline every later feature gets compared against.

### Step 3 — process accounting (how many processes does the app really own?)

A Tauri app on macOS uses WKWebView, which runs out-of-process. Those helpers are launched by
launchd, so their parent PID is 1 — they will not show up as children in a `ps` tree. Diff the
process list instead.

```bash
# BEFORE launching the app
ps -ax -o pid,command | grep -E "WebKit|WebContent|Networking\.xpc" | grep -v grep | sort > /tmp/webkit-before.txt

open -a "/Applications/jira-to-qa-portal.app"; sleep 5

ps -ax -o pid,command | grep -E "WebKit|WebContent|Networking\.xpc" | grep -v grep | sort > /tmp/webkit-after.txt
diff /tmp/webkit-before.txt /tmp/webkit-after.txt
```

Then repeat the diff after hiding the window, to answer the spec's question of whether hiding
releases the webview or retains it:

```bash
# hide the window (⌘W), wait for things to settle
sleep 30
ps -ax -o pid,command | grep -E "WebKit|WebContent" | grep -v grep | sort > /tmp/webkit-hidden.txt
diff /tmp/webkit-after.txt /tmp/webkit-hidden.txt

# total memory across the app and its helpers
footprint -p "$APP_PID"
for p in $(ps -ax -o pid,command | grep "WebContent" | grep -v grep | awk '{print $1}'); do
  echo "--- WebContent $p"; footprint -p "$p" | tail -3
done
```

**Expectation:** hiding retains the webview (Tauri does not tear it down). Record the retained cost
as a known number; if it is large, that is a follow-up item, not a blocker for this feature.

### Step 4 — idle wakeups and energy (the real test for a background app)

This is the metric that matters most for PLAN.md §1. A sleeping app that wakes the CPU 50×/sec
costs battery even at 0% CPU.

```bash
# Window hidden. 6 samples at 5s. Needs sudo.
sudo powermetrics --samplers tasks --show-process-energy -n 6 -i 5000 \
  | grep -iE "jira-to-qa-portal|WebContent|^Name|ALL_TASKS"
```

Read the **Idle Wakeups** and **Intr Wakeups** columns plus the energy impact score.

**Pass:** idle wakeups in the low single digits per second, energy impact near zero. Double digits
mean a timer is running that should not be.

If wakeups are high, find the timer:

```bash
sudo powermetrics --samplers timer_analysis -n 1 -i 5000 | grep -iA5 "jira-to-qa-portal"
```

### Step 5 — show/hide cycle leak test (50 cycles)

This is the load test for the activation-policy flip. Automate it with AppleScript. **Terminal needs
Accessibility permission** (System Settings → Privacy & Security → Accessibility) for the tray click.

```bash
# Baseline before cycling
ps -o rss= -p "$APP_PID" | tr -d ' '

for i in $(seq 1 50); do
  # Show: click the menu bar extra
  osascript -e 'tell application "System Events" to tell process "jira-to-qa-portal" to click menu bar item 1 of menu bar 2' 2>/dev/null
  sleep 1
  # Hide: ⌘W on the focused window
  osascript -e 'tell application "System Events" to keystroke "w" using command down' 2>/dev/null
  sleep 1
  echo "cycle $i rss=$(ps -o rss= -p "$APP_PID" | tr -d ' ')"
done

sleep 60   # let things settle
echo "after: $(ps -o rss= -p "$APP_PID" | tr -d ' ')"
```

If the AppleScript menu-bar path does not resolve (menu bar index varies), fall back to clicking the
tray icon by hand for 50 cycles — tedious but valid — or drop to 10 cycles and watch the trend.

**Pass:** RSS returns to roughly baseline after settling. A consistent step up per cycle means the
window or webview is being recreated instead of reused.

Confirm with a leak check at the end:

```bash
leaks "$APP_PID" | tail -20
# Deeper, if leaks reports anything:
heap "$APP_PID" | head -40
```

### Step 6 — long soak (8 hours, hidden)

Start the sampler, leave the machine alone, come back.

```bash
LOG=~/qa-portal-soak-$(date +%Y%m%d-%H%M).csv
echo "epoch,iso,rss_kb,footprint_kb" > "$LOG"
while sleep 300; do
  RSS=$(ps -o rss= -p "$APP_PID" 2>/dev/null | tr -d ' ')
  [ -z "$RSS" ] && { echo "process gone" >> "$LOG"; break; }
  FP=$(footprint -p "$APP_PID" 2>/dev/null | awk '/phys_footprint/ {print $NF; exit}')
  echo "$(date +%s),$(date -Iseconds),$RSS,$FP" >> "$LOG"
done &
echo "sampler PID $!  writing $LOG"
```

Stop it with `kill %1`. Then check the trend:

```bash
awk -F, 'NR>1 {print $3}' "$LOG" | awk 'NR==1{f=$1} {l=$1; if($1>m)m=$1} END {printf "first=%dKB last=%dKB peak=%dKB drift=%+.1f%%\n", f, l, m, (l-f)*100.0/f}'
```

**Pass:** drift within a few percent, no monotonic climb. A steady upward slope over 8h blocks the
feature.

Sample the stack mid-soak to see what it is doing while "idle":

```bash
sample "$APP_PID" 10 -f /tmp/qa-portal-idle.sample.txt
grep -A30 "Call graph" /tmp/qa-portal-idle.sample.txt | head -40
```

### Step 7 — launch/quit cycle test (20 iterations)

Exercises the clean-teardown criterion. `osascript ... to quit` sends a real Quit AppleEvent, so
this goes through the same path as ⌘Q.

```bash
for i in $(seq 1 20); do
  open -a "/Applications/jira-to-qa-portal.app"
  sleep 4
  osascript -e 'tell application "jira-to-qa-portal" to quit' 2>/dev/null
  sleep 3
  LEFT=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | wc -l | tr -d ' ')
  echo "cycle $i: residual processes = $LEFT"
  [ "$LEFT" != "0" ] && echo "!!! ORPHAN after cycle $i" && break
done
```

Then check for leaked file descriptors and stray helpers after a normal quit:

```bash
open -a "/Applications/jira-to-qa-portal.app"; sleep 5
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
lsof -p "$APP_PID" | wc -l                      # note the count
osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
pgrep -fl "qa-portal"                            # must print nothing
ps -ax -o pid,command | grep WebContent | grep -v grep   # no orphaned webviews
```

### Step 8 — autostart verification

```bash
# After enabling the toggle in the app:
ls -la ~/Library/LaunchAgents/ | grep -i "qa-portal"
plutil -p ~/Library/LaunchAgents/*qa-portal*.plist

# Is it loaded in the user's launchd domain?
launchctl list | grep -i "qa-portal"
launchctl print "gui/$(id -u)/<label-from-the-plist>"
```

Verify the `ProgramArguments` path points at `/Applications/...`, not at `target/debug` — that is
the dev-path hazard the spec calls out. After disabling the toggle the plist must be gone:

```bash
ls ~/Library/LaunchAgents/ | grep -i "qa-portal" || echo "correctly removed"
```

Measure the login-start cost after a reboot:

```bash
# Time from login window to the process existing
log show --predicate 'eventMessage CONTAINS "jira-to-qa-portal"' --last 10m --style compact | head -20
# Or simply:
ps -o pid,lstart,etime -p "$(pgrep -f 'jira-to-qa-portal.app/Contents/MacOS' | head -1)"
```

### Step 9 — wake-from-sleep survival

```bash
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
ps -o rss= -p "$APP_PID"          # note it
sudo pmset sleepnow
# ... wake the machine an hour later ...
ps -o pid,etime,rss= -p "$APP_PID"   # same PID, etime spans the sleep
```

Then click the tray icon and confirm the window still shows correctly. Check for anything ugly
during sleep/wake:

```bash
log show --predicate 'process == "jira-to-qa-portal"' --last 2h --style compact | tail -40
```

### Step 10 — deep profiling, only if a number above looks wrong

```bash
# Allocation trace (Instruments, headless)
xctrace record --template 'Allocations' --attach "$APP_PID" --time-limit 120s --output /tmp/qa-portal.trace
open /tmp/qa-portal.trace

# Or CPU time attribution
xctrace record --template 'Time Profiler' --attach "$APP_PID" --time-limit 60s --output /tmp/qa-portal-cpu.trace

# If the app hangs or spins
spindump "$APP_PID" 10 -file /tmp/qa-portal.spindump.txt
```

Note `instruments` is gone on this machine (deprecated); `xctrace` is its replacement and is
present at `/usr/bin/xctrace`.

### Results table to fill in for the PR

| Measurement | Command (step) | Expected | Actual |
|---|---|---|---|
| Idle CPU avg / peak, 10 min hidden | 1 | ~0% / <1% | |
| Idle RSS | 2 | record | |
| Idle footprint | 2 | record | |
| vmmap dirty total | 2 | record | |
| Process count when hidden | 3 | record | |
| Idle wakeups/sec | 4 | low single digits | |
| RSS after 50 show/hide cycles | 5 | ≈ baseline | |
| `leaks` after cycling | 5 | 0 leaks | |
| 8h soak drift | 6 | within a few % | |
| Orphans after 20 launch/quit | 7 | 0 | |
| Login-item plist path | 8 | `/Applications/...` | |
| Survives 1h sleep | 9 | yes | |
