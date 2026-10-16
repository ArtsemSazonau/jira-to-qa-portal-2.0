# SYS-008 — [System][Release] Check the release build -> the e2e feature is off by default and the executable holds no e2e_snapshot or wdio code

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`Cargo.toml + lib.rs`](../../../../src-tauri/Cargo.toml) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

Test access — the embedded WebDriver server and the e2e_* commands — must never ship. This checks the configuration a plain release build uses, and the artefact itself.

## Preconditions

- A release bundle built from the current tree: `npm run tauri build`.

## Steps

1. Run `npm run test:release` from the repo root.
2. Read the first three steps of its summary.

## Expected result

- `cargo tree -e features` shows neither the `e2e` feature nor `tauri-plugin-wdio-webdriver`.
- `strings` over `target/release/bundle/macos/jira-to-qa-portal.app/Contents/MacOS/app` finds no `e2e_snapshot` and no `wdio`.
- A release built with `--features e2e` fails the stage, naming the string that leaked.

## Automated by

| Test | File |
|---|---|
| `step_feature_off` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |
| `step_no_test_code` | [`scripts/test/release-smoke.sh`](../../../../scripts/test/release-smoke.sh) |

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`src-tauri/Cargo.toml`](../../../../src-tauri/Cargo.toml)
- Catalog: [SYS-008](../../catalog.md)
