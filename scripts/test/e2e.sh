#!/usr/bin/env bash
# End-to-end stage: clean state, then WebdriverIO against the test build. Assumes the test build is
# built (`npm run build:e2e`) and the prerequisites are met (`npm run test:doctor`).
#
#   npm run test:e2e                               every spec
#   npm run test:e2e -- --spec ./specs/pilot.e2e.ts one spec (path relative to e2e/)
#
# Report: e2e/report/index.html, with screenshots, the app log and the state snapshot per failure.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# Whatever happens — a failure, Ctrl-C — leave no test build, login item or Appium behind.
trap 'node "$REPO_ROOT/e2e/support/clean.ts" >/dev/null 2>&1 || true' EXIT

wdio_args=""
(($#)) && wdio_args=$(printf ' %q' "$@")

run_steps "e2e" \
  "clean state::rm -rf e2e/report && node e2e/support/clean.ts" \
  "webdriverio::cd e2e && npx wdio run ./wdio.conf.ts$wdio_args"
