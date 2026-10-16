# LOGIN-014 — [Launch at login][Dev path] Toggle on in tauri dev -> the log warns about a development binary

| | |
|---|---|
| Status | `automated` |
| Levels | e2e |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## Purpose

A login item pointing into `target/` breaks on the next rebuild. The warning is the cheapest guard.

## Preconditions

- A development run from the repo root, with its log visible in the terminal:

  ```bash
  npm install
  npm --prefix ui install
  npm run tauri dev
  ```

## Steps

1. Turn **Launch at login** on in the dev window.
2. Read the terminal log.
3. Turn it off again, so the dev binary is not left registered.

## Expected result

- The log carries `registered a login item for a development binary at …/target/debug/…`.

## Automated by

| Test | File |
|---|---|
| `Turn the toggle on -> plist with --hidden appears, and the dev-binary warning is logged` | [`e2e/specs/login-item.e2e.ts`](../../../../e2e/specs/login-item.e2e.ts) |

## Related

- Feature: [Launch at login](../../../docs/features/04-launch-at-login.md)
- Module: [`src-tauri/src/autostart.rs`](../../../../src-tauri/src/autostart.rs)
- Catalog: [LOGIN-014](../../catalog.md)
- Former checklist ID: A14
