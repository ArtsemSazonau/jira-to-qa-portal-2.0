#!/usr/bin/env bash
# Full regression: prerequisites → build the test variant → fast suite → every e2e scenario.
# The e2e stage never starts if anything before it fails. Run by `npm run test:regression`.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

run_steps "regression" \
  "prerequisites::scripts/test/doctor.sh --before-build" \
  "build test variant::npm run build:e2e" \
  "fast suite::scripts/test/fast.sh" \
  "e2e::scripts/test/e2e.sh"
