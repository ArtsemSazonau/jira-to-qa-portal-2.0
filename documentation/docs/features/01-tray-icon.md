# 1. Tray icon and menu

A macOS menu bar icon, present for as long as the app runs. Once the window is hidden the app has no
Dock icon, so this is the only way back in — which is why its failure mode is treated as seriously
as its success path.

## Behaviour

- Created at startup, inside `setup`.
- Clicking it — **left or right** — opens a menu:

  ```
  Show Window
  ─────────────
  Quit
  ```

- **Show Window** shows and focuses the existing window. It never creates a second one.
- **Quit** exits the process through the same path as ⌘Q.
- The icon is a monochrome template image, so macOS recolours it for light and dark menu bars.

## The asset

`src-tauri/icons/trayTemplate.png` (18×18) and `trayTemplate@2x.png` (36×36) — black on transparent,
with only the alpha channel carrying the glyph. macOS ignores the colour of a template image
entirely and derives the menu bar rendering from alpha, which is why the full-colour app icon cannot
be reused here.

The sizes are not arbitrary: `tray-icon` renders the status item at a fixed **18pt** height, so 36px
is 1:1 on a Retina display and halves cleanly on a non-Retina one. The 36px file is the one embedded
in the binary.

Regenerate both with:

```bash
python3 scripts/generate-tray-icon.py
```

That script is stdlib-only (no Pillow): the glyph is a rounded-cap polyline rasterised with 8×8
supersampling, written out as an 8-bit RGBA PNG by hand. Edit `STROKE` and `HALF_WIDTH` at the top to
change the shape.

## Implementation

`src-tauri/src/tray.rs`.

The icon is embedded at compile time:

```rust
.icon(tauri::include_image!("icons/trayTemplate@2x.png"))
.icon_as_template(true)
.show_menu_on_left_click(true)
```

`include_image!` resolves relative to `CARGO_MANIFEST_DIR` and stores raw pixels in the binary. A
runtime path would have to differ between `tauri dev` and the bundle; this does not.

The menu's shape comes from `policy::TRAY_MENU_ITEMS`, and menu events are mapped by
`policy::map_menu_event`, so both are asserted by unit tests that need no Tauri runtime.

### Why the tray is not declared in `tauri.conf.json`

Tauri creates a tray icon automatically when `app.trayIcon` is present in the config — but it does so
inside `App::build`, where a failure aborts startup. The spec requires tray-creation failure to be
survivable, so the icon is built in `setup` instead, where the error is catchable.

**`app.trayIcon` is therefore deliberately absent from the config.** Adding it would create a
*second* tray icon alongside this one.

### Why the menu has Show Window in it

The spec's manual checklist asks for two things that a status item cannot both do on a single click:
clicking the tray reopens the window (step 5), and Quit appears in the left-click menu (step 8).

The menu route was chosen: left and right click both open it, and it carries both items. Reopening
costs one extra click, and in exchange **Quit is always reachable** — which matters more once the app
is in `Accessory` and the menu bar is the only remaining entry point.

## Failure handling

If `TrayIconBuilder::build` fails, the app does not panic and does not abort startup. Instead:

1. The error is logged through the existing `tauri-plugin-log` sink, together with the consequence.
2. `AppState.tray_available` stays `false`.
3. `policy::decide` therefore never returns `HideToTray`, and the close button quits instead — see
   [hide to tray](02-hide-to-tray.md#when-there-is-no-tray).

```
ERROR could not create the tray icon: <cause>. Hide-to-tray is disabled;
      closing the window will quit the app.
```

The UI reads `get_tray_available` and replaces the "Hide to menu bar" button with an explanation, so
the degraded behaviour is visible rather than surprising.

## Extending it

The tray menu is the natural home for "Run now", "Settings" and "Logs" as PLAN.md §3 describes. To
add an item:

1. Add an id constant and a `TRAY_MENU_ITEMS` entry in `lifecycle/policy.rs`.
2. Add an arm to `map_menu_event` returning the `Action` it performs.
3. If that needs a new `Action`, add a variant and one arm in `macos::apply`.

The unit test `tray_menu_contains_exactly_the_expected_ids` will fail until step 1 is reflected in
its expectation — deliberately, so a menu change is never silent.

The tray is registered under id `main`, so `app.tray_by_id("main")` reaches it later — for a sync
progress indicator, for instance, via `set_icon` or `set_title`.

## Tests

Every case for this feature is in the test catalog — the [`TRAY` cases](../../tests/catalog.md#os-tray--tray). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [TRAY-001](../../tests/cases/tray/TRAY-001-icon-appears.md) | Launch the app -> a tray icon appears in the menu bar | automated | e2e |
| [TRAY-002](../../tests/cases/tray/TRAY-002-left-click-menu.md) | Left-click the icon -> menu shows Show Window, a separator, Quit | automated | unit, e2e |
| [TRAY-003](../../tests/cases/tray/TRAY-003-right-click-menu.md) | Right-click the icon -> the same menu opens | automated | e2e |
| [TRAY-004](../../tests/cases/tray/TRAY-004-show-while-visible.md) | Show Window while the window is visible -> it comes forward, no second window | automated | unit, e2e |
| [TRAY-005](../../tests/cases/tray/TRAY-005-show-while-hidden.md) | Show Window while hidden -> the same window reappears with its prior state | automated | unit, e2e |
| [TRAY-006](../../tests/cases/tray/TRAY-006-dark-appearance.md) | Switch macOS to Dark appearance -> the icon inverts and stays legible | manual | manual |
| [TRAY-007](../../tests/cases/tray/TRAY-007-light-appearance.md) | Switch back to Light appearance -> the icon stays legible | manual | manual |
| [TRAY-008](../../tests/cases/tray/TRAY-008-scale-factor.md) | Move the window to a display with another scale factor -> the icon stays sharp | manual | manual |
| [TRAY-009](../../tests/cases/tray/TRAY-009-icon-removed-on-quit.md) | Quit the app -> the tray icon disappears immediately | automated | e2e |
| [TRAY-010](../../tests/cases/tray/TRAY-010-tray-failure-fallback.md) | Tray creation fails -> app still starts, logs the fallback, window warns that closing quits | partial | unit, component, flow, manual |
| TRAY-011 | Menu event with an unknown id -> ignored, nothing happens | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

