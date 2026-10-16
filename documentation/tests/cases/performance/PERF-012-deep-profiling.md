# PERF-012 — [Performance][Deep profiling] Allocation and CPU traces -> a regression found elsewhere is attributed to code

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | the core process, `app` |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

Only run when another case has found a regression in the core: these traces attribute allocations
and CPU time to call stacks, so the fix lands in the right place.

## Setup

- Release bundle installed in `/Applications`, re-signed with `get-task-allow`, processes
  discovered: [method](../../performance/README.md#make-the-process-debuggable).
- The app in the state where the regression shows.

## Procedure

```bash
xctrace record --template 'Allocations' --attach "$APP_PID" --time-limit 120s --output /tmp/qa-portal.trace
open /tmp/qa-portal.trace

xctrace record --template 'Time Profiler' --attach "$APP_PID" --time-limit 60s --output /tmp/qa-portal-cpu.trace
```

If the app hangs or spins:

```bash
spindump "$APP_PID" 10 -file /tmp/qa-portal.spindump.txt
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Persistent allocations by call site | Allocations trace, *Persistent Bytes* grouped by responsible caller, over 120 s idle | no growing call site in the app's own code |
| CPU time by frame at idle | Time Profiler, heaviest stack trace | no frame from the app's own code above 1% of samples |
| Hang | `spindump` main-thread stack | the main thread is idle in the run loop |
| Outcome | the traces | the regression from the case that triggered this one is attributed to a call site |

## Latest result

Not a recurring measurement; run on demand. Not needed so far.

## Pitfalls

- `--attach` needs the `get-task-allow` re-sign, like `leaks`.
- Re-signing and relaunching change `APP_PID`.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §12 of the pre-catalog performance procedures
