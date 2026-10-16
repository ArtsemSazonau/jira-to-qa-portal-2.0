# PERF-004 — [Performance][Wakeups] Hidden and idle -> idle wakeups in low single digits per second, energy impact about 0

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | `app` plus the three WebKit helpers |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

How often the processes wake the CPU while idle. This is the metric that matters most for a
background app: something that wakes the CPU 50 times a second costs battery even at 0% CPU. When
the scheduler lands it becomes the only legitimate periodic wakeup source, and this case is how to
check it wakes no more often than its cron expression needs.

## Setup

- Release bundle installed in `/Applications`, processes discovered:
  [method → Find all four processes](../../performance/README.md#find-all-four-processes).
- Window hidden and settled for two minutes. `sudo` available.

## Procedure

Filter by **PID**, not by name:

```bash
sudo powermetrics --samplers tasks --show-process-energy -n 6 -i 5000 \
  | awk -v pids="$APP_PID $WK_PIDS" '
      BEGIN{n=split(pids,a," "); for(i=1;i<=n;i++) want[a[i]]=1}
      /^Name/ {print; next}
      $2 in want {print}'
```

Six samples, five seconds apart. Read **Idle Wakeups**, **Intr Wakeups**, the energy impact score
and CPU ms/s.

If wakeups are high, find the timer:

```bash
sudo powermetrics --samplers timer_analysis -n 1 -i 5000 | grep -iA5 "app"
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Idle wakeups per second | *Idle Wakeups* column, per process, per sample | < 5 for every process; double digits means a timer is running that should not be |
| Energy impact | energy impact column | ≤ 0.05 |
| CPU ms/s while idle | *CPU ms/s* column | ≤ 0.1 |

## Latest result

2026-09-20, v0.1.0: idle wakeups **0.2 – 1.4/s**; energy impact **0.00 – 0.01**; CPU 0.01 – 0.09
ms/s — pass.

## Pitfalls

- The executable is `app`, so grepping for `jira-to-qa-portal` matches nothing and leaves you
  reading `ALL_TASKS` — the whole machine.
- A completely idle process **drops out of the listing**. Samples showing only the header are a
  pass, not a broken command.
- `powermetrics` needs `sudo`; this case cannot run in CI.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §4 of the pre-catalog performance procedures
