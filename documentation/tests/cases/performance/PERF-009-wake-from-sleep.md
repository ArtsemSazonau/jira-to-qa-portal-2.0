# PERF-009 — [Performance][Sleep] One hour asleep -> same PID, RSS stable, tray responsive

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | the core process, `app` |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

That the app survives a real sleep/wake cycle unchanged: same process, no memory jump, still
responsive. A background app that has to be relaunched after every sleep has failed at its job.

## Setup

- Release bundle installed in `/Applications`, launched by hand, window hidden.
- `sudo` available.

## Procedure

```bash
export APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1)
ps -o rss= -p "$APP_PID"
sudo pmset sleepnow
```

Wake the machine at least an hour later, then:

```bash
ps -o pid,etime,rss= -p "$APP_PID"
log show --predicate 'process == "app"' --last 2h --style compact | tail -40
```

Click the tray icon → **Show Window**.

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Same process | `ps -p "$APP_PID"` prints a row; `etime` spans the sleep | yes |
| RSS change | RSS after wake vs before sleep | ≤ +5% |
| Tray responsiveness | click the tray icon after wake | the menu opens within 1 s and Show Window shows the window |
| Log | `log show` over the sleep | no errors or panics around sleep and wake |

## Latest result

**Deferred** — needs an hour of sleep. Run it together with
[SYS-001](../sys/SYS-001-wake-from-sleep.md) and [SYS-002](../sys/SYS-002-sleep-log.md): one sleep
closes all three.

## Pitfalls

- `APP_PID` does not survive a new shell; re-derive it before the sleep.
- Closing the lid is a valid sleep for this case, unlike the soak.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §9 of the pre-catalog performance procedures
