# Performance results

One section per pass, newest first. Each row names its case; the case file holds the procedure and
the target. Add a new section for each pass rather than overwriting — the point of the history is
the deltas.

✅ passed · ❌ failed · ⏳ deferred, needs a reboot or a long wait · ☐ not run

## 2026-09-20 — v0.1.0

Release bundle in `/Applications`, MacBook Air (arm64, 24 GB), macOS 26.6.2 (25G83).

| Case | Measurement | Target | Actual | |
|---|---|---|---|---|
| [PERF-001](../cases/performance/PERF-001-idle-cpu.md) | Idle CPU avg / peak, 10 min hidden | ≤ 0.05% / < 1% | **0.002% / 0.100%** (60 samples) | ✅ |
| [PERF-002](../cases/performance/PERF-002-idle-memory.md) | Idle footprint, core | baseline | **28 MB** (peak 29 MB) | ✅ |
| [PERF-002](../cases/performance/PERF-002-idle-memory.md) | `vmmap` dirty total | baseline | **26.1 MB** | ✅ |
| [PERF-002](../cases/performance/PERF-002-idle-memory.md) | malloc: dirty / live / fragmentation | baseline | 17.5 MB / 9.4 MB / **8.5 MB (48%)** | ✅ |
| [PERF-002](../cases/performance/PERF-002-idle-memory.md) | Live allocations | baseline | 74 060 objects, 9.1 MB | ✅ |
| [PERF-003](../cases/performance/PERF-003-process-accounting.md) | Process count when hidden | 4 | **4** | ✅ |
| [PERF-003](../cases/performance/PERF-003-process-accounting.md) | WebContent footprint when hidden | baseline | **29 MB** (peak 44 MB) | ✅ |
| [PERF-003](../cases/performance/PERF-003-process-accounting.md) | GPU / Networking when hidden | baseline | 11 MB (peak 62) / 4.8 MB (peak 5.2) | ✅ |
| [PERF-003](../cases/performance/PERF-003-process-accounting.md) | **Total idle footprint, all processes** | baseline | **≈ 73 MB** — core 28, webview 45 | ✅ |
| [PERF-004](../cases/performance/PERF-004-idle-wakeups.md) | Idle wakeups / sec | < 5 | **0.2 – 1.4** | ✅ |
| [PERF-004](../cases/performance/PERF-004-idle-wakeups.md) | Energy impact | ≤ 0.05 | **0.00 – 0.01** | ✅ |
| [PERF-004](../cases/performance/PERF-004-idle-wakeups.md) | CPU ms/s while idle | ≤ 0.1 | 0.01 – 0.09 | ✅ |
| [PERF-005](../cases/performance/PERF-005-show-hide-cycles.md) | Cycles that actually ran | 50 / 0 | **50 / 50, 0 failed** | ✅ |
| [PERF-005](../cases/performance/PERF-005-show-hide-cycles.md) | RSS after 50 show/hide cycles | ±2% | 191 264 → 193 248 → **192 560 KB after settling (+0.68%)** | ✅ |
| [PERF-005](../cases/performance/PERF-005-show-hide-cycles.md) | `leaks` after cycling | no growth | **286 / 14 240 B before and after — identical** | ✅ |
| [PERF-006](../cases/performance/PERF-006-soak.md) | 8h soak drift | ±3% | **−0.20%** over 9 h / 108 samples — 192 112 → 191 728 KB, peak 192 176, spread 0.23% | ✅ |
| [PERF-006](../cases/performance/PERF-006-soak.md) | Helper restarts during soak | 0 | **0** — all four processes alive for the whole run | ✅ |
| [PERF-007](../cases/performance/PERF-007-launch-quit-cycles.md) | Orphans after 20 launch/quit | 0 | **0 / 20** | ✅ |
| [PERF-007](../cases/performance/PERF-007-launch-quit-cycles.md) | Open file descriptors while idle | baseline | **28 total** — core 10, Networking 9, GPU 6, WebContent 3 | ✅ |
| [PERF-008](../cases/performance/PERF-008-login-item.md) | Login-item plist path | `/Applications/…` | **`/Applications/…/MacOS/app --hidden`**, `RunAtLoad` true; off removes the file, on recreates it | ✅ |
| [PERF-008](../cases/performance/PERF-008-login-item.md) | Time from login to tray ready | ≤ 10 s, no visible delay | **deferred** — needs a reboot; run it with LOGIN-007 … LOGIN-009 | ⏳ |
| [PERF-009](../cases/performance/PERF-009-wake-from-sleep.md) | Survives 1h sleep | same PID, ≤ +5% RSS | **deferred** — needs an hour of sleep; run it with SYS-001 and SYS-002 | ⏳ |
| [PERF-010](../cases/performance/PERF-010-frontend-profiling.md) | Frontend JS heap growth | < 1 MB | **deferred** — moot for the closed state if the webview is destroyed on close; still applies while the window is open | ⏳ |
| [PERF-011](../cases/performance/PERF-011-instruments-recon.md) | Reconnaissance | on demand | used to establish the webview's share of the footprint | ✅ |
| [PERF-012](../cases/performance/PERF-012-deep-profiling.md) | Deep profiling | on demand | not needed | ☐ |

The targets in this table were set when the cases were split out (2026-10), as the 2026-09-20
baseline plus the budget in the [method page](../performance/README.md#budgets). The 2026-09-20 pass
measured against "record a baseline", so every row recorded there is its own baseline.

The deferred rows are the only ones that cannot be finished in a sitting. Pair them with the manual
cases rather than scheduling a separate pass: a single reboot closes PERF-008's login-time row and
LOGIN-007 … LOGIN-009, and a single hour of sleep closes PERF-009 and SYS-001 … SYS-002.
