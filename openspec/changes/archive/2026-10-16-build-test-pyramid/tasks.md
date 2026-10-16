# Tasks

Rust, e2e and anything that launches the app run in the developer's own terminal (CLAUDE.md: the
agent sandbox blocks `cargo`, `osascript` and process inspection). Each task's verification names the
command to run.

## 1. Test documentation foundation and catalog checker

- [x] 1.1 Create `documentation/tests/README.md` (strategy page): the pyramid, the layer → tool →
      placement-rule table, the stages-and-commands table (stages not yet built marked *planned*),
      ID/naming/tag conventions and the TDD loop (design §11–12); verify every relative link in it
      resolves
- [x] 1.2 Write `documentation/tests/catalog.md`: one table per area/feature with
      `| ID | Case | Levels | Status | Module | Feature | File |`, migrating every check from
      `functional-checklist.md` (T, H, Q, A, S, N, C, U, X) and adding the behaviours already covered
      by Rust unit/integration and vitest tests, named `[Area][Feature] action -> expected result`
      with today's status; verify every old checklist ID appears in exactly one case
- [x] 1.3 Write a case file under `cases/<area>/<ID>-<slug>.md` for every `manual` and `partial` case
      (Purpose, Preconditions, Steps, Expected result, Automated by, Manual remainder, Related incl.
      old checklist ID); verify each old check's steps and expected text are carried over
- [x] 1.4 Split `performance.md` into `performance/README.md` (process discovery, re-signing,
      tools, pitfalls) and `cases/performance/PERF-001…` (one per procedure: what and why, setup,
      procedure, each metric and how it is taken, target per metric, latest result, pitfalls), and
      move the results table to `runs/performance-results.md`; verify each of the 12 procedures maps
      to one PERF file and every metric has a stated target
- [x] 1.5 Create `runs/TEMPLATE.md` and record the 2026-09-20 pass from the checklist as the first
      run record; verify the record lists version, cases run and results
- [x] 1.6 Implement `scripts/test/catalog.mjs` (parse catalog tables, scan tags in `src-tauri/src`,
      `src-tauri/tests`, `ui/src`, `ui/flows`, `e2e/specs`; check required case files; `--write`
      regenerates `inventory.md`, default mode fails if stale) with `node:test` tests on fixtures,
      and add root script `test:catalog`; verify `node --test scripts/test` passes and each fixture
      failure (claim without test, orphan tag, missing file, stale inventory) is reported by name
- [x] 1.7 Tag the existing Rust tests (`// case: ID` above `#[test]`) and vitest tests (`[ID]` title
      prefix) that cover catalog cases, and generate `inventory.md`; verify `npm run test:catalog`
      passes and `cargo test` / `npm --prefix ui test` still report 57 and 14 passed
- [x] 1.8 Remove `functional-checklist.md`, `performance.md` and `automation-notes.md`; retarget
      their inbound links in `README.md`, `CLAUDE.md`, `src-tauri/CLAUDE.md`, `PLAN.md` §4/§6,
      `documentation/README.md`, `docs/overview.md` and the feature documents; verify
      `grep -rn "functional-checklist\|performance.md\|automation-notes"` finds nothing outside
      `openspec/changes/archive`, `_specs` and `_plans`

## 2. Rust unit and integration test review

- [x] 2.1 Add `Trigger::HideRequested` to `policy.rs` (visible + tray → `HideToTray`; hidden, no
      tray or quitting → `Nothing`) with unit tests, and make `ipc_commands::hide_main_window` apply
      the decision without branching; verify `cargo test` and
      `cargo clippy --all-targets -- -D warnings` pass and the "hide button never quits" case is
      tagged
- [x] 2.2 Add `proptest` as a dev-dependency and property tests over `decide()` for the invariants
      in design §9; verify `cargo test` passes and a deliberately broken invariant (e.g. returning
      `HideToTray` without a tray) is caught, then revert
- [x] 2.3 Extract the notification titles and bodies in `notify.rs` into pure functions with tests
      (non-empty; the close notice names the menu bar and Quit); verify `cargo test` passes and the
      wording is unchanged
- [x] 2.4 Add `tests/capabilities.rs` asserting `capabilities/default.json` grants only
      `core:default` to window `main`; verify it passes, and fails when a permission is added
      temporarily
- [x] 2.5 Add a `config.rs` test for saving into an unwritable directory (error returned, no panic,
      no temp file); verify `cargo test` passes
- [x] 2.6 Update catalog levels/statuses, regenerate the inventory, and update the test counts in
      `README.md`, `CLAUDE.md`, `src-tauri/CLAUDE.md` and `docs/overview.md`; verify
      `npm run test:catalog` passes and the documented counts match `cargo test` output

## 3. UI component tests and IPC contract

- [x] 3.1 Add component tests: toggle disabled while a save is in flight, a previous error clears
      after a successful toggle, the hide button calls `hideMainWindow`; tag them; verify
      `npm --prefix ui test` passes
- [x] 3.2 Add an axe accessibility test of the rendered panel (`axe-core` in jsdom); verify it
      passes, and fails when the switch's label is removed temporarily
- [x] 3.3 Add `ui/src/lib/ipc.contract.test.ts` comparing the `generate_handler!` list in
      `src-tauri/src/lib.rs` with the names `ipc.ts` invokes; verify it passes, and fails when a
      command name is changed on one side only
- [x] 3.4 Measure coverage and set `test.coverage.thresholds` to the measured values rounded down
      to 5%; verify `npm --prefix ui run test:coverage` passes and fails when a threshold is raised
      above the actual value
- [x] 3.5 Update the catalog (U6 → `partial` for role/name), inventory and the strategy page's
      component and contract sections; verify `npm run test:catalog` passes

## 4. Fast suite and pre-push hook

- [x] 4.1 Write `scripts/test/fast.sh` (cargo test → clippy → vitest → ui build → oxlint →
      catalog check; `set -euo pipefail`, a banner per step, the failing step named, a summary) and
      root script `test:fast`; verify it runs green, and that a deliberately failing test stops it at
      that step with later steps not run
- [x] 4.2 Add `lefthook` as a root devDependency with `lefthook.yml` running `npm run test:fast` on
      `pre-push`; verify that after `npm install` `.git/hooks/pre-push` exists, `npx lefthook run
      pre-push` fails on a failing test, and `LEFTHOOK=0` skips it
- [x] 4.3 Time a warm `test:fast` run (target under 3 minutes) and document the stages, watch mode
      (`npm --prefix ui run test:watch`, `cargo watch` if installed), the hook and its override in
      the strategy page, and point README's Testing section at the commands; verify the documented
      commands run as written and the recorded time is under the target

## 5. Test build

- [x] 5.1 Add the `e2e` cargo feature with `tauri-plugin-wdio-webdriver` as an optional,
      desktop-gated dependency, registered in `lib.rs` only under the feature; verify
      `cargo tree -e features` shows the plugin only with `--features e2e`, and both feature sets pass
      `cargo clippy --all-targets -- -D warnings`
- [x] 5.2 Add `src-tauri/tauri.e2e.conf.json` (identifier `dev.sazonau.jira-to-qa-portal.e2e`,
      productName `jira-to-qa-portal-e2e`, any plugin capability inline) and root script `build:e2e`
      (`tauri build --debug --features e2e --bundles app --config …`); verify it produces
      `target/debug/bundle/macos/jira-to-qa-portal-e2e.app` and leaves the release bundle untouched
- [x] 5.3 Add `src-tauri/src/e2e.rs` with `e2e_snapshot` (core belief, platform reality, stored
      config, OS login-item state) and the two `cfg`-gated `invoke_handler` lists in `lib.rs`;
      verify `cargo test --features e2e` passes and the command is absent without the feature
- [x] 5.4 Extend the IPC contract test: the e2e list equals the production list plus `e2e_*` names;
      verify it passes, and fails when a production command is added to one list only
- [x] 5.5 Check isolation by hand: with the real app running, launch the e2e bundle, and confirm two
      processes, two tray icons, distinct config paths and distinct plist names; record the result and
      the test-build section in the strategy page, and add the isolation cases to the catalog; verify
      `npm run test:catalog` passes

## 6. UI flows (Playwright)

- [x] 6.1 Add `@playwright/test` to `ui`, `playwright.config.ts` (WebKit only, `webServer` running
      `vite --mode mock`), install the WebKit browser; verify `npx playwright test --list` runs
- [x] 6.2 Add `ui/src/test/mock-backend.ts` (scenario from `window.__MOCK_SCENARIO__`, calls recorded
      on `window.__IPC_CALLS__`) and the `MODE === 'mock'` branch in `main.tsx`, plus a mock-leak
      check script over `ui/dist`; verify `vite --mode mock` renders a scripted scenario and
      `npm --prefix ui run build` output passes the leak check
- [x] 6.3 Write flows for initial render (U1), disabled-until-answered (U2), 360 px width with no
      horizontal overflow (U4), keyboard toggle reaching the backend (U5), the no-backend message
      (U7), failed registration reverting with an alert, and the tray-unavailable warning; tag them;
      verify `npm --prefix ui exec playwright test` passes
- [x] 6.4 Add light/dark screenshot baselines (U3 → `partial`) and document the baseline-update
      command; verify a deliberate CSS change fails with expected/actual/diff images saved
- [x] 6.5 Add the flows and mock-leak steps to `fast.sh`, add root script `test:flows`, update the
      catalog, inventory and the strategy page's flows section; verify `npm run test:fast` and
      `npm run test:catalog` pass and the warm fast suite is still under 3 minutes

## 7. E2E harness and pilot (gate)

- [x] 7.1 Create `e2e/` with its own `package.json` (pinned `@wdio/cli`, `@wdio/tauri-service`,
      `appium`, the Mac2 driver), `tsconfig.json` and a multiremote `wdio.conf.ts`
      (`app` = tauri-service on the e2e bundle, `os` = Appium Mac2 on its bundle id,
      `maxInstances: 1`, one retry flagged as flaky); verify `npx wdio config` loads without errors
- [x] 7.2 Write `scripts/test/doctor.sh` and root script `test:doctor` (Xcode, Appium with Mac2,
      Accessibility grant probe, e2e bundle present); verify each missing item is reported with its
      fix and a complete setup reports all green
- [x] 7.3 Implement `e2e/support/` (`clean.ts`, `state.ts`, `step.ts`, `window.ts`, `os.ts`,
      `report.ts`) per design §5, with cleanup before the first and after the last spec and
      failure attachments (both screenshots, app log, snapshot); verify through 7.4
- [x] 7.4 Write `specs/pilot.e2e.ts` (launch → close → tray Show Window → toggle launch at login →
      snapshot and config show it persisted) and run it 10 times in a row; verify 10/10 green and
      record gate criteria a–d in the strategy page
- [x] 7.5 For any failed gate criterion, implement the recorded fallback (design §6) inside
      `support/` only, or record "fallback not needed"; verify the pilot is again 10/10 green
- [x] 7.6 Write `scripts/test/e2e.sh` and `scripts/test/regression.sh` with root scripts `test:e2e`
      and `test:regression` (doctor → `build:e2e` → fast → e2e, HTML report in `e2e/report/`);
      verify a full regression runs green, a failing fast suite prevents the e2e stage, and a
      deliberately failing step produces a report entry with screenshots, log and snapshot
- [x] 7.7 Document prerequisites, one-time permission grants, running and reading reports in the
      strategy page; verify by following the page from a fresh terminal

## 8. E2E regression for existing features

Each spec tags its tests with catalog IDs and asserts every step's effect. Each task also updates the
catalog statuses, the cases' *Automated by* and *Manual remainder* sections, and the inventory, and
its verification includes `npm run test:catalog`.

- [x] 8.1 `tray.e2e.ts`: icon present; menu items and order; left and right click; Show Window while
      visible and while hidden yields one window; Quit removes the icon (T1–T5, T9); verify the spec
      passes under `npm run test:e2e`
- [x] 8.2 `hide.e2e.ts`: close button hides; Dock icon and app-switcher entry gone; tray still
      present; process alive; Show restores Dock and focus; same window state; ⌘W; hide button;
      5 rapid cycles keep one window (H1–H9); verify the spec passes
- [x] 8.3 `quit.e2e.ts`: ⌘Q; app menu Quit; tray Quit visible and hidden; Quit AppleEvent; no
      leftover app or WebKit processes; no new crash report; ⌘Q while hidden (Q1–Q9); verify the
      spec passes
- [x] 8.4 `login-item.e2e.ts`: fresh install off with no plist; on creates the plist with `--hidden`;
      survives restart with one plist; off removes it; external registration wins over a stored off;
      a deleted plist is re-created; the dev-binary warning appears in the log (A1–A3, A6, A10, A12–A14;
      the `/Applications` path part of A3 stays manual); verify the spec passes
- [x] 8.5 `single-instance.e2e.ts`: `open -a` while hidden shows the window; one process and one
      icon; while visible it comes forward with no second window; running the binary directly makes
      the second process exit; 5 rapid relaunches (S1–S6, with Spotlight itself staying manual);
      verify the spec passes
- [x] 8.6 `config.e2e.ts`: file created on first launch; value persisted after toggle and quit;
      corrupt file → defaults and a log warning; deleted file recreated; unknown key ignored; no temp
      file left; read-only directory → toggle still works with a log error (C1–C7); verify the spec
      passes
- [x] 8.7 `notices.e2e.ts`: first-run and first-close flags flip once; no repeat on second close or
      relaunch; both fire again after config deletion; first-run prompt skipped when already
      registered (N1–N6; banners themselves stay manual, so `partial`); verify the spec passes
- [x] 8.8 Run `npm run test:regression` twice in a row, both green; record the run in `runs/`;
      update each feature document's test section to list its catalog IDs; verify
      `npm run test:catalog` passes and the strategy page's list of what stays manual matches the
      catalog's `manual`/`partial` cases

## 9. Release smoke

- [x] 9.1 Write `scripts/test/release-smoke.sh` and root script `test:release`: the leak checks
      (`cargo tree -e features --release` without `e2e`; `strings` finds no `e2e_snapshot`/`wdio`),
      then launch the release `.app`, assert the tray icon, Quit, and no leftover processes; verify it
      passes on a normal release build and fails, naming the leak, on a release built with
      `--features e2e`
- [x] 9.2 Add the release-smoke cases and case files to the catalog and a release section to the
      strategy page (smoke → manual pass from `runs/TEMPLATE.md` → performance cases); verify
      `npm run test:catalog` passes

## 10. Process integration

- [x] 10.1 Add `rules.tasks` to `openspec/config.yaml`: changes with UI or cross-process behaviour
      include tasks for flow/e2e scenarios, catalog and case-file updates, and a green
      `npm run test:regression`; verify `openspec instructions tasks --change build-test-pyramid
      --json` returns the rule
- [x] 10.2 Update `PLAN.md` §2 (test row) and §6 (tools decided, stages) in Russian, and add to §4 the
      follow-ups: scripting the PERF cases, `tauri-specta` with the credentials change, and mock
      Jira/QA Portal servers with the sync. Update `CLAUDE.md` (Running it, stack table, decisions:
      e2e stack, isolation by identity, catalog) and `src-tauri/CLAUDE.md` (Tests, adding a test-only
      command); verify every link and command in the touched sections resolves or runs
- [x] 10.3 From a fresh clone: `npm install`, `npm --prefix ui install`, `npm --prefix e2e install`,
      then `npm run test:regression` and, after `npm run tauri build`, `npm run test:release`; verify
      both are green and each scenario in the three spec files maps to a passing test or a documented
      manual case

## Workflow follow-up

- Archive the change with `/opsx:archive` once the regression and release smoke are green.
- After archive, confirm `openspec/specs/` holds `e2e-test-build`, `test-suites` and `test-catalog`.
