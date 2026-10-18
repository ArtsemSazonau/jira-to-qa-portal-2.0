# Tasks

Catalog areas introduced here (design §10): `TAB` navigation, `SET` Settings previews, `SYNC`, `TIME`,
`GH`. Each group adds its own catalog rows in the same task that adds the tests carrying them, so
`npm run test:catalog` stays green after every group.

## 1. Pure models and shared data

- [x] 1.1 Add `ui/src/domain/platforms.ts` with the seven platforms (id + label, display order:
      Android mobile, iOS mobile, Android TV, Fire TV, Apple TV, Samsung, LG); verify with a vitest
      case asserting the order and that IDs are unique
- [x] 1.2 Add `ui/src/views/totals.ts` (row sums, column sums, grand total, signed delta against a
      previous snapshot) with `totals.test.ts` covering sums, a rise, a fall and no change; verify
      `npm --prefix ui test` passes
- [x] 1.3 Add `ui/src/views/github/selection.ts` implementing design §6 (`initialSelection`,
      `withBranch`, `toggle`, `toggleDevice`, `allState`, `toggleAll`, `effectiveJobs`, `summary`)
      with `selection.test.ts` covering every `project-ci-jobs` rule: defaults, independent Prod
      env/Dev mode, Run-off keeps values, Run-off ignores Prod env/Dev mode/device toggles,
      `effectiveJobs` drops Run-off rows and keeps build-only rows, tri-state All for each column,
      Prod env/Dev mode All touch Run-on rows only and read `disabled` with none, branch change
      resets everything including Release, returning to a branch restores nothing; verify the tests
      pass
- [x] 1.4 Add `ui/src/fixtures/sample-data.ts` with typed `SyncSnapshot`, `TimesheetWeek` and
      `CiCatalog` (branches, default branch, devices per platform) per design §5; verify `npm --prefix
      ui run build` type-checks it
- [x] 1.5 Add the `GH` catalog area to `documentation/tests/catalog.md` with unit-level cases for
      the selection rules and tag each test in `selection.test.ts` with its ID; add rows for the
      totals cases under `SYNC`/`TIME` and tag `totals.test.ts`; verify `npm run test:catalog` passes

## 2. Tabbed shell and Settings tab with launch at login

- [x] 2.1 Add `ui/src/components/Tabs.tsx` (design §3, §4: ARIA roles, roving tabIndex,
      Left/Right wrapping, Home/End, automatic activation, inactive panels `hidden` but mounted) and
      `ui/src/components/NotWired.tsx` (badge and sample-data notice); verify with component tests
      for roles, `aria-selected`, `aria-labelledby`, every key, and that hidden panels stay in the DOM
- [x] 2.2 Turn `ui/src/App.tsx` into the shell (design §2): heading, Tabs with Settings first,
      notices and footer outside the panels; move the launch-at-login row into
      `ui/src/views/SettingsView.tsx`, fed by props from the shell; other three tabs render empty
      panels for now; verify every existing test in `App.test.tsx` and `App.a11y.test.tsx` passes
      unchanged
- [x] 2.3 Add shell cases to `App.test.tsx`: four tabs in order, Settings selected on load, click
      selects, footer visible on a non-Settings tab, typed input kept across a tab switch, no IPC
      call on switching; extend `App.a11y.test.tsx` to run axe with each tab selected; verify `npm
      --prefix ui run test:coverage` meets the floor
- [x] 2.4 Update `App.css` per design §9: raise the cap to 760 px, tab-list styles in both
      appearances, table wrapper with `overflow-x: auto`, muted preview-label style; verify `npm
      --prefix ui run build` and `npm --prefix ui run lint` pass
- [x] 2.5 Add `ui/flows/tabs.flow.ts`: keyboard through the tab list (arrows, wrap, Home/End, Tab
      into the panel), and 360 px with no page overflow on every tab; update `appearance.flow.ts` and
      regenerate its screenshot baselines for the new layout, reviewing them by eye; verify `npm run
      test:flows` passes
- [x] 2.6 Add the `TAB` catalog area with cases for tab order, default tab, keyboard, persistence
      rule, shared footer, narrow width and a `manual` VoiceOver case with its case file under
      `documentation/tests/cases/tab/`; reword `UI-001` and `UI-004` where the layout moved and update
      their case files; tag every new test; verify `npm run test:catalog` passes
- [x] 2.7 Write `documentation/docs/features/09-window-tabs.md` (shell, tabs, persistence rule,
      preview conventions, test table) and update `08-settings-ui.md` (the panel is now the Settings
      tab; replace its "Extending it" section), `documentation/docs/overview.md` and
      `documentation/README.md`; verify every link in the changed pages resolves

## 3. Settings tab previews

- [x] 3.1 Add the preview sections to `SettingsView.tsx` per the `settings-view` spec: Jira, QA
      Portal, Sync schedule, Timesheet (URL, login, password, weekday, time, auto/remind, project
      rows with add/remove and hours 0–24 step 0.5 default 8), GitHub; masked secret fields with
      `autoComplete="off"`; "Not wired yet" on each section; "Test connection" disabled with
      `aria-describedby`; verify by component tests in `SettingsView.test.tsx`
- [x] 3.2 Cover in `SettingsView.test.tsx`: every section and field present, fields editable, no
      IPC call while typing, secrets masked, add a row defaults to 8, remove the last row, 10 hours
      accepted, badges on previews only, Test connection disabled with its description; add axe for
      the tab; verify coverage floor holds
- [x] 3.3 Add `SET` catalog cases for the above, tag the tests, add the Settings section to
      `09-window-tabs.md`; verify `npm run test:catalog` passes

## 4. QA Portal sync tab

- [x] 4.1 Implement `ui/src/views/SyncView.tsx` per the `sync-status-view` spec from the
      `SyncSnapshot` fixture prop: sample-data notice, status and timing, disabled Run now with Dry
      run, five steps with textual outcomes, platform × severity table with deltas and totals from
      `totals.ts`, skipped-tickets warning, read-only report with disabled Generate and Copy; verify
      with `SyncView.test.tsx`
- [x] 4.2 Cover in `SyncView.test.tsx`: notice, status line, Run now disabled with description,
      step order, table rows in platform order, totals, delta shown and absent, warning shown with a
      count and absent with zero, report read-only; add axe; verify coverage floor holds
- [x] 4.3 Add `SYNC` catalog cases, tag the tests, add the sync section to `09-window-tabs.md`;
      verify `npm run test:catalog` passes

## 5. Timesheet tab

- [x] 5.1 Implement `ui/src/views/TimesheetView.tsx` per the `timesheet-view` spec from the
      `TimesheetWeek` fixture prop: sample-data notice, week dates, Mon–Fri grid with totals from
      `totals.ts`, empty-template message, status and next submission, disabled Submit; verify with
      `TimesheetView.test.tsx`
- [x] 5.2 Cover in `TimesheetView.test.tsx`: the 8 + 0.5 example (40, 2.5, 8.5 a day), no
      projects, Draft status with next submission, Submit disabled with description; add axe; verify
      coverage floor holds
- [x] 5.3 Add `TIME` catalog cases, tag the tests, add the timesheet section to
      `09-window-tabs.md`; verify `npm run test:catalog` passes

## 6. GitHub jobs tab

- [x] 6.1 Implement `ui/src/views/GitHubJobsView.tsx` on top of `selection.ts` (design §6, §7):
      sample-data notice, branch dropdown, Release with its description, All row, seven platform
      rows with per-platform accessible names, device buttons with `aria-pressed` and a check mark,
      `indeterminate` All checkboxes, disabled state while Run is off, summary button label; verify
      with `GitHubJobsView.test.tsx`
- [x] 6.2 Cover in `GitHubJobsView.test.tsx` the view's wiring of the rules: defaults, Run off
      disables and Run on restores, mixed All, Prod env All on Run rows only and disabled with none,
      device toggle shows pressed and mark, branch change resets, Release changes nothing else,
      selection kept across a tab switch, button labels (plural, singular, no deployment, nothing
      selected); add axe; verify coverage floor holds
- [x] 6.3 Add to `ui/flows/tabs.flow.ts` a GitHub scenario in WebKit: select platforms and devices
      with mouse and keyboard, read the summary, switch branch and see the reset; verify `npm run
      test:flows` passes
- [x] 6.4 Add view-level `GH` catalog cases, tag the tests, add the GitHub section to
      `09-window-tabs.md`; verify `npm run test:catalog` passes

## 7. End-to-end in the built app

- [x] 7.1 Add a `selectTab(name)` helper to `e2e/support/window.ts`, re-acquiring the window
      handle as the other helpers do; verify it is used by the spec below
- [x] 7.2 Add `e2e/specs/tabs.e2e.ts`, each step verifying its effect: the four tabs render in the
      app's webview in order, Settings is selected, selecting each tab shows its panel, and launch at
      login still toggles from Settings after visiting GitHub jobs (snapshot confirms the config);
      verify `npm run test:e2e` passes
- [x] 7.3 Add the e2e cases to the `TAB` area with case files under `documentation/tests/cases/tab/`,
      tag the spec; verify `npm run test:catalog` passes

## 8. Plan and project documentation

- [x] 8.1 Update `PLAN.md`: §1 goal 2 rewritten as weekly submission from a project template
      (expected hours per day, submitted on a chosen weekday), exception calendar moved to later;
      new goal "launch the project's CI jobs" distinct from goal 3; §2 UI status; §3 `ui/src/` tree
      (views, components, domain, fixtures; credentials and schedule as Settings sections, report
      inside the sync view); §4 goal 2 checklist and a new goal section with the GitHub tab items;
      verify the Russian text reads consistently and every link resolves
- [x] 8.2 Update `CLAUDE.md` (What exists, UI row of the stack table, test counts in the
      `test:fast` comment) and `documentation/tests/README.md` (component-test file table, flows
      list, catalog areas); verify the counts against an actual `npm run test:fast` run
- [x] 8.3 Regenerate the inventory with `npm run test:catalog -- --write`; verify `npm run
      test:catalog` passes with no diff on a second run

## 9. Integration check

- [x] 9.1 Run `npm run test:regression` and see it green, including the existing `UI`, `CONF` and
      pilot scenarios; record the failing step and fix before calling the change done
