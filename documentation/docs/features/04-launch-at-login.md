# 4. Launch at login

A persisted toggle that registers the app to start when the user logs in to macOS. Off by default;
the app never enrols itself.

## Behaviour

- A switch in the app window reads **the real OS registration**, not a stored guess.
- Turning it on writes `~/Library/LaunchAgents/dev.sazonau.jira-to-qa-portal.plist`; turning it off
  removes it.
- The entry appears under **System Settings → General → Login Items & Extensions → Allow in the
  Background**.
- A login-item launch starts **hidden** — menu bar icon only, no window, no Dock icon.
- On a fresh install the toggle is off, and a one-time notification offers the opt-in.

## Why "Allow in the Background", not "Open at Login"

`tauri-plugin-autostart` offers two mechanisms. `MacosLauncher::LaunchAgent` was chosen:

| | LaunchAgent | AppleScript |
|---|---|---|
| Mechanism | Writes a `~/Library/LaunchAgents/*.plist` | Drives System Events to add a login item |
| Permission prompt | None | Automation permission prompt |
| Where it appears | *Allow in the Background* | *Open at Login* |

The absence of an Automation prompt is worth the less obvious location — a permission dialog on
first toggle would be a poor first-run experience for a setting the user just asked for.

**Look in the right place when verifying.** The entry is genuinely not under *Open at Login*.

## Starting hidden

The registration passes an extra argument:

```rust
tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"]))
```

At startup, `policy::launched_hidden(std::env::args())` looks for it. When present, the window is
hidden and the activation policy drops to `Accessory` before anything is drawn.

The window is configured `visible: true` in `tauri.conf.json` and hidden at runtime instead —
because a config-level `visible: false` would also hide it on a normal manual launch, which is not
what anyone wants.

## Reconciliation: the OS is the source of truth

The user can add or remove the login item in System Settings without the app knowing. The toggle must
therefore reflect reality on startup rather than replaying a stored value.

`policy::reconcile_autostart(stored, os_registered)` decides, and returns three things: what the UI
should show, what to write to the config, and what to change in the OS.

| Stored | OS registered | Toggle shows | Config rewritten | OS changed | Why |
|---|---|---|---|---|---|
| *(no file)* | no | off | off | — | Fresh install, the documented default. |
| *(no file)* | yes | **on** | on | — | Leftover registration from a previous install; adopt it. |
| off | no | off | — | — | Agreement. |
| on | yes | on | — | — | Agreement — and no double-registration on restart. |
| off | **yes** | **on** | on | — | Added manually in System Settings. Reality wins; the user's own entry is never deleted. |
| on | **no** | on | — | **register** | The opt-in survived but the registration did not — a plist pointing at a path that moved, say. Re-assert rather than silently drop. |

The asymmetry in the last two rows is deliberate. An *external opt-in* is honoured; an *explicit
opt-in whose registration vanished* is restored. Neither ever surprises the user by undoing something
they did.

If the plugin cannot report the registration state at all, the stored value is trusted and nothing is
changed — guessing "not registered" would make the app re-register on every launch.

## The dev-path hazard

Toggling this on in `tauri dev` registers a login item pointing at `target/debug/app`, which stops
existing the moment you `cargo clean`. The app logs a warning when it notices:

```
WARN registered a login item for a development binary at …/target/debug/app;
     it will break as soon as the build directory changes.
     Test autostart against a bundle installed in /Applications.
```

Always verify autostart against a `tauri build` bundle in `/Applications`.

## Implementation

| Piece | File |
|---|---|
| Reconciliation logic (pure) | `src-tauri/src/lifecycle/policy.rs` — `reconcile_autostart` |
| Plugin calls, dev-path warning | `src-tauri/src/autostart.rs` |
| Startup wiring | `src-tauri/src/lib.rs` — `setup` |
| Hidden-launch detection (pure) | `src-tauri/src/lifecycle/policy.rs` — `launched_hidden` |
| Hidden start sequence | `src-tauri/src/lifecycle/macos.rs` — `start_hidden` |
| Commands | `src-tauri/src/ipc_commands.rs` — `get_autostart_enabled`, `set_autostart_enabled` |
| UI | `ui/src/App.tsx`, `ui/src/lib/ipc.ts` |

Writing order matters in `set_enabled`: the OS registration is changed **first**, and the preference
is only persisted once that succeeded. A failed registration can therefore never leave the stored
value claiming something untrue.

## Verifying it by hand

```bash
# After enabling the toggle
plutil -p ~/Library/LaunchAgents/dev.sazonau.jira-to-qa-portal.plist
launchctl print "gui/$(id -u)/dev.sazonau.jira-to-qa-portal"

# ProgramArguments must point at /Applications/..., not target/debug
# and must include --hidden

# After disabling
ls ~/Library/LaunchAgents/ | grep -i qa-portal || echo "correctly removed"
```

## Tests

| Test | File |
|---|---|
| `a_fresh_install_with_no_registration_is_off` | `policy.rs` |
| `a_fresh_install_adopts_an_existing_registration` | `policy.rs` |
| `agreement_needs_no_correction_in_either_direction` | `policy.rs` |
| `registered_behind_our_back_wins_over_a_stored_off` | `policy.rs` |
| `a_stored_opt_in_with_a_vanished_registration_is_re_asserted` | `policy.rs` |
| `reconciliation_never_asks_to_register_what_is_already_registered` | `policy.rs` |
| `the_hidden_flag_marks_a_login_item_launch` | `policy.rs` |
| `a_similar_looking_argument_does_not_count` | `policy.rs` |
| `autostart_across_a_fresh_install_opt_in_and_restart` | `tests/lifecycle_policy.rs` |
| `autostart_reflects_a_login_item_added_in_system_settings` | `tests/lifecycle_policy.rs` |
| `autostart_restores_an_opt_in_whose_registration_disappeared` | `tests/lifecycle_policy.rs` |
| `the_toggle_round_trips_through_the_config_file` | `tests/lifecycle_policy.rs` |
| `registers the login item when switched on` | `ui/src/App.test.tsx` |
| `removes the login item when switched off` | `ui/src/App.test.tsx` |
| `reverts and explains when registration fails` | `ui/src/App.test.tsx` |

Reboot-dependent checks are in
[the functional checklist](../../tests/functional-checklist.md#module-autostartrs).
