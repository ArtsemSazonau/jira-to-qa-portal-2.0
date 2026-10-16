#!/usr/bin/env bash
# Checks what the end-to-end stage needs on this Mac, and says how to fix whatever is missing.
# Run by `npm run test:doctor` and as the first step of `npm run test:regression`.
#
# Exits non-zero if any required check fails. Every check runs, so one pass lists every problem.
#
#   --before-build   skip the "test build present" check — for `test:regression`, which builds it next
set -uo pipefail
before_build=0
[[ "${1:-}" == --before-build ]] && before_build=1
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$REPO_ROOT/e2e"
APP_BINARY="$REPO_ROOT/src-tauri/target/debug/bundle/macos/jira-to-qa-portal-e2e.app/Contents/MacOS/app"

if [[ -t 1 ]]; then ok=$'\e[32m✓\e[0m'; bad=$'\e[31m✗\e[0m'; else ok='ok'; bad='MISSING'; fi
failures=0

check() { # check "<what>" "<fix>" <command...>
  local what=$1 fix=$2
  shift 2
  if "$@" >/dev/null 2>&1; then
    printf '  %s %s\n' "$ok" "$what"
  else
    printf '  %s %s\n      fix: %s\n' "$bad" "$what" "$fix"
    failures=$((failures + 1))
  fi
}

full_xcode() { [[ "$(xcode-select -p)" == *.app/Contents/Developer ]] && xcodebuild -version; }
e2e_deps() { [[ -x "$E2E/node_modules/.bin/wdio" && -x "$E2E/node_modules/.bin/appium" ]]; }
mac2_driver() { (cd "$E2E" && node_modules/.bin/appium driver list --installed --json) | grep -q '"mac2"'; }
# Both probes ask System Events, so the first must pass for the second to mean anything.
automation() { osascript -e 'tell application "System Events" to get name'; }
# `UI elements enabled` reads the Accessibility grant of the process asking — this terminal.
accessibility() { [[ "$(osascript -e 'tell application "System Events" to get UI elements enabled')" == true ]]; }
# Any checkout's test build: they share the identity, the single-instance lock and port 4445.
not_running() { ! pgrep -f 'jira-to-qa-portal-e2e.app/Contents/MacOS/app'; }
port_free() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN; }

# Launch Services flags bundles in temporary directories (`in-temp-dir`) and will not resolve their
# identifier, so Appium cannot find the test build of a checkout under /tmp.
not_in_temp_dir() { case "$(cd "$REPO_ROOT" && pwd -P)/" in /private/tmp/* | /tmp/* | /private/var/folders/*) return 1 ;; esac; }

echo "e2e prerequisites"
check "macOS" "the e2e stage drives AppKit; it runs on macOS only" \
  test "$(uname -s)" = Darwin
check "checkout is not in a temporary directory" \
  "move or clone it under your home folder: macOS does not resolve the test build's identifier for an app under /tmp" \
  not_in_temp_dir
check "Xcode (full, not just the Command Line Tools) is the active developer dir" \
  "install Xcode from the App Store, then: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" \
  full_xcode
check "e2e dependencies installed (WebdriverIO, Appium)" "npm --prefix e2e install" \
  e2e_deps
check "Appium Mac2 driver available" "npm --prefix e2e install (appium-mac2-driver is a dependency of e2e/)" \
  mac2_driver
check "this terminal may control System Events (Automation)" \
  "run the doctor again and click OK on the prompt, or System Settings → Privacy & Security → Automation: under your terminal app, enable System Events" \
  automation
check "Accessibility permission for this terminal" \
  "System Settings → Privacy & Security → Accessibility: enable the app this terminal runs in — Terminal, iTerm, or Visual Studio Code for its integrated terminal (untick and re-tick if it is already listed), then restart that app" \
  accessibility
if ((before_build)); then
  echo "  - test build: not checked, it is built next"
else
  check "test build present (jira-to-qa-portal-e2e.app)" "npm run build:e2e" \
    test -x "$APP_BINARY"
fi
check "no test build running (from this or any other checkout)" "quit it, or: node e2e/support/clean.ts" \
  not_running
check "port 4445 free (embedded WebDriver)" "quit whatever listens on 4445: lsof -nP -iTCP:4445 -sTCP:LISTEN" \
  port_free 4445
check "port 4723 free (Appium)" "quit whatever listens on 4723: lsof -nP -iTCP:4723 -sTCP:LISTEN" \
  port_free 4723

if ((failures)); then
  printf '\n%d prerequisite(s) missing. See documentation/tests/README.md#end-to-end-tests.\n' "$failures"
  exit 1
fi
printf '\nall e2e prerequisites present\n'
