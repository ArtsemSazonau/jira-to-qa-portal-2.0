# PERF-008 — [Performance][Login item] Toggle on and off, then log in -> plist correct, login not visibly delayed

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | [`autostart.rs`](../../../../src-tauri/src/autostart.rs) |
| Feature | [Launch at login](../../../docs/features/04-launch-at-login.md) |

## What we measure and why

That the login item written by the app's own toggle is correct, survives an off/on cycle, and that a
login start costs the user nothing they can notice.

## Setup

- Release bundle installed in `/Applications`, launched by hand.
- Turn the toggle on **from the app's own window**. Registering by hand through `launchctl` tests
  launchd, not the feature.

The login agent is named after the app, **not** the bundle identifier:
`~/Library/LaunchAgents/jira-to-qa-portal.plist`, launchd label `jira-to-qa-portal`.
`tauri-plugin-autostart` derives both from `productName`.

## Procedure

With the toggle on:

```bash
ls -la ~/Library/LaunchAgents/ | grep -i "qa-portal"
plutil -p ~/Library/LaunchAgents/jira-to-qa-portal.plist

launchctl list | grep -i "qa-portal"
launchctl print "gui/$(id -u)/jira-to-qa-portal" 2>&1 | grep -E "path|program|state|properties"
```

Turn the toggle off from the window:

```bash
ls ~/Library/LaunchAgents/ | grep -i "qa-portal" || echo "correctly removed"
launchctl print "gui/$(id -u)/jira-to-qa-portal" 2>&1 | head -3
```

Turn it back on and re-check the plist. Then reboot (or log out and in) and, as soon as the desktop
is usable:

```bash
ps -o pid,lstart,etime -p "$(pgrep -f 'jira-to-qa-portal.app/Contents/MacOS' | head -1)"
log show --predicate 'eventMessage CONTAINS "jira-to-qa-portal"' --last 10m --style compact | head -20
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Plist program path | `ProgramArguments` in `plutil -p` | `/Applications/jira-to-qa-portal.app/Contents/MacOS/app`, never a `target/` path |
| Hidden flag | `ProgramArguments` | includes `--hidden` |
| Run at load | `RunAtLoad` | `true` |
| Off removes, on recreates | `ls` after each toggle | file gone after off; present again after on |
| Login to tray ready | `lstart` vs the moment the desktop became usable, and a click on the tray icon | the tray responds within 10 s of the desktop appearing, and login is not visibly delayed |

## Latest result

2026-09-20, v0.1.0: plist **`/Applications/…/MacOS/app --hidden`**, `RunAtLoad` true; off removes
the file, on recreates it — pass. **Login-to-tray time: deferred** — needs a reboot; run it together
with [LOGIN-007](../login/LOGIN-007-starts-at-login.md) … [LOGIN-009](../login/LOGIN-009-login-start-cost.md).

## Pitfalls

- Anything addressed as `dev.sazonau.jira-to-qa-portal` reports that no such file or service exists.
- In `launchctl list`, a dash instead of a PID next to `jira-to-qa-portal` is correct whenever the
  running copy was started by hand. The separate `application.dev.sazonau.jira-to-qa-portal.*` row is
  the running GUI app, unrelated to autostart.
- The **file** decides the next login; launchd rebuilds the domain from disk. A `launchctl list`
  entry that lingers after the file is gone is stale session state, not a failed disable.
- Do the off-and-on explicitly: a re-registration that silently fails to overwrite would leave
  autostart broken in a way nothing else catches.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Functional counterparts: [LOGIN-003](../login/LOGIN-003-plist-arguments.md),
  [LOGIN-009](../login/LOGIN-009-login-start-cost.md)
- Former section: §8 of the pre-catalog performance procedures
