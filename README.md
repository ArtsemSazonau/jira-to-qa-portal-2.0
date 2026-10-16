# jira-to-qa-portal-2.0

Desktop app that syncs Jira issues into the QA Portal (Quality Tracker), replacing the v1.0 console
Playwright script. The aim: syncs that run on a schedule, credentials in the system keychain instead
of `.env`, and builds from GitHub Actions. Time entry into the internal time tracker is drafted as
the next goal; LLM reports from Jira tickets come later. The goals and their order are in
[PLAN.md](PLAN.md) §1.

**Current state:** the macOS app lifecycle is implemented — tray icon, hide-to-tray, launch at
login, single instance. The credentials window, Jira client, sync, scheduler, CI, time tracking and
report generation are not built yet; see [PLAN.md](PLAN.md) §4 for the backlog and
[documentation/docs/overview.md](documentation/docs/overview.md) for what exists today.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Tauri core (Rust) — the long-lived process                      │
│                                                                  │
│  lib.rs          builder wiring: plugins, setup, event handlers  │
│  lifecycle/                                                      │
│    policy.rs     PURE decision logic — no Tauri types            │
│    macos.rs      #[cfg(macos)] adapter — executes decisions      │
│    mod.rs        AppState: runtime atomics + config              │
│  tray.rs         menu bar icon and menu                          │
│  autostart.rs    login item registration + reconciliation        │
│  notify.rs       one-time informational notifications            │
│  config.rs       non-secret config as JSON                       │
│  ipc_commands.rs #[tauri::command] bridge to the UI              │
└───────────────┬──────────────────────────────────────────────────┘
                │ invoke()
┌───────────────▼──────────────────────────────────────────────────┐
│  UI (Vite + React, ui/)                                          │
│    App.tsx       settings panel                                  │
│    lib/ipc.ts    typed invoke() wrappers — the only IPC surface   │
└──────────────────────────────────────────────────────────────────┘
```

Planned but not yet built: a Node + Playwright **sidecar** for QA Portal automation, a `reqwest`
**Jira client** in the Rust core, a `tokio-cron-scheduler` **scheduler**, a **credentials window**
backed by `keyring-rs`, a **time tracker** client (draft), and **CI** on GitHub Actions. An **LLM**
report generator comes later. See [PLAN.md](PLAN.md) §2–3.

### The design principle that shapes everything

Heavy work — browser automation, LLM inference — lives in short-lived external processes. The Tauri
core stays idle otherwise: a tray icon and a sleeping scheduler, no Chromium and no Node. Every
feature added to the core is measured against the idle baseline recorded in
[documentation/tests/runs/performance-results.md](documentation/tests/runs/performance-results.md).

### The testability split

Everything that *decides* is a pure function over plain values (`lifecycle/policy.rs`); everything
that *touches* `AppHandle` or `WebviewWindow` is a thin adapter with no branching
(`lifecycle/macos.rs`). This is why the lifecycle behaviour has unit tests without needing a live
window or `tauri::test::mock_app`.

**If you are adding an `if` to the adapter, it belongs in the policy instead.**

---

## Running it

```bash
npm install               # root devDependency: @tauri-apps/cli
npm --prefix ui install
npm run tauri dev         # Vite (ui/, port 1420) + the Tauri window
```

`npm run tauri build` produces `src-tauri/target/release/bundle/macos/jira-to-qa-portal.app` and a
`.dmg`.

> **Run cargo commands in your own terminal, not through an agent's sandboxed shell.** Sandboxes
> typically block writes to `~/.cargo`, which breaks the crate registry cache. Editing source files
> through an agent is fine; invoking `cargo` is not. See [CLAUDE.md](CLAUDE.md) for the details and
> the `CARGO_HOME` workaround.

Rust toolchain is managed via `rustup` — not `mise`, whose HTTP client fails TLS through this
machine's network setup.

### Testing

The whole automated suite that needs no built app, from the repo root:

```bash
npm run test:fast
```

It runs each step in order, stops at the first failure, names it, and ends with a per-step summary.
The `pre-push` hook runs the same command, installed by `npm install` through `lefthook`; skip it
once with `LEFTHOOK=0 git push`.

| Step | Covers | Expected |
|---|---|---|
| `cargo test` | policy decisions and invariants, config, lifecycle state, notice wording, integration, capability guard | 56 unit + 18 integration = **74 passed** |
| `cargo clippy --all-targets -- -D warnings` | the test targets too | nothing but `Finished` |
| `npm --prefix ui test` | IPC wrappers and contract, the settings panel, accessibility; vitest in jsdom | **25 passed** across 4 files |
| `npm --prefix ui run build` | `tsc -b && vite build`; type-checks all of `src`, tests included | `built in …` |
| mock leak check | the UI flows' scripted backend is absent from `ui/dist` | `mock leak check passed` |
| `npm --prefix ui run lint` | oxlint | `Found 0 warnings and 0 errors` |
| UI flows | Playwright in WebKit against a scripted backend; light/dark screenshot baselines | **10 passed** |
| catalog check | the checker's own tests, then the [test catalog](documentation/tests/catalog.md) against the code | `catalog check passed` |

Seconds warm; about two minutes cold, almost all of it `cargo` building the test and clippy targets.
Run it in your own terminal — see the note on cargo and sandboxes above.

> **`build` means two different things here.** At the repo root `npm run build` is `tauri build` —
> the full release bundle, minutes. The suite's build step is `ui/`'s, `tsc -b && vite build`, under
> a second.

| Command | Use it for |
|---|---|
| `npm run test:fast` | before every push (the hook does it) and during development |
| `npm run test:flows` | the UI flows alone, while iterating on a screen |
| `npm run test:catalog` | after changing a test's case tag or the catalog; `-- --write` regenerates the inventory |
| `npm --prefix ui run test:watch` | watch mode for the UI while writing a feature |
| `npm --prefix ui run test:coverage` | the UI coverage report; fails below the floor |
| `npm run test:doctor` | checks Xcode, Appium, the Accessibility grant and the test build before e2e |
| `npm run build:e2e` | builds the test variant (`jira-to-qa-portal-e2e.app`, WebDriver inside, own identity) |
| `npm run test:e2e` | the end-to-end specs against the test variant; takes over the screen for ~2.5 min |
| `npm run test:regression` | doctor → build:e2e → fast suite → e2e; before calling a change done |
| `npm run test:release` | after `npm run tauri build`: no test code in the release, launch, tray, quit, no leftovers |

**No build command runs a test.** Rust drops `#[cfg(test)]` code from a normal build entirely, and
`tauri build` only calls `tsc -b && vite build` for the frontend. A green build means the tests
*compile*, not that they pass. A CI workflow is planned, not built. The testing strategy — layers,
tools, stages and the test catalog — is [documentation/tests/README.md](documentation/tests/README.md).

The two interactive steps run separately, from the root:

```bash
npm run tauri dev      # window opens; log carries `tray icon created` and no panic
npm run tauri build    # produces the .app and the .dmg
```

In `tauri dev` the window's close button **hides the app to the tray** rather than stopping the dev
server — that is the feature working, not a hang. Stop it with Ctrl-C in the terminal, or ⌘Q.

Manual and performance checks — the ones that need eyes, the menu bar, the Dock or a reboot, and
are not automated today — are in [documentation/tests/](documentation/tests/).

---

## Configuring it

### Non-secret config

Written as JSON to the platform config dir:

```
~/Library/Application Support/dev.sazonau.jira-to-qa-portal/app-config.json
```

```json
{
  "autostart_enabled": false,
  "first_close_notice_shown": false,
  "first_run_prompt_shown": false
}
```

All three default to `false`. A missing file is a fresh install; a corrupt one is logged and
replaced by defaults, so a bad edit cannot stop the app from starting. Unknown keys are ignored, so
a file written by a newer build still loads.

**Secrets never go here.** Jira tokens and the QA Portal login belong in the system keychain via
`keyring-rs` (PLAN.md §2) — not yet implemented.

### Launch at login

Toggled in the app window. Registration uses `tauri-plugin-autostart` with
`MacosLauncher::LaunchAgent`, which writes:

```
~/Library/LaunchAgents/jira-to-qa-portal.plist
```

It appears in **System Settings → General → Login Items & Extensions → Allow in the Background**
(*not* under *Open at Login*, which is where the AppleScript launcher would put it). Default is off
on a fresh install; a one-time notification offers the opt-in.

The registration passes `--hidden`, so a login-item launch starts in the menu bar without showing
the window. A manual launch has no such argument and opens normally.

### Capabilities

`src-tauri/capabilities/default.json` grants only `core:default` — and deliberately nothing else.
Every window, activation-policy, autostart and notification operation happens in Rust, so the
frontend only calls our own `#[tauri::command]`s, which are not gated by plugin ACLs. Keep it that
way: a plugin JS API called from the UI is the only thing that would force new permission entries.

---

## Debugging it

### Logs

`tauri-plugin-log` is registered under `debug_assertions` only, at `Info` level. In `tauri dev` the
log goes to stdout in the terminal running the dev server. For a release build, raise the level or
drop the `cfg!(debug_assertions)` guard in `setup` — see
[src-tauri/CLAUDE.md](src-tauri/CLAUDE.md).

What the lifecycle logs, and what each line means:

| Line | Meaning |
|---|---|
| `tray icon created` | The tray is up; hide-to-tray is active. |
| `could not create the tray icon: … Hide-to-tray is disabled` | Fallback engaged — closing the window now quits. |
| `launched by the login item; starting hidden` | The `--hidden` argument was seen. |
| `exit requested; shutting down` | A real quit is underway; the close that follows is allowed through. |
| `registered a login item for a development binary` | The plist points at `target/`; it will break on rebuild. |
| `could not show the … notification` | Expected in `tauri dev` — macOS wants a registered bundle id. |

macOS-side logs for a bundled app:

```bash
log show --predicate 'process == "app"' --last 10m --style compact
```

### Inspecting the running app

```bash
# The executable is named `app` (from Cargo's package name) inside jira-to-qa-portal.app
pgrep -fl "jira-to-qa-portal.app/Contents/MacOS"

# Web inspector: right-click in the window (enabled in debug builds)
# Login item state
plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist
launchctl print "gui/$(id -u)/jira-to-qa-portal"
```

### Things that behave differently in `tauri dev`

Test these against a `tauri build` bundle installed in `/Applications`, never a dev binary:

- **Notifications** — macOS generally needs a registered bundle identifier to deliver them.
- **Login items** — the dev binary's path lives under `target/`, which disappears on `cargo clean`.
- **Activation policy and the Dock** — an unbundled binary's Dock behaviour is not representative.

### Resetting to a fresh-install state

```bash
rm ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
rm ~/Library/LaunchAgents/jira-to-qa-portal.plist
```

---

## Where to read next

| Document | What it covers |
|---|---|
| [PLAN.md](PLAN.md) | The v2.0 architecture plan (Russian). Read first for implementation work. |
| [CLAUDE.md](CLAUDE.md) | Conventions, environment constraints, reference material for contributors. |
| [src-tauri/CLAUDE.md](src-tauri/CLAUDE.md) | Tauri backend development — plugins, capabilities, events, gotchas. |
| [documentation/docs/overview.md](documentation/docs/overview.md) | What is implemented today. |
| [documentation/tests/](documentation/tests/) | Testing strategy, the test catalog, manual and performance cases. |
| [reference/legacy-script/](reference/legacy-script/) | The v1.0 console script being ported. Reference only. |
