# Proposal

## Why

The project's core documents no longer describe either the code or the goals. PLAN.md still carries
generation leftovers, an unfenced module tree, decisions that were later reversed, and an MVP that
puts LLM reports first, while the app's goals have changed: time tracking is now the second goal and
LLM reports are "much later". Every future change starts by reading these documents, so they need to
be accurate before the next feature (credentials, Jira sync) is planned on top of them.

## What Changes

**PLAN.md** (stays in Russian, per convention)
- Remove the leftover line "Сохраните это как new_version_2.0/PLAN.md." and the `new_version_2.0/`
  root; fence the module tree and redraw it to show what exists today plus what is planned.
- Rewrite §1 Goals around the five new goals in priority order: (1) Jira → QA Portal sync,
  (2) time entry into the internal time tracker + calendar review, (3) convenient GitHub Actions
  builds, (4) a window for tokens/API keys/logins/passwords, (5) later: local LLM reports. Add
  "automated unit and e2e tests for every feature" as a cross-cutting goal.
- Resolve the platform priority conflict: macOS first, then Windows, Linux low priority.
- §2 Stack: config is a serde → JSON struct (not `tauri-plugin-store`); logging is `log` +
  `tauri-plugin-log` (debug-only today, release logging is a backlog item); add rows for the time
  tracker client, CI (GitHub Actions + `tauri-action`), and testing tools.
- Record that QA Portal sync **must** use browser automation (Playwright sidecar) — the portal
  computes its parameters in its frontend, so there is no usable API — and that Jira REST moves to
  Rust (`reqwest`), so the sidecar only receives pre-grouped counts. This closes the §5 open
  question.
- Add the missing sidecar packaging risk (Node runtime + Chromium, ~200 MB) as an open question.
- §4 Features: tick what is done (tray, hide-to-tray, autostart, single instance); restructure the
  backlog by goal; move LLM report generation out of the MVP; add time tracking as a **draft /
  future plan** (template-based hours — N hours/day on a project — with the calendar used for
  exceptions; API vs Playwright still undecided); add CI, the credentials window and the
  code-hygiene items found in review (release logging, strict CSP, duplicated `apply()`,
  `hide_main_window` decision in the adapter, `AppConfig: Copy`).
- §5 Open questions: replace answered ones; add time tracker integration method, local storage for
  timesheet drafts (SQLite likely), code signing / Apple Developer ID (also affects keychain
  re-prompts), sidecar packaging.
- Add a testing strategy section: test layers per component, dry-run mode for live systems, never
  writing to real systems from CI.

**README.md**
- Update the intro to the new goals; keep the verified parts (architecture, test counts 57/14,
  config, debugging) as they are.
- Point to the planned CI and e2e layers without claiming they exist.

**CLAUDE.md**
- Jira auth: Basic auth (email + API token) routed through the `api.atlassian.com/ex/jira/{cloudId}`
  gateway — cloudId is required, as the v1 client shows.
- Stack table: add time tracker, CI, credentials window; LLM moved to "later".
- Workflow: OpenSpec (`openspec/`) is the spec/plan workflow from now on; `_specs/` and `_plans/`
  are kept as history of the lifecycle feature.
- Testing convention: every feature ships with unit tests and, where it has UI or cross-process
  behaviour, an automated e2e test; the manual checklist is for what genuinely needs eyes, the menu
  bar, or a reboot.

**src-tauri/CLAUDE.md** — align the tests section with the new convention; note that macOS e2e via
WebDriver is now possible.

**documentation/** — `tests/automation-notes.md`: remove the claim that `config.rs` lacks
corrupt-file/unknown-field tests (they exist), replace "tauri-driver has no macOS support" with the
current options, and correct "everything else runs anywhere" (macOS-gated modules only compile on a
macOS runner). `docs/overview.md`: "Not implemented yet" follows the new goal order.

**Code comments and log text only (no behaviour change)**
- `tray.rs`: module doc and the failure log say the window "will close normally" without a tray;
  the policy actually quits. Fix the wording.
- `autostart.rs`: the plist is named after `productName` (`jira-to-qa-portal.plist`), not the
  bundle id.
- Scaffold metadata: `Cargo.toml` `description`/`authors`; remove the unused Vite template
  `ui/README.md` and unused assets in `ui/src/assets` and `ui/public` if nothing references them.

**Out of scope** (recorded in PLAN.md §4 backlog instead): any behaviour change — deduplicating
`apply()`, a `HideRequested` trigger, release logging, CSP, `AppConfig` redesign, bundle targets,
CI workflow files, e2e harness setup.

## Capabilities

### New Capabilities

None. This change corrects documentation and comments; no system behaviour changes.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`.

## Impact

- Files: `PLAN.md`, `README.md`, `CLAUDE.md`, `src-tauri/CLAUDE.md`,
  `documentation/tests/automation-notes.md`, `documentation/docs/overview.md`,
  `src-tauri/src/tray.rs` (comments/log string), `src-tauri/src/autostart.rs` (comment),
  `src-tauri/Cargo.toml` (metadata), `ui/README.md` and unused `ui` assets (removal).
- No API, dependency, config-format or runtime behaviour change. The existing 57 Rust and 14 UI
  tests must still pass; the one log string change is not asserted by any test.
- Downstream: the next changes (credentials window, Jira client, CI) will be planned against the
  updated PLAN.md.
