# jira-to-qa-portal-2.0

Sync Jira issues into a QA Portal (Quality Tracker), with a UI. The Tauri + React hello-world
skeleton is scaffolded (`src-tauri/`, `ui/`); actual sync/scheduler/report logic is not
implemented yet — see [PLAN.md](PLAN.md) for what's next. `sidecar/` (Playwright automation
packaged as a Tauri sidecar) does not exist yet.

## Running it

```bash
npm install          # root devDependency: @tauri-apps/cli
npm --prefix ui install
npm run tauri dev    # launches Vite (ui/, port 1420) + the Tauri window
```

`npm run tauri build` produces a release bundle. Root `package.json` only holds the Tauri
CLI + scripts; the frontend's own dependencies live in `ui/package.json`.

**Do this in your own terminal, not through the agent's sandboxed Bash tool.** The sandbox
blocks writes outside the repo/tmp, which breaks `cargo`'s registry cache under `~/.cargo`
(and any project-local `CARGO_HOME` substitute still fails — some crates ship a
`.vscode/settings.json` in their published source, and the sandbox blocks writing any
`.vscode/settings.json`, which aborts `cargo fetch`/`check`/`build` mid-unpack). Rust itself
had a similar issue: `rustup` installs fine standalone but writing into `~/.cargo/bin` is
blocked, so it also had to be installed from a plain user terminal. Editing source files
(Rust or TS) works fine through the agent — only invoking `cargo`/first-time crate downloads
needs a real terminal.

## Start here

- [PLAN.md](PLAN.md) — the v2.0 architecture plan (in Russian). Read this first for any
  implementation work. Summary below.
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

| Layer | Tech | Role |
|---|---|---|
| Core/shell | Tauri (Rust) | app lifecycle, tray, scheduler, IPC |
| UI | Vite + React/Svelte | settings, schedule, sync status, report views |
| QA Portal automation | Node + Playwright (TS), packaged as a Tauri sidecar | reuses/ports the legacy `helpers/`/`page_objects/`/`data/` logic; runs only during sync |
| Jira REST | `reqwest` (Rust) or the same Node sidecar | fetch tickets/filters/JQL (open question, see PLAN.md §5) |
| Scheduler | `tokio-cron-scheduler` (Rust) | configurable cron/interval sync |
| Credentials | `keyring-rs` → OS keychain | Jira token, QA Portal login, LLM key |
| App config (non-secret) | `tauri-plugin-store` | schedule, mappings, chosen LLM provider |
| LLM | Ollama (`localhost:11434`) now; Anthropic/OpenAI later behind an `LLMProvider` trait | report generation |

Design principle: heavy work (browser automation, LLM inference) lives in short-lived
external processes; the Tauri core stays idle (tray + sleeping scheduler) otherwise.

MVP scope and post-MVP backlog are tracked as checkboxes in
[PLAN.md §4](PLAN.md#4-фичи) — check there before starting new feature work, and update
the plan (or open questions in §5) as decisions are made.

## Conventions

- Planning docs (PLAN.md) are written in Russian; code and comments should follow whatever
  convention is established once implementation starts (not yet decided).
- `reference/legacy-script/` has its own `package.json`/Playwright config, but it is
  reference-only — do not treat it as the active project's toolchain.
- UI framework: React (chosen over the Svelte alternative PLAN.md left open).
- Rust toolchain managed via `rustup` (not `mise` — `mise`'s HTTP client fails TLS through
  this machine's network setup).
