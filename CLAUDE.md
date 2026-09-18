# jira-to-qa-portal-2.0

Sync Jira issues into a QA Portal (Quality Tracker), with a UI.

**What exists:** the macOS app lifecycle — tray icon, hide-to-tray, launch at login, single
instance — plus the Rust/UI module skeleton it establishes. **What does not:** sync, scheduler,
credentials, Jira client, report generation, and the `sidecar/` Playwright process. See
[PLAN.md](PLAN.md) §4 for the backlog and
[documentation/docs/overview.md](documentation/docs/overview.md) for what is built.

## Running it

```bash
npm install          # root devDependency: @tauri-apps/cli
npm --prefix ui install
npm run tauri dev    # launches Vite (ui/, port 1420) + the Tauri window

cd src-tauri && cargo test     # 57 Rust tests
cd ui && npm test              # 14 UI tests
```

`npm run tauri build` produces a release bundle. Root `package.json` only holds the Tauri
CLI + scripts; the frontend's own dependencies live in `ui/package.json`.

**Run cargo in your own terminal, not through the agent's sandboxed Bash tool.** The sandbox
blocks writes outside the repo/tmp, which breaks `cargo`'s registry cache under `~/.cargo`
(and any project-local `CARGO_HOME` substitute still fails — some crates ship a
`.vscode/settings.json` in their published source, and the sandbox blocks writing any
`.vscode/settings.json`, which aborts `cargo fetch`/`check`/`build` mid-unpack). Rust itself
had a similar issue: `rustup` installs fine standalone but writing into `~/.cargo/bin` is
blocked, so it also had to be installed from a plain user terminal. Editing source files
(Rust or TS) works fine through the agent — only invoking `cargo`/first-time crate downloads
needs a real terminal.

*Workaround that does work inside a sandbox*, if you need one: seed a writable `CARGO_HOME` from the
real registry, so only genuinely new crates need the network.

```bash
export CH=$TMPDIR/cargo-home && mkdir -p "$CH" && cp -R ~/.cargo/registry "$CH"/
CARGO_HOME=$CH cargo test
```

`npm run tauri build` still fails at the `.dmg` step that way (`bundle_dmg.sh` needs `hdiutil`); the
`.app` it produces first is valid. `ps`, `top` and `pgrep` are denied outright, so every performance
measurement needs a real terminal.

## Start here

- [PLAN.md](PLAN.md) — the v2.0 architecture plan (in Russian). Read this first for any
  implementation work. Summary below.
- [src-tauri/CLAUDE.md](src-tauri/CLAUDE.md) — **Tauri backend development.** Module layout, the
  policy/adapter rule, how to add a plugin or an IPC command, and the macOS event-ordering
  gotchas this codebase already solves. Read before touching Rust.
- [README.md](README.md) — architecture diagram, configuration, debugging.
- [documentation/](documentation/) — feature docs and test plans.
- [reference/legacy-script/](reference/legacy-script/) — snapshot of the v1.0 console
  Playwright script being ported. Not part of the v2.0 build; kept only to check logic
  against while porting. See its own [README.md](reference/legacy-script/README.md) and
  [ORIGINAL-README.md](reference/legacy-script/ORIGINAL-README.md).

## What v1.0 (legacy) does

A serial Playwright test that: authenticates to Jira → runs a saved JQL filter → fetches
bugs → logs into the QA Portal → maps Jira priorities to portal severity levels
(Blocker/Critical/Major/Minor/Trivial) → updates quality counts per platform → verifies →
logs out. Key files to reference when porting:

- `reference/legacy-script/helpers/jiraClient.ts` — Jira REST client (Basic Auth: email + API token)
- `reference/legacy-script/page_objects/QAPortalQualityTracker.ts` — QA Portal page object
- `reference/legacy-script/data/{jiraData,platformMapping,priorityMapping}.ts` — mappings
- `reference/legacy-script/tests/sync-jira-qa-portal.spec.ts` — orchestration test

## What v2.0 is planned to be

A cross-platform desktop app (macOS priority, then Windows, Linux low-priority) replacing
the console script, so credentials live in the system keychain instead of `.env`, sync
runs on a schedule, and it generates work-done/in-progress reports from Jira tickets via
an LLM (Ollama locally first, cloud providers later).

Planned stack (see PLAN.md §2-3 for full detail):

| Layer | Tech | Role | Status |
|---|---|---|---|
| Core/shell | Tauri (Rust) | app lifecycle, tray, scheduler, IPC | lifecycle + tray done |
| UI | Vite + React | settings, schedule, sync status, report views | settings panel only |
| QA Portal automation | Node + Playwright (TS), packaged as a Tauri sidecar | reuses/ports the legacy `helpers/`/`page_objects/`/`data/` logic; runs only during sync | not started |
| Jira REST | `reqwest` (Rust) or the same Node sidecar | fetch tickets/filters/JQL (open question, see PLAN.md §5) | not started |
| Scheduler | `tokio-cron-scheduler` (Rust) | configurable cron/interval sync | not started |
| Credentials | `keyring-rs` → OS keychain | Jira token, QA Portal login, LLM key | not started |
| App config (non-secret) | plain serde struct → JSON (**deviation**, see below) | schedule, mappings, chosen LLM provider | lifecycle flags only |
| Autostart | `tauri-plugin-autostart` (`MacosLauncher::LaunchAgent`) | launch at login | done |
| LLM | Ollama (`localhost:11434`) now; Anthropic/OpenAI later behind an `LLMProvider` trait | report generation | not started |

Design principle: heavy work (browser automation, LLM inference) lives in short-lived
external processes; the Tauri core stays idle (tray + sleeping scheduler) otherwise.

MVP scope and post-MVP backlog are tracked as checkboxes in
[PLAN.md §4](PLAN.md#4-фичи) — check there before starting new feature work, and update
the plan (or open questions in §5) as decisions are made.

## Decisions made during implementation

These resolved open questions or deviated from PLAN.md. Do not re-open them without a reason.

| Decision | Instead of | Why |
|---|---|---|
| Non-secret config is a plain serde struct written as JSON | `tauri-plugin-store` (PLAN.md §2) | The store is reached through `AppHandle`, so "reading with no store returns the default" would need a mock app. Three booleans did not justify it. Swapping later is contained to `config.rs`. |
| The tray is built in Rust `setup`, and `app.trayIcon` is **absent** from `tauri.conf.json` | declaring it in config | A config-declared tray is created inside `App::build`, where failure aborts startup; the spec requires that failure to be survivable. Declaring it as well would create a second icon. |
| The tray menu carries **Show Window** as well as Quit, and opens on left *and* right click | left click reopens the window directly | The spec's manual checklist asks for both "clicking the tray reopens the window" and "Quit is present in the left-click menu"; a status item cannot do both on one click. The menu satisfies the second exactly and the first in one extra click, and guarantees Quit is always reachable. |
| No tray → the close button **quits** | "leave the window a normal closable window" | A closed window is destroyed, not hidden, and Tauri does not exit when the last one goes. Merely allowing the close would leave a live process with no window and no way to build another. |
| Hiding drops to `ActivationPolicy::Accessory` | staying `Regular` | Confirmed in the spec's open questions. The consequence: the tray is the only way back in, which is what the no-tray fallback above exists to handle. |
| `tauri-plugin-single-instance` **and** `RunEvent::Reopen` | either alone | They cover different paths. macOS activates an already-running app rather than starting a second process, so single-instance never fires for a Finder/Spotlight relaunch. |

## Conventions

- Planning docs (PLAN.md) are written in Russian; **code, comments and documentation are in
  English**.
- Rust: decisions live in pure functions (`lifecycle/policy.rs`), platform calls in thin adapters
  (`lifecycle/macos.rs`). See [src-tauri/CLAUDE.md](src-tauri/CLAUDE.md) — this is the rule that
  keeps the code testable.
- TypeScript: the UI never calls `invoke` directly. Every command goes through a typed wrapper in
  `ui/src/lib/ipc.ts`.
- Platform-specific code is behind `#[cfg(target_os = "macos")]` so a Windows/Linux build is
  additive rather than a rewrite.
- Tests: pure logic gets unit tests; anything needing a live window, the menu bar or a reboot goes
  in [documentation/tests/functional-checklist.md](documentation/tests/functional-checklist.md)
  rather than a test that will flake.
- `reference/legacy-script/` has its own `package.json`/Playwright config, but it is
  reference-only — do not treat it as the active project's toolchain.
- UI framework: React (chosen over the Svelte alternative PLAN.md left open).
- Rust toolchain managed via `rustup` (not `mise` — `mise`'s HTTP client fails TLS through
  this machine's network setup).

## Spec and plan workflow

`_specs/` holds feature specs (summary, edge cases, acceptance criteria, open questions answered
inline by the user); `_plans/` holds the implementation plan derived from a spec. Both are inputs,
not living documents — once a feature ships, its behaviour is documented in `documentation/` and the
decisions above, and the spec/plan pair is history.
