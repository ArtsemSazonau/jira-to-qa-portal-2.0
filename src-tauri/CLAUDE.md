# src-tauri — Tauri backend

Rust core: app lifecycle, tray, IPC, and (later) the scheduler, Jira client, sidecar bridge and LLM
report generation. **This file covers the backend only.** The frontend has its own conventions;
nothing here applies to `ui/`.

Read [../CLAUDE.md](../CLAUDE.md) for project-wide context and [../PLAN.md](../PLAN.md) §2–3 for the
target architecture.

## Running cargo

`cargo` needs a writable `~/.cargo`, which agent sandboxes block. **Run it in your own terminal.**

If you must run it inside a sandbox, point `CARGO_HOME` at a writable directory seeded from the real
one, so only genuinely new crates need the network:

```bash
export CH=$TMPDIR/cargo-home
mkdir -p "$CH" && cp -R ~/.cargo/registry "$CH"/
CARGO_HOME=$CH cargo test
```

A project-local `CARGO_HOME` does **not** work: some crates ship a `.vscode/settings.json` in their
published source, and sandboxes block writing that path, which aborts `cargo fetch` mid-unpack.

`npm run tauri build` completes the `.app` but fails on the `.dmg` step under a sandbox —
`bundle_dmg.sh` needs `hdiutil`. The `.app` in `target/release/bundle/macos/` is still valid.

## Module layout and the one rule that matters

```
src/
├── lib.rs              builder wiring only — plugins, setup, event handlers
├── config.rs           non-secret config: plain serde struct → JSON
├── lifecycle/
│   ├── mod.rs          AppState (runtime atomics + config), MAIN_WINDOW
│   ├── policy.rs       PURE decisions — no Tauri imports, ever
│   └── macos.rs        #[cfg(target_os = "macos")] adapter — executes, never decides
├── tray.rs             menu bar icon + menu
├── autostart.rs        login item registration and reconciliation
├── notify.rs           one-time notifications
└── ipc_commands.rs     #[tauri::command] bridge to the UI
```

**The rule: decisions go in `policy.rs`, platform calls go in the adapter.** `policy.rs` has no
Tauri imports, so its logic is testable without a window or `tauri::test::mock_app`. If you find
yourself writing a branch in `macos.rs`, move the condition into `decide()` and give it a test.

Every lifecycle event — close button, ⌘Q, tray Quit, tray click, second instance, Cocoa reopen —
routes through one function:

```rust
policy::decide(trigger, state) -> Action
```

Adding a trigger means adding a `Trigger` variant, a `decide` arm and a test. Adding a behaviour
means adding an `Action` variant and one arm in `macos::apply`.

## Adding a plugin

1. `Cargo.toml` — put desktop-only plugins under the target gate, so a future mobile target still
   compiles:

   ```toml
   [target.'cfg(any(target_os = "macos", windows, target_os = "linux"))'.dependencies]
   tauri-plugin-x = "2"
   ```

2. `lib.rs` — register inside the `#[cfg(desktop)]` block. **`tauri-plugin-single-instance` must be
   registered first**, per its docs.

3. `capabilities/default.json` — **only if the frontend calls the plugin's JS API directly.** It
   currently grants `core:default` and nothing else, because every privileged operation happens in
   Rust and the UI only calls our own commands, which are not gated by plugin ACLs. Keep new work on
   the Rust side and this file stays as small as it is.

   Note `core:default` already includes `core:tray:default` and `core:menu:default`. It does *not*
   include `core:window:allow-hide`/`allow-show`/`allow-set-focus` or
   `core:app:allow-set-dock-visibility` — none of which are needed while Rust owns the window.

## Adding an IPC command

```rust
// ipc_commands.rs
#[tauri::command]
pub fn my_command(app: AppHandle, state: State<'_, AppState>) -> Result<T, String> { … }
```

Then add it to `tauri::generate_handler![…]` in `lib.rs` **and** add a typed wrapper in
`ui/src/lib/ipc.ts`. Components never call `invoke` directly.

Errors must be `Result<_, String>`: `tauri::Error` is not `Serialize`. Argument names cross the
boundary in camelCase from JS and arrive as the Rust parameter name.

## macOS gotchas this codebase already handles

Do not re-discover these the hard way.

- **⌘Q closes windows on its way out.** A naive `CloseRequested → prevent_close()` makes the app
  unquittable. `RunEvent::ExitRequested` fires *before* the windows get their close events, so it
  sets `is_quitting`, and the close that follows is allowed through. Never prevent `ExitRequested`.
- **A closed window is destroyed, not hidden**, and Tauri does not exit when the last one goes.
  Allowing a close without a way to rebuild the window leaves a live process with no UI. That is why
  the no-tray fallback quits instead of merely closing.
- **`RunEvent::Reopen`, not single-instance**, is what fires when an already-running app is launched
  again from Finder or Spotlight — macOS activates the existing process rather than starting a
  second one. The single-instance plugin only covers launching the binary directly, which is what
  the dev loop does. Both are wired; you need both.
- **Activation policy must flip to `Regular` before `show()`**, or an Accessory app's window can
  come up behind whatever is in front.
- **`skipTaskbar` is a no-op on macOS.** Use `ActivationPolicy::Accessory` to leave the Dock and
  ⌘-Tab.
- **The tray is built in `setup`, not declared in `tauri.conf.json`.** A config-declared tray is
  created inside `App::build`, where a failure aborts startup; the spec requires that failure to be
  survivable. `app.trayIcon` is therefore deliberately absent from the config — adding it would
  create a *second* tray icon.
- **The tray icon must be a template image** — black on transparent, `icon_as_template(true)`, so
  macOS recolours it for light and dark menu bars. `tray-icon` renders it at a fixed 18pt height, so
  36px is the correct source size. Regenerate with `python3 scripts/generate-tray-icon.py`.
- **`tauri::include_image!` resolves relative to `CARGO_MANIFEST_DIR`** (this directory) and embeds
  raw pixels in the binary — keep the image small.
- **Notifications generally need a registered bundle identifier.** They fail silently under
  `tauri dev`. Every call site logs and carries on; never let one block a hide or a startup.

## Config and state

- **Non-secret config** — `config.rs`, a plain serde struct written as JSON to `app_config_dir()`.
  This is a deliberate deviation from PLAN.md §2, which names `tauri-plugin-store`: the store is
  reached through `AppHandle`, so testing "no store present returns the default" would need a mock
  app. Three booleans do not justify that. When the schedule and platform mappings land, swapping
  `config.rs` for the plugin is a contained change — nothing outside it sees more than
  `load`/`save`.
- **Runtime state** — `AppState`, registered with `app.manage()`. Atomics, not a mutex, because
  they are read on the event-loop thread on every window event.
- **Secrets** — the system keychain via `keyring-rs`, not yet implemented. Never in `config.rs`.

## Tests

```bash
cargo test                              # 57 tests
cargo clippy --all-targets -- -D warnings
```

Split by kind, on purpose:

- **`#[cfg(test)]` inline** (`policy.rs`, `config.rs`, `lifecycle/mod.rs`) — exhaustive case-by-case
  coverage of the pure logic.
- **`tests/lifecycle_policy.rs`** — the same public API driven from *outside* the crate, walking
  whole scenarios (a ⌘Q, a close-then-reopen). This also proves the surface the adapter depends on is
  actually public. Note that integration tests link only against the crate and its
  `[dev-dependencies]`, so `tauri` types cannot be named there — a useful constraint, since it means
  nothing testable from that file can depend on the Tauri runtime.

Anything needing a live window belongs in the manual checklist at
[../documentation/tests/functional-checklist.md](../documentation/tests/functional-checklist.md),
not in a test that will be skipped or flake.

## Naming

The Cargo package is `app` and the library is `app_lib` (scaffold defaults), so the built executable
is `jira-to-qa-portal.app/Contents/MacOS/app`. Integration tests import from `app_lib`. The bundle
identifier is `dev.sazonau.jira-to-qa-portal`.
