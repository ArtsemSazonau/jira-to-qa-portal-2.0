//! Guards `capabilities/default.json`.
//!
//! The UI calls only our own `#[tauri::command]`s, which plugin ACLs do not
//! gate, so the capability file grants nothing beyond `core:default` (see
//! `ipc_commands.rs`). A permission added here widens what the webview can do on
//! its own; this test makes that a deliberate change rather than a drive-by.
//!
//! Test-only access (the WebDriver plugin, `e2e_*` commands) never belongs in
//! this file: it goes inline in `tauri.e2e.conf.json`.

use std::path::Path;

fn default_capability() -> serde_json::Value {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("capabilities/default.json");
    let text = std::fs::read_to_string(&path).unwrap_or_else(|err| panic!("{}: {err}", path.display()));
    serde_json::from_str(&text).unwrap_or_else(|err| panic!("{}: {err}", path.display()))
}

fn strings(value: &serde_json::Value, key: &str) -> Vec<String> {
    value[key]
        .as_array()
        .unwrap_or_else(|| panic!("`{key}` is not an array"))
        .iter()
        .map(|item| {
            item.as_str()
                .unwrap_or_else(|| panic!("`{key}` holds a non-string entry: {item}"))
                .to_owned()
        })
        .collect()
}

// case: SYS-005
#[test]
fn the_default_capability_grants_only_core_default() {
    assert_eq!(strings(&default_capability(), "permissions"), ["core:default"]);
}

// case: SYS-005
#[test]
fn the_default_capability_applies_only_to_the_main_window() {
    assert_eq!(strings(&default_capability(), "windows"), ["main"]);
}

// case: SYS-005
#[test]
fn no_other_capability_file_exists() {
    // A second file in the directory would be loaded alongside this one and
    // could grant what the assertions above forbid.
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("capabilities");
    let files: Vec<_> = std::fs::read_dir(&dir)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(files, ["default.json"]);
}
