//! Non-secret app config, persisted as JSON.
//!
//! Deliberately a plain serde struct rather than `tauri-plugin-store`: every
//! function here is reachable without an `AppHandle`, so the persistence rules
//! (missing file, corrupt file, round-trip) are unit-testable against a tempdir.
//! When the sync schedule and platform mappings land this is the module to swap
//! for the plugin — the rest of the app only sees `load`/`save`.
//!
//! Secrets never live here. Jira tokens and the QA Portal login belong in the
//! system keychain (`keyring-rs`), per PLAN.md §2.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// File name written inside the platform config dir.
pub const CONFIG_FILE_NAME: &str = "app-config.json";

/// Everything the lifecycle feature needs to remember across restarts.
///
/// `#[serde(default)]` means a config file written by an older build (or one
/// hand-edited to remove a key) still loads — missing keys fall back to the
/// documented default rather than failing the whole read.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "snake_case")]
pub struct AppConfig {
    /// Whether the user has asked the app to launch at login. Default off — a
    /// fresh install must not enrol itself.
    pub autostart_enabled: bool,
    /// Whether the "still running in the menu bar" notice has been shown.
    pub first_close_notice_shown: bool,
    /// Whether the first-run launch-at-login prompt has been shown.
    pub first_run_prompt_shown: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("config io error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("config parse error at {path}: {source}")]
    Parse {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
}

/// Full path of the config file inside `dir`.
pub fn config_path(dir: &Path) -> PathBuf {
    dir.join(CONFIG_FILE_NAME)
}

/// Read the config, distinguishing "not there yet" from "there but broken".
///
/// A missing file is not an error: it is a fresh install, and the caller gets
/// `Ok(None)` so it can tell that apart from a stored all-false config. That
/// distinction is what [`crate::lifecycle::policy::reconcile_autostart`] uses to
/// decide whether to adopt the OS registration state or re-assert its own.
pub fn try_load(path: &Path) -> Result<Option<AppConfig>, ConfigError> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(source) if source.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(source) => {
            return Err(ConfigError::Io {
                path: path.to_path_buf(),
                source,
            })
        }
    };

    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|source| ConfigError::Parse {
            path: path.to_path_buf(),
            source,
        })
}

/// Read the config, falling back to defaults for anything that goes wrong.
///
/// Startup must never abort because config could not be read — a corrupt file
/// is logged and the app comes up with defaults. Use [`try_load`] where the
/// distinction matters.
pub fn load(path: &Path) -> AppConfig {
    match try_load(path) {
        Ok(Some(config)) => config,
        Ok(None) => {
            log::info!("no config at {}, using defaults", path.display());
            AppConfig::default()
        }
        Err(err) => {
            log::warn!("{err}; falling back to defaults");
            AppConfig::default()
        }
    }
}

/// Write the config, creating the parent directory if needed.
///
/// Writes to a sibling temp file and renames, so an interrupted write cannot
/// leave a half-written file that the next startup would report as corrupt.
pub fn save(path: &Path, config: &AppConfig) -> Result<(), ConfigError> {
    let io_err = |source: io::Error| ConfigError::Io {
        path: path.to_path_buf(),
        source,
    };

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(io_err)?;
    }

    let json = serde_json::to_vec_pretty(config).map_err(|source| ConfigError::Parse {
        path: path.to_path_buf(),
        source,
    })?;

    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, &json).map_err(io_err)?;
    fs::rename(&tmp, path).map_err(io_err)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn default_is_all_off() {
        let config = AppConfig::default();
        assert!(!config.autostart_enabled);
        assert!(!config.first_close_notice_shown);
        assert!(!config.first_run_prompt_shown);
    }

    #[test]
    fn reading_with_no_store_present_returns_the_default() {
        let dir = tempdir().unwrap();
        let path = config_path(dir.path());

        assert_eq!(try_load(&path).unwrap(), None);
        assert_eq!(load(&path), AppConfig::default());
    }

    #[test]
    fn writing_then_reading_returns_the_same_value() {
        let dir = tempdir().unwrap();
        let path = config_path(dir.path());

        let written = AppConfig {
            autostart_enabled: true,
            first_close_notice_shown: true,
            first_run_prompt_shown: false,
        };
        save(&path, &written).unwrap();

        assert_eq!(try_load(&path).unwrap(), Some(written));
        assert_eq!(load(&path), written);
    }

    #[test]
    fn save_creates_missing_parent_directories() {
        let dir = tempdir().unwrap();
        let path = config_path(&dir.path().join("nested").join("deeper"));

        save(&path, &AppConfig::default()).unwrap();

        assert!(path.exists());
    }

    #[test]
    fn save_leaves_no_temp_file_behind() {
        let dir = tempdir().unwrap();
        let path = config_path(dir.path());

        save(&path, &AppConfig::default()).unwrap();

        let leftovers: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .filter(|name| name != CONFIG_FILE_NAME)
            .collect();
        assert!(leftovers.is_empty(), "unexpected files: {leftovers:?}");
    }

    #[test]
    fn a_corrupt_file_is_an_error_for_try_load_but_defaults_for_load() {
        let dir = tempdir().unwrap();
        let path = config_path(dir.path());
        fs::write(&path, b"{ this is not json").unwrap();

        assert!(matches!(try_load(&path), Err(ConfigError::Parse { .. })));
        assert_eq!(load(&path), AppConfig::default());
    }

    #[test]
    fn unknown_and_missing_keys_do_not_break_the_read() {
        let dir = tempdir().unwrap();
        let path = config_path(dir.path());
        // Only one of the three keys, plus a key from a hypothetical newer build.
        fs::write(
            &path,
            br#"{"autostart_enabled": true, "sync_interval_minutes": 30}"#,
        )
        .unwrap();

        let config = try_load(&path).unwrap().unwrap();
        assert!(config.autostart_enabled);
        assert!(!config.first_close_notice_shown);
        assert!(!config.first_run_prompt_shown);
    }

    #[test]
    fn config_path_appends_the_file_name() {
        assert_eq!(
            config_path(Path::new("/tmp/example")),
            PathBuf::from("/tmp/example").join(CONFIG_FILE_NAME)
        );
    }
}
