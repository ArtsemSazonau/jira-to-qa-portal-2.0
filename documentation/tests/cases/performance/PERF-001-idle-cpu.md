# PERF-001 — [Performance][Idle CPU] Hidden and untouched for 10 minutes -> CPU average about 0%, peak below 1%

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | the core process, `app` |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

The CPU the Rust core uses while the window is hidden and nothing is happening. The app is meant to
sit in the menu bar for weeks; any recurring CPU use at idle means something polls, and nothing in
it should — it is entirely event-driven.

## Setup

- Release bundle installed in `/Applications`, launched by hand, processes discovered:
  [method → Find all four processes](../../performance/README.md#find-all-four-processes).
- Window hidden (click the red close button), then **two minutes** of settling, so startup work does
  not land in the sample.
- Do not touch the machine during the run. Any interaction wakes the webview and contaminates it.

## Procedure

```bash
sleep 120

top -pid "$APP_PID" -l 61 -s 10 -stats pid,cpu,mem,threads \
  | awk -v p="$APP_PID" '$1==p {n++; if(n>1){gsub(/%/,"",$2); print $2; fflush()}}' \
  | tee /tmp/idle-cpu.txt

awk '{s+=$1; if($1>m)m=$1; n++} END{printf "avg=%.3f%%  peak=%.3f%%  samples=%d\n", s/n, m, n}' \
  /tmp/idle-cpu.txt
```

61 samples at 10-second intervals; the first is discarded, leaving 60 over 10 minutes.

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Average CPU | mean of the 60 `top` samples after the first | ≤ 0.05% (effectively 0.0%) |
| Peak CPU | max of the same samples | < 1% |
| Sample count | `samples=` in the summary | 60 — fewer means the run was cut short |

## Latest result

2026-09-20, v0.1.0: **avg 0.002%, peak 0.100%, 60 samples** — pass. History in
[runs/performance-results.md](../../runs/performance-results.md).

## Pitfalls

- `ps -o %cpu` on macOS is a **lifetime average**, not an instantaneous reading, and hides periodic
  spikes. Use `top`.
- `top`'s **first sample is also a lifetime average**, inflated by the launch burn. The awk above
  skips it (`n>1`).
- Without `fflush()` and `tee`, awk buffers and the command looks frozen for ten minutes.
- A recurring non-zero spike means something is polling; find it with
  [PERF-006](PERF-006-soak.md)'s `sample` step or with [PERF-004](PERF-004-idle-wakeups.md)'s timer
  analysis.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §1 of the pre-catalog performance procedures
