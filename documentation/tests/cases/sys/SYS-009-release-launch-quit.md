# SYS-009 — [System][Release] Launch the release bundle -> it starts, its menu bar icon appears, and Quit from the icon ends it with no leftover processes

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`lib.rs + tray.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

Everything else in the e2e stage runs against the test build. This is the one automated check of the bundle that actually ships, with no test access compiled in.

## Preconditions

- A release bundle built from the current tree: `npm run tauri build`.
- No copy of the app is running, from `/Applications` or anywhere else: they share the single-instance lock.
- Accessibility granted to the terminal (`npm run test:doctor`).

## Steps

1. Run `npm run test:release` from the repo root.

## Expected result

- The app starts from `target/release/bundle/macos/`.
- Its process owns a menu bar icon.
- Choosing Quit from that icon ends the process within 10 s.
- No app process and none of the WebKit helpers it started are left.

## Automated by

| Test | File |
|---|---|
| `step_launch` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |
| `step_tray_icon` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |
| `step_quit` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |
| `step_no_leftovers` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [SYS-009](../../catalog.md)
