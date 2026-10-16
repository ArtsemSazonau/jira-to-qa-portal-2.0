# Proposal

## Why

Every layer above unit tests is missing. The app's behaviour as a user sees it — the tray, hiding to
the menu bar, quitting, launch at login, single instance — is verified only by a 47-check manual
pass, and nothing ties the window to the Rust commands it calls. The Jira → QA Portal sync is next,
and it cannot be tested end to end at all without a way to point the app at fake systems. Building
the pyramid now, on the lifecycle code that already exists, gives the sync feature a harness to be
written against test-first instead of retrofitted afterwards.

## What Changes

**A test build of the app (the "hidden doors")**
- A cargo feature `e2e` that compiles WebDriver access (`tauri-plugin-wdio-webdriver`) and test-only
  IPC commands into the app. A release build contains none of it, and a check proves that.
- A separate bundle identifier and product name for the test build, so it never shares settings, a
  login item or the single-instance lock with the user's real copy of the app.
- An `e2e_snapshot` command that reports the core's state (window visibility, tray, quitting,
  stored config, login-item registration), so tests assert state rather than infer it from pixels.

**An end-to-end harness** — WebdriverIO drives two sessions in one scenario: the embedded WebDriver
plugin for everything inside the window, and Appium Mac2 (Xcode / XCUITest) for everything outside
it — the menu bar icon and its menu, the window's close button, the Dock.
- **Pilot first**: one scenario — launch → close button → tray *Show Window* → toggle launch at login
  → the setting persisted. It gates the rest of the harness, with a recorded fallback (AppleScript
  for the native side) if Appium cannot reach the menu bar icon.
- After the pilot, the automatable part of today's manual checklist moves into e2e specs: tray menu,
  hide/show, quit paths, launch at login, single instance and reopen, config persistence and
  recovery, the one-time notice flags.

**A UI-flow layer** — Playwright against `vite dev` in WebKit, with the IPC mocked through
`@tauri-apps/api/mocks`: real rendering, keyboard operation, narrow-window layout, light/dark
screenshots and the no-backend message, in seconds and without building the app.

**Review of the existing unit, component and integration tests**, adding what is missing:
- Move `hide_main_window`'s decision into `policy.rs` (`Trigger::HideRequested`) so the rule "the
  *Hide to menu bar* button never quits" gets a test. No behaviour change.
- Property tests over `decide()`; pure, tested notification wording; a guard on the capability file;
  config writes to an unwritable directory.
- An IPC contract check: every command the UI calls is registered in Rust, and vice versa.
- UI component additions (saving state, error recovery, accessibility checks with axe) and a coverage
  floor.

**One way to run each stage**, as root npm scripts: a fast suite for the TDD loop, the full
regression, and a release-bundle smoke check. A git pre-push hook runs the fast suite. "Regression
green" becomes a standing item in every change's tasks.

**Test documentation** under `documentation/tests/`:
- A strategy page: the pyramid, which tool owns which layer, when each stage runs, the commands.
- A catalog: every test case in one hierarchy, named `[Area][Feature] action -> expected result`,
  with its level, automation status (automated / partial / manual / planned), module, the feature it
  belongs to, and a link to its case file.
- One file per manual, partial, end-to-end and performance case — preconditions, steps, expected
  result, links to code and docs. Performance cases also state what is measured, which metrics are
  taken, and the target.
- A checker that fails when the catalog claims a case is automated but no test carries its ID.
- `functional-checklist.md` and `performance.md` are split into the catalog and case files;
  `automation-notes.md` is folded into the strategy page. All inbound links are updated.

**Out of scope**: running anything in GitHub Actions (PLAN.md goal 3 stays separate); scripting the
performance measurements (they get detailed instructions now, automation later); mock Jira/QA Portal
servers and an in-memory keychain — the test build is designed to take them, but they arrive with the
sync and credentials features that need them.

## Capabilities

### New Capabilities

- `e2e-test-build`: the test variant of the app — what it adds over a release build (WebDriver
  access, state snapshot), how it is isolated from the user's real installation, and the guarantee
  that none of it ships.
- `test-suites`: the staged test runs a developer uses — fast suite, UI flows, end-to-end regression,
  release smoke — their commands, what each must cover, the git hook, and how failures are reported.
- `test-catalog`: the human-readable inventory of test cases — naming, hierarchy, status marks,
  per-case files, and the check that keeps the catalog's automation claims true.

### Modified Capabilities

None. No specs exist yet (`openspec/specs/` is empty), and the one code refactor
(`Trigger::HideRequested`) does not change behaviour.

## Impact

- **Rust**: `Cargo.toml` (feature `e2e`, `tauri-plugin-wdio-webdriver` optional, `proptest` dev-dep),
  `lib.rs` (feature-gated plugin and command registration), `ipc_commands.rs` (test-only snapshot
  command; `hide_main_window` stops branching), `lifecycle/policy.rs` (new trigger), `notify.rs`
  (pure message builders). New `src-tauri/tauri.e2e.conf.json`.
- **UI**: `ui/package.json` (Playwright, axe, coverage floor), a mock-IPC entry used only in a
  dedicated Vite mode; `main.tsx` gains a statically-eliminated branch for it.
- **New**: `e2e/` (WebdriverIO project and specs), `ui/tests-flows/` (Playwright), `scripts/`
  (test runners, catalog checker), git hooks via `lefthook`.
- **Local machine**: Xcode, Appium with the Mac2 driver, and an Accessibility grant for the terminal
  running e2e. The e2e and Rust stages run in the developer's own terminal, not an agent sandbox.
- **Docs**: `documentation/tests/` restructured; links in `README.md`, `CLAUDE.md`,
  `src-tauri/CLAUDE.md`, `PLAN.md` §4/§6, `documentation/README.md`, `docs/overview.md` and the
  feature documents updated.
- No change to the release app's behaviour, IPC surface or capability file.
