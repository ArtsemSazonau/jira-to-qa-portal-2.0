# Test inventory

**Generated** by `npm run test:catalog -- --write` from the test sources. Do not edit by hand;
`npm run test:catalog` fails when this file is out of date.

Every automated test, the file it lives in, and the [catalog](catalog.md) case it carries. A test
with no case is a helper-level check that does not map to a catalogued behaviour.

| Layer | Tests | Carrying a case |
|---|---|---|
| unit (Rust) | 2 | 1 |
| integration (Rust) | 0 | 0 |
| component (vitest) | 2 | 1 |
| flow (Playwright) | 0 | 0 |
| e2e (WebdriverIO) | 0 | 0 |
| release smoke (shell) | 0 | 0 |
| **Total** | **4** | **2** |

## `src-tauri/src/lib.rs`

unit (Rust).

| Test | Cases |
|---|---|
| `close_on_a_visible_window_hides_it` | DEMO-001 |
| `a_helper_level_check` | — |

## `ui/src/panel.test.tsx`

component (vitest).

| Test | Cases |
|---|---|
| `[DEMO-002] saves the setting when switched on` | DEMO-002 |
| `renders without crashing` | — |
