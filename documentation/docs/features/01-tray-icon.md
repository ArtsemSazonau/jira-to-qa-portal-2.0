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
      the window will close normally.
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

| Test | File |
|---|---|
| `tray_menu_contains_exactly_the_expected_ids` | `src-tauri/src/lifecycle/policy.rs` |
| `the_quit_menu_id_maps_to_the_app_exit_action` | `src-tauri/src/lifecycle/policy.rs` |
| `the_show_menu_id_maps_to_the_show_action` | `src-tauri/src/lifecycle/policy.rs` |
| `an_unknown_menu_id_maps_to_nothing` | `src-tauri/src/lifecycle/policy.rs` |
| `every_menu_label_is_non_empty` | `src-tauri/src/lifecycle/policy.rs` |
| `a_fresh_state_assumes_no_tray_until_one_is_registered` | `src-tauri/src/lifecycle/mod.rs` |
| `the_tray_menu_offers_both_a_way_in_and_a_way_out` | `src-tauri/tests/lifecycle_policy.rs` |
| `without_a_tray_the_app_never_hides_itself_out_of_reach` | `src-tauri/tests/lifecycle_policy.rs` |

Manual checks — the icon's presence, legibility in both appearances, and sharpness on a Retina
display — are in [the functional checklist](../../tests/functional-checklist.md#module-trayrs).
