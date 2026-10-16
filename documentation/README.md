# Documentation

What the app does, and how to verify it.

```
documentation/
├── docs/
│   ├── overview.md          what is implemented, and how the pieces fit
│   └── features/            one document per feature
└── tests/
    ├── README.md            testing strategy: layers, tools, stages, naming, the test-first loop
    ├── catalog.md           every test case, by area and feature, with its status
    ├── inventory.md         generated: every automated test and the case it carries
    ├── cases/               one file per manual, partial, e2e and performance case
    ├── performance/         how performance is measured
    └── runs/                manual pass records and performance results
```

## Start here

- **[docs/overview.md](docs/overview.md)** — every implemented feature in one table, the decision
  flow they all share, and what is deliberately not built yet.
- **[tests/README.md](tests/README.md)** — how the project is tested, and which command runs which
  stage.
- **[tests/catalog.md](tests/catalog.md)** — every test case; before shipping a change, its
  `manual` and `partial` cases are the manual pass.
- **[tests/performance/README.md](tests/performance/README.md)** — before and after any change to
  the core process, so the idle baseline stays honest.

## Features

| # | Feature |
|---|---|
| 1 | [Tray icon and menu](docs/features/01-tray-icon.md) |
| 2 | [Hide to tray](docs/features/02-hide-to-tray.md) |
| 3 | [Quit handling](docs/features/03-quit-handling.md) |
| 4 | [Launch at login](docs/features/04-launch-at-login.md) |
| 5 | [Single instance and reopen](docs/features/05-single-instance.md) |
| 6 | [One-time notifications](docs/features/06-notifications.md) |
| 7 | [App configuration](docs/features/07-app-config.md) |
| 8 | [Settings UI](docs/features/08-settings-ui.md) |

Each feature document covers behaviour, the decisions behind it, edge cases, where it is implemented
and which tests cover it.

## Elsewhere

| Document | What it covers |
|---|---|
| [../README.md](../README.md) | Architecture, running, configuring, debugging |
| [../CLAUDE.md](../CLAUDE.md) | Conventions, environment constraints, decisions taken |
| [../src-tauri/CLAUDE.md](../src-tauri/CLAUDE.md) | Tauri backend development |
| [../PLAN.md](../PLAN.md) | The v2.0 architecture plan (Russian) |

## Adding to this

A new feature gets a numbered document in `docs/features/`, a row in
[docs/overview.md](docs/overview.md), its cases in [tests/catalog.md](tests/catalog.md) with case
files where they are needed, and — if it runs in the core process — a before/after section in
[tests/runs/performance-results.md](tests/runs/performance-results.md).
