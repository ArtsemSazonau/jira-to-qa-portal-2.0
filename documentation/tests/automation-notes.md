# What else could be automated

Notes, not a mandate. Each item says what it would buy and what it would cost, so the next person can
pick rather than work through a list.

Two things shaped these notes. First, every performance figure in
[performance.md](performance.md) was produced by hand, and three of the runs silently measured
nothing before the fourth caught it — automation here is not about saving keystrokes, it is about a
test that can tell you it did not run. Second, the
[functional check-list](functional-checklist.md) has grown to nine modules of manual steps, and only
a minority genuinely need human eyes.

## Where things stand

| Layer | Exists | Runs with |
|---|---|---|
| Rust unit | 42 tests in `src/` — `lifecycle/policy.rs` 30, `config.rs` 8, `lifecycle/mod.rs` 4 | `cargo test` |
| Rust integration | 15 tests in `tests/lifecycle_policy.rs` | `cargo test` |
| UI unit | 14 tests — `App.test.tsx`, `lib/ipc.test.ts` | `npm test` (vitest + testing-library + jsdom) |
| Lint | `clippy`, `oxlint` | `cargo clippy`, `npm run lint` |
| Coverage | configured, not enforced | `npm run test:coverage` |
| E2E | **none** | — |
| Performance | **none** — [performance.md](performance.md) is hand-driven | — |
| CI | **none** — no `.github/` in the repo | — |

---

## 1. Rust unit tests

The policy/adapter split does its job: `decide()` has 30 tests and needs no window. The gaps are
where logic escaped the split, or where a module has no pure core to test.

### A decision leaked into an adapter

`ipc_commands::hide_main_window` branches:

```rust
let action = decide(Trigger::WindowCloseRequested, state.snapshot());
if action == Action::HideToTray {
    apply(&app, action);
} else {
    log::warn!("hide_main_window ignored: nothing to hide ({action:?})");
}
```

That `if` is exactly what [`policy.rs`](../../src-tauri/src/lifecycle/policy.rs) tells you not to
write — *"If you are tempted to add an `if` to the adapter, add it here instead and give it a test."*
It also reuses `WindowCloseRequested`, whose meaning is "the close button was pressed", to mean
something else.

Worth a `Trigger::HideRequested` of its own, returning `HideToTray` or `Nothing`. The adapter then
just applies, and the rule *"a button labelled Hide to menu bar must never quit the app"* — currently
enforced by an untested `if` — becomes a test.

### Modules with no pure core

- **`notify.rs`** — no tests. The notification bodies are built inline; extracting title/body into
  pure functions makes the wording assertable and stops a copy-edit from silently changing what the
  user reads.
- **`tray.rs`** — the menu's *shape* is covered through `TRAY_MENU_ITEMS`, but the consequence of
  `install()` failing (`tray_available = false`, which turns close-into-quit) is only covered on the
  policy side. The adapter half is untested.

### Cheap additions to existing modules

- **`config.rs`** — 8 tests. Missing: a corrupt file, a file with unknown fields, an unwritable
  directory, and whether a partial write can leave the file truncated.
- **Property tests over `decide()`** — `a_tray_failure_never_produces_a_hide` already loops over a
  small matrix by hand. `proptest` would state the invariant once and cover the whole state space,
  which matters more as triggers accumulate.
- **A snapshot test of `capabilities/default.json`** — `ipc_commands.rs` explains at length why the
  capability file stays minimal. A test that fails when it grows turns that comment into a guard.

---

## 2. UI unit tests

14 tests across 218 lines. `lib/ipc.ts` being the only route to the backend is what makes this easy —
mock one module and the whole surface is controlled.

Gaps, roughly in order of value:

- **The no-backend path.** Check-list item U7 ("the desktop backend is not available" message when
  opened in a plain browser) is a real branch and is currently only verified by hand.
- **Failure states.** `setAutostartEnabled` rejects with a message; nothing asserts what the user
  sees when it does.
- **The tray-unavailable explanation.** `getTrayAvailable()` drives explanatory text about the close
  button quitting instead of hiding. Untested.
- **Accessibility.** `@testing-library/jest-dom` is already a dependency. Adding `axe-core` would
  automate U5 (keyboard operation) and part of U6 (the switch's role and name) — though the actual
  VoiceOver announcement stays manual.
- **Enforce coverage.** `@vitest/coverage-v8` is installed but nothing fails on a drop. A floor is
  more useful than a number nobody looks at.

---

## 3. E2E

### The constraint that shapes everything

Tauri's official E2E route is `tauri-driver` with WebdriverIO — and **it has no macOS support**,
because WKWebView exposes no WebDriver endpoint. Verify against current Tauri docs before planning
around it, but assume for now that the standard answer does not apply to this project's primary
platform.

So macOS E2E means the accessibility API, driven from AppleScript. That is less elegant and it is
also what [performance.md §5](performance.md#5-showhide-cycle-leak-test-50-cycles) already had to
build.

### The harness already half exists

Three primitives came out of the performance work and belong in `scripts/` rather than pasted into a
terminal each time:

```bash
bgonly()   # ActivationPolicy: "false" = Regular/shown, "true" = Accessory/hidden
hide_win() # click the close button — NOT ⌘W, see below
# plus the launchd-parented WebKit helper PID discovery
```

Two lessons from building them are worth keeping:

- **`keystroke "w" using command down` does not reach the app.** Accessibility *queries* work, so the
  permission is fine; the synthesised key event goes elsewhere. Clicking the close button
  (`click button 1 of window 1`) works and takes the same code path.
- **Every step must assert its own effect.** Three 50-cycle runs reported flat memory and looked like
  passes while the window never opened. `shown=false → hidden=true` per cycle is what turned the
  fourth run into evidence.

### What could move from the check-list into a script

| Check-list | Automatable via | Note |
|---|---|---|
| T1 tray icon appears | `count menu bar items of menu bar 2` | |
| T2/T3 menu contents | enumerate `menu items of menu 1` | asserts labels *and* order |
| T4/T5 Show Window, visible and hidden | click + `bgonly` | no second window: assert `count windows` stays 1 |
| Hide to tray, close button and ⌘W | `bgonly` | ⌘W needs a real key press — see the caveat above |
| Quit paths (⌘Q, tray Quit, AppleEvent) | `pgrep` after quit | already scripted as [performance.md §7](performance.md#7-launchquit-cycle-test-20-iterations) |
| Single instance / reopen | `open -a` twice, count processes | |
| Autostart on/off | `plutil -p` the plist, `launchctl print` | including the `--hidden` flag and the `/Applications` path |
| Config persistence | assert the JSON after a toggle | |
| First-run / first-close notices | assert the config flags flipped | the notification *banner* stays manual |

Perhaps two-thirds of the check-list. What stays manual is the part that needs eyes or a reboot:
dark-mode legibility, Retina sharpness, the VoiceOver announcement, login-time cost, and behaviour
across display scale factors.

### A cheaper frontend-only option

Playwright against `vite dev` with `lib/ipc.ts` mocked covers U1–U5 and U7 without Tauri, a bundle or
Accessibility permission — fast enough for every commit. It cannot test anything involving the real
window, the tray or the activation policy, so it complements the AppleScript harness rather than
replacing it.

---

## 4. Performance

### Make the document runnable

[performance.md](performance.md) is twelve scenarios of copy-paste. As `scripts/perf/*.sh` emitting
the results table as markdown, a full pass becomes one command and the output drops straight into a
PR.

Worth carrying over verbatim, because each one cost a failed run to learn:

- discard `top`'s first sample — it is a lifetime average
- `fflush()` + `tee`, or a ten-minute command looks frozen
- filter `powermetrics` by **PID**; the executable is `app`, so the obvious name grep silently
  matches nothing and leaves you reading `ALL_TASKS`
- `WK_PIDS` must be a zsh **array**
- `#` is not a comment in interactive zsh
- take cycle-test baselines in the **same** window state as the final reading

### Baselines and budgets

Commit a baseline JSON and diff against it. The figures that would actually catch a regression:

| Budget | Today | Why this one |
|---|---|---|
| Total idle footprint | ≈ 73 MB | the headline number; the webview is 62% of it |
| Idle wakeups/sec | 0.2 – 1.4 | the first thing the scheduler will move |
| Idle CPU | 0.002% | should stay at zero while nothing polls |
| `leaks` count | ~286, constant | growth, never absolute — the baseline is Apple's, not ours |

A build that widens any of these should say so in the PR, not be discovered a release later.

### Where CI cannot help

- `powermetrics` needs `sudo` — unavailable on hosted runners.
- `leaks` needs the `get-task-allow` re-sign, which means CI would test a differently-signed binary.
- Timing-sensitive measurements flake badly on shared runners.

So performance gates are for a local or self-hosted macOS machine. CI can still build the bundle and
assert cheap structural things — that the binary is not suddenly 3× larger, that no log plugin
slipped into the release feature set.

### When the deferred features land

The baseline exists so these can be measured as deltas rather than argued about:

- **Scheduler** — becomes the only periodic wakeup source. Scenario 4 checks it wakes no more often
  than its cron expression requires.
- **Playwright sidecar** — a short-lived process by design. Worth asserting it actually exits, and
  that the core returns to its idle footprint afterwards.
- **LLM inference** — memory and thermal behaviour during a run, and the same return-to-idle check.

---

## 5. CI

There is no `.github/` at all, and 71 tests that already pass are going unrun on every push. That is
the cheapest thing on this page:

```
cargo test · cargo clippy -D warnings · npm test · npm run build · npm run lint
```

Needs a macOS runner for the Tauri build. Everything else runs anywhere.

---

## Suggested order

1. **CI for what already exists.** 71 tests, no new code, immediate.
2. **Move `hide_main_window`'s decision into `policy.rs`.** A correctness rule currently rests on an
   untested `if`.
3. **Script the performance pass.** The knowledge is fresh and the failure modes are documented
   above; six months from now they will have to be rediscovered.
4. **AppleScript E2E for the check-list's mechanical two-thirds.** Reuse the primitives from step 3.
5. **Playwright for the frontend.** Fast per-commit coverage of the UI branches.
6. **Coverage floors and perf budgets.** Only once the suites are worth defending.
