# 8. Settings UI

The app window. One setting today — launch at login — plus the affordances that make hide-to-tray
discoverable.

This replaced the stock Vite demo (hero images, counter, framework links) outright rather than
grafting a control into it, so the window is a real settings panel from the first feature.

## What the window shows

```
QA Portal Sync
Keeps running in the menu bar so scheduled syncs can continue.

┌──────────────────────────────────────────────────────┐
│  Launch at login                            ( ●——)   │
│  Start automatically when you log in to macOS,       │
│  hidden in the menu bar.                             │
└──────────────────────────────────────────────────────┘

[ Hide to menu bar ]
Closing this window hides it too. Use Quit in the menu
bar icon, or ⌘Q, to exit.
```

The footer text is doing real work: it is the only place, before the first close, that tells the user
the close button will not quit.

## States

| State | What the user sees |
|---|---|
| Loading | The toggle is **disabled** until the backend answers. Clicking before the real state is known would write a guess. |
| Ready | The toggle reflects the OS registration. |
| Toggle failed | The switch reverts, and an alert shows the error from Rust. |
| No tray | The hide button is **removed** and an alert explains that closing quits. Offering "Hide to menu bar" with no menu bar icon would strand the user. |
| No backend | A status message pointing at `npm run tauri dev` — this is what plain `vite dev` looks like. |

The toggle is optimistic and then reconciled: it flips immediately, `set_autostart_enabled` runs, and
the result is re-read from the OS. A failed registration therefore cannot leave the switch claiming
something untrue.

## The IPC boundary

**Components never call `invoke` directly.** Everything goes through typed wrappers in
`ui/src/lib/ipc.ts`:

```ts
getAutostartEnabled(): Promise<boolean>
setAutostartEnabled(enabled: boolean): Promise<void>
getTrayAvailable(): Promise<boolean>
hideMainWindow(): Promise<void>
showMainWindow(): Promise<void>
```

Two reasons. The command names live in one place, so a rename is one edit rather than a grep. And
tests have a single thing to mock — `App.test.tsx` mocks the wrappers, `ipc.test.ts` pins the wrappers
to the exact command names and argument shapes that `ipc_commands.rs` registers.

That second file is the contract test. A typo in a command name is otherwise a runtime failure that
only shows up in the built app.

**The UI deliberately uses no plugin JS APIs** — not autostart, not notification, not window. Rust
does all of it. This is why `src-tauri/capabilities/default.json` still grants nothing beyond
`core:default`.

## Styling

Uses the CSS custom properties already in `ui/src/index.css` (`--accent`, `--accent-border`,
`--border`, `--text-h`, `--code-bg`, `--social-bg`), which carry a `prefers-color-scheme: dark`
block — so nothing in `App.css` needs its own media query.

The switch is a styled `<input type="checkbox" role="switch">` rather than a custom widget, so it
keeps native keyboard and screen-reader behaviour. Tests find it with
`getByRole('switch', { name: /launch at login/i })`, which only works because the label is properly
associated.

`#root` lost its `width: 1126px` and `border-inline` from the scaffold — those were for the demo's
full-bleed layout and drew stray lines down the sides of an 800×600 window.

## Test setup

Added with this feature; there was no frontend test infrastructure before.

| Piece | File |
|---|---|
| Runner config | `ui/vite.config.ts` — a `test` block, using `defineConfig` from `vitest/config` so it is typed |
| jsdom + matchers | `ui/src/test/setup.ts` |
| Scripts | `npm test`, `npm run test:watch`, `npm run test:coverage` |

`tsconfig.app.json` already includes `src`, so the test files are type-checked by `tsc -b` during
`npm run build` — a broken test is a broken build, not a surprise later.

## Extending it

PLAN.md §3 plans `views/Settings.tsx`, `Schedule.tsx`, `SyncStatus.tsx` and `Report.tsx`. When the
second view arrives, this panel's body becomes `views/Settings.tsx` and `App.tsx` becomes the shell
that routes between them. The `lib/ipc.ts` boundary stays exactly as it is.

## Tests

| Test | File |
|---|---|
| `renders off when the app is not registered` | `App.test.tsx` |
| `reflects the real registration state rather than a default` | `App.test.tsx` |
| `registers the login item when switched on` | `App.test.tsx` |
| `removes the login item when switched off` | `App.test.tsx` |
| `reverts and explains when registration fails` | `App.test.tsx` |
| `is disabled until the backend has answered` | `App.test.tsx` |
| `explains itself when there is no backend at all` | `App.test.tsx` |
| `offers a hide button and explains how to quit` | `App.test.tsx` |
| `warns that closing quits when the tray could not be created` | `App.test.tsx` |
| `reads the autostart state with no arguments` | `lib/ipc.test.ts` |
| `passes the new value when setting autostart` | `lib/ipc.test.ts` |
| `propagates a rejection from the backend` | `lib/ipc.test.ts` |
| `reads tray availability` | `lib/ipc.test.ts` |
| `calls the window commands by their registered names` | `lib/ipc.test.ts` |

Appearance checks — dark mode, Retina, window resize — are in
[the functional checklist](../../tests/functional-checklist.md#module-ui).
