#!/usr/bin/env bash
# Fast suite: everything that needs no built app and no OS permission. Run by `npm run test:fast`
# and by the pre-push hook. Target: under three minutes on a warm build.
#
# Stops at the first failing step. See documentation/tests/README.md for what belongs here.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

run_steps "fast suite" \
  "cargo test::cd src-tauri && cargo test" \
  "cargo clippy::cd src-tauri && cargo clippy --all-targets -- -D warnings" \
  "vitest::npm --prefix ui test" \
  "ui build::npm --prefix ui run build" \
  "mock leak check::node scripts/test/check-mock-leak.mjs" \
  "oxlint::npm --prefix ui run lint" \
  "ui flows::cd ui && npx playwright test" \
  "catalog check::node --test 'scripts/test/*.test.mjs' && node scripts/test/catalog.mjs"
