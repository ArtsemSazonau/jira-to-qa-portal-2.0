# PERF-011 — [Performance][Reconnaissance] Instruments capture of all processes -> the misbehaving process is identified

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | `app` plus the three WebKit helpers |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

When a number in another case looks wrong and it is not yet clear *which* of the four processes is
responsible, a GUI capture across all of them is faster than scripting. This case produces a
finding — which process, which resource — that another case then measures precisely.

## Setup

- Release bundle installed in `/Applications`, launched, in the state where the problem shows.
- Xcode installed (Instruments.app ships with it).

## Procedure

1. Open Instruments.app. **Set the target to the Mac itself → All Processes.** Picking the `app`
   process captures the Rust core only, and the webview — the bigger half — is invisible.
2. Choose the **Activity Monitor** template. Record for 10 minutes, reproducing the problem if it
   needs an action.
3. Afterwards, type `WebKit` in the *Detail Filter* to isolate the helpers, then `app` for the core.

To get numbers out, select the detail table, ⌘A, ⌘C, then `pbpaste > snapshots.tsv`. For the full
trace:

```bash
xctrace export --input run-1.trace --toc --output toc.xml
xctrace export --input run-1.trace --xpath '/trace-toc/run[@number="1"]/data/table[@schema="…"]'
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Memory trend per process | Activity Monitor template, real memory column over time | flat for all four processes over the capture |
| CPU per process | CPU column over time | no recurring spikes at idle |
| Threads per process | thread count over time | constant at idle |
| Outcome | the trace | names the process and resource that misbehaves, or shows none does |

## Latest result

Not a recurring measurement; run on demand. Last used to establish that the webview, not the core,
holds most of the idle footprint (2026-09-20).

## Pitfalls

- The Activity Monitor template gives CPU, memory, threads and thread-level wakeups. It gives **no**
  dirty/clean split, no leak detection and no energy model — those stay with `vmmap`, `leaks` and
  `powermetrics` (PERF-002, PERF-005, PERF-004).
- A `.trace` is a ~19 MB binary; record the numbers in text, not the file.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §11 of the pre-catalog performance procedures
