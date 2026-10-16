# Manual pass — YYYY-MM-DD — vX.Y.Z

Copy this file to `runs/YYYY-MM-DD-vX.Y.Z.md` and fill it in. A pass covers the `manual` and
`partial` cases of the [catalog](../catalog.md); performance results go in
[performance-results.md](performance-results.md) instead.

| | |
|---|---|
| Date | YYYY-MM-DD |
| App version | vX.Y.Z (from `src-tauri/tauri.conf.json`) |
| Commit | `git rev-parse --short HEAD` |
| Build | release bundle in `/Applications`, clean entitlements (`codesign -d --entitlements -` prints one `Executable=` line) |
| Machine | model, macOS version and build |
| Tester | name |

## Automated stages first

| Stage | Command | Result |
|---|---|---|
| Fast suite | `npm run test:fast` | ☐ |
| Regression | `npm run test:regression` | ☐ |
| Release smoke | `npm run test:release` | ☐ |

## Cases

✅ pass · ❌ fail · ⊘ not applicable · ☐ not run

List every `manual` and `partial` case run. For a `partial` case, only the manual remainder is run.

| Case | Result | Notes |
|---|---|---|
| TRAY-001 | ☐ | |

## Failures

For each ❌: what was observed, the relevant log lines (the lifecycle logs one line per decision,
listed in [the README](../../../README.md#logs)), and the issue or fix it led to.

## Not run

Cases skipped this pass, and why (needs a reboot, a second display, …).
