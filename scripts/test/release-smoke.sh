#!/usr/bin/env bash
# Release smoke: the bundle that ships contains no test access, starts, shows its menu bar icon, and
# quits through it without leaving processes behind. Run after `npm run tauri build`:
#
#   npm run test:release
#
# This launches the *release* app, with the real identity: it reads and may create the real config
# (~/Library/Application Support/dev.sazonau.jira-to-qa-portal). It never touches the login item.
# Needs the Accessibility grant `npm run test:doctor` checks, to find and click the menu bar icon.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BUNDLE="$REPO_ROOT/src-tauri/target/release/bundle/macos/jira-to-qa-portal.app"
BINARY="$BUNDLE/Contents/MacOS/app"
STATE="${TMPDIR:-/tmp}/qa-portal-release-smoke"

webkit_pids() { pgrep -f 'WebKit.WebContent|WebKit.Networking|WebKit.GPU' | sort || true; }
app_pid() { pgrep -f "$BINARY" | head -1 || true; }
status_items() { # number of menu bar icons the process owns
  osascript -e "tell application \"System Events\" to count menu bar items of menu bar 2 of (first process whose unix id is $1)"
}

step_bundle_present() {
  [[ -x "$BINARY" ]] || { echo "no release bundle at $BUNDLE — run: npm run tauri build"; return 1; }
  echo "release bundle: $BUNDLE"
}

# case: SYS-008
step_feature_off() {
  # The default feature set — what a plain `tauri build` compiles — must not reach the test build's.
  local leaks
  leaks=$(cd "$REPO_ROOT/src-tauri" && cargo tree -e features | grep -E 'feature "e2e"|tauri-plugin-wdio-webdriver' || true)
  if [[ -n "$leaks" ]]; then
    echo "LEAK: the default feature set enables test access:"
    echo "$leaks"
    return 1
  fi
  echo "default features: no e2e, no WebDriver plugin"
}

# case: SYS-008
step_no_test_code() {
  # The artefact itself, whatever built it: no test-only command, no WebDriver server.
  local found=0
  for marker in e2e_snapshot wdio; do
    local n
    n=$(strings -a "$BINARY" | grep -c "$marker" || true)
    if ((n > 0)); then
      echo "LEAK: the release executable contains \"$marker\" ($n strings) — it was built with --features e2e"
      found=1
    fi
  done
  ((found == 0)) && echo "release executable: no e2e_snapshot, no wdio"
  return "$found"
}

# case: SYS-009
step_launch() {
  if [[ -n "$(app_pid)" ]]; then
    echo "a release copy is already running from target/ — quit it first"
    return 1
  fi
  if pgrep -f 'jira-to-qa-portal.app/Contents/MacOS/app' >/dev/null; then
    echo "another copy of jira-to-qa-portal is running (it shares the single-instance lock) — quit it first"
    return 1
  fi
  mkdir -p "$STATE"
  webkit_pids >"$STATE/webkit-before"
  open -a "$BUNDLE"
  for _ in $(seq 1 40); do
    [[ -n "$(app_pid)" ]] && break
    sleep 0.25
  done
  local pid
  pid=$(app_pid)
  [[ -n "$pid" ]] || { echo "the app did not start"; return 1; }
  echo "$pid" >"$STATE/pid"
  sleep 3 # let the window load, so its WebKit helpers exist
  comm -13 "$STATE/webkit-before" <(webkit_pids) >"$STATE/webkit-helpers"
  echo "started: pid $pid, $(wc -l <"$STATE/webkit-helpers" | tr -d ' ') WebKit helper(s)"
}

# case: SYS-009
step_tray_icon() {
  local pid n=0
  pid=$(cat "$STATE/pid")
  for _ in $(seq 1 20); do
    n=$(status_items "$pid" 2>/dev/null || echo 0)
    ((n >= 1)) && break
    sleep 0.25
  done
  ((n >= 1)) || { echo "no menu bar icon for pid $pid"; return 1; }
  echo "menu bar icon present"
}

# case: SYS-009
step_quit() {
  local pid
  pid=$(cat "$STATE/pid")
  osascript <<EOF
tell application "System Events" to tell (first process whose unix id is $pid)
  click menu bar item 1 of menu bar 2
  delay 0.5
  click menu item "Quit" of menu 1 of menu bar item 1 of menu bar 2
end tell
EOF
  for _ in $(seq 1 40); do
    kill -0 "$pid" 2>/dev/null || { echo "quit through the menu bar icon: pid $pid exited"; return 0; }
    sleep 0.25
  done
  echo "pid $pid still running 10 s after Quit"
  return 1
}

# case: SYS-009
step_no_leftovers() {
  sleep 2
  [[ -z "$(app_pid)" ]] || { echo "an app process is still running"; return 1; }
  local left
  left=$(comm -12 "$STATE/webkit-helpers" <(webkit_pids) || true)
  [[ -z "$left" ]] || { echo "WebKit helpers outlived the app: $left"; return 1; }
  echo "no app process, no WebKit helper left"
}

if [[ "${1:-}" == step:* ]]; then
  "step_${1#step:}"
  exit
fi

# Whatever happens, do not leave a release copy running.
trap 'pkill -f "$BINARY" 2>/dev/null || true' EXIT

self="$REPO_ROOT/scripts/test/release-smoke.sh"
run_steps "release smoke" \
  "release bundle present::$self step:bundle_present" \
  "e2e feature off by default::$self step:feature_off" \
  "no test code in the binary::$self step:no_test_code" \
  "launch::$self step:launch" \
  "menu bar icon::$self step:tray_icon" \
  "quit from the menu bar icon::$self step:quit" \
  "no leftover processes::$self step:no_leftovers"
