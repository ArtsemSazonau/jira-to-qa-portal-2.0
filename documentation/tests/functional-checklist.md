# Functional check-list

Manual verification, ordered by module. Everything here needs something an automated test cannot
have: a real menu bar, a Dock, a login cycle, a display with a different scale factor.

**Run against a release bundle installed in `/Applications`, not `tauri dev`.** Login items,
notifications and the activation-policy flip all behave differently for an unbundled dev binary.

```bash
npm run tauri build
rm -rf "/Applications/jira-to-qa-portal.app"
cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
open -a "/Applications/jira-to-qa-portal.app"
```

Confirm you are not testing a bundle left re-signed from a performance session —
[performance.md](performance.md#make-the-process-debuggable) grants `get-task-allow` so `leaks` can
attach, and that is not what ships:

```bash
codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
```

A single `Executable=…` line and no entitlements dict means the bundle is clean.

Start from a clean state so the one-time notices and the fresh-install autostart path are exercised:

```bash
rm ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal/app-config.json
rm ~/Library/LaunchAgents/jira-to-qa-portal.plist
```

Handy throughout — the PID changes on every launch, so re-run it in each new shell:

```bash
APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
```

Legend: ☐ not run · ✅ pass · ❌ fail · ⊘ not applicable

---

## Automated coverage first

Before any manual pass, these must be green:

| ☐ | Check | Command | Expected |
|---|---|---|---|
| ✅ | Rust unit + integration tests | `cd src-tauri && cargo test` | 57 passed, 0 failed |
| ✅ | Rust lint | `cd src-tauri && cargo clippy --all-targets -- -D warnings` | no warnings |
| ✅ | UI tests | `cd ui && npm test` | 14 passed, 0 failed |
| ✅ | UI type-check + build | `cd ui && npm run build` | succeeds |
| ✅ | UI lint | `cd ui && npm run lint` | no errors |
| ✅ | Dev run | `npm run tauri dev` | window opens, no panic in the log |
| ✅ | Release bundle | `npm run tauri build` | `.app` and `.dmg` produced |

**Run each command from the directory its row names**, and mind that `build` means one thing at the
repo root (`tauri build`, the whole bundle) and another in `ui/` (`tsc -b && vite build`). The
copy-paste version that cannot get this wrong, with expected output per step, is in
[the README](../../README.md#testing).

Last full pass: 2026-09-20, v0.1.0 — 57 Rust, 14 UI, clippy and oxlint clean, `.app` and `.dmg`
produced.

---

## Module: `tray.rs`

Feature doc: [tray icon and menu](../docs/features/01-tray-icon.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ✅ | T1 | Launch the app | A tray icon appears in the menu bar |
| ✅ | T2 | Left-click the tray icon | The menu opens with **Show Window**, a separator, **Quit** |
| ✅ | T3 | Right-click the tray icon | The same menu opens |
| ✅ | T4 | Choose **Show Window** while the window is visible | The window comes forward; no second window (check the Window menu / Mission Control) |
| ✅ | T5 | Choose **Show Window** while hidden | The same window reappears with its prior state |
| ✅ | T6 | Switch macOS to Dark appearance | The icon stays legible — it inverts, it does not disappear or turn into a dark blob |
| ✅ | T7 | Switch back to Light appearance | Still legible |
| ✅ | T8 | Move the window to an external display with a different scale factor | The tray icon is sharp, not blurry or doubled |
| ✅ | T9 | Quit the app | The tray icon disappears immediately |
| ☐ | T10 | Simulate tray failure: temporarily rename `icons/trayTemplate@2x.png` and rebuild | The app still starts; the log carries `could not create the tray icon … Hide-to-tray is disabled`; the window shows the "closing quits" warning |

> T10 is the only way to exercise the fallback path end to end. Restore the file afterwards.

---

## Module: `lifecycle/macos.rs` — hide/show

Feature doc: [hide to tray](../docs/features/02-hide-to-tray.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ✅ | H1 | Click the red close button | The window disappears instantly — no minimise animation, nothing lands in the Dock |
| ✅ | H2 | Immediately after H1 | The Dock icon is **gone** and the app is **not** in the ⌘-Tab switcher |
| ✅ | H3 | Immediately after H1 | The tray icon is still present |
| ✅ | H4 | `ps -p "$APP_PID"` after H1 | The process is still alive |
| ✅ | H5 | Tray → Show Window | The Dock icon returns, the app is back in ⌘-Tab, the window is focused and in front of other apps |
| ✅ | H6 | Check the window contents after H5 | Prior state intact — the same window, not a fresh one |
| ✅ | H7 | Press ⌘W with the window focused | Same as H1: hides, does not quit |
| ✅ | H8 | Click the "Hide to menu bar" button in the window | Same as H1 |
| ✅ | H9 | Hide, then show, 5 times in a row quickly | Never more than one window; the window always ends up focused and in front |
| ✅ | H10 | Hide, then check `ps -ax \| grep WebContent` | The WebKit helper is retained, as documented. Record the number of processes — **3 helpers (WebContent, GPU, Networking), 45 MB retained while hidden**; see [performance.md §3](performance.md#3-process-accounting--the-webview-is-the-bigger-half) |

---

## Module: `lib.rs` — quit paths

Feature doc: [quit handling](../docs/features/03-quit-handling.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | Q1 | Press ⌘Q with the window focused | The process exits; the tray icon disappears |
| ☐ | Q2 | App menu → Quit | Same |
| ☐ | Q3 | Tray → Quit, with the window **visible** | Same |
| ☐ | Q4 | Tray → Quit, with the window **hidden** | Same |
| ☐ | Q5 | `osascript -e 'tell application "jira-to-qa-portal" to quit'` | Same |
| ☐ | Q6 | After any quit: `pgrep -fl "qa-portal"` | Prints nothing |
| ☐ | Q7 | After any quit: `ps -ax \| grep WebContent \| grep -v grep` | No orphaned webview processes |
| ☐ | Q8 | After any quit: Console.app | No crash report for the app |
| ☐ | Q9 | ⌘Q **while the window is hidden** (focus the app via the tray first) | Exits cleanly |

> Q1 is the single most important check in this document. If ⌘Q hides instead of quitting, the
> `ExitRequested`-before-`CloseRequested` assumption has broken — see
> [quit handling](../docs/features/03-quit-handling.md#if-the-ordering-ever-changes).

---

## Module: `autostart.rs`

Feature doc: [launch at login](../docs/features/04-launch-at-login.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | A1 | Fresh install, first launch | The toggle reads **off**; no plist in `~/Library/LaunchAgents/` |
| ☐ | A2 | Turn the toggle **on** | `~/Library/LaunchAgents/jira-to-qa-portal.plist` appears |
| ☐ | A3 | `plutil -p` that plist | `ProgramArguments` points at `/Applications/…`, **not** `target/debug`, and includes `--hidden` |
| ☐ | A4 | System Settings → General → Login Items & Extensions | The app is listed under **Allow in the Background** (not *Open at Login*) |
| ☐ | A5 | `launchctl print "gui/$(id -u)/jira-to-qa-portal"` | The job is loaded |
| ☐ | A6 | Quit and relaunch with the toggle on | The toggle still reads **on**; exactly one plist, not two |
| ☐ | A7 | Log out and back in (or reboot) | The app starts automatically |
| ☐ | A8 | Immediately after A7 | It started **hidden**: tray icon present, no window, no Dock icon |
| ☐ | A9 | Time A7 | The app is ready (tray responds) without visibly delaying the login sequence. Record the time |
| ☐ | A10 | Turn the toggle **off** | The plist is gone: `ls ~/Library/LaunchAgents \| grep -i qa-portal` finds nothing |
| ☐ | A11 | Reboot after A10 | The app does **not** start |
| ☐ | A12 | With the toggle off, add the app manually in System Settings → Login Items, then restart the app | The toggle reads **on** — it reflects reality, not the stale stored value |
| ☐ | A13 | With the toggle on, delete the plist by hand, then restart the app | The toggle reads **on** and the plist is re-created |
| ☐ | A14 | Toggle on in `tauri dev` | The log warns `registered a login item for a development binary` |

---

## Module: single instance / reopen

Feature doc: [single instance and reopen](../docs/features/05-single-instance.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | S1 | With the app running and **hidden**, launch it from Finder | The existing window appears, focused |
| ☐ | S2 | After S1 | Exactly one tray icon, one process |
| ☐ | S3 | With the app running and **visible**, launch it from Spotlight | The existing window comes forward; no second window |
| ☐ | S4 | `open -a "/Applications/jira-to-qa-portal.app"` while hidden | Window appears |
| ☐ | S5 | Run the binary directly (`"/Applications/jira-to-qa-portal.app/Contents/MacOS/app"`) while an instance runs | The second process exits; the first reveals its window |
| ☐ | S6 | Repeat S1 five times quickly | Still exactly one window and one tray icon |

> S1 exercises `RunEvent::Reopen`; S5 exercises the single-instance plugin. They are different code
> paths — running only one of them proves half the feature.

---

## Module: `notify.rs`

Feature doc: [one-time notifications](../docs/features/06-notifications.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | N1 | Fresh install, first launch | A notification offers launch at login |
| ☐ | N2 | Fresh install, first window close | A notification says the app is still running in the menu bar |
| ☐ | N3 | Close the window a second time | **No** notification |
| ☐ | N4 | Relaunch the app (config now exists) | **No** first-run notification |
| ☐ | N5 | Delete `app-config.json`, relaunch | Both notices fire again |
| ☐ | N6 | Fresh install with autostart already registered externally | The first-run prompt is **skipped** |
| ☐ | N7 | Turn on Do Not Disturb, then trigger a notice | The app does not hang, crash or fail to hide; a `warn` appears in the log |
| ☐ | N8 | Deny notifications for the app in System Settings, then trigger a notice | Same as N7 |

> If N1/N2 do not appear under `tauri dev`, that is expected — macOS wants a registered bundle
> identifier. Retest against the `/Applications` bundle before treating it as a bug.

---

## Module: `config.rs`

Feature doc: [app configuration](../docs/features/07-app-config.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | C1 | First launch | `~/Library/Application Support/dev.sazonau.jira-to-qa-portal/app-config.json` is created |
| ☐ | C2 | Toggle autostart on, quit, inspect the file | `"autostart_enabled": true` |
| ☐ | C3 | Corrupt the file (`echo "{" > app-config.json`), relaunch | The app starts with defaults; the log carries a parse warning |
| ☐ | C4 | Delete the file, relaunch | The app starts; the file is recreated |
| ☐ | C5 | Add an unknown key by hand, relaunch | The app starts and ignores it |
| ☐ | C6 | Look for stray files in the config dir after several launches | No `.json.tmp` left behind |
| ☐ | C7 | Make the config dir read-only, toggle autostart | The toggle still works against the OS; the log carries `could not persist config` and the app does not crash |

---

## Module: UI

Feature doc: [settings UI](../docs/features/08-settings-ui.md)

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | U1 | Open the window | Heading, subtitle, the Launch at login row, the hide button and its explanation |
| ☐ | U2 | Immediately on open | The toggle is briefly disabled, then becomes interactive |
| ☐ | U3 | Switch macOS to Dark appearance with the window open | Colours follow; text stays readable; the switch is still visible in both states |
| ☐ | U4 | Resize the window narrow | The layout does not overflow horizontally |
| ☐ | U5 | Tab to the switch and press Space | It toggles — keyboard operation works |
| ☐ | U6 | With VoiceOver on, focus the switch | It is announced as a switch named "Launch at login" with its on/off state |
| ☐ | U7 | Run `cd ui && npm run dev` and open `localhost:1420` in a browser | The "desktop backend is not available" message appears instead of a dead toggle |
| ☐ | U8 | Retina display | Text and the switch are sharp |

---

## Cross-cutting

| ☐ | # | Check | Expected |
|---|---|---|---|
| ☐ | X1 | Sleep the Mac with the app hidden for ≥1 hour, then wake | Same PID, `etime` spans the sleep, the tray still responds, the window still shows correctly |
| ☐ | X2 | `log show --predicate 'process == "app"' --last 2h --style compact` after X1 | Nothing alarming during sleep/wake |
| ☐ | X3 | Move the app from `/Applications` to `~/Desktop` with autostart on, then relaunch | The stale registration is re-asserted (A13 behaviour); the log is not silent about it |
| ☐ | X4 | Full pass with the app started by the login item rather than manually | Every check above still behaves the same once the window is shown |

---

## Recording results

Copy the tables into the PR description and fill the ☐ column. For anything that fails, note the
observed behaviour and the relevant log lines — the lifecycle logs one line per decision, listed in
[the README](../../README.md#logs).
