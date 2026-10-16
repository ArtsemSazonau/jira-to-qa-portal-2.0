# PERF-002 — [Performance][Idle memory] Hidden and settled -> core footprint and dirty memory within budget of the baseline

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | the core process, `app` |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

The Rust core's memory at idle, from three angles: what Activity Monitor shows (`footprint`), what
is actually dirty (`vmmap --summary`), and what the live objects are (`heap`). The footprint and the
dirty total are the two figures every later feature is compared against.

## Setup

- Release bundle installed in `/Applications`, re-signed with `get-task-allow` so `heap` can attach,
  processes discovered: [method → Make the process debuggable](../../performance/README.md#make-the-process-debuggable).
- Window hidden and settled for two minutes.

## Procedure

```bash
footprint -p "$APP_PID"
vmmap --summary "$APP_PID"
heap "$APP_PID" | grep -A 25 "CLASS_NAME"
```

### Reading `vmmap --summary`

The `TOTAL` line is alarming and mostly meaningless:

```
TOTAL    6.8G virtual    840.7M resident    26.1M dirty
```

- **6.8 G virtual** is reserved address space, not memory. `JS VM Gigacage (reserved)` alone is 4.0 G
  with zero resident pages.
- **840 M resident** is dominated by `__TEXT` of system frameworks (590 M), shared with every other
  process on the machine.
- **26.1 M dirty** is the real cost. This is the number that is recorded.

### The malloc zone table

```
MALLOC ZONE            DIRTY   ALLOCATED   FRAG SIZE   % FRAG   COUNT
DefaultMallocZone      14.6M       9036K       5876K      40%    70018
WebKit Malloc          2064K        169K       1895K      92%     1551
QuartzCore              736K        130K        606K      83%     1736
TOTAL                  17.5M       9363K       8557K      48%
```

The allocator holds 17.5 MB of dirty pages while only 9.4 MB is live — 8.5 MB, 48%, is
fragmentation. Not a leak: the memory is freed, but each page still holds a live object so it
cannot go back to the OS. `DefaultMallocZone` is shared between Rust and Objective-C; `heap` splits
it by class name.

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Core footprint | `phys_footprint` from `footprint -p` | ≤ 31 MB (baseline 28 MB + 10%) |
| Dirty total | `TOTAL … dirty` from `vmmap --summary` | ≤ 29 MB (baseline 26.1 MB + 10%) |
| malloc dirty / live / fragmentation | malloc zone `TOTAL` row: DIRTY, ALLOCATED, FRAG SIZE | dirty ≤ 19.5 MB; fragmentation ≤ 60% |
| Live allocations | object count and bytes from `heap` | ≤ 81 000 objects, ≤ 10 MB (baseline + 10%) |

A breach is not automatically a bug — the sync and report features will add real allocations — but
it must be named in the PR that caused it, with the new baseline recorded.

## Latest result

2026-09-20, v0.1.0: footprint **28 MB** (peak 29); dirty **26.1 MB**; malloc 17.5 / 9.4 / **8.5 MB
(48%)**; **74 060 objects, 9.1 MB** — pass.

## Pitfalls

- `heap` and `leaks` need the `get-task-allow` re-sign; without it they refuse to attach.
- Never quote `vmmap`'s virtual or resident totals as the app's memory use.
- Re-signing restarts nothing by itself, but the quit/relaunch around it changes `APP_PID`.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §2 of the pre-catalog performance procedures
