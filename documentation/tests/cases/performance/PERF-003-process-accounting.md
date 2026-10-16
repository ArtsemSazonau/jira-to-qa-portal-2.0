# PERF-003 — [Performance][Process accounting] Hidden and settled -> four processes, total footprint about 73 MB

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | `app` plus the three WebKit helpers |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## What we measure and why

The footprint of all four processes with the window hidden. Hiding **retains** the webview — Tauri
does not tear it down — and the three WebKit helpers together cost more than the Rust core. Any
memory work belongs here. This case also answers the question that gates the planned
destroy-on-close change: does closing the window release the helpers?

## Setup

- Release bundle installed in `/Applications`, processes discovered:
  [method → Find all four processes](../../performance/README.md#find-all-four-processes).
- Window hidden and settled for two minutes.

## Procedure

```bash
echo "--- core $APP_PID"
footprint -p $APP_PID | grep phys_footprint
for p in $WK_PIDS; do
  echo "--- $p  $(ps -p $p -o comm= | sed 's|.*/||')"
  footprint -p $p | grep phys_footprint
done
```

### Does closing release them?

Only meaningful on a build that destroys the window on close. Today hiding keeps the window alive,
so this returns all three helpers either way.

```bash
for p in $WK_PIDS; do ps -p $p -o pid=,comm= ; done
```

Close the window, wait 60 seconds, then run the same loop again.

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Process count when hidden | `$APP_PID` plus the entries of `$WK_PIDS` still alive | exactly 4 |
| WebContent footprint, hidden | `phys_footprint` for the WebContent PID | ≤ 32 MB (baseline 29 MB + 10%) |
| GPU / Networking footprint, hidden | `phys_footprint` for each | ≤ 12 MB / ≤ 5.5 MB |
| Total idle footprint, all processes | sum of the four `phys_footprint` values | ≤ 80 MB (baseline ≈ 73 MB + 10%) |
| Helpers alive 60 s after a real close | the second `ps` loop | today: n/a (window is hidden, not closed). For the destroy-on-close change: **0** — if the helpers survive, that change saves nothing and should not ship |

## Latest result

2026-09-20, v0.1.0: **4 processes**; WebContent **29 MB** (peak 44); GPU 11 MB (peak 62);
Networking 4.8 MB (peak 5.2); **total ≈ 73 MB — core 28, webview 45** — pass. The helpers shrink on
hide (GPU 62 → 11 MB, WebContent 44 → 29 MB) but stay alive and keep about a third of their peak.

## Pitfalls

- The helpers are launchd children (parent PID 1); only the before/after diff finds them.
- `ps rss` is not comparable to `footprint` — shared framework pages are counted once per process.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Functional counterpart: [HIDE-010](../hide/HIDE-010-webview-retained.md)
- Planned change: [destroy the window instead of hiding it](../../../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it)
- Former section: §3 of the pre-catalog performance procedures
