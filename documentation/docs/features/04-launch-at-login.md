# 4. Launch at login

A persisted toggle that registers the app to start when the user logs in to macOS. Off by default;
the app never enrols itself.

## Behaviour

- A switch in the app window reads **the real OS registration**, not a stored guess.
- Turning it on writes `~/Library/LaunchAgents/jira-to-qa-portal.plist`; turning it off
  removes it.
- **The agent is named after `productName`, not the bundle identifier.** The file is
  `jira-to-qa-portal.plist` and the launchd label is `jira-to-qa-portal` — there is no
  `dev.sazonau.` prefix anywhere in the registration, though the config directory does use the
  identifier. Addressing it as `dev.sazonau.jira-to-qa-portal` gets "no such file or service",
  which reads like a broken registration and is not one.
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
plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist
launchctl print "gui/$(id -u)/jira-to-qa-portal"

# ProgramArguments must point at /Applications/..., not target/debug
# and must include --hidden

# After disabling
ls ~/Library/LaunchAgents/ | grep -i qa-portal || echo "correctly removed"
```

## Tests

Every case for this feature is in the test catalog — the [`LOGIN` cases](../../tests/catalog.md#launch-at-login--login). The automated tests that
carry each ID, with their files, are listed in the generated
[inventory](../../tests/inventory.md); `npm run test:catalog` keeps the two in step.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| [LOGIN-001](../../tests/cases/login/LOGIN-001-fresh-install-off.md) | First launch -> the toggle reads off and no plist exists | automated | unit, component, e2e |
| [LOGIN-002](../../tests/cases/login/LOGIN-002-toggle-on-creates-plist.md) | Turn the toggle on -> ~/Library/LaunchAgents/jira-to-qa-portal.plist appears | automated | component, e2e |
| [LOGIN-003](../../tests/cases/login/LOGIN-003-plist-arguments.md) | Inspect the plist -> ProgramArguments point into /Applications and include --hidden | partial | e2e, manual |
| [LOGIN-004](../../tests/cases/login/LOGIN-004-system-settings-listing.md) | Open Login Items -> the app is listed under Allow in the Background | manual | manual |
| [LOGIN-005](../../tests/cases/login/LOGIN-005-launchctl-loaded.md) | launchctl print the job -> it is loaded | manual | manual |
| [LOGIN-006](../../tests/cases/login/LOGIN-006-survives-restart.md) | Quit and relaunch with the toggle on -> still on, exactly one plist | automated | unit, e2e |
| [LOGIN-007](../../tests/cases/login/LOGIN-007-starts-at-login.md) | Log out and back in (or reboot) -> the app starts automatically | manual | manual |
| [LOGIN-008](../../tests/cases/login/LOGIN-008-starts-hidden.md) | Start by the login item -> starts hidden: tray icon, no window, no Dock icon | partial | unit, manual |
| [LOGIN-009](../../tests/cases/login/LOGIN-009-login-start-cost.md) | Time a login start -> app ready without visibly delaying login | manual | manual, perf |
| [LOGIN-010](../../tests/cases/login/LOGIN-010-toggle-off-removes-plist.md) | Turn the toggle off -> the plist is removed | automated | component, e2e |
| [LOGIN-011](../../tests/cases/login/LOGIN-011-off-survives-reboot.md) | Reboot after turning it off -> the app does not start | manual | manual |
| [LOGIN-012](../../tests/cases/login/LOGIN-012-external-registration-wins.md) | Added in System Settings while the toggle is off, then restart -> toggle reads on | partial | unit, component, e2e, manual |
| [LOGIN-013](../../tests/cases/login/LOGIN-013-deleted-plist-recreated.md) | Plist deleted by hand while on, then restart -> toggle reads on and the plist is re-created | automated | unit, e2e |
| [LOGIN-014](../../tests/cases/login/LOGIN-014-dev-path-warning.md) | Toggle on in tauri dev -> the log warns about a development binary | automated | e2e |
| LOGIN-015 | Manual launch (no --hidden, or a look-alike argument) -> the window opens | automated | unit |
| LOGIN-016 | Fresh install with a login item already registered -> toggle reads on, nothing re-registered | automated | unit |

`manual` and `partial` cases are run by hand before a release, from their case files; see
[Before a release](../../tests/README.md#before-a-release).

