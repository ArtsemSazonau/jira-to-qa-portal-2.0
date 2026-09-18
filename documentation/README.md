# Documentation

What the app does, and how to verify it.

```
documentation/
├── docs/
│   ├── overview.md          what is implemented, and how the pieces fit
│   └── features/            one document per feature
└── tests/
    ├── functional-checklist.md   manual checks, ordered by module
    └── performance.md            performance, load and stability scenarios
```

## Start here

- **[docs/overview.md](docs/overview.md)** — every implemented feature in one table, the decision
  flow they all share, and what is deliberately not built yet.
- **[tests/functional-checklist.md](tests/functional-checklist.md)** — before shipping a change to
  the lifecycle.
- **[tests/performance.md](tests/performance.md)** — before and after any change to the core
  process, so the idle baseline stays honest.

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
[docs/overview.md](docs/overview.md), a module section in the functional checklist, and — if it runs
in the core process — a before/after row in the performance results table.
