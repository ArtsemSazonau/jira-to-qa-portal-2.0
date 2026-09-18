//! Menu bar (tray) icon.
//!
//! The icon is built here rather than declared as `app.trayIcon` in
//! `tauri.conf.json` on purpose: a config-declared tray is created inside
//! `App::build`, where a failure aborts startup. The spec requires the opposite
//! — tray creation failure must be survivable — so it is built inside `setup`,
//! where the error is catchable and the app can fall back to being an ordinary
//! closable window.
//!
//! The menu deliberately carries a **Show Window** item as well as **Quit**.
//! With `show_menu_on_left_click`, a left or right click opens the menu, so the
//! menu is the only re-entry point once the app is in `Accessory` — it has to
//! offer both.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::{AppHandle, Manager, Wry};

use crate::lifecycle::macos;
use crate::lifecycle::policy::{self, TRAY_MENU_ITEMS};
use crate::lifecycle::AppState;

/// Tray icon id, so `app.tray_by_id` can find it later (a status indicator for
/// sync progress is the obvious next use).
pub const TRAY_ID: &str = "main";

/// Build the menu described by [`TRAY_MENU_ITEMS`].
///
/// The ids and labels come from the policy module so the menu's shape is
/// asserted by a unit test that needs no Tauri runtime.
fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let menu = Menu::new(app)?;
    for item in TRAY_MENU_ITEMS {
        match item {
            Some((id, label)) => menu.append(&MenuItem::with_id(app, *id, label, true, None::<&str>)?)?,
            None => menu.append(&PredefinedMenuItem::separator(app)?)?,
        }
    }
    Ok(menu)
}

/// Create the tray icon and wire its events.
///
/// On success the caller must mark the tray available in [`AppState`]; on
/// failure it must leave it unavailable, which is what makes
/// [`policy::decide`] fall back to a normal window close instead of hiding the
/// app somewhere the user cannot reach it.
pub fn create(app: &AppHandle) -> tauri::Result<TrayIcon<Wry>> {
    let menu = build_menu(app)?;

    TrayIconBuilder::with_id(TRAY_ID)
        // Black-on-transparent so macOS recolours it for light and dark menu
        // bars. Embedded at compile time — a path resolved at runtime would
        // differ between `tauri dev` and the bundle.
        .icon(tauri::include_image!("icons/trayTemplate@2x.png"))
        .icon_as_template(true)
        .show_menu_on_left_click(true)
        .tooltip("QA Portal Sync")
        .menu(&menu)
        .on_menu_event(|app, event| {
            let Some(action) = policy::map_menu_event(event.id().as_ref()) else {
                log::warn!("unhandled tray menu id: {}", event.id().as_ref());
                return;
            };
            macos::apply(app, action);
        })
        .build(app)
}

/// Create the tray, recording the outcome in [`AppState`].
///
/// Never returns an error: a missing tray degrades the app rather than
/// stopping it.
pub fn install(app: &AppHandle) {
    match create(app) {
        Ok(_tray) => {
            app.state::<AppState>().set_tray_available(true);
            log::info!("tray icon created");
        }
        Err(err) => {
            // The consequence, spelled out because it is not obvious: without a
            // tray there is no way back into a hidden Accessory app, so
            // hide-to-tray turns itself off and the window stays closable.
            log::error!(
                "could not create the tray icon: {err}. \
                 Hide-to-tray is disabled; the window will close normally."
            );
            app.state::<AppState>().set_tray_available(false);
        }
    }
}
