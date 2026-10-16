# PERF-005 — [Performance][Show/hide cycles] 50 verified show/hide cycles -> RSS back to baseline, leak count unchanged

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | [`lifecycle/macos.rs`](../../../../src-tauri/src/lifecycle/macos.rs) |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## What we measure and why

The load test for the activation-policy flip. Fifty show/hide cycles must leave memory and the leak
count where they started. A consistent step up per cycle would mean the window or its webview is
being recreated rather than reused — which would contradict the show path, whose whole point is that
it resolves to the existing window.

## Setup

- Release bundle installed in `/Applications`, re-signed with `get-task-allow`, processes
  discovered: [method](../../performance/README.md#make-the-process-debuggable).
- **Accessibility permission for the terminal** — the only performance case that needs it, because
  50 hide cycles cannot be clicked by hand:
  [method → Assistive access](../../performance/README.md#assistive-access-and-what-still-works-without-it).

Define the helpers:

```bash
hide_win() { osascript -e 'tell application "System Events" to tell process "app" to click button 1 of window 1' >/dev/null 2>&1; }

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

## Procedure

Take the baseline **hidden**, so it compares like with like:

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

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Cycles that actually ran | `succeeded:` / `failed:` — each cycle asserts `shown=false` then `hidden=true` | 50 / 0 |
| RSS after settling | `total_rss` after the 60-second settle vs the hidden baseline | within ±2% of baseline |
| Leak count | `total leaked bytes` line before and after | unchanged (±2 leaks) — growth, never absolute, is the criterion |

## Latest result

2026-09-20, v0.1.0: **50 / 50, 0 failed**; RSS 191 264 → 193 248 → **192 560 KB after settling
(+0.68%)**; leaks **286 / 14 240 B before and after — identical** — pass.

## Pitfalls

- **Drive the hide with the close button, not ⌘W.** `keystroke "w" using command down` does not
  reach the app; two full 50-cycle runs passed silently while the window never once closed.
- **Every cycle must verify itself.** A cycle test that does not check its own effect reports a flat
  memory graph as a pass — which is what happened on the first three attempts.
- **Reading `leaks`:** the summary prints before the details, so `leaks … | tail` misses it — grep
  for `total leaked bytes`. A fresh process always reports ~286 leaks / ~14 KB from Apple's
  `AppIntents` framework (`ROOT CYCLE: NSXPCConnection`). A jump into the thousands would mean the
  registry client is recreated per show, and that would be this app's problem.
- The tray menu (`menu bar item 1 of menu bar 2`) silently resolves to the wrong item; do not script
  through it.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Functional counterpart: [HIDE-009](../hide/HIDE-009-rapid-cycles.md)
- Former section: §5 of the pre-catalog performance procedures
