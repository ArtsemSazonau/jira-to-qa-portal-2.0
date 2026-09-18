# Performance, load and stability tests

PLAN.md §1 commits to "минимальная нагрузка на систему в фоне" — a near-idle background process.
These measurements establish the baseline **before** the scheduler, the Playwright sidecar and LLM
inference exist, so every later feature can be measured as a delta rather than argued about.

**Record every number in [the results table](#results-table).** A baseline nobody wrote down is not a
baseline.

## Before you start

**Run everything in a real Terminal.** Agent sandboxes deny `ps`, `top` and `pgrep` outright
(`operation not permitted`, `sysmond service not found`), so none of this works through one.

**Test a release bundle installed in `/Applications`**, never `tauri dev`. An unbundled binary's
memory profile, login-item behaviour and activation-policy handling are all unrepresentative.

```bash
cd ~/Workspace/01-Projects/02-Personal/jira-to-qa-portal-2.0
npm run tauri build

rm -rf "/Applications/jira-to-qa-portal.app"
cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
open -a "/Applications/jira-to-qa-portal.app"
```

Capture the PID once per shell — it changes on every launch:

```bash
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
echo "APP_PID=$APP_PID"
```

If that comes back empty, find the real executable name — it is `app`, from the Cargo package name:

```bash
ls "/Applications/jira-to-qa-portal.app/Contents/MacOS/"
pgrep -fl "qa-portal"
```

### If the debug tools refuse to attach

`vmmap`, `leaks` and `heap` reporting "process is not debuggable" is the hardened runtime — Tauri
defaults `bundle.macOS.hardenedRuntime` to `true`.

```bash
codesign -d --entitlements - "/Applications/jira-to-qa-portal.app" 2>&1
codesign -dv --verbose=4 "/Applications/jira-to-qa-portal.app" 2>&1 | grep -i flags
```

Fix **for local measurement only**: set `"hardenedRuntime": false` under `bundle.macOS` in
`tauri.conf.json`, rebuild, and revert before committing. Never ship that.

### Tools

All verified present on macOS 26.6.2 with Xcode at `/Applications/Xcode.app`: `top`, `ps`, `vmmap`,
`leaks`, `footprint`, `heap`, `sample`, `spindump`, `lsof`, `powermetrics`, `xctrace`, `launchctl`,
`osascript`, `log`. Note `instruments` is gone (deprecated); `xctrace` at `/usr/bin/xctrace` replaces
it.

---

## 1. Idle CPU baseline (10 minutes, window hidden)

`ps -o %cpu` on macOS reports a **lifetime average**, not an instantaneous reading, so it hides
periodic spikes. Sample with `top` instead.

```bash
# 61 samples, 10s apart = 10 minutes. Hide the window BEFORE starting.
top -pid "$APP_PID" -l 61 -s 10 -stats pid,command,cpu,mem,rsize,threads,ports \
  | awk -v pid="$APP_PID" '$1==pid {print $3}' > /tmp/idle-cpu.txt

awk '{gsub(/%/,""); s+=$1; if($1>m) m=$1; n++} \
     END {printf "avg=%.3f%%  peak=%.3f%%  samples=%d\n", s/n, m, n}' /tmp/idle-cpu.txt
```

**Pass:** average effectively 0.0%, peak below ~1%.

A recurring non-zero spike means something is polling. Nothing in this feature should poll — the app
is entirely event-driven. Find it with [scenario 6](#6-long-soak-8-hours-hidden).

---

## 2. Idle memory baseline

Three views; record all three. `rss` is what you trend over time, `footprint` is what Activity
Monitor shows, `vmmap` tells you what is actually dirty.

```bash
# 1. Resident set size, in KB
ps -o pid=,rss=,vsz= -p "$APP_PID"

# 2. Apple's own accounting (the "Memory" column in Activity Monitor)
footprint -p "$APP_PID"

# 3. Dirty vs clean, plus per-region detail
vmmap --summary "$APP_PID"
vmmap "$APP_PID" | grep -E "TOTAL|MALLOC|WebKit|__DATA" | head -20
```

**Record the `footprint` number and the `vmmap --summary` dirty total.** Those two are the figures
every later feature gets compared against.

---

## 3. Process accounting

A Tauri app on macOS uses WKWebView, which runs out of process. Those helpers are launched by
launchd, so **their parent PID is 1** — they will not appear as children in a `ps` tree. Diff the
process list instead.

```bash
# BEFORE launching
ps -ax -o pid,command | grep -E "WebKit|WebContent|Networking\.xpc" | grep -v grep | sort > /tmp/webkit-before.txt

open -a "/Applications/jira-to-qa-portal.app"; sleep 5

ps -ax -o pid,command | grep -E "WebKit|WebContent|Networking\.xpc" | grep -v grep | sort > /tmp/webkit-after.txt
diff /tmp/webkit-before.txt /tmp/webkit-after.txt
```

Then repeat after hiding, to answer whether hiding releases the webview:

```bash
# Hide the window (⌘W), then let things settle
sleep 30
ps -ax -o pid,command | grep -E "WebKit|WebContent" | grep -v grep | sort > /tmp/webkit-hidden.txt
diff /tmp/webkit-after.txt /tmp/webkit-hidden.txt

# Total across the app and its helpers
footprint -p "$APP_PID"
for p in $(ps -ax -o pid,command | grep "WebContent" | grep -v grep | awk '{print $1}'); do
  echo "--- WebContent $p"; footprint -p "$p" | tail -3
done
```

**Expectation:** hiding **retains** the webview — Tauri does not tear it down. Record the retained
cost. If it is large, that is a follow-up item, not a blocker for this feature.

---

## 4. Idle wakeups and energy

The metric that matters most for a background app. Something that wakes the CPU 50×/second costs
battery even at 0% CPU.

```bash
# Window hidden. 6 samples at 5s. Needs sudo.
sudo powermetrics --samplers tasks --show-process-energy -n 6 -i 5000 \
  | grep -iE "jira-to-qa-portal|WebContent|^Name|ALL_TASKS"
```

Read **Idle Wakeups**, **Intr Wakeups** and the energy impact score.

**Pass:** idle wakeups in the low single digits per second, energy impact near zero. Double digits
mean a timer is running that should not be.

```bash
# If wakeups are high, find the timer
sudo powermetrics --samplers timer_analysis -n 1 -i 5000 | grep -iA5 "jira-to-qa-portal"
```

---

## 5. Show/hide cycle leak test (50 cycles)

The load test for the activation-policy flip. **Terminal needs Accessibility permission**
(System Settings → Privacy & Security → Accessibility) for the tray click.

```bash
# Baseline before cycling
ps -o rss= -p "$APP_PID" | tr -d ' '

for i in $(seq 1 50); do
  osascript -e 'tell application "System Events" to tell process "app" to click menu bar item 1 of menu bar 2' 2>/dev/null
  sleep 1
  osascript -e 'tell application "System Events" to keystroke "w" using command down' 2>/dev/null
  sleep 1
  echo "cycle $i rss=$(ps -o rss= -p "$APP_PID" | tr -d ' ')"
done

sleep 60   # let it settle
echo "after: $(ps -o rss= -p "$APP_PID" | tr -d ' ')"
```

The tray now opens a **menu** rather than toggling the window directly, so the AppleScript click
needs a second step to choose *Show Window*:

```bash
osascript -e 'tell application "System Events" to tell process "app" to click menu item "Show Window" of menu 1 of menu bar item 1 of menu bar 2'
```

If the menu-bar index does not resolve (it varies with what else is in the menu bar), fall back to
clicking the tray by hand for 50 cycles — tedious but valid — or drop to 10 and watch the trend.

**Pass:** RSS returns to roughly baseline after settling. A consistent step up per cycle means the
window or its webview is being recreated rather than reused — which would contradict
[the show path](../docs/features/02-hide-to-tray.md), whose whole point is that it resolves to the
existing window.

```bash
leaks "$APP_PID" | tail -20
heap "$APP_PID" | head -40   # deeper, only if leaks reports something
```

---

## 6. Long soak (8 hours, hidden)

```bash
LOG=~/qa-portal-soak-$(date +%Y%m%d-%H%M).csv
echo "epoch,iso,rss_kb,footprint_kb" > "$LOG"
while sleep 300; do
  RSS=$(ps -o rss= -p "$APP_PID" 2>/dev/null | tr -d ' ')
  [ -z "$RSS" ] && { echo "process gone" >> "$LOG"; break; }
  FP=$(footprint -p "$APP_PID" 2>/dev/null | awk '/phys_footprint/ {print $NF; exit}')
  echo "$(date +%s),$(date -Iseconds),$RSS,$FP" >> "$LOG"
done &
echo "sampler PID $!  writing $LOG"
```

Stop with `kill %1`, then check the trend:

```bash
awk -F, 'NR>1 {print $3}' "$LOG" \
  | awk 'NR==1{f=$1} {l=$1; if($1>m)m=$1} \
         END {printf "first=%dKB last=%dKB peak=%dKB drift=%+.1f%%\n", f, l, m, (l-f)*100.0/f}'
```

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

Then check for leaked descriptors and stray helpers after a normal quit:

```bash
open -a "/Applications/jira-to-qa-portal.app"; sleep 5
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
lsof -p "$APP_PID" | wc -l                                # note the count

osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
pgrep -fl "qa-portal"                                     # must print nothing
ps -ax -o pid,command | grep WebContent | grep -v grep    # no orphaned webviews
```

**Pass:** 0 orphans across all 20 cycles.

---

## 8. Autostart verification

```bash
ls -la ~/Library/LaunchAgents/ | grep -i "qa-portal"
plutil -p ~/Library/LaunchAgents/dev.sazonau.jira-to-qa-portal.plist

launchctl list | grep -i "qa-portal"
launchctl print "gui/$(id -u)/dev.sazonau.jira-to-qa-portal"
```

`ProgramArguments` must point at `/Applications/…`, **not** `target/debug` — that is the dev-path
hazard. It must also include `--hidden`.

After disabling the toggle:

```bash
ls ~/Library/LaunchAgents/ | grep -i "qa-portal" || echo "correctly removed"
```

Login-start cost, after a reboot:

```bash
ps -o pid,lstart,etime -p "$(pgrep -f 'jira-to-qa-portal.app/Contents/MacOS' | head -1)"
log show --predicate 'eventMessage CONTAINS "jira-to-qa-portal"' --last 10m --style compact | head -20
```

**Pass:** the app is ready without visibly delaying the login sequence.

---

## 9. Wake-from-sleep survival

```bash
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
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

## 10. Deep profiling — only if a number above looks wrong

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

Fill this in and put it in the PR description.

| # | Measurement | Expected | Actual |
|---|---|---|---|
| 1 | Idle CPU avg / peak, 10 min hidden | ~0% / <1% | |
| 2 | Idle RSS | record | |
| 2 | Idle footprint | record | |
| 2 | `vmmap` dirty total | record | |
| 3 | Process count when hidden | record | |
| 3 | WebContent footprint when hidden | record | |
| 4 | Idle wakeups / sec | low single digits | |
| 4 | Energy impact | ~0 | |
| 5 | RSS after 50 show/hide cycles | ≈ baseline | |
| 5 | `leaks` after cycling | 0 leaks | |
| 6 | 8h soak drift | within a few % | |
| 7 | Orphans after 20 launch/quit | 0 | |
| 7 | Open file descriptors while idle | record | |
| 8 | Login-item plist path | `/Applications/…` | |
| 8 | Time from login to tray ready | no visible delay | |
| 9 | Survives 1h sleep | yes | |

## Known costs to carry forward

Note these alongside the numbers, so a future comparison is not surprised by them:

- **The webview is retained while hidden.** Tauri does not tear down WKWebView on hide, so the
  WebKit content and networking helpers keep their memory for the whole time the app sits in the
  menu bar. This is the single largest component of the idle footprint.
- **`tauri-plugin-log` is debug-only.** The release build writes no log, so a release measurement
  does not include logging overhead — and a release-build diagnosis has no log to read.
- **Nothing polls.** The app is entirely event-driven: no timers, no intervals, no watchers. When
  the scheduler lands, it becomes the only periodic wakeup source, and scenario 4 is how you check
  it is not waking more often than its cron expression requires.
