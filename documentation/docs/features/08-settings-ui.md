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

Every case for this feature is in the test catalog — the [`UI` cases](../../tests/catalog.md#settings-ui--ui) and [`IPC` cases](../../tests/catalog.md#ipc--ipc). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [UI-001](../../tests/cases/ui/UI-001-initial-render.md) | Open the window -> heading, subtitle, Launch at login row, hide button and its explanation | partial | component, flow, manual |
| [UI-002](../../tests/cases/ui/UI-002-disabled-until-answered.md) | Open the window -> the toggle is briefly disabled, then interactive | partial | component, flow, manual |
| [UI-003](../../tests/cases/ui/UI-003-dark-appearance.md) | Switch macOS to Dark appearance with the window open -> colours follow, text readable, switch visible in both states | partial | flow, manual |
| [UI-004](../../tests/cases/ui/UI-004-narrow-window.md) | Resize the window narrow -> no horizontal overflow | partial | flow, manual |
| [UI-005](../../tests/cases/ui/UI-005-keyboard-toggle.md) | Tab to the switch and press Space -> it toggles | partial | flow, manual |
| [UI-006](../../tests/cases/ui/UI-006-voiceover.md) | Focus the switch with VoiceOver on -> announced as a switch named "Launch at login" with its state | partial | component, manual |
| [UI-007](../../tests/cases/ui/UI-007-no-backend.md) | Open the frontend in a plain browser -> "desktop backend is not available" message, toggle disabled | automated | component, flow |
| [UI-008](../../tests/cases/ui/UI-008-retina.md) | Window on a Retina display -> text and the switch are sharp | manual | manual |
| UI-009 | Registration fails -> the toggle reverts and an alert shows the message | automated | component, flow |
| UI-010 | Toggle while a save is in flight -> the switch is disabled until it settles | automated | component |
| UI-011 | Successful toggle after a failure -> the previous error clears | automated | component |
| UI-012 | Render the panel -> axe finds no violations | automated | component |
| IPC-001 | Call each lib/ipc.ts wrapper -> it invokes the registered command name with the right arguments | automated | component |
| IPC-002 | Backend rejects a command -> the wrapper rejects with the same message | automated | component |
| IPC-003 | Compare lib/ipc.ts with the Rust handler list -> the same command names on both sides | automated | component |
| IPC-004 | Compare the test-build handler list with production -> production plus e2e_* names only | automated | component |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

