# UI-007 — [Settings UI][No backend] Open the frontend in a plain browser -> "desktop backend is not available" message, toggle disabled

| | |
|---|---|
| Status | `automated` |
| Levels | component, flow |
| Module | [`App.tsx`](../../../../ui/src/App.tsx) |
| Feature | [Settings UI](../../../docs/features/08-settings-ui.md) |

## Purpose

Running the frontend outside Tauri must explain itself instead of showing a dead toggle.

## Preconditions

- From the repo root: `npm --prefix ui install`.

## Steps

1. Run `npm --prefix ui run dev`.
2. Open `http://localhost:1420` in a browser.

## Expected result

- The message *The desktop backend is not available. Run the app with `npm run tauri dev`* appears.
- The switch is disabled.

## Automated by

| Test | File |
|---|---|
| `explains itself when there is no backend at all` | [`ui/src/App.test.tsx`](../../../../ui/src/App.test.tsx) |
| `explains that the desktop backend is missing instead of showing a dead toggle` | [`ui/flows/no-backend.flow.ts`](../../../../ui/flows/no-backend.flow.ts) |

## Related

- Feature: [Settings UI](../../../docs/features/08-settings-ui.md)
- Module: [`ui/src/App.tsx`](../../../../ui/src/App.tsx)
- Catalog: [UI-007](../../catalog.md)
- Former checklist ID: U7
