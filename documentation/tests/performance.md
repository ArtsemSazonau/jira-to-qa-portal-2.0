# Performance, load and stability tests

PLAN.md §1 commits to "минимальная нагрузка на систему в фоне" — a near-idle background process.
These measurements establish the baseline **before** the scheduler, the Playwright sidecar and LLM
inference exist, so every later feature can be measured as a delta rather than argued about.

**Record every number in [the results table](#results-table).** A baseline nobody wrote down is not a
baseline.

The table is filled in from a full pass on 2026-09-20 against v0.1.0. Re-run and overwrite it when
the numbers could have moved; the point of the table is one current set of figures, not a history.

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

### Find all four processes

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

`WK_PIDS` must be an **array**, or every loop below iterates once with all three PIDs glued into one
string. If it comes back empty, WebKit reused helpers already running for Safari or another
Electron/Tauri app — quit those and repeat.

Both PID sets change on every launch. Re-run this block after anything that restarts the app,
including the re-signing step below.

### Make the process debuggable

`vmmap` works out of the box. `leaks` and `heap` do not:

```
Process 8799 is not debuggable. Due to security restrictions, leaks can only show
or save contents of readonly memory of restricted processes.
```

**This is not the hardened runtime.** Check and you will find the flag is absent:

```bash
codesign -dv --verbose=4 "/Applications/jira-to-qa-portal.app" 2>&1 | grep -i flags
# flags=0x20002(adhoc,linker-signed)   — no `runtime` flag
```

What `leaks` wants is the **`com.apple.security.get-task-allow` entitlement**, which a release build
does not carry. Grant it by re-signing locally — no rebuild needed:

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

Local measurement only. Never ship a build signed this way, and re-run the PID discovery afterwards.
Before a functional-checklist pass, reinstall a clean bundle — `codesign -d --entitlements -` should
print one `Executable=` line and no entitlements dict.

### Assistive access, and what still works without it

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

That is the verification probe used throughout, so **every measurement here except the cycle test in
[scenario 5](#5-showhide-cycle-leak-test-50-cycles) can be completed with the permission missing** —
click the close button by hand where a script would have. Quitting also works without it, because
`tell application … to quit` is an AppleEvent, governed by Automation rather than Accessibility.

### Tools

Verified present on macOS 26.6.2 with Xcode at `/Applications/Xcode.app`: `top`, `ps`, `vmmap`,
`leaks`, `footprint`, `heap`, `sample`, `spindump`, `lsof`, `powermetrics`, `xctrace`, `launchctl`,
`osascript`, `log`.

The **`instruments` CLI** is gone; `xctrace` at `/usr/bin/xctrace` replaces it. **Instruments.app is
not gone** and is still the best way to watch a trend across all four processes — see
[scenario 11](#11-instrumentsapp-for-reconnaissance).

### Which tool for which job

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

---

## 1. Idle CPU baseline (10 minutes, window hidden)

`ps -o %cpu` on macOS reports a **lifetime average**, not an instantaneous reading, so it hides
periodic spikes. Sample with `top` instead — and **discard the first sample**, which is also a
lifetime average and will be inflated by the launch burn.

Hide the window and let the app settle for two minutes first, or startup work lands in the window.

```bash
sleep 120   # settle

top -pid "$APP_PID" -l 61 -s 10 -stats pid,cpu,mem,threads \
  | awk -v p="$APP_PID" '$1==p {n++; if(n>1){gsub(/%/,"",$2); print $2; fflush()}}' \
  | tee /tmp/idle-cpu.txt

awk '{s+=$1; if($1>m)m=$1; n++} END{printf "avg=%.3f%%  peak=%.3f%%  samples=%d\n", s/n, m, n}' \
  /tmp/idle-cpu.txt
```

`fflush()` and `tee` matter: without them awk buffers and the command looks frozen for ten minutes
with no way to tell whether it is working.

**Do not touch the machine during the run.** Any interaction wakes the webview and contaminates the
sample — the first attempt at this measurement mixed 13 minutes of interaction into a 43-minute
"idle" capture and was unusable.

**Pass:** average effectively 0.0%, peak below ~1%.

A recurring non-zero spike means something is polling. Nothing in this feature should poll — the app
is entirely event-driven. Find it with [scenario 6](#6-long-soak-8-hours-hidden).

---

## 2. Idle memory baseline

Three views; record all three. `footprint` is what Activity Monitor shows, `vmmap --summary` tells
you what is actually dirty, `heap` says what the live objects are.

```bash
footprint -p "$APP_PID"
vmmap --summary "$APP_PID"
heap "$APP_PID" | grep -A 25 "CLASS_NAME"
```

**Record the `footprint` number and the `vmmap --summary` dirty total.** Those two are the figures
every later feature gets compared against.

### Reading `vmmap --summary`

The `TOTAL` line is alarming and mostly meaningless:

```
TOTAL    6.8G virtual    840.7M resident    26.1M dirty
```

- **6.8 G virtual** is reserved address space, not memory. `JS VM Gigacage (reserved)` alone is 4.0 G
  with zero resident pages — WebKit staking out addresses it may never use.
- **840 M resident** is dominated by `__TEXT` of system frameworks (590 M), shared with every other
  process on the machine.
- **26.1 M dirty** is the real cost. This is the number that goes in the table.

### The malloc zone table is where the interesting number is

```
MALLOC ZONE            DIRTY   ALLOCATED   FRAG SIZE   % FRAG   COUNT
DefaultMallocZone      14.6M       9036K       5876K      40%    70018
WebKit Malloc          2064K        169K       1895K      92%     1551
QuartzCore              736K        130K        606K      83%     1736
TOTAL                  17.5M       9363K       8557K      48%
```

The allocator holds 17.5 MB of dirty pages while only 9.4 MB is live — **8.5 MB, 48%, is
fragmentation**. Not a leak: the memory is freed, but each page still has a live object on it so it
cannot go back to the OS. Normal for malloc, worth recording because it will grow once sync and
report generation exist.

`DefaultMallocZone` is **shared**: Rust goes through the system malloc and so does Objective-C. The
9 MB of live objects is Rust *plus* AppKit and cannot be split by this output alone. `heap` splits it
by class name.

---

## 3. Process accounting — the webview is the bigger half

Measure with the window **hidden** and settled, and cover all four processes:

```bash
echo "--- core $APP_PID"
footprint -p $APP_PID | grep phys_footprint
for p in $WK_PIDS; do
  echo "--- $p  $(ps -p $p -o comm= | sed 's|.*/||')"
  footprint -p $p | grep phys_footprint
done
```

**Expectation:** hiding **retains** the webview — Tauri does not tear it down. Measured, it is more
nuanced than that: the helpers shrink substantially on hide (GPU 62 MB → 11 MB, WebContent 44 MB →
29 MB) but the processes stay alive and keep 45 MB between them. Roughly a third of their peak size
is retained indefinitely.

The helpers together cost **more than the Rust core**. Any memory optimisation effort belongs here,
not in Rust.

### Does closing release them? — the measurement that gates the planned change

Destroying the window on close instead of hiding it is
[planned](../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it),
and its entire justification rests on this one question. WebKit pools helper processes so a later
load is fast, so they may well outlive the view that spawned them.

Run it before any of that design work starts:

```bash
for p in $WK_PIDS; do ps -p $p -o pid=,comm= ; done   # three, window open
# close the window
sleep 60
for p in $WK_PIDS; do ps -p $p -o pid=,comm= ; done
```

Today this returns all three either way, because hiding keeps the window alive. It becomes
meaningful the moment a build actually closes the window — and if the helpers survive that, the
change saves nothing and should not be built.

### `ps rss` is not comparable to `footprint`

Cycle tests below use `ps -o rss=` because it is cheap to call in a loop. It reports every resident
page including shared framework text, and each of the four processes counts the same shared pages
again — total RSS came to ~200 MB against a 73 MB footprint. Fine as a **relative** signal inside one
test; never put an RSS figure in the results table.

---

## 4. Idle wakeups and energy

The metric that matters most for a background app. Something that wakes the CPU 50×/second costs
battery even at 0% CPU.

**Filter by PID, not by name** — the executable is called `app`, so grepping for
`jira-to-qa-portal` matches nothing and leaves you reading `ALL_TASKS`, which is the whole machine:

```bash
sudo powermetrics --samplers tasks --show-process-energy -n 6 -i 5000 \
  | awk -v pids="$APP_PID $WK_PIDS" '
      BEGIN{n=split(pids,a," "); for(i=1;i<=n;i++) want[a[i]]=1}
      /^Name/ {print; next}
      $2 in want {print}'
```

Read **Idle Wakeups**, **Intr Wakeups** and the energy impact score.

**Pass:** idle wakeups in the low single digits per second, energy impact near zero. Double digits
mean a timer is running that should not be.

A process that is completely idle **drops out of the listing entirely** — powermetrics only prints
processes with measurable activity. Half the samples showing nothing but the header is a pass, not a
broken command.

```bash
# If wakeups are high, find the timer
sudo powermetrics --samplers timer_analysis -n 1 -i 5000 | grep -iA5 "app"
```

---

## 5. Show/hide cycle leak test (50 cycles)

The load test for the activation-policy flip, and **the only scenario here that genuinely needs
[assistive access](#assistive-access-and-what-still-works-without-it)** — 50 hide cycles cannot be
clicked by hand.

### Drive the hide with the close button, not ⌘W

`keystroke "w" using command down` **does not reach the app**. Two full 50-cycle runs passed
silently while the window never once closed. The accessibility *queries* work, so the permission is
fine; it is the synthesised key event that goes astray.

Click the close button instead. [`on_window_event`](../../src-tauri/src/lib.rs) takes the close
button and ⌘W down the same path, so this exercises exactly the same code:

```bash
hide_win() { osascript -e 'tell application "System Events" to tell process "app" to click button 1 of window 1' >/dev/null 2>&1; }
```

The tray menu is a worse driver still: `menu bar item 1 of menu bar 2` depends on what else is in
the menu bar and silently resolves to the wrong thing.

### Every cycle must verify itself

This is not optional. A cycle test that does not check its own effect reports a **flat memory graph
as a pass**, which is indistinguishable from "the automation did nothing" — and that is what happened
on the first three attempts here.

`background only` is the right probe: it reflects `ActivationPolicy` directly, which is the feature
under test. `Regular` (window shown) reads `false`, `Accessory` (hidden) reads `true`.

```bash
bgonly() { osascript -e 'tell application "System Events" to tell process "app" to get background only' 2>/dev/null; }

total_rss() {
  local s=0 r
  for p in $APP_PID $WK_PIDS; do
    r=$(ps -o rss= -p $p 2>/dev/null | tr -d ' ')
    [[ -n "$r" ]] && s=$((s+r))
  done
  echo $s
}
```

### The test

Take the baseline **hidden**, so it compares like with like — an open window is worth ~11 MB and will
otherwise look like a first-cycle leak.

```bash
hide_win; sleep 2
echo "baseline (hidden): $(total_rss) KB"
leaks "$APP_PID" | grep "total leaked bytes"

ok=0; bad=0
for i in $(seq 1 50); do
  open -a "/Applications/jira-to-qa-portal.app"; sleep 1.5
  shown=$(bgonly)
  hide_win; sleep 1.5
  hidden=$(bgonly)
  [[ "$shown" == "false" && "$hidden" == "true" ]] && ok=$((ok+1)) || bad=$((bad+1))
  echo "cycle $i: shown=$shown hidden=$hidden rss=$(total_rss) KB"
done

echo "succeeded: $ok, failed: $bad"
sleep 60
echo "after settling (hidden): $(total_rss) KB"
leaks "$APP_PID" | grep "total leaked bytes"
```

`open -a` drives the show path through `RunEvent::Reopen`, which is more reliable than a tray click
and is a path the app has to handle anyway.

**Pass:** `succeeded: 50, failed: 0`, RSS back to roughly baseline after settling, and the leak count
unchanged. A consistent step up per cycle means the window or its webview is being recreated rather
than reused — which would contradict
[the show path](../docs/features/02-hide-to-tray.md), whose whole point is that it resolves to the
existing window.

### Reading `leaks`: the criterion is "no growth", not "zero"

The summary line prints **before** the leak details, so `leaks … | tail` misses it. Grep for it:

```bash
leaks "$APP_PID" | grep -E "total leaked bytes|nodes malloced"
leaks --groupByType "$APP_PID" | head -30   # what they are
```

**A fresh process always reports ~286 leaks / ~14 KB, and that is not a bug in this app.** All of
them are one `ROOT CYCLE: NSXPCConnection` plus what hangs off it, created by Apple's `AppIntents`
framework in `-[LNProcessInstanceRegistryClient makeXPCConnection]` — the retain cycle is a block
capturing `self` as an interruption handler. AppKit loads AppIntents on every app; there is no switch
to turn it off, and the connection is meant to live for the process lifetime anyway.

Three separate launches measured 286, 288 and 288 — a fixed, one-time cost. So the pass criterion is
**the count does not grow across the cycles**, not that it is zero. A jump into the thousands would
mean the registry client is being recreated per window show, and that would be this app's problem.

---

## 6. Long soak (8 hours, hidden)

Log all four processes, not just the core — the webview is where growth would show first.

Three things make the difference between eight hours of data and a useless file:

- **Track the PIDs discovered at the start, not whatever matches `WebKit` at sample time.** Open
  Safari overnight and a `pgrep`-per-iteration sampler quietly starts logging its helpers too.
- **`caffeinate -i`, or a laptop idles into sleep within minutes** and the sampler sleeps with it.
  The screen may still go dark; closing the lid still sleeps the machine regardless.
- **`nohup`**, so an accidentally closed Terminal does not take the run with it.

Write the sampler to a file rather than pasting a loop, so it survives the shell:

```bash
cat > ~/qa-soak.zsh <<'EOF'
#!/bin/zsh
LOG=$1; CORE=$2; shift 2
HELPERS=("$@")
echo "iso,core_kb,helpers_kb,total_kb,alive" > "$LOG"
while sleep 300; do
  core=$(ps -o rss= -p $CORE 2>/dev/null | tr -d ' ')
  if [[ -z "$core" ]]; then echo "$(date -Iseconds),GONE,,,0" >> "$LOG"; break; fi
  h=0; alive=1
  for p in $HELPERS; do
    r=$(ps -o rss= -p $p 2>/dev/null | tr -d ' ')
    [[ -n "$r" ]] && { h=$((h+r)); alive=$((alive+1)); }
  done
  echo "$(date -Iseconds),$core,$h,$((core+h)),$alive" >> "$LOG"
done
EOF
chmod +x ~/qa-soak.zsh
```

Hide the window, let it settle five minutes so the starting point is not inflated by an open
window, then:

```bash
LOG=~/qa-portal-soak-$(date +%Y%m%d-%H%M).csv

nohup caffeinate -i >/dev/null 2>&1 &
CAFFEINE=$!
nohup ~/qa-soak.zsh "$LOG" $APP_PID $WK_PIDS >/dev/null 2>&1 &
SOAK=$!

echo "log: $LOG"
echo "stop in the morning:  kill $SOAK $CAFFEINE"
```

**Write those PIDs down** — the shell variables may not survive the night.

Check after five minutes that the first row landed and `alive` is 4. A lower number means a helper
died before the run even started, which is a finding in itself.

```bash
sleep 310; cat "$LOG"
```

In the morning, stop both and read the trend. `alive` matters as much as the drift: a helper that
disappears and is respawned resets its own memory and would otherwise hide a climb.

```bash
kill $SOAK $CAFFEINE 2>/dev/null

awk -F, 'NR>1 && $2!="GONE" {n++; if(!f){f=$4} l=$4; if($4>m)m=$4; if($5<4)drop++}
  END {printf "samples=%d first=%dKB last=%dKB peak=%dKB drift=%+.2f%% alive-dips=%d\n", \
       n, f, l, m, (l-f)*100/f, drop+0}' "$LOG"
```

Eight hours at a five-minute interval is about 96 samples.

**Pass:** drift within a few percent, no monotonic climb. A steady upward slope over 8h **blocks the
feature** — this app is meant to run for weeks.

Sample the stack mid-soak to see what it does while "idle":

```bash
sample "$APP_PID" 10 -f /tmp/qa-portal-idle.sample.txt
grep -A30 "Call graph" /tmp/qa-portal-idle.sample.txt | head -40
```

---

## 7. Launch/quit cycle test (20 iterations)

Exercises clean teardown. `osascript … to quit` sends a real Quit AppleEvent, so this goes through
the same path as ⌘Q.

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

Then check for leaked descriptors and stray helpers after a normal quit. Take the WebKit count with
the app **not running** first, so there is something to compare against — other apps keep their own
helpers alive:

```bash
pgrep -fl "qa-portal"
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l

open -a "/Applications/jira-to-qa-portal.app"; sleep 5
export APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l

osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l
```

The first `pgrep -fl` must print nothing; the WebKit count is the system baseline from other apps,
must rise by exactly 3 on launch, and must return to that baseline on quit.

### Descriptors: count file descriptors, not `lsof` lines

`lsof -p` lists every **memory-mapped library** alongside the actual descriptors — rows with
`FD=txt`. They outnumber the real ones about four to one here, and they move whenever a dependency
changes, which has nothing to do with a descriptor leak. Filter for numbered descriptors:

```bash
for p in $APP_PID $WK_PIDS; do
  n=$(lsof -p $p 2>/dev/null | awk 'NR>1 && $4 ~ /^[0-9]+[rwu]?$/' | wc -l | tr -d ' ')
  printf "%-8s fd=%s\n" "$p" "$n"
done
```

Measure with the window hidden. This is a baseline being created, not checked against one — its
value is the comparison after the Jira client and the Playwright sidecar land, when sockets that
outlive a sync would show up here first.

**Pass:** 0 orphans across all 20 cycles, and the WebKit count returns to its baseline.

---

## 8. Autostart verification

Turn the toggle on **from the app's own window**. Registering by hand through `launchctl` tests
launchd, not the feature.

The login agent is named after the app, **not** after the bundle identifier:
`~/Library/LaunchAgents/jira-to-qa-portal.plist`, with the launchd label `jira-to-qa-portal`.
`tauri-plugin-autostart` derives both from `productName`. Anything addressed as
`dev.sazonau.jira-to-qa-portal` will simply report that no such file or service exists.

```bash
ls -la ~/Library/LaunchAgents/ | grep -i "qa-portal"
plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist

launchctl list | grep -i "qa-portal"
launchctl print "gui/$(id -u)/jira-to-qa-portal" 2>&1 | grep -E "path|program|state|properties"
```

`ProgramArguments` must point at `/Applications/…`, **not** `target/debug` — that is the dev-path
hazard. It must also include `--hidden`, which is what
[`policy::launched_hidden()`](../../src-tauri/src/lifecycle/policy.rs) reads to tell a login start
from a manual one. Expect `RunAtLoad => true`.

In `launchctl list`, a dash instead of a PID next to `jira-to-qa-portal` is correct whenever the
running copy was started by hand — the login agent itself is idle. The separate
`application.dev.sazonau.jira-to-qa-portal.*` row is the running GUI app and is unrelated to
autostart.

Now turn the toggle off, again from the window:

```bash
ls ~/Library/LaunchAgents/ | grep -i "qa-portal" || echo "correctly removed"
launchctl print "gui/$(id -u)/jira-to-qa-portal" 2>&1 | head -3
```

The **file** is what decides the next login: launchd rebuilds the domain from disk each time. A
`launchctl list` entry that lingers after the file is gone is stale in-memory state for the current
session, not a failed disable.

Then turn it back on and re-check the plist. Off-and-on is worth doing explicitly: a re-registration
that silently fails to overwrite would leave autostart broken in a way nothing else here catches.

Login-start cost, after a reboot:

```bash
ps -o pid,lstart,etime -p "$(pgrep -f 'jira-to-qa-portal.app/Contents/MacOS' | head -1)"
log show --predicate 'eventMessage CONTAINS "jira-to-qa-portal"' --last 10m --style compact | head -20
```

**Pass:** the app is ready without visibly delaying the login sequence.

---

## 9. Wake-from-sleep survival

```bash
export APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
ps -o rss= -p "$APP_PID"          # note it
sudo pmset sleepnow
# ... wake the machine an hour later ...
ps -o pid,etime,rss= -p "$APP_PID"   # same PID, etime spans the sleep
```

Then click the tray icon and confirm the window still shows correctly.

```bash
log show --predicate 'process == "app"' --last 2h --style compact | tail -40
```

**Pass:** same PID, RSS not materially higher, tray responsive, window shows normally.

---

## 10. Frontend profiling — the 62% nobody was measuring

The webview is the larger half of the idle footprint, and none of the tools above can see inside it.
Profiling the React app needs Safari's Web Inspector.

### Enable it

`devtools` is **not** in the release feature set, so an installed release build has no inspector.
Add it temporarily in [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml):

```toml
tauri = { version = "2.11.3", features = ["tray-icon", "image-png", "devtools"] }
```

Rebuild, then in Safari enable **Settings → Advanced → Show features for web developers** and open
**Develop → [machine name] → QA Portal Sync**.

**Revert the feature before committing.** It opens an inspector on a production build.

### What to look at

| Panel | Question it answers |
|---|---|
| **Timelines → JavaScript Allocations** | Snapshot, use the UI, snapshot again. A growing delta between snapshots is a React leak |
| **Elements** | Count DOM nodes. If toggling settings grows the count and it never falls, components are not unmounting |
| **Network** | Must be empty. Any request from the webview at idle is a finding |
| **Console** | Errors nobody sees in a release build |

### Process-level check, no rebuild needed

Cheaper and available on any build — watch the helper alongside an interaction:

```bash
WC=$(pgrep -f "WebKit.WebContent" | head -1)
for i in $(seq 1 30); do
  echo "$(date +%T)  $(footprint -p $WC | awk '/phys_footprint:/{print $2, $3}')"
  sleep 2
done
```

Open the window, toggle settings, close it. WebContent's footprint should return to where it
started. A staircase means the frontend is retaining.

---

## 11. Instruments.app for reconnaissance

When it is not yet clear which of the four processes is misbehaving, a GUI capture is faster than
scripting. The CLI is `xctrace`; the app is Instruments.app from Xcode.

1. **Set the target to the Mac itself → All Processes.** Picking the `app` process is the obvious
   move and it is wrong: it captures the Rust core only, and the webview — the bigger half — is
   invisible. The first capture taken for this document made exactly that mistake.
2. Choose the **Activity Monitor** template. Record.
3. Afterwards, type `WebKit` in the *Detail Filter* at the bottom to isolate the helpers.

To get numbers out, select the detail table, ⌘A, ⌘C, then `pbpaste > snapshots.tsv`. For the full
trace:

```bash
xctrace export --input run-1.trace --toc --output toc.xml
xctrace export --input run-1.trace --xpath '/trace-toc/run[@number="1"]/data/table[@schema="…"]'
```

The Activity Monitor template gives CPU, memory, threads and thread-level wakeups. It gives **no**
dirty/clean split, no leak detection and no energy model — those stay with `vmmap`, `leaks` and
`powermetrics`.

---

## 12. Deep profiling — only if a number above looks wrong

```bash
# Allocation trace (Instruments, headless)
xctrace record --template 'Allocations' --attach "$APP_PID" --time-limit 120s --output /tmp/qa-portal.trace
open /tmp/qa-portal.trace

# CPU time attribution
xctrace record --template 'Time Profiler' --attach "$APP_PID" --time-limit 60s --output /tmp/qa-portal-cpu.trace

# If the app hangs or spins
spindump "$APP_PID" 10 -file /tmp/qa-portal.spindump.txt
```

---

## Results table

Measured 2026-09-20, v0.1.0, release bundle in `/Applications`, MacBook Air (arm64, 24 GB),
macOS 26.6.2 (25G83).

| # | Measurement | Expected | Actual | |
|---|---|---|---|---|
| 1 | Idle CPU avg / peak, 10 min hidden | ~0% / <1% | **0.002% / 0.100%** (60 samples) | ✅ |
| 2 | Idle footprint, core | record | **28 MB** (peak 29 MB) | ✅ |
| 2 | `vmmap` dirty total | record | **26.1 MB** | ✅ |
| 2 | malloc: dirty / live / fragmentation | record | 17.5 MB / 9.4 MB / **8.5 MB (48%)** | ✅ |
| 2 | Live allocations | record | 74 060 objects, 9.1 MB | ✅ |
| 3 | Process count when hidden | record | **4** | ✅ |
| 3 | WebContent footprint when hidden | record | **29 MB** (peak 44 MB) | ✅ |
| 3 | GPU / Networking when hidden | record | 11 MB (peak 62) / 4.8 MB (peak 5.2) | ✅ |
| 3 | **Total idle footprint, all processes** | record | **≈ 73 MB** — core 28, webview 45 | ✅ |
| 4 | Idle wakeups / sec | low single digits | **0.2 – 1.4** | ✅ |
| 4 | Energy impact | ~0 | **0.00 – 0.01** | ✅ |
| 4 | CPU ms/s while idle | — | 0.01 – 0.09 | ✅ |
| 5 | Cycles that actually ran | 50 | **50 / 50, 0 failed** | ✅ |
| 5 | RSS after 50 show/hide cycles | ≈ baseline | 191 264 → 193 248 → **192 560 KB after settling (+0.68%)** | ✅ |
| 5 | `leaks` after cycling | no growth | **286 / 14 240 B before and after — identical** | ✅ |
| 6 | 8h soak drift | within a few % | **−0.20%** over 9 h / 108 samples — 192 112 → 191 728 KB, peak 192 176, total spread 0.23% | ✅ |
| 6 | Helper restarts during soak | 0 | **0** — all four processes alive for the whole run | ✅ |
| 7 | Orphans after 20 launch/quit | 0 | **0 / 20** | ✅ |
| 7 | Open file descriptors while idle | record | **28 total** — core 10, Networking 9, GPU 6, WebContent 3 | ✅ |
| 8 | Login-item plist path | `/Applications/…` | **`/Applications/…/MacOS/app --hidden`**, `RunAtLoad` true; off removes the file, on recreates it | ✅ |
| 8 | Time from login to tray ready | no visible delay | **deferred** — needs a reboot; run it with checklist A7–A9 | ⏳ |
| 9 | Survives 1h sleep | yes | **deferred** — needs an hour of sleep; run it with checklist X1–X2 | ⏳ |
| 10 | Frontend JS heap growth | no growth | **deferred** — moot for the closed state if the webview is destroyed on close ([planned](../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it)); still applies while the window is open | ⏳ |

✅ passed · ⏳ deferred, needs a reboot or a long wait · ☐ not run

The two deferred rows are the only ones that cannot be finished in a sitting. Pair them with the
functional check-list rather than scheduling a separate pass: a single reboot closes both this table's
login-time row and A7–A9, and a single hour of sleep closes both the sleep row and X1–X2.

## Known costs to carry forward

Note these alongside the numbers, so a future comparison is not surprised by them:

- **The webview is 62% of the idle footprint.** 45 MB across three helper processes against 28 MB for
  the Rust core. Hiding the window shrinks them to about a third of their peak but never frees them.
  This is the cost that
  [destroying the window on close](../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it)
  is meant to remove — a planned change, gated on the measurement in scenario 3.
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
  When the scheduler lands, it becomes the only periodic wakeup source, and scenario 4 is how you
  check it is not waking more often than its cron expression requires.

## Where the automation should go next

Everything above is hand-driven. [automation-notes.md](automation-notes.md) lists what could be
turned into a test suite, including the AppleScript primitives this document established
(`bgonly`, `hide_win`, the PID discovery block) — they are the beginnings of a macOS E2E harness,
not just performance plumbing.
