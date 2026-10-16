# Design

## Context

See proposal.md for why. What shapes the how:

- **What exists.** 42 inline Rust unit tests (`policy.rs` 30, `config.rs` 8, `lifecycle/mod.rs` 4), 15
  in `src-tauri/tests/lifecycle_policy.rs` (public policy API, no Tauri runtime), 14 vitest tests
  (`App.test.tsx` mocks `lib/ipc.ts`; `ipc.test.ts` mocks `invoke`). There is no root test script,
  no hook, no e2e and no UI-flow layer. The manual checklist has 47 checks plus 7 automated-run rows;
  `performance.md` has 12 procedures and a results table.
- **`documentation/tests/automation-notes.md` is partly stale.** It lists the no-backend message,
  the failed-registration state and the tray-unavailable warning as untested UI branches. All three
  are already covered in `App.test.tsx`. It is right about `notify.rs` having no tests and about the
  `if` in `ipc_commands::hide_main_window`.
- **The app has two surfaces.** The window is a WKWebView, which WebDriver can reach through an
  in-app plugin. The menu bar icon, the close button, the Dock and the activation policy belong to
  AppKit, and only the Accessibility API can reach them. No single driver covers both well.
- **Identity drives isolation for free.** The config file lives under `app_config_dir()`, which is
  derived from the bundle identifier. The login item plist is named after `productName`
  (`~/Library/LaunchAgents/<productName>.plist`). The single-instance lock is keyed by the
  identifier. Change the identifier and the product name, and all three separate from the real app.
- **Behaviour differs unbundled.** Login items, notifications and the activation-policy flip
  misbehave for a bare `target/debug` binary (functional-checklist preamble). E2E must run against
  a bundle.
- **Environment.** `cargo`, `osascript` and process inspection are blocked in the agent sandbox
  (CLAUDE.md). Everything from the Rust tests upward runs in the developer's terminal. Xcode is
  available.

## Goals / Non-Goals

**Goals:**
- Each layer has one owner tool and one placement rule, so where a new test goes is never a
  judgement call.
- The test build adds the fewest possible code paths. Isolation comes from identity, not from a
  switch on every resource.
- The e2e harness hides which driver performs a step behind a small support API. If the pilot forces
  a fallback, only the support layer changes and the specs stay as written.
- The catalog cannot claim coverage that does not exist.

**Non-Goals:**
- Running anything in CI. The scripts are written so a later workflow can call them, nothing more.
- Automating performance measurement. This change rewrites the procedures as case files with
  metrics and targets, and stops there.
- Mock Jira and QA Portal servers, and an in-memory credential store. The `e2e-test-build` spec
  requires replaceable addresses; the sync and credentials changes build the fakes.
- A Tauri mock-runtime test layer (`tauri::test`). See decision 9.

## Decisions

### 1. The test build is a cargo feature plus a config overlay, built as a debug bundle

```
npm run tauri build -- --debug --features e2e --bundles app \
                       --config src-tauri/tauri.e2e.conf.json
```

- `Cargo.toml` adds `[features] e2e = ["dep:tauri-plugin-wdio-webdriver"]`, with the plugin as an
  optional, desktop-gated dependency.
- `tauri.e2e.conf.json` overrides `identifier` → `dev.sazonau.jira-to-qa-portal.e2e` and
  `productName` → `jira-to-qa-portal-e2e`.
- The output is a separate `.app` under `target/debug/bundle/macos/`, so the release bundle is never
  overwritten.

**Alternatives.**
- Gating on `debug_assertions`, as the plugin's docs suggest. Rejected: every `tauri dev` run would
  serve WebDriver, and the spec forbids that.
- A runtime flag such as an env var. Rejected: the code would ship in the release binary.
- Testing the bare binary. Rejected: unbundled behaviour differs, see Context.

### 2. Isolation by identity, with real side effects cleaned up by the harness

The test build registers a real login item (`jira-to-qa-portal-e2e.plist`) and writes a real config
file under its own identifier. The harness deletes both, plus any matching `launchctl` job, before
the first spec and after the last. Each spec file also wipes the config before it launches the app.

**Alternative.** Faking autostart in the test build. Rejected: the registration path is exactly what
the manual checks A2/A3/A6/A10/A13 verify, and faking it would leave that path untested.

**Cost.** An interrupted run can leave a plist that launches the debug test bundle at the next
login. That is why cleanup runs *before* the first spec as well as after the last.

### 3. A feature-gated `e2e` module owns every test-only command

`src-tauri/src/e2e.rs` is compiled under `#[cfg(feature = "e2e")]` and holds `e2e_snapshot`, which
returns:

- the core's belief: `AppState` window-visible, tray-available and is-quitting;
- the platform's reality: `window.is_visible()` and whether `tray_by_id(TRAY_ID)` exists;
- the stored config;
- `autostart::os_registered`.

Reporting belief and reality side by side makes divergence between the two a testable failure,
rather than something to infer.

**Registration.** `tauri::generate_handler!` cannot take per-item `cfg` attributes, and Tauri keeps
only the last `invoke_handler`. `lib.rs` therefore has two `cfg`-gated `invoke_handler` calls: the
production list, and the same list plus the `e2e::` commands. The IPC contract check (decision 8)
parses both and fails if the shared part drifts.

**Capability.** If the WebDriver plugin needs a capability permission, it goes inline in
`tauri.e2e.conf.json` (`app.security.capabilities`), never into `capabilities/default.json`. The
capability guard test (decision 9) enforces that.

### 4. Proving nothing leaked into the release

The release smoke stage runs two checks:

1. `cargo tree -e features --release` must not activate the `e2e` feature.
2. `strings` over the release executable must find no `e2e_snapshot` and no `wdio` symbol strings.

The second check is crude, but it tests the artefact that actually ships rather than the build
configuration.

### 5. The e2e harness is WebdriverIO multiremote: two sessions, one scenario

```
e2e/                        own package.json (root package.json stays CLI + scripts)
  wdio.conf.ts              multiremote: { app: tauri-service, os: appium mac2 }
  support/
    window.ts               settings window via WebDriver (switch, buttons, notices)
    os.ts                   menu bar icon + menu, close button, Dock, app switcher via Appium
    state.ts                e2e_snapshot via browser.tauri.execute / invoke
    step.ts                 step(name, act, verify) - every step asserts its own effect
    clean.ts                remove e2e config dir, plist, launchctl job, stray processes
    report.ts               on failure: screenshot (both sessions), app log, snapshot
  specs/
    pilot.e2e.ts            the gate scenario
    tray.e2e.ts  hide.e2e.ts  quit.e2e.ts  login-item.e2e.ts
    single-instance.e2e.ts  config.e2e.ts  notices.e2e.ts
```

- **`app` session.** `@wdio/tauri-service` with the embedded provider points at
  `jira-to-qa-portal-e2e.app/Contents/MacOS/app` and drives the WebView.
- **`os` session.** Appium's Mac2 driver, keyed by the e2e bundle id, drives AppKit through
  XCUITest. Key presses such as ⌘W go through XCUITest's own event synthesis. AppleScript
  `keystroke` was shown not to reach the app (performance.md §5).
- **Execution.** `maxInstances: 1`, because one menu bar and one single-instance lock rule out
  parallel specs. One app process per spec file. A failed scenario retries once, and the retry is
  marked as flaky in the report.
- **Logs.** The app log is captured by setting `RUST_LOG` and redirecting the bundle's stdout. The
  debug build already registers `tauri-plugin-log` at Info level.

**Implementation note (resolved while building the harness).** `@wdio/tauri-service` 1.4.0 treats
every capability in the config as a Tauri app: one without a `browserName` (an Appium Mac2
capability) passes its check, and the service then tries to resolve and launch an app for it. So the
`os` session is not a multiremote instance. The test runner's `browser` is the app session, and
`support/os.ts` opens the Appium session itself with `webdriverio`'s `remote()`, against an Appium
server `wdio.conf.ts` starts in `onPrepare`. Two sessions in one scenario, as above; only `support/`
knows how. The service's own `browser.tauri.execute` needs a second plugin (`tauri-plugin-wdio`) plus
a frontend import, `withGlobalTauri` and `wdio:*` permissions; the harness does not use it.
`support/state.ts` calls `e2e_snapshot` through `window.__TAURI_INTERNALS__.invoke` over plain
`browser.execute`, which the embedded provider awaits, so none of that is added to the test build.

**Alternatives.**
- AppleScript alone: no waits, no screenshots, and the key-event problem above.
- Appium alone, reading the WebView through its Accessibility tree: workable, but coarser than DOM
  selectors.
- `@crabnebula/tauri-driver`: needs a paid API key on macOS.
- Playwright: cannot attach to WKWebView.

### 6. The pilot gates the harness, with recorded fallbacks

The pilot is `[Hide to tray][Pilot] Launch -> close -> tray Show Window -> toggle launch at login ->
setting persisted`. It passes the gate when all of these hold:

| # | Criterion | Fallback if it fails |
|---|---|---|
| a | A WebDriver session reaches the settings switch in the e2e bundle | Drive the WebView through Appium's Accessibility tree, behind `window.ts` |
| b | Appium opens the menu bar icon's menu and clicks *Show Window* | `os.ts` shells out to the AppleScript primitives from performance.md |
| c | The close-button click hides the window, confirmed by the snapshot | none: this is the core of the harness |
| d | 10 consecutive green runs | investigate flakiness before expanding |

The outcome is recorded in the strategy page. Only `support/` changes under a fallback.

### 7. UI flows: Playwright in WebKit, with a mock backend loaded in its own Vite mode

- **Location.** `ui/flows/*.flow.ts` and `ui/playwright.config.ts`. Playwright starts
  `vite --mode mock` itself. The only project is WebKit, the engine closest to WKWebView.
- **How the mock loads.** `main.tsx` runs
  `if (import.meta.env.MODE === 'mock') await import('./test/mock-backend')` before render.
  `MODE` is replaced statically, so the production build drops the branch and the module.
- **What the mock does.** `ui/src/test/mock-backend.ts` calls `mockIPC` from
  `@tauri-apps/api/mocks`. It picks a scenario from `window.__MOCK_SCENARIO__`, which Playwright sets
  through `addInitScript`, and records every call on `window.__IPC_CALLS__` for assertions.
- **The no-backend case** runs without the mock, against plain `vite`.
- **Screenshots.** Visual baselines (`toHaveScreenshot`) cover light and dark through `colorScheme`
  emulation and live next to the flows, suffixed by platform.
- **Leak check.** The fast suite fails if `ui/dist` contains `mockIPC` or the mock module's marker
  string.

**Alternatives.**
- Vitest browser mode: viable, but Playwright is needed anyway for the sidecar's page objects, so
  one browser tool covers both.
- Cypress: no WebKit.

### 8. The IPC contract check is a vitest test that reads both sides as text

`ui/src/lib/ipc.contract.test.ts` reads `src-tauri/src/lib.rs` (both handler lists) and
`ui/src/lib/ipc.ts` (`invoke<…>('name'`), then asserts:

- the production handler list and the set of names `ipc.ts` invokes are equal;
- the e2e list is the production list plus `e2e_*` names only.

**Alternative.** `tauri-specta` generated bindings, which turn a mismatch into a compile error and
also type the arguments. Deferred to the credentials change, where the command count roughly doubles
and typed arguments start to matter. Five commands do not justify a code generator yet.

### 9. Rust test additions, and no mock-runtime layer

| Addition | Where | Why |
|---|---|---|
| `Trigger::HideRequested` → `HideToTray` or `Nothing` | `policy.rs` + unit tests; `ipc_commands::hide_main_window` just applies | Removes the untested `if`. "Hide never quits" becomes a test |
| Property tests over `decide()` | `policy.rs` tests, `proptest` dev-dependency | State the invariants once over the whole state space. Without a tray, nothing yields `HideToTray`. While quitting, a close yields `AllowClose`. Only the quit triggers yield `Exit`. Show requests never yield more than `ShowAndFocus` |
| Notification wording as pure functions returning `(title, body)` | `notify.rs` + tests | Makes the wording assertable. `notify.rs` has no tests today |
| Capability guard | `tests/capabilities.rs` reads `capabilities/default.json` | Fails if permissions grow beyond `core:default` or the window list beyond `main` |
| Unwritable config directory | `config.rs` tests | `save` returns an error, does not panic, and leaves no temp file. Unit side of C7 |

**Not added.** `tauri::test::mock_builder` tests of `ipc_commands`. The commands are typed on `Wry`,
and making them generic only so a mock runtime can call them would weaken the policy/adapter rule.
Their wiring is covered by the contract check (names) and by e2e (behaviour).

### 10. UI component additions

- The toggle is disabled while a save is in flight.
- A previous error clears after a successful toggle.
- The hide button calls `hideMainWindow`.
- An axe accessibility check on the rendered panel, with `axe-core` run in jsdom.
- A coverage floor in `vite.config.ts` `test.coverage.thresholds`, set at implementation to the
  measured value rounded down to the nearest 5%.

### 11. Stages are shell scripts behind root npm scripts

| npm script | Script | Runs |
|---|---|---|
| `test:fast` | `scripts/test/fast.sh` | cargo test → clippy → vitest (+ contract) → ui build → mock-leak check → oxlint → Playwright flows → catalog check |
| `test:flows` | (ui) `playwright test` | UI flows only, for iterating on screens |
| `test:doctor` | `scripts/test/doctor.sh` | Xcode CLT, Appium + Mac2 driver, Accessibility grant (probe), e2e bundle id free |
| `test:e2e` | `scripts/test/e2e.sh` | clean → wdio run (assumes the e2e bundle is built) |
| `test:regression` | `scripts/test/regression.sh` | doctor → build e2e bundle → fast → e2e |
| `test:release` | `scripts/test/release-smoke.sh` | leak checks (decision 4) → launch release `.app` → tray present → Quit → no leftover processes |
| `test:catalog` | `scripts/test/catalog.mjs` | catalog check; `--write` regenerates the inventory |

Each script uses `set -euo pipefail`, prints a banner per step and the name of the step that failed,
and finishes with a per-step summary.

**Why shell.** The steps span cargo, npm, xcrun and Appium, and an orchestrator in JS would only
wrap them. The catalog checker is the one piece with real logic, so it is Node.

**Git hook: `lefthook`.** It is installed as a root devDependency, and its `postinstall` installs the
hooks, so `npm install` is enough. `pre-push` runs `test:fast`. Skipping it requires
`LEFTHOOK=0 git push` or `git push --no-verify`, which is visible in the command, and the strategy
page documents both. No `pre-commit` hook: commits stay instant, and the push is the gate the user
asked for.

### 12. Documentation layout

```
documentation/tests/
  README.md             strategy: pyramid, layer -> tool -> placement rule, stages and commands,
                        prerequisites, the TDD loop, adding a test, troubleshooting, pilot outcome
  catalog.md            every case, by area -> feature, one table per feature
  inventory.md          GENERATED: every automated test, file, and the case ID it carries
  cases/
    <area>/<ID>-<slug>.md          one per manual / partial / e2e case
    performance/PERF-<NNN>-<slug>.md
  performance/README.md method: process discovery, re-signing, tools and their pitfalls
  runs/
    TEMPLATE.md         manual pass record
    YYYY-MM-DD-<version>.md
    performance-results.md   results history (the current results table moves here)
```

- **IDs.** `<AREA>-<NNN>`. The areas, with the `[Area]` labels used in names, are: TRAY `[OS tray]`,
  HIDE `[Hide to tray]`, QUIT `[Quit]`, LOGIN `[Launch at login]`, INST `[Single instance]`,
  NOTE `[Notifications]`, CONF `[Config]`, UI `[Settings UI]`, IPC `[IPC]`, SYS `[System]`,
  PERF `[Performance]`. Future areas follow the same pattern, e.g. JIRA `[Jira]` and SYNC
  `[Portal Sync]`.
- **Catalog row.** `| ID | Case | Levels | Status | Module | Feature | File |`. *Levels* lists every
  layer that covers the case: `unit`, `component`, `flow`, `e2e`, `manual`, `perf`. *Feature* links
  to `docs/features/NN-*.md`, or to the OpenSpec change for features not yet documented.
- **Case file sections.** Purpose · Preconditions · Steps · Expected result · Automated by ·
  Manual remainder (for `partial`) · Related (feature doc, module, change, old checklist ID).
  Performance case files add: What we measure and why · Metrics (how each is taken) · Target / pass
  criterion · Latest result · Pitfalls.
- **Tags in tests.**
  - vitest, Playwright and WDIO: a title prefix, `it('[UI-003] …')`.
  - Rust, whose test names cannot hold brackets: a `// case: UI-003` line directly above `#[test]`.
  - Only tests that cover a catalog case are tagged. Helper-level tests appear in the inventory with
    no tag.
- **Checker** (`scripts/test/catalog.mjs`). It parses the catalog tables, scans the tagged
  locations (`src-tauri/src`, `src-tauri/tests`, `ui/src`, `ui/flows`, `e2e/specs`), and fails on:
  - a case marked `automated`/`partial` with no tag;
  - a tag with an unknown ID;
  - a missing required case file;
  - an `inventory.md` that is stale against `--write`.
- **Migration of the old documents.**
  - Checklist T1–T10, H1–H10, Q1–Q9, A1–A14, S1–S6, N1–N8, C1–C7, U1–U8 and X1–X4 become cases, and
    each case file keeps its old ID under Related.
  - The performance procedures become PERF cases.
  - `functional-checklist.md`, `performance.md` and `automation-notes.md` are removed once their
    content has moved.
  - Inbound links are retargeted: README, both CLAUDE.md files, PLAN.md §4/§6,
    `documentation/README.md`, `docs/overview.md` and the feature documents.

**Alternative.** One file per area with every case as a section. Rejected because the request asks
for a file per test, and per-file links from code comments stay stable as areas grow.

**Language.** English, per the project convention for documentation.

### 13. Definition of done for every future change

`openspec/config.yaml` gains `rules.tasks`: a change with UI or cross-process behaviour must include
tasks to add or update its flow/e2e scenarios, update `catalog.md` and the case files, and run
`npm run test:regression`. This makes the `test-suites` requirement apply automatically to the
artifacts OpenSpec generates.

## Risks / Trade-offs

- **[`tauri-plugin-wdio-webdriver` is young and untried here]** → The pilot runs before any other
  e2e work. If gate (a) fails, fallback (a) applies without rewriting specs.
- **[Appium cannot see our menu bar icon]** → Status items are exposed by the owning app's
  Accessibility tree, but this is unverified for Tauri's tray. Fallback (b) reuses the AppleScript
  primitives already proven in performance.md.
- **[Accessibility and notification permission prompts on the first run]** → `test:doctor` probes
  the Accessibility grant. The strategy page lists the one-time grants: Accessibility for the
  terminal and for Appium's WebDriverAgentMac, and notifications for the e2e bundle.
- **[Screenshot baselines drift with macOS or font updates]** → Baselines are per platform and run
  with a small tolerance. Updating them is one documented command, and a diff is reviewed like code.
- **[Playwright's WebKit is not WKWebView]** → Flows cover layout and behaviour. Anything
  WebView-specific is e2e's job.
- **[E2E runs take over the screen and are slower]** → They run only in `test:regression`, never in
  the hook. The developer starts them deliberately.
- **[A left-over e2e login item]** → Cleanup runs both before and after. The plist name contains
  `-e2e`, so the developer can spot and remove it easily.
- **[The planned "destroy the window on close" change invalidates window handles]** →
  `support/window.ts` re-acquires the window after every show. The e2e suite then becomes that
  change's safety net instead of an obstacle to it.
- **[A test build is not the shipped build]** → `test:release` checks the real bundle for launch,
  tray and quit, plus the leak checks.
- **[The catalog becomes paperwork]** → The checker keeps it honest, and only cases at
  feature-behaviour level are catalogued, never every unit assertion.

## Migration Plan

Everything is additive and the `e2e` feature is off by default, so release behaviour cannot change.
Order of work:

1. Catalog skeleton and checker.
2. Unit and component review, tagging tests as they are touched.
3. Fast suite and hook.
4. Test build.
5. Pilot (gate).
6. UI flows.
7. E2E expansion.
8. Release smoke.
9. Document migration and link updates.
10. OpenSpec rule.

Rollback means reverting the change: no data format or user-visible behaviour depends on it.

## Open Questions

These are resolved during implementation without changing specs or tasks:

- Exact package versions to pin for `@wdio/*`, `appium`, the Mac2 driver and
  `tauri-plugin-wdio-webdriver`. They are recorded in the strategy page.
- Whether the WebDriver plugin requires a capability permission. If it does, the permission goes in
  the overlay per decision 3.
- The coverage floor values. They are measured, per decision 10.
