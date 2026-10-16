# INST-005 — [Single instance][Second process] Run the binary directly while an instance runs -> the second exits, the first reveals its window

| | |
|---|---|
| Status | `automated` |
| Levels | unit, e2e |
| Module | [`lib.rs`](../../../../src-tauri/src/lib.rs) |
| Feature | [Single instance and reopen](../../../docs/features/05-single-instance.md) |

## Purpose

Launching the executable directly does start a second process. The single-instance plugin must hand off to the first and exit.

## Preconditions

- A release bundle is installed in `/Applications` and carries no debug entitlements. Login items, notifications and the activation-policy flip behave differently for an unbundled `tauri dev` binary, so never run this against one. From the repo root:

  ```bash
  npm run tauri build
  rm -rf "/Applications/jira-to-qa-portal.app"
  cp -R "src-tauri/target/release/bundle/macos/jira-to-qa-portal.app" /Applications/
  codesign -d --entitlements - /Applications/jira-to-qa-portal.app 2>&1 | tail -2
  ```

  The last command must print a single `Executable=…` line and no entitlements dict. Anything else means the bundle was re-signed for a performance session; rebuild it.
- The app is running, launched by hand (not by the login item):

  ```bash
  open -a "/Applications/jira-to-qa-portal.app"
  APP_PID=$(pgrep -f "jira-to-qa-portal.app/Contents/MacOS" | head -1); echo "APP_PID=$APP_PID"
  ```
- The window is hidden: click its red close button once. The Dock icon disappears and the tray icon stays.

## Steps

1. Run `"/Applications/jira-to-qa-portal.app/Contents/MacOS/app"` in a terminal.
2. Run `pgrep -fl "jira-to-qa-portal.app/Contents/MacOS"`.

## Expected result

- The command in the terminal returns on its own (the second process exits).
- The first instance's window appears.
- `pgrep` prints one line.

## Automated by

| Test | File |
|---|---|
| `a_second_instance_reveals_the_hidden_window` | [`src-tauri/src/lifecycle/policy.rs`](../../../../src-tauri/src/lifecycle/policy.rs) |
| `relaunching_from_finder_reveals_the_hidden_window` | [`src-tauri/tests/lifecycle_policy.rs`](../../../../src-tauri/tests/lifecycle_policy.rs) |
| `Run the binary directly while an instance runs -> the second exits, the first reveals its window` | [`e2e/specs/single-instance.e2e.ts`](../../../../e2e/specs/single-instance.e2e.ts) |

## Related

- Feature: [Single instance and reopen](../../../docs/features/05-single-instance.md)
- Module: [`src-tauri/src/lib.rs`](../../../../src-tauri/src/lib.rs)
- Catalog: [INST-005](../../catalog.md)
- Former checklist ID: S5
