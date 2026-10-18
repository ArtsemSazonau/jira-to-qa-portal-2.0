# Proposal

## Why

The window is a single settings panel with one toggle, while the app is about to grow four distinct
areas: settings and credentials, the QA Portal sync, weekly time entry, and launching the project's
CI jobs. Laying out the navigation and each area's intended fields now — as clearly marked previews —
lets every following feature drop real data into a screen that already exists and is already tested,
instead of reshaping the window each time.

## What Changes

- The window becomes a tabbed shell with four tabs: **Settings**, **QA Portal sync**, **Timesheet**,
  **GitHub jobs**. Settings is the tab shown when the window opens. The heading and the
  "Hide to menu bar" footer stay shared by every tab.
- The selected tab is on-screen state only: it is not persisted, and nothing depends on it surviving
  a hide or a window rebuild.
- **Settings tab**: the existing launch-at-login toggle, unchanged in behaviour, plus preview
  sections for Jira, QA Portal, sync schedule, timesheet (projects with expected hours per day,
  submission day and time) and the project's GitHub. Preview fields are editable but save nothing;
  each preview section is marked as not wired yet.
- **QA Portal sync tab** (preview, sample data): status, last and next sync time, a disabled
  Run now with a dry-run option, the run's steps, a platform × severity table with deltas and totals,
  a skipped-tickets warning, and a report area for text the local LLM will generate later.
- **Timesheet tab** (preview, sample data): the current week, Monday to Friday, per project, with
  daily and weekly totals, draft status, the next automatic submission, and a disabled Submit.
- **GitHub jobs tab** (preview, sample branches and devices, real selection logic): a branch
  dropdown, a global Release checkbox, and one row per platform with Run, Prod env and Dev mode
  checkboxes plus selectable device chips. Each column has a tri-state "All". A platform whose Run is
  off has its other controls disabled but keeps their values; changing the branch resets every
  selection. The Run button summarises the selection and stays disabled until dispatch exists.
- One shared list of the seven platforms (Android mobile, iOS mobile, Android TV, Fire TV, Apple TV,
  Samsung, LG) used by the sync table and the GitHub tab.
- Tests at every layer for the new screens: unit tests for the selection and totals logic, component
  and accessibility tests per tab, UI flows (keyboard, narrow width, light/dark), and an end-to-end
  scenario in the built app. New catalog cases for each.
- PLAN.md: goal 2 (time entry) is rewritten around a weekly submission from a project template, and
  a new goal is added — launching the project's CI jobs from the app, distinct from goal 3 (building
  this app in CI). Feature docs, the overview and the test strategy page are updated to match.

No backend or IPC changes: no new commands, no new config fields. Nothing typed into a preview field
leaves the webview.

## Capabilities

### New Capabilities

- `app-window-navigation`: the tabbed shell — which tabs exist, which is shown first, keyboard
  navigation, shared header and footer, and the rule that tab selection is not persisted.
- `settings-view`: the Settings tab — the working launch-at-login control, the preview sections for
  credentials, schedule, timesheet template and project GitHub, and how unfinished settings are
  presented.
- `sync-status-view`: the QA Portal sync tab — what the user sees about past and next syncs, the
  synced counts per platform and severity, and the report area.
- `timesheet-view`: the Timesheet tab — the week of hours per project and its totals, status and
  submission controls.
- `project-ci-jobs`: the GitHub jobs tab — choosing a branch, platforms, environment, mode, release
  and target devices for the project's CI jobs, and the rules that keep that selection consistent.

### Modified Capabilities

None. The existing specs (`e2e-test-build`, `test-catalog`, `test-suites`) cover the test
infrastructure, whose requirements this change follows but does not alter.

## Impact

- **UI code**: `ui/src/App.tsx` becomes the shell; new views, a tabs component, a shared platform
  list, sample-data fixtures and pure selection/totals modules under `ui/src/`. `App.css` loses the
  560 px content cap.
- **Tests**: new and updated vitest files, new UI flows and refreshed screenshot baselines, a new
  e2e spec plus a tab helper in `e2e/support/window.ts`. Existing tests keep passing: Settings is the
  first tab, so `#autostart`, the heading and the hide button stay where they are.
- **Docs**: `documentation/tests/catalog.md`, case files, the generated inventory, the feature docs
  (`08-settings-ui.md` and a new window-tabs page), `documentation/docs/overview.md`,
  `documentation/README.md`, `documentation/tests/README.md`, `PLAN.md` §1, §3, §4, and the status
  lines in `CLAUDE.md`.
- **Unchanged**: Rust core, IPC commands and their contract test, the mock backend, app config,
  window size, capabilities.
