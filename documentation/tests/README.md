# Testing strategy

How this project is tested: which layer a test belongs to, which tool runs it, which command runs
which stage, and how a case is named and traced from the catalog to the code.

| Page | What it is |
|---|---|
| [catalog.md](catalog.md) | Every test case, by area and feature, with its status |
| [inventory.md](inventory.md) | Generated: every automated test and the case it carries |
| [cases/](cases/) | One file per manual, partial, end-to-end and performance case |
| [performance/README.md](performance/README.md) | How performance is measured: tools, process discovery, pitfalls |
| [runs/](runs/) | Records of manual passes, and the [performance results](runs/performance-results.md) history |

## The pyramid

```
                 ┌──────────┐
                 │  manual  │  eyes, a reboot, a second display, VoiceOver
               ┌─┴──────────┴─┐
               │     e2e      │  the built test app: window + menu bar + Dock
             ┌─┴──────────────┴─┐
             │     UI flows     │  real frontend in WebKit, IPC mocked
           ┌─┴──────────────────┴─┐
           │ component · contract │  React in jsdom; IPC names on both sides
         ┌─┴──────────────────────┴─┐
         │  Rust unit · integration │  pure policy, config, state
         └──────────────────────────┘
```

Most behaviour is decided in pure functions (`lifecycle/policy.rs`) and tested at the bottom, in
milliseconds. Each layer up adds only what the one below cannot see: a rendered panel, a real
browser engine, a real window and menu bar, and finally a person.

## Layers

Each layer has one tool and one placement rule, so where a new test goes is never a judgement call.

| Layer | Tool | Put a test here when it checks… | Location |
|---|---|---|---|
| Rust unit | `cargo test`, inline `#[cfg(test)]` | a decision or a pure function: `decide()`, reconciliation, config parsing. If it needs an `AppHandle`, the logic belongs in `policy.rs` first | next to the code, `src-tauri/src/**` |
| Rust integration | `cargo test`, `src-tauri/tests/` | a whole scenario through the public API, from outside the crate. No Tauri runtime | `src-tauri/tests/*.rs` |
| Component | vitest + Testing Library + jsdom, `lib/ipc.ts` mocked | a render branch, an error state, what a click asks the backend for | `ui/src/**/*.test.tsx` |
| IPC wrappers and contract | vitest | that wrappers call the registered command names, and that both sides agree on the list | `ui/src/lib/*.test.ts` |
| UI flow | Playwright, WebKit, `vite --mode mock` | rendering in a real engine, keyboard, layout widths, light/dark screenshots, the no-backend page | `ui/flows/*.flow.ts` |
| End to end | WebdriverIO: the in-app WebDriver plugin, plus an Appium Mac2 session | anything that needs the built app: window, tray, Dock, activation policy, login item, single instance | `e2e/specs/*.e2e.ts` |
| Manual | a person, from the case file | appearance judgement, a reboot or login, a second display, VoiceOver, notification banners | `cases/<area>/*.md` |
| Performance | hand-run, from the case file | footprint, wakeups, leaks, soak — measured against the recorded baseline | `cases/performance/*.md` |

A test that launches the app, needs a real window or an OS permission never goes in the fast suite;
it is e2e.

### Component and contract tests

`npm --prefix ui test` runs these files in jsdom:

| File | Covers |
|---|---|
| `ui/src/App.test.tsx` | the shell: the launch-at-login states — loading, saving, errors, no backend, no tray — with `lib/ipc.ts` mocked, so each test asserts which wrapper the window calls; and the tabs — order, Settings first, the shared footer, no IPC on a switch |
| `ui/src/App.a11y.test.tsx` | `axe-core` over the rendered window in each state and with each tab selected, and the switch's role, name and checked state. `color-contrast` is off: jsdom has no layout, so contrast is left to the UI flows' screenshots |
| `ui/src/components/*.test.tsx` | the tab list on its own — roles, keys, hidden panels kept mounted — and the not-wired markers |
| `ui/src/views/*View.test.tsx` | one file per tab: what it shows, what is disabled and why, edge cases through its data prop, and axe |
| `ui/src/views/*.test.ts`, `ui/src/domain/*.test.ts` | the pure models with no rendering: the GitHub jobs selection rules (`github/selection.test.ts`), totals and deltas, date formatting, the platform list |
| `ui/src/lib/ipc.test.ts` | each wrapper invokes its command name with the right arguments, and passes rejections through |
| `ui/src/lib/ipc.contract.test.ts` | reads `src-tauri/src/lib.rs` and `ipc.ts` as text: the `generate_handler!` list and the names `ipc.ts` invokes must be the same set |

The contract test is what catches a command renamed on one side only, which compiles on both and
fails only at runtime in the built app. Typed bindings generated from Rust (`tauri-specta`) would turn
that into a compile error; they are deferred to the credentials change, when the command count grows.

**Coverage floor.** `npm --prefix ui run test:coverage` fails below the thresholds in
`ui/vite.config.ts` — the values measured when the floor was set, rounded down to 5% (statements 90,
branches 85, functions 100, lines 100). `main.tsx` and test infrastructure are excluded. Raise the
floor when coverage rises; never lower it to make a change pass.

## Stages and commands

| Stage | Command | Runs | Status |
|---|---|---|---|
| Catalog check | `npm run test:catalog` | the checks below, against the catalog and every test source | built |
| Fast suite | `npm run test:fast` | cargo test → clippy → vitest → ui build → mock leak check → oxlint → UI flows → catalog check; also the pre-push hook | built |
| UI flows | `npm run test:flows` | Playwright only, for iterating on screens | built |
| Prerequisites | `npm run test:doctor` | Xcode, Appium with Mac2, Accessibility grant, e2e bundle, free ports | built |
| End to end | `npm run test:e2e` | clean state → WebdriverIO against the built test app | built; about 50 s for 3 spec files |
| Regression | `npm run test:regression` | doctor → build the test app → fast suite → e2e | built |
| Release smoke | `npm run test:release` | leak checks on the release build → launch → tray → Quit → no leftovers | built |

Every stage script prints a banner per step, stops at the first failing step and names it, and ends
with a per-step summary — steps after a failure are listed as *not run*. The scripts live in
`scripts/test/` and share their step runner, `scripts/test/lib.sh`.

### Fast suite

`npm run test:fast` (`scripts/test/fast.sh`) runs, from the repo root:

| # | Step | Command |
|---|---|---|
| 1 | cargo test | `cd src-tauri && cargo test` |
| 2 | cargo clippy | `cd src-tauri && cargo clippy --all-targets -- -D warnings` |
| 3 | vitest | `npm --prefix ui test` — component, accessibility, wrapper and contract tests |
| 4 | ui build | `npm --prefix ui run build` — `tsc -b` type-checks tests and flows too, then `vite build` |
| 5 | mock leak check | `node scripts/test/check-mock-leak.mjs` — the flows' mock backend must not be in `ui/dist` |
| 6 | oxlint | `npm --prefix ui run lint` |
| 7 | UI flows | `cd ui && npx playwright test` — see [UI flows](#ui-flows) |
| 8 | catalog check | `node --test 'scripts/test/*.test.mjs' && node scripts/test/catalog.mjs` |

**Budget: under three minutes warm.** Measured 2026-10-15 on the development MacBook Air: 4–5 s
warm before the UI flows were added, which take 7 s on their own; 2 min 09 s cold — the first run after a dependency change,
where `cargo` building the test and clippy targets took 1 min 57 s. Run the root scripts from the
repo root and Playwright from `ui/`: `npx playwright` anywhere else fetches an unrelated copy. Anything that needs a built app, a real window or an OS
permission does not belong here — see [Layers](#layers).

Run `cargo` from your own terminal: an agent sandbox blocks writes under `~/.cargo` (see
[CLAUDE.md](../../CLAUDE.md#running-it) for the `CARGO_HOME` workaround).

**Watch mode** while writing a feature:

```bash
npm --prefix ui run test:watch
```

re-runs the affected vitest tests on every save. For Rust, `cargo watch -x test` in `src-tauri/`
does the same if `cargo-watch` is installed (`cargo install cargo-watch`); it is optional.

### UI flows

`npm run test:flows` (or `npx playwright test` in `ui/`) runs the real frontend in **WebKit** — the
engine closest to the app's WKWebView — with the backend replaced by scripted IPC answers. No Tauri,
no bundle, no OS permission; it takes seconds.

| Piece | File |
|---|---|
| Config: WebKit only, two Vite servers it starts itself (mock mode on 1421, plain on 1422) | `ui/playwright.config.ts` |
| The scripted backend, `mockIPC` from `@tauri-apps/api/mocks` | `ui/src/test/mock-backend.ts` |
| Loading it: `if (import.meta.env.MODE === 'mock') await import('./test/mock-backend')` | `ui/src/main.tsx` |
| Flows | `ui/flows/*.flow.ts` |
| Helpers: `openWith(page, scenario)`, `ipcCalls(page)` | `ui/flows/support.ts` |

**Scenarios.** A flow scripts the backend before the page loads — `openWith(page, { autostart: true,
tray: false, failRegistration: 'message', latencyMs: 600 })` sets `window.__MOCK_SCENARIO__` — and
asserts what the UI sent through `window.__IPC_CALLS__`, every command in order. A command the mock
has no answer for rejects, so a new IPC call needs a scripted answer before its flow can pass.

**No backend.** `no-backend.flow.ts` runs in its own project against plain `vite`, without the mock:
what a developer sees after `npm --prefix ui run dev`.

**The mock never ships.** `MODE` is replaced at build time, so the production bundle drops the
branch and the module — the built `index.js` is byte-identical with or without it. The fast suite's
mock leak check fails if `ui/dist` contains the mock's marker strings anyway.

**Keyboard on macOS.** WebKit only moves focus to checkboxes and buttons with plain Tab when System
Settings → Keyboard → *Keyboard navigation* is on; Option-Tab reaches every control regardless. The
keyboard flow presses Option-Tab, and the real window behaves the same way.

**Screenshot baselines.** `appearance.flow.ts` compares light and dark renders — the Settings tab
with the switch off and on, and each other tab — against approved images in `ui/flows/appearance.flow.ts-snapshots/`, one set per platform
(`…-webkit-darwin.png`). The tolerance is tight — at most 100 differing pixels — because the page is
mostly white and a layout shift changes only sparse text pixels; a 1% allowance let a heading grow
from 28 to 40 px unnoticed. On a mismatch Playwright writes `-expected.png`, `-actual.png` and
`-diff.png` under `ui/test-results/`, and `npx playwright show-report` shows them side by side.

After an **intended** visual change, approve new baselines from `ui/`:

```bash
npx playwright test appearance --update-snapshots
```

and review the changed images in the diff like code. A macOS or font update can move every pixel;
that is a reason to regenerate on purpose, not to loosen the tolerance.

On any flow failure, `ui/test-results/` also holds a screenshot and a trace
(`npx playwright show-trace <path>/trace.zip`).

### End-to-end tests

The test build (below) driven from outside, through two WebDriver sessions in one scenario:

| Session | Reaches | Through |
|---|---|---|
| `browser`, the test runner's | the webview: the switch, the buttons, the notices | the WebDriver server inside the test build (`tauri-plugin-wdio-webdriver`), started by `@wdio/tauri-service` |
| the `os` session | everything AppKit owns: the menu bar icon and its menu, the window's close button, the Dock, app state | Appium's Mac2 driver (XCUITest), opened by `e2e/support/os.ts` |

`e2e/` is its own npm project — WebdriverIO 9, `@wdio/tauri-service` 1.4.0 (matching the Rust
plugin), Appium 3.7 and the Mac2 driver 4.3.5, all pinned and local, so nothing is installed
globally.

| File | Role |
|---|---|
| `e2e/wdio.conf.ts` | one spec at a time; one retry per test, a pass on retry recorded as flaky; starts Appium; cleans before the first spec and after the last |
| `e2e/support/step.ts` | `step(name, act, verify)` — every state-changing step asserts its own effect, retried until it holds, and fails *there* |
| `e2e/support/state.ts` | `snapshot()` — the `e2e_snapshot` command: what the core believes next to what the platform reports |
| `e2e/support/window.ts` | the settings window through DOM selectors |
| `e2e/support/os.ts` | close button, tray menu, key presses, app state through Appium |
| `e2e/support/clean.ts` | removes the test build's config, login item, launchd job and processes; `node e2e/support/clean.ts` by hand |
| `e2e/support/report.ts` | failure attachments and `e2e/report/index.html` |
| `e2e/specs/*.e2e.ts` | the scenarios, tagged with catalog IDs |

**Why not WebdriverIO multiremote.** `@wdio/tauri-service` treats every capability in the config as
a Tauri app, so an Appium capability beside it would be launched as one. The `os` session is a
standalone `remote()` client instead; specs never see the difference.

#### Prerequisites and one-time grants

`npm run test:doctor` checks each of these and prints the fix for anything missing:

- **Xcode**, the full app, selected with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
  The Mac2 driver builds its XCTest runner (WebDriverAgentMac) with it; the first session takes a few
  minutes for that.
- **`npm --prefix e2e install`** — WebdriverIO, Appium and the Mac2 driver.
- **Automation for your terminal**: the doctor's first `osascript` call asks whether your terminal
  may control System Events; allow it (System Settings → Privacy & Security → Automation).
- **Accessibility for your terminal**: System Settings → Privacy & Security → Accessibility. Grant it
  to the app the terminal runs in — Terminal, iTerm, or **Visual Studio Code** for its integrated
  terminal. If it is already listed, untick and re-tick it, then restart that app; a stale record
  looks granted and is not.
- **The pre-push hook**: `npm install` at the root runs `lefthook install` (the `prepare` script), so
  the hook is (re)installed on every install, not only the first.
- **The Mac2 runner**: the first Appium session of a checkout builds the driver's XCTest runner
  (*WebDriverAgentRunner*). The harness opens that session before the first spec and fails with a
  message after three minutes if it never opens, rather than hanging inside a test.
- **Notifications for the test build**: the first launch may ask whether *jira-to-qa-portal-e2e* may
  send notifications. Either answer works — the app degrades silently — but answer it once so the
  prompt does not sit over the window.
- **The test build**: `npm run build:e2e`.

Ports 4445 (the embedded WebDriver server) and 4723 (Appium) must be free.

#### Running

```bash
npm run build:e2e                                   # after any app change
npm run test:e2e                                    # every spec
npm run test:e2e -- --spec ./specs/pilot.e2e.ts     # one spec; the path is relative to e2e/
npm run test:regression                             # doctor → build:e2e → fast suite → e2e
```

The e2e stage takes over the screen: the app window opens and closes and the menu bar icon is
clicked. Do not use the machine while it runs. It never runs in the pre-push hook.

#### Reading a failure

`e2e/report/index.html` lists every failed test. Each has a directory under
`e2e/report/failures/` with:

- `failure.txt` — the test, the step that failed, and why (`did not take effect` means the action
  ran and its assertion never held);
- `webview.png` and `screen.png` — the webview, and the whole screen through Appium;
- `snapshot.json` — the core state at the moment of failure;
- `app.log` — the WebdriverIO worker log, which carries the app's own log lines.

`e2e/report/flaky.txt` lists tests that passed only on their retry. `e2e/report/appium.log` and
`e2e/report/logs/` hold the raw logs. If a run is interrupted, `node e2e/support/clean.ts` removes
anything it left behind, including a login item that would start the debug build at the next login.

#### The pilot gate

[HIDE-013](cases/hide/HIDE-013-pilot.md) — launch → close → tray *Show Window* → toggle launch at
login → setting persisted — gates the rest of the e2e work (design §6):

| # | Criterion | Fallback if it fails | Result |
|---|---|---|---|
| a | A WebDriver session reaches the settings switch | drive the WebView through Appium's Accessibility tree, in `window.ts` | **passed** |
| b | Appium opens the menu bar icon's menu and clicks *Show Window* | `os.ts` shells out to the AppleScript primitives in the [performance method](performance/README.md#assistive-access-and-what-still-works-without-it) | **passed** — the status item and its menu are in the app's Accessibility tree |
| c | The close-button click hides the window, confirmed by the snapshot | none: this is the core of the harness | **passed** |
| d | 10 consecutive green runs | investigate flakiness before expanding | **passed** — 10/10, no retries, 6–7 s each |

**Outcome (2026-10-16): gate passed, no fallback needed.** Run on the development MacBook Air, macOS
26.6.2, WebdriverIO 9.30.1, `@wdio/tauri-service` 1.4.0, Appium 3.7.0, Mac2 driver 4.3.5. The first
Appium session of a machine builds the Mac2 XCTest runner and takes noticeably longer.

Harness lessons from getting there and from the first specs:

- A run interrupted before `onComplete` left its Appium server on port 4723, and the next run's
  session request hung against it. `e2e.sh` now cleans on every exit, Ctrl-C included, and the
  harness refuses to reuse a server it did not start.
- The runner deletes the app's WebDriver session at the end of every spec file and does not catch a
  failure. A spec that quits the app (the tray's Quit) would crash its worker; `wdio.conf.ts` drops
  the dead session first. Set it on `globalThis.browser` — `@wdio/globals`' `browser` is a proxy.
- A key press with no target goes wherever focus is. Right after a tray-driven show that is not
  reliably the window, so ⌘W was flaky until `os.pressKeyInWindow` aimed it at the window element.
- A retry starts from the state the failed attempt left, and usually fails differently. Each attempt
  gets its own failure directory (`…--attempt-1`, `…--attempt-2`); read attempt 1.

### Pre-push hook

`lefthook` is a root devDependency; its postinstall installs the hooks, so `npm install` at the repo
root is all the setup there is. [`lefthook.yml`](../../lefthook.yml) runs `npm run test:fast` on
`pre-push` and refuses the push when it fails, showing the failing step. There is no pre-commit hook:
commits stay instant, and the push is the gate.

| To | Run |
|---|---|
| Install or repair the hook | `npx lefthook install` (writes `.git/hooks/pre-push`) |
| Run the hook by hand | `npx lefthook run pre-push --force` — without `--force`, lefthook skips the command when there are no pushed refs, which is always the case outside a real push |
| Skip it once | `LEFTHOOK=0 git push`, or `git push --no-verify` |

Both overrides are visible in the command that was typed, which is the point: a skipped gate should
never be an accident.

### The test build

End-to-end tests run against a **test variant** of the app: the same code, plus automation access,
under a different identity.

```bash
npm run build:e2e
```

runs `tauri build --debug --features e2e --bundles app --config src-tauri/tauri.e2e.conf.json` and
produces `src-tauri/target/debug/bundle/macos/jira-to-qa-portal-e2e.app`. It is a debug build in its
own bundle, so it never overwrites the release `.app` under `target/release/`.

**What the `e2e` cargo feature adds** — and nothing else does; a release build and `tauri dev`
contain none of it:

| Addition | Where | What it is for |
|---|---|---|
| `tauri-plugin-wdio-webdriver` (pinned `=1.4.0`) | `lib.rs`, under `#[cfg(feature = "e2e")]` | a W3C WebDriver server inside the app, on `127.0.0.1:$TAURI_WEBDRIVER_PORT` (default 4445), that `@wdio/tauri-service` connects to |
| `e2e_snapshot` | `src-tauri/src/e2e.rs`, registered only in the test build's handler list | the core's state as data: `core` (what `AppState` believes: window visible, tray available, quitting), `platform` (what the window and tray report), the stored `config` and its path, `login_item_registered` from the OS, and the `pid` |

The plugin's default permission set is empty — it adds an HTTP server, not IPC commands — so the
test build needs no capability entry. If a later version does need one, it goes inline in
`tauri.e2e.conf.json` under `app.security.capabilities`, never into `capabilities/default.json`;
`tests/capabilities.rs` fails if that file grows.

**Isolation is by identity.** The overlay changes two values, and everything the app keys on them
separates from the user's real copy:

| | Real app | Test build |
|---|---|---|
| Identifier | `dev.sazonau.jira-to-qa-portal` | `dev.sazonau.jira-to-qa-portal.e2e` |
| Product name | `jira-to-qa-portal` | `jira-to-qa-portal-e2e` |
| Window title | *QA Portal Sync* | *QA Portal Sync — TEST BUILD*, so the two windows cannot be confused |
| Config file | `~/Library/Application Support/dev.sazonau.jira-to-qa-portal/app-config.json` | `~/Library/Application Support/dev.sazonau.jira-to-qa-portal.e2e/app-config.json` |
| Login item | `~/Library/LaunchAgents/jira-to-qa-portal.plist` | `~/Library/LaunchAgents/jira-to-qa-portal-e2e.plist` |
| Single-instance lock | keyed by the identifier | keyed by the identifier |

The test build registers a *real* login item and writes a *real* config file — that is the path
the launch-at-login cases exist to test. The e2e harness removes both before the first spec and after
the last, so an interrupted run cannot leave the debug bundle starting at the next login. Whether
identity really separates all three is checked by hand in
[SYS-007](cases/sys/SYS-007-test-build-isolation.md). **Result (2026-10-16): passed** — with the real
app running, the test build started as a second process with its own tray icon, its login item was a
separate `jira-to-qa-portal-e2e.plist` beside the real one, and the real app's config and login item
were byte-for-byte unchanged. A first attempt was spoiled by toggling the wrong window, which is why
the test build's window is titled *QA Portal Sync — TEST BUILD*.

Only one test build may run at a time, **from any checkout**: every copy has the same identity, so a
test build left open from another clone takes the single-instance lock and port 4445, and this run's
tests end up driving it. `npm run test:doctor` and the cleanup look for a test build anywhere, not
only at this checkout's path.

Appium finds the app by identifier, through Launch Services. A bundle the test service starts
directly is never registered there, and another checkout's registered bundle can win the lookup even
though it is not the one running — Appium then waits forever. So before Appium starts, `wdio.conf.ts`
unregisters every other `jira-to-qa-portal-e2e.app` and registers this checkout's
(`e2e/support/launchservices.ts`). Targeting the bundle by path instead would avoid the lookup, but it
stops XCUITest key presses (⌘W, ⌘Q) from reaching the app. Launch Services also refuses to resolve the identifier of a bundle in
a temporary directory (`in-temp-dir`), so e2e cannot run from a checkout under `/tmp`;
`npm run test:doctor` says so.

That the release build contains none of this is checked by `npm run test:release`: `cargo tree` must
not activate `e2e` in the default feature set, and `strings` over the release executable must find
neither `e2e_snapshot` nor `wdio`. See [Before a release](#before-a-release).

### Before a release

Three stages, in order, against the bundle that ships:

1. **Release smoke** — `npm run tauri build`, then `npm run test:release`
   ([SYS-008](cases/sys/SYS-008-release-has-no-test-access.md),
   [SYS-009](cases/sys/SYS-009-release-launch-quit.md)). It checks that no test access reached the
   build — the default features do not enable `e2e`, and the executable holds no `e2e_snapshot` or
   `wdio` — then launches the release `.app`, finds its menu bar icon, quits through it, and checks
   no app process or WebKit helper is left. It launches with the real identity, so quit any other
   copy of the app first (they share the single-instance lock); it reads the real config but never
   touches the login item.
2. **Manual pass** — the catalog's `manual` cases and the manual remainder of its `partial` cases,
   against the release bundle installed in `/Applications`. Record it as
   `runs/YYYY-MM-DD-vX.Y.Z.md` from [runs/TEMPLATE.md](runs/TEMPLATE.md).
3. **Performance** — the `PERF` cases a change could have moved, recorded as a new section of
   [runs/performance-results.md](runs/performance-results.md).

## Catalog: IDs, names and tags

**IDs** are `<AREA>-<NNN>` and never reused. The areas, with the label used in names:

| Area | Label | Feature document |
|---|---|---|
| `TRAY` | `[OS tray]` | [01-tray-icon.md](../docs/features/01-tray-icon.md) |
| `HIDE` | `[Hide to tray]` | [02-hide-to-tray.md](../docs/features/02-hide-to-tray.md) |
| `QUIT` | `[Quit]` | [03-quit-handling.md](../docs/features/03-quit-handling.md) |
| `LOGIN` | `[Launch at login]` | [04-launch-at-login.md](../docs/features/04-launch-at-login.md) |
| `INST` | `[Single instance]` | [05-single-instance.md](../docs/features/05-single-instance.md) |
| `NOTE` | `[Notifications]` | [06-notifications.md](../docs/features/06-notifications.md) |
| `CONF` | `[Config]` | [07-app-config.md](../docs/features/07-app-config.md) |
| `UI` | `[Settings UI]` | [08-settings-ui.md](../docs/features/08-settings-ui.md) |
| `TAB` | `[Window tabs]` | [09-window-tabs.md](../docs/features/09-window-tabs.md) |
| `SET` | `[Settings previews]` | [09-window-tabs.md](../docs/features/09-window-tabs.md#settings-tab) |
| `SYNC` | `[QA Portal sync]` | [09-window-tabs.md](../docs/features/09-window-tabs.md#qa-portal-sync-tab) |
| `TIME` | `[Timesheet]` | [09-window-tabs.md](../docs/features/09-window-tabs.md#timesheet-tab) |
| `GH` | `[GitHub jobs]` | [09-window-tabs.md](../docs/features/09-window-tabs.md#github-jobs-tab) |
| `IPC` | `[IPC]` | [08-settings-ui.md](../docs/features/08-settings-ui.md#the-ipc-boundary) |
| `SYS` | `[System]` | [overview.md](../docs/overview.md) |
| `PERF` | `[Performance]` | [performance/README.md](performance/README.md) |

Future areas follow the same pattern — `JIRA` `[Jira]` arrives with the sync feature, whose
behaviour then joins the `SYNC` cases its tab already has.

**Names** take the form `[Area][Feature] action -> expected result`, readable without opening the
case file: `[OS tray][Menu] Right-click the icon -> the same menu opens`.

**Statuses** — one per case:

| Status | Meaning |
|---|---|
| `automated` | Fully checked by automated tests carrying the ID |
| `partial` | Automated in part; the case file's *Manual remainder* says what is left and why |
| `manual` | Needs a person; the case file's *Why manual* says why |
| `planned` | Described, not yet checked by anything |

**Case files** exist for every `manual`, `partial`, `e2e` and `perf` case, at
`cases/<area>/<ID>-<slug>.md`. Sections: Purpose · Preconditions · Steps · Expected result ·
Automated by · Manual remainder (or Why manual) · Related. Performance case files instead carry: What
we measure and why · Setup · Procedure · Metrics (how each is taken, and its target) · Latest result ·
Pitfalls.

**Tags** connect a test to its case. Only tests that cover a catalogued behaviour carry one;
helper-level tests appear in the inventory with none.

- vitest, Playwright and WebdriverIO: a title prefix — `it('[UI-003] …')`, several as
  `it('[UI-003, UI-004] …')`.
- Rust, whose test names cannot hold brackets: a line directly above `#[test]` —
  `// case: UI-003`, or `// case: UI-003, UI-004`.

**The check.** `npm run test:catalog` fails when:

- a case is marked `automated` or `partial` and no test carries its ID (*claim without test*);
- a test carries an ID the catalog does not have, or a Rust `// case:` line is not above a test
  (*orphan tag*);
- a case is marked `manual` or `planned` but a test carries it (*under-claimed*);
- a required case file is missing, or a row is malformed;
- `inventory.md` differs from what the sources produce (*stale inventory*).

`npm run test:catalog -- --write` regenerates `inventory.md`. The checker's own tests run with
`node --test 'scripts/test/*.test.mjs'`.

## The test-first loop

1. **Add the case.** A row in [catalog.md](catalog.md) with status `planned`, and a case file if it
   will be `manual`, `partial`, `e2e` or `perf`.
2. **Write the failing test** at the lowest layer that can see the behaviour, carrying the case ID.
   A decision goes in `policy.rs`; a render branch in a component test; only what needs the built app
   goes to e2e.
3. **Make it pass.** Keep watch mode running: `npm --prefix ui run test:watch` for the UI, and
   `cargo watch -x test` in `src-tauri/` if `cargo-watch` is installed.
4. **Update the status** in the catalog (`planned` → `automated` or `partial`) and run
   `npm run test:catalog -- --write`.
5. **Before pushing**, the fast suite must be green; before calling a change done, the regression.

## Adding a test

| You are adding… | Do this |
|---|---|
| A new trigger or action in the lifecycle | A `decide()` arm and a unit test in `policy.rs`, tagged; update the property tests if an invariant changes |
| A new IPC command | A `#[tauri::command]`, its entry in the `generate_handler!` list, a wrapper in `lib/ipc.ts` with a wrapper test; the contract test catches a mismatch |
| A new UI state | A component test in `ui/src/`, tagged |
| A new external system (Jira, the portal, the time tracker) | Its address as a setting the test build can point at a local fake; never a live system in an automated run |
| A behaviour only a person can judge | A `manual` case and its case file, with *Why manual* filled in |

## What stays manual

What still needs a person: appearance judgement (dark mode, Retina, a second display), anything
across a reboot, login or an hour of sleep, the VoiceOver announcement, notification banners, System
Settings, Finder and Spotlight themselves, and the `/Applications` install. This table is generated
from the catalog's `manual` and `partial` cases, so it is the same list; for a `partial` case only
the remainder is manual. A pass is recorded from [runs/TEMPLATE.md](runs/TEMPLATE.md).

| Case | Status | Behaviour | What needs a person |
|---|---|---|---|
| [TRAY-006](cases/tray/TRAY-006-dark-appearance.md) | manual | Switch macOS to Dark appearance -> the icon inverts and stays legible | Judging legibility needs eyes. |
| [TRAY-007](cases/tray/TRAY-007-light-appearance.md) | manual | Switch back to Light appearance -> the icon stays legible | Judging legibility needs eyes. |
| [TRAY-008](cases/tray/TRAY-008-scale-factor.md) | manual | Move the window to a display with another scale factor -> the icon stays sharp | Needs a second physical display and eyes. |
| [TRAY-010](cases/tray/TRAY-010-tray-failure-fallback.md) | partial | Tray creation fails -> app still starts, logs the fallback, window warns that closing quits | The real failure path through `tray::install` needs a deliberately broken build, so it stays manual. |
| [HIDE-001](cases/hide/HIDE-001-close-button-hides.md) | partial | Click the red close button -> the window disappears instantly, nothing lands in the Dock | That it happens instantly, with no minimise animation, is judged by eye. |
| [HIDE-010](cases/hide/HIDE-010-webview-retained.md) | manual | Hide -> the three WebKit helpers are retained, about 45 MB between them | A measurement on a running bundle. |
| [LOGIN-003](cases/login/LOGIN-003-plist-arguments.md) | partial | Inspect the plist -> ProgramArguments point into /Applications and include --hidden | The test build lives under target/debug/, so that the path points into /Applications for an installed bundle is checked by hand. |
| [LOGIN-004](cases/login/LOGIN-004-system-settings-listing.md) | manual | Open Login Items -> the app is listed under Allow in the Background | Needs System Settings and eyes. |
| [LOGIN-005](cases/login/LOGIN-005-launchctl-loaded.md) | manual | launchctl print the job -> it is loaded | Needs the user's launchd domain. |
| [LOGIN-007](cases/login/LOGIN-007-starts-at-login.md) | manual | Log out and back in (or reboot) -> the app starts automatically | Needs a real login cycle. |
| [LOGIN-008](cases/login/LOGIN-008-starts-hidden.md) | partial | Start by the login item -> starts hidden: tray icon, no window, no Dock icon | The real login start is checked by hand. |
| [LOGIN-009](cases/login/LOGIN-009-login-start-cost.md) | manual | Time a login start -> app ready without visibly delaying login | Needs a real login cycle and a person to judge the delay. |
| [LOGIN-011](cases/login/LOGIN-011-off-survives-reboot.md) | manual | Reboot after turning it off -> the app does not start | Needs a real login cycle. |
| [LOGIN-012](cases/login/LOGIN-012-external-registration-wins.md) | partial | Added in System Settings while the toggle is off, then restart -> toggle reads on | Adding the item through System Settings, as a user would, is checked by hand. |
| [INST-001](cases/inst/INST-001-finder-reopen-hidden.md) | partial | Launch from Finder while running hidden -> the existing window appears, focused | A literal double-click in Finder is checked by hand. |
| [INST-003](cases/inst/INST-003-spotlight-reopen-visible.md) | partial | Launch from Spotlight while visible -> the existing window comes forward, no second window | Launching from Spotlight itself is checked by hand. |
| [INST-006](cases/inst/INST-006-rapid-relaunch.md) | partial | Relaunch from Finder 5 times quickly -> still one window and one tray icon | Five fast double-clicks in Finder are checked by hand. |
| [NOTE-001](cases/note/NOTE-001-first-run-prompt.md) | partial | Fresh install, first launch -> a notification offers launch at login | Whether macOS actually shows the banner needs eyes. |
| [NOTE-002](cases/note/NOTE-002-first-close-notice.md) | partial | Fresh install, first window close -> a notification says the app still runs in the menu bar | Whether macOS actually shows the banner needs eyes. |
| [NOTE-003](cases/note/NOTE-003-no-repeat-close-notice.md) | partial | Close the window a second time -> no notification | That no banner appears is checked by eye. |
| [NOTE-004](cases/note/NOTE-004-no-repeat-first-run.md) | partial | Relaunch once config exists -> no first-run notification | That no banner appears is checked by eye. |
| [NOTE-005](cases/note/NOTE-005-reset-refires.md) | partial | Delete app-config.json and relaunch -> both notices fire again | The banners themselves need eyes. |
| [NOTE-006](cases/note/NOTE-006-skip-when-registered.md) | partial | Fresh install with autostart already registered -> the first-run prompt is skipped | That no banner appears is checked by eye. |
| [NOTE-007](cases/note/NOTE-007-do-not-disturb.md) | manual | Trigger a notice with Do Not Disturb on -> no hang or crash, hide still works, a warn in the log | Needs the system's Focus mode. |
| [NOTE-008](cases/note/NOTE-008-notifications-denied.md) | manual | Trigger a notice with notifications denied -> no hang or crash, hide still works, a warn in the log | Needs the system's notification settings. |
| [UI-001](cases/ui/UI-001-initial-render.md) | partial | Open the window -> heading, subtitle, Launch at login row, hide button and its explanation | That the real app window shows the same, in its WKWebView, is checked by hand. |
| [UI-002](cases/ui/UI-002-disabled-until-answered.md) | partial | Open the window -> the toggle is briefly disabled, then interactive | The real backend's timing in the app window is checked by hand. |
| [UI-003](cases/ui/UI-003-dark-appearance.md) | partial | Switch macOS to Dark appearance with the window open -> colours follow, text readable, switch visible in both states | Judging that a baseline is readable — and approving a new one — needs eyes, as does the real window following a live appearance switch. |
| [UI-004](cases/ui/UI-004-narrow-window.md) | partial | Resize the window narrow -> no horizontal overflow | Dragging the real window narrower still is checked by hand. |
| [UI-005](cases/ui/UI-005-keyboard-toggle.md) | partial | Tab to the switch and press Space -> it toggles | That the real window does the same, and that the login item follows, is checked by hand. |
| [UI-006](cases/ui/UI-006-voiceover.md) | partial | Focus the switch with VoiceOver on -> announced as a switch named "Launch at login" with its state | What VoiceOver actually announces needs a person listening. |
| [UI-008](cases/ui/UI-008-retina.md) | manual | Window on a Retina display -> text and the switch are sharp | Judging sharpness needs eyes. |
| [SYS-001](cases/sys/SYS-001-wake-from-sleep.md) | manual | Sleep the Mac for an hour with the app hidden, then wake -> same PID, tray responds, window shows | Needs an hour of real sleep. |
| [SYS-002](cases/sys/SYS-002-sleep-log.md) | manual | Read the system log after the sleep -> nothing alarming during sleep or wake | Needs a person to read the log after a real sleep. |
| [SYS-003](cases/sys/SYS-003-moved-app.md) | partial | Move the app out of /Applications with autostart on and relaunch -> the registration is re-asserted and logged | The real move and the log line are checked by hand. |
| [SYS-004](cases/sys/SYS-004-login-started-pass.md) | manual | Full manual pass with the app started by the login item -> every case behaves the same once the window is shown | Needs a real login cycle and a full manual pass. |
| [SYS-007](cases/sys/SYS-007-test-build-isolation.md) | manual | Launch the test build beside the real app -> separate process, tray icon, config file and login item | Needs both apps running side by side and a person to watch the real one. |
| [SYS-010](cases/sys/SYS-010-stale-login-item-cleaned.md) | manual | A killed run left a login item behind -> the next run removes it before its first spec | It needs a deliberately planted leftover, which no spec should create on its own. |

The 12 `PERF` cases are run by hand too — see [performance/README.md](performance/README.md).

## Lessons that shaped the harness

Learned while measuring by hand, before any of this was automated:

- **Every step must assert its own effect.** Three 50-cycle runs reported flat memory and looked like
  passes while the window never opened. A step that silently did nothing has to fail where it
  happened, not at an unrelated assertion later.
- **AppleScript `keystroke` does not reach the app.** Accessibility queries work, but a synthesised
  ⌘W goes elsewhere. Clicking the close button takes the same code path; real key presses need
  XCUITest's own event synthesis.
- **The menu bar is a poor scripted target.** `menu bar item 1 of menu bar 2` resolves to whatever
  happens to be first. Address the app's own status item, or drive the show path with `open -a`.
- **Unbundled behaviour differs.** Login items, notifications and the activation-policy flip
  misbehave for a bare `target/debug` binary. Anything above the UI flows runs against a bundle.
- **CI needs a macOS runner** even for `cargo test`: `tray.rs` and `lifecycle/macos.rs` compile only
  on macOS, so a Linux runner would test a different crate. Running anything in CI is a separate
  goal ([PLAN.md §1](../../PLAN.md)); the stage scripts are written so a workflow can call them.
