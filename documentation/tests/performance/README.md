# Performance testing — method

PLAN.md §1 commits to "минимальная нагрузка на систему в фоне" — a near-idle background process.
The performance cases measure that, so every later feature (the scheduler, the Playwright sidecar,
LLM inference) is measured as a delta against a recorded baseline rather than argued about.

This page is the shared method: how to find the processes, how to make them inspectable, which
tool answers which question, and the pitfalls that each cost a failed run to learn. The cases
themselves, one file each with their metrics and targets, are `PERF-001` … `PERF-012` in the
[catalog](../catalog.md#performance--perf). Results go in
[runs/performance-results.md](../runs/performance-results.md).

| Case | Measures |
|---|---|
| [PERF-001](../cases/performance/PERF-001-idle-cpu.md) | Idle CPU, 10 minutes hidden |
| [PERF-002](../cases/performance/PERF-002-idle-memory.md) | Idle memory of the core: footprint, dirty, malloc zones |
| [PERF-003](../cases/performance/PERF-003-process-accounting.md) | All four processes, and whether closing releases the webview |
| [PERF-004](../cases/performance/PERF-004-idle-wakeups.md) | Idle wakeups and energy |
| [PERF-005](../cases/performance/PERF-005-show-hide-cycles.md) | 50 show/hide cycles: leaks and RSS |
| [PERF-006](../cases/performance/PERF-006-soak.md) | 8-hour soak |
| [PERF-007](../cases/performance/PERF-007-launch-quit-cycles.md) | 20 launch/quit cycles, file descriptors |
| [PERF-008](../cases/performance/PERF-008-login-item.md) | Login-item registration and login-start cost |
| [PERF-009](../cases/performance/PERF-009-wake-from-sleep.md) | Survival across an hour of sleep |
| [PERF-010](../cases/performance/PERF-010-frontend-profiling.md) | The webview's own JS heap and DOM |
| [PERF-011](../cases/performance/PERF-011-instruments-recon.md) | Instruments.app reconnaissance across all processes |
| [PERF-012](../cases/performance/PERF-012-deep-profiling.md) | Allocation and CPU traces, when a number looks wrong |

**Record every number.** A baseline nobody wrote down is not a baseline.

---

## Before you start

**Run everything in a real Terminal.** Agent sandboxes deny `ps`, `top` and `pgrep` outright
(`operation not permitted`, `sysmond service not found`), so none of this works through one.

**The shell here is zsh**, and two of its differences from bash will bite:

- `#` **does not start a comment** in an interactive zsh. `wc -l   # note` passes `#` and `note` to
  `wc` as filenames and silently returns the wrong number. Either `setopt interactive_comments` or
  keep comments out of pasted commands.
- **Unquoted parameters are not word-split.** `for p in $PIDS` iterates once with the whole string.
  Use an array (`PIDS=(${(f)"$(...)"})`) or force splitting with `${=PIDS}`.

**Test a release bundle installed in `/Applications`**, never `tauri dev`. An unbundled binary's
memory profile, login-item behaviour and activation-policy handling are all unrepresentative.

```bash
cd ~/Workspace/01-Projects/02-Personal/jira-to-qa-portal-2.0
npm run tauri build

rm -rf "/Applications/jira-to-qa-portal.app"
cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
```

## Find all four processes

A Tauri app on macOS is **four** processes, not one. The Rust core hosts AppKit and the client half
of WKWebView; the rest of the webview runs out of process:

| Process | Role |
|---|---|
| `app` | Rust/Tauri — tray, window, event loop. The executable is named `app`, from the Cargo package name |
| `com.apple.WebKit.WebContent` | renders the React UI — DOM, JS, layout |
| `com.apple.WebKit.GPU` | compositing |
| `com.apple.WebKit.Networking` | the webview's network stack |

The three helpers are launched by launchd, so **their parent PID is 1** — they are not children of
`app` and no process tree will find them. Diff the process list across a launch instead:

```bash
osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | sort > /tmp/wk-before.txt

open -a "/Applications/jira-to-qa-portal.app"; sleep 8
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | sort > /tmp/wk-after.txt

export APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
WK_PIDS=(${(f)"$(comm -13 /tmp/wk-before.txt /tmp/wk-after.txt)"})

echo "core: $APP_PID   helpers: $WK_PIDS"
```

`WK_PIDS` must be an **array**, or every loop iterates once with all three PIDs glued into one
string. If it comes back empty, WebKit reused helpers already running for Safari or another
Electron/Tauri app — quit those and repeat.

Both PID sets change on every launch. Re-run this block after anything that restarts the app,
including the re-signing step below.

## Make the process debuggable

`vmmap` works out of the box. `leaks` and `heap` do not:

```
Process 8799 is not debuggable. Due to security restrictions, leaks can only show
or save contents of readonly memory of restricted processes.
```

**This is not the hardened runtime.** Check and you will find the flag is absent:

```bash
codesign -dv --verbose=4 "/Applications/jira-to-qa-portal.app" 2>&1 | grep -i flags
```

It prints `flags=0x20002(adhoc,linker-signed)` — no `runtime` flag. What `leaks` wants is the
**`com.apple.security.get-task-allow` entitlement**, which a release build does not carry. Grant it by
re-signing locally — no rebuild needed:

```bash
cat > /tmp/dbg.entitlements <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.get-task-allow</key>
  <true/>
</dict>
</plist>
EOF

osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
codesign -f -s - --entitlements /tmp/dbg.entitlements /Applications/jira-to-qa-portal.app
open -a "/Applications/jira-to-qa-portal.app"; sleep 8
```

Local measurement only. Never ship a build signed this way, and re-run the process discovery
afterwards. Before a manual pass, reinstall a clean bundle — `codesign -d --entitlements -` should
print one `Executable=` line and no entitlements dict.

## Assistive access, and what still works without it

Anything that **acts** on the UI — clicking a button, a menu item, sending a keystroke — needs
Accessibility permission for the terminal app. Without it:

```
execution error: System Events got an error: osascript is not allowed assistive access. (-1719)
```

Grant it in **System Settings → Privacy & Security → Accessibility**. If the terminal is already
listed and ticked, **untick and re-tick it** — a stale TCC record produces this error even when the
switch looks right — then restart the terminal, because only new processes pick the permission up.
Restarting the terminal loses `APP_PID` and `WK_PIDS`, so redo the discovery block.

The useful half survives without the permission. `background only` is read from the process list
rather than the accessibility tree, so it keeps answering:

```bash
osascript -e 'tell application "System Events" to tell process "app" to get background only'
```

`false` means `Regular` (window shown), `true` means `Accessory` (hidden). That is the verification
probe the cycle tests use, so **every case except the cycle test in
[PERF-005](../cases/performance/PERF-005-show-hide-cycles.md) can be completed with the permission
missing** — click the close button by hand where a script would have. Quitting also works without
it, because `tell application … to quit` is an AppleEvent, governed by Automation rather than
Accessibility.

## Tools

Verified present on macOS 26.6.2 with Xcode at `/Applications/Xcode.app`: `top`, `ps`, `vmmap`,
`leaks`, `footprint`, `heap`, `sample`, `spindump`, `lsof`, `powermetrics`, `xctrace`, `launchctl`,
`osascript`, `log`.

The **`instruments` CLI** is gone; `xctrace` at `/usr/bin/xctrace` replaces it. **Instruments.app is
not gone** and is still the best way to watch a trend across all four processes — see
[PERF-011](../cases/performance/PERF-011-instruments-recon.md).

| | Instruments.app | Console |
|---|---|---|
| Trend over time, all processes at once | best tool | needs a script |
| Memory breakdown (dirty vs clean, by region) | cannot | `vmmap` |
| Wakeups and energy | cannot | `powermetrics` |
| Leak detection | cannot | `leaks`, `heap` |
| Cycle tests | cannot | yes |
| Output that goes in a PR | a 19 MB binary `.trace` | text, comparable a year later |

Console for the numbers that get recorded; Instruments when it is not yet clear *which* process has
the problem.

## Pitfalls that each cost a failed run

- **`top`'s first sample is a lifetime average.** Discard it, or the launch burn inflates the result.
  `ps -o %cpu` is a lifetime average throughout and hides periodic spikes.
- **`fflush()` and `tee`**, or awk buffers and a ten-minute command looks frozen.
- **Filter `powermetrics` by PID.** The executable is `app`, so grepping for `jira-to-qa-portal`
  matches nothing and leaves you reading `ALL_TASKS`, which is the whole machine.
- **A cycle test must verify each cycle.** Three 50-cycle runs reported flat memory and looked like
  passes while the window never opened. Assert `shown=false → hidden=true` per cycle.
- **AppleScript `keystroke "w" using command down` does not reach the app.** Accessibility *queries*
  work, so the permission is fine; the synthesised key event goes elsewhere. Click the close button
  (`click button 1 of window 1`), which takes the same code path.
- **The tray menu is a poor scripted driver.** `menu bar item 1 of menu bar 2` depends on what else
  is in the menu bar and silently resolves to the wrong thing. `open -a` drives the show path
  through `RunEvent::Reopen` instead.
- **Take cycle-test baselines in the same window state as the final reading.** An open window is
  worth ~11 MB and otherwise looks like a first-cycle leak.
- **`ps rss` is not comparable to `footprint`.** RSS counts shared framework pages once per process;
  total RSS came to ~200 MB against a 73 MB footprint. Fine as a relative signal inside one test;
  never record an RSS figure as a footprint.
- **`lsof -p` lists memory-mapped libraries** (`FD=txt`) alongside real descriptors, about four to
  one. Count numbered descriptors only.
- **Do not touch the machine during an idle measurement.** The first idle-CPU attempt mixed 13
  minutes of interaction into a 43-minute capture and was unusable.

## Known costs to carry forward

Note these alongside the numbers, so a future comparison is not surprised by them:

- **The webview is 62% of the idle footprint.** 45 MB across three helper processes against 28 MB for
  the Rust core. Hiding the window shrinks them to about a third of their peak but never frees them.
  This is the cost that
  [destroying the window on close](../../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it)
  is meant to remove — a planned change, gated on the measurement in PERF-003.
  Any memory work belongs here; the Rust side has nothing worth optimising.
- **The Rust core is not "just Rust".** It links AppKit, WebKit, Carbon, CoreGraphics and CoreVideo,
  so its floor is a full Cocoa application's, not a daemon's. Of its 26 MB dirty, 9 MB is live
  objects shared between Rust and Objective-C, 8.5 MB is allocator fragmentation, and the rest is
  framework static data.
- **~286 leaks / 14 KB are unavoidable.** Apple's `AppIntents` framework leaks one
  `NSXPCConnection` retain cycle per process. Constant, one-time, not this app's code.
- **`tauri-plugin-log` is debug-only.** The release build writes no log — confirmed by zero disk I/O
  across 854 Activity Monitor samples. A release-build diagnosis therefore has no log to read.
- **Nothing polls.** The app is entirely event-driven: no timers, no intervals, no watchers. Measured
  idle wakeups of 0.2–1.4/s are framework housekeeping, and part of that is the observer itself.
  When the scheduler lands, it becomes the only periodic wakeup source, and PERF-004 is how you
  check it is not waking more often than its cron expression requires.

## Budgets

Each case states a target per metric. Where the target is "within budget of the baseline", the
budget is **the recorded baseline plus 10%**, and a build that exceeds it says so in its PR rather
than being discovered a release later. The figures that would actually catch a regression:

| Budget | Baseline | Why this one |
|---|---|---|
| Total idle footprint | ≈ 73 MB | the headline number; the webview is 62% of it |
| Idle wakeups/sec | 0.2 – 1.4 | the first thing the scheduler will move |
| Idle CPU | 0.002% | should stay at zero while nothing polls |
| `leaks` count | ~286, constant | growth, never absolute — the baseline is Apple's, not ours |

## Where CI cannot help

- `powermetrics` needs `sudo` — unavailable on hosted runners.
- `leaks` needs the `get-task-allow` re-sign, which means CI would test a differently-signed binary.
- Timing-sensitive measurements flake badly on shared runners.

So performance cases are for a local or self-hosted macOS machine. CI can still build the bundle
and assert cheap structural things — that the binary is not suddenly 3× larger, that no log plugin
slipped into the release feature set.

## When the deferred features land

The baseline exists so these can be measured as deltas:

- **Scheduler** — becomes the only periodic wakeup source. PERF-004 checks it wakes no more often
  than its cron expression requires.
- **Playwright sidecar** — a short-lived process by design. Worth asserting it actually exits, and
  that the core returns to its idle footprint afterwards (PERF-003, PERF-007).
- **LLM inference** — memory and thermal behaviour during a run, and the same return-to-idle check.

Scripting these cases is a follow-up in [PLAN.md §4](../../../PLAN.md#4-фичи). Until then they are
run by hand from their case files.
