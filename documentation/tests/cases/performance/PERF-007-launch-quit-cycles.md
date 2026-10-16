# PERF-007 — [Performance][Launch/quit cycles] 20 launch/quit cycles -> no orphans, WebKit count back to baseline

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Quit handling](../../../docs/features/03-quit-handling.md) |

## What we measure and why

Clean teardown under repetition: every quit must end the core and release its three WebKit helpers.
It also records the open file descriptors at idle — a baseline that matters once the Jira client and
the Playwright sidecar land, when sockets that outlive a sync would show up here first.

## Setup

- Release bundle installed in `/Applications`, not running.
- No Accessibility permission needed: `tell application … to quit` is an AppleEvent.

## Procedure

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

WebKit helpers — take the count with the app **not running** first; other apps keep their own:

```bash
pgrep -fl "qa-portal"
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l

open -a "/Applications/jira-to-qa-portal.app"; sleep 5
export APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l

osascript -e 'tell application "jira-to-qa-portal" to quit'; sleep 3
pgrep -f "WebKit.WebContent|WebKit.Networking|WebKit.GPU" | wc -l
```

File descriptors, with the window hidden and the processes discovered as in the
[method](../../performance/README.md#find-all-four-processes):

```bash
for p in $APP_PID $WK_PIDS; do
  n=$(lsof -p $p 2>/dev/null | awk 'NR>1 && $4 ~ /^[0-9]+[rwu]?$/' | wc -l | tr -d ' ')
  printf "%-8s fd=%s\n" "$p" "$n"
done
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Orphans after each cycle | `residual processes` per cycle | 0 in all 20 cycles |
| App processes before launch | the first `pgrep -fl` | none |
| WebKit helper count | before launch / after launch / after quit | +3 on launch, back to the before-launch count on quit |
| Open descriptors at idle | sum of `fd=` over the four processes | ≤ 32 (baseline 28 + 4); any per-process growth is named in the PR |

## Latest result

2026-09-20, v0.1.0: **0 / 20 orphans**; **28 descriptors** — core 10, Networking 9, GPU 6,
WebContent 3 — pass.

## Pitfalls

- `lsof -p` lists every memory-mapped library (`FD=txt`) alongside real descriptors, about four to
  one, and those move whenever a dependency changes. The awk keeps numbered descriptors only.
- Measure descriptors with the window hidden, the same state as the baseline.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Functional counterparts: [QUIT-006](../quit/QUIT-006-no-leftover-process.md),
  [QUIT-007](../quit/QUIT-007-no-orphan-webkit.md)
- Former section: §7 of the pre-catalog performance procedures
