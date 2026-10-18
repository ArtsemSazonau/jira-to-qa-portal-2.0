# 9. Window tabs

The window is organised into four tabs: **Settings**, **QA Portal sync**, **Timesheet** and
**GitHub jobs**. Settings holds the one working setting, launch at login, and the settings later
features will need. The other three tabs are previews: they show sample data in the layout each
feature will fill, so wiring a feature replaces sample data rather than reshaping the window.

Specified by the `app-window-navigation`, `settings-view`, `sync-status-view`, `timesheet-view` and
`project-ci-jobs` capabilities in [openspec/specs/](../../../openspec/specs/), introduced by the
[add-window-tabs](../../../openspec/changes/archive/2026-10-18-add-window-tabs/proposal.md) change.

## The shell

```
QA Portal Sync
Keeps running in the menu bar so scheduled syncs can continue.

[ Settings ] [ QA Portal sync ] [ Timesheet ] [ GitHub jobs ]
 ==========
  (the selected tab's panel)

[ Hide to menu bar ]
Closing this window hides it too. Use Quit in the menu bar icon, or ⌘Q, to exit.
```

`App.tsx` is the shell. It keeps what it owned before the tabs existed — the backend load of launch
at login and tray availability, the toggle's save and error handling, the no-backend and no-tray
notices, and the hide footer — and renders those outside the panels, so they apply on every tab.
The launch-at-login row itself moved into `views/SettingsView.tsx`, which receives its state as a
prop.

## Tabs

`components/Tabs.tsx` is a WAI-ARIA tab list with automatic activation:

| Key | Effect |
|---|---|
| Left / Right | Focus and select the previous / next tab, wrapping at either end |
| Home / End | Focus and select the first / last tab |
| Tab | Leave the tab list for the selected panel's first control |

Only the selected tab is in the Tab order (`tabIndex` 0, the others -1). Each panel is labelled by
its tab, so a screen reader announces "QA Portal sync, tab, 2 of 4".

**Every panel stays mounted.** Inactive panels carry `hidden` rather than being unmounted, so what
the user typed into a preview field or chose on GitHub jobs survives switching away and back. It also
keeps the launch-at-login switch in the DOM whatever tab is selected, which the e2e helpers rely on.

## The selected tab is not persisted

The selection lives in `Tabs`' React state and nowhere else: it is not written to the config file
and no command is sent to the core when it changes. Today hiding the window keeps the page alive, so
the window reopens on the tab it was hidden on; once the window is destroyed on close (the planned
change in [02-hide-to-tray.md](02-hide-to-tray.md)), it will reopen on Settings. Both are intended,
and no test asserts either across a hide.

## Preview conventions

What is not built yet is said in words, never only by colour:

| Marker | Where | Component |
|---|---|---|
| "Not wired yet" badge | The heading of every preview section on the Settings tab | `NotWiredBadge` |
| Sample-data notice | The top of QA Portal sync, Timesheet and GitHub jobs | `SampleDataNotice` |
| Disabled button described by its reason | Every action that does not exist yet: Test connection, Run now, Generate, Copy, Submit, Run jobs | `PendingAction` |

Preview field labels use the body colour (`--text`) instead of the heading colour, which is the
greyed look while staying above the 4.5:1 contrast an enabled control needs. Preview fields are
editable and save nothing: no IPC call, no config write.

Sample data lives in `fixtures/sample-data.ts`, typed as the shapes the future IPC wrappers are
expected to return. Each view takes its data as a prop defaulting to the sample, so a feature wires
up by replacing that default with a call through `lib/ipc.ts`. The sample data ships in the release
bundle, which is why every preview tab says so on screen.

The platform list shared by the sync table and GitHub jobs is `domain/platforms.ts`: id and display
label only. Mapping Jira and QA Portal names onto those ids belongs to the Rust grouping when the
sync lands.

## Settings tab

```
Launch at login                                   ( o--)   <- works

Jira                                          [Not wired yet]
  Email / API token / Cloud ID / Filter ID or JQL
  [ Test connection ]  The Jira connection is not wired yet.

QA Portal                                     [Not wired yet]
  URL / Login / Password

Sync schedule                                 [Not wired yet]
  (o) Every interval  ( ) On a cron schedule
  Interval, minutes [60]   Cron expression [0 9 * * 1-5]
  Next run: Mon 19 Oct, 09:00        [ ] Dry run

Timesheet                                     [Not wired yet]
  Tracker URL / Login / Password
  Submit on [Friday v]  At [17:00]
  (o) Submit automatically  ( ) Remind me to review and submit
  Projects and expected hours per day
    [Project A    ] [8  ] [Remove]
    [Project B    ] [0.5] [Remove]
    [Add project]

GitHub                                        [Not wired yet]
  Token / Repository / Workflow
```

The fields are uncontrolled inputs: there is nothing to do with their values until each feature
stores them in Rust, so React does not hold them either. The exception is the project list, whose
rows are state because they are added and removed; each new row has no name and 8 hours per day,
and the hours field accepts 0 to 24 in steps of 0.5 with no warning above 8.

The Jira section asks for email, API token and cloud ID together, because the Jira REST gateway
the sync will use needs all three. The secrets (API token, both passwords, GitHub token) are
password fields with `autocomplete="off"`, so WebKit neither autofills them nor offers to save them
to the keychain from a field that stores nothing.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| SET-001 | Open the tab -> the five preview sections with their fields | automated | component |
| SET-002 | Type, choose or select in each preview field -> it takes the input | automated | component |
| SET-003 | Fill in credentials and edit projects -> nothing reaches the core | automated | component |
| SET-004 | Type a secret -> masked, no autofill | automated | component |
| SET-005 | Add, edit, remove projects -> 8 hours by default, 0–24 step 0.5, may be empty | automated | component |
| SET-006 | Timesheet submission -> Friday, 17:00, automatic by default | automated | component |
| SET-007 | Unfinished section or sample data -> marked in words | automated | component |
| SET-008 | Action not built -> disabled, described by its reason | automated | component |
| SET-009 | Render the tab -> axe finds no violations | automated | component |

## QA Portal sync tab

```
Sample data: the sync is not wired yet, so these numbers are not from Jira or the QA Portal.

Sync
  Status Idle    Last sync Fri 16 Oct, 09:00, succeeded    Next sync Mon 19 Oct, 09:00
  [ Run now ]  The sync is not wired yet.     [ ] Dry run
  Steps of the last run:  ✓ Jira: done  ✓ Group: done  ✓ Portal login: done  ✓ Update: done  ✓ Verify: done

Synced counts
  Platform        Blocker Critical Major Minor Trivial Total
  Android mobile     0       2     5+1    3      1      11
  iOS mobile         1      1−1     4     2      0       8
  ...
  Total              1       4     18    12      3      38
  3 tickets were skipped because their platform is not recognised.

Report
  Period [Last week v]
  Report text (read-only)
  [ Generate ]  [ Copy ]
```

`SyncView` takes a `SyncSnapshot` prop; the sample is the default. The steps are the legacy
script's stages, so a failed run shows where it stopped, each outcome written out next to its mark.
Row and column totals and the deltas come from `views/totals.ts`; a delta appears only where a count
moved since the sync before. The skipped-tickets warning exists because the legacy script silently
drops tickets whose platform is not in the mapping.

Run now, Generate and Copy are `PendingAction`s. Dry run and the period choice are live controls
that do nothing yet.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| SYNC-001 | Counts table -> row, column and grand totals add up | automated | unit, component |
| SYNC-002 | A count moved -> signed delta; unchanged -> none | automated | unit, component |
| SYNC-003 | Open the tab -> sample-data notice | automated | component |
| SYNC-004 | Last and next sync -> weekday, day, month, 24-hour time | automated | unit |
| SYNC-005 | Status, last and next sync; Never and Not scheduled when absent | automated | component |
| SYNC-006 | Run now disabled with its reason; Dry run offered | automated | component |
| SYNC-007 | The five steps in order, outcomes in words | automated | component |
| SYNC-008 | Skipped tickets -> warning with the count | automated | component |
| SYNC-009 | Report read-only; Generate and Copy disabled | automated | component |
| SYNC-010 | Render the tab -> axe finds no violations | automated | component |

## Timesheet tab

```
Sample data: time entry is not wired yet, so nothing here comes from or goes to the time tracker.

Week of Mon 12 Oct – Fri 16 Oct
  Status Draft    Next submission Fri 16 Oct, 17:00

  Project     Mon 12 Oct  Tue 13 Oct  Wed 14 Oct  Thu 15 Oct  Fri 16 Oct  Total
  Project A        8           8           8           8           8        40
  Project B      0.5         0.5         0.5         0.5         0.5       2.5
  Total          8.5         8.5         8.5         8.5         8.5      42.5

  [ Submit ]  Time entry is not wired yet.
```

The week is the template applied to Monday to Friday: each project's expected hours per day in every
cell. `TimesheetView` takes a `TimesheetWeek` prop; the sample is the default. It deliberately does
not reflect projects typed into the Settings tab — those fields save nothing, and sharing unsaved
edits between tabs would need state that belongs in Rust. An empty template shows a message instead
of an empty grid.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| TIME-001 | 8 and 0.5 hours a day -> 40, 2.5, and 8.5 a day | automated | unit, component |
| TIME-002 | The week's Monday–Friday dates, across month ends | automated | unit, component |
| TIME-003 | Open the tab -> sample-data notice | automated | component |
| TIME-004 | No projects -> a message, no grid | automated | component |
| TIME-005 | Draft or Submitted, next submission's weekday and time | automated | component |
| TIME-006 | Submit disabled with its reason | automated | component |
| TIME-007 | Render the tab -> axe finds no violations | automated | component |

## GitHub jobs tab

Launches the *project's* CI jobs — the app under test, on its seven platforms. Not to be confused
with building this app in CI (PLAN.md goal 3).

```
Sample data: branches and devices are examples, and starting jobs is not wired yet.

Branch [ main            v ]     [ ] Release
                                     For all platforms. Android builds go to Play Console
                                     instead of a local build.

Platform          Run   Prod env  Dev mode
All               [-]     [ ]       [ ]
Android mobile    [x]     [x]       [ ]
  (v Pixel 7) (+ Galaxy S23) (+ Xiaomi 13)
iOS mobile        [x]     [ ]       [x]
  (v iPhone 15) (+ iPhone SE) (v iPad Air)
Android TV        [ ]     [.]       [.]          <- Run off: disabled, values kept
  (+ Shield TV) (+ Chromecast with Google TV)
...
[ Run 2 jobs, deploy to 3 devices ]  Starting jobs is not wired yet.
```

Platforms are rows and the options columns, so the table needs four narrow columns and the device
buttons wrap on the line below their platform; nothing in it needs horizontal room.

**The rules live in `views/github/selection.ts`**, as pure functions the view calls; the view holds
none of its own, so real dispatch reuses them unchanged:

| Rule | Function |
|---|---|
| Everything starts off: no device, Release off | `initialSelection` |
| Prod env and Dev mode are independent of each other | `toggle` |
| While Run is off, the platform's Prod env, Dev mode and devices cannot change, and keep their values | `toggle`, `toggleDevice` (the view disables them) |
| Only Run-on platforms are dispatched; Run with no devices is build only | `effectiveJobs` |
| Each column's All is on, off or mixed; off or mixed checks all, on unchecks all | `allState`, `toggleAll` |
| Prod env and Dev mode All count only Run-on platforms, and are disabled when none runs | `allState`, `toggleAll` |
| Release applies to every platform and changes nothing else | `setRelease` |
| A new branch resets everything, Release included; nothing is remembered per branch | `withBranch` |
| The Run button reads "Run 2 jobs, deploy to 3 devices", "Run 1 job, no deployment", or "No platform selected" | `summary`, `summaryLabel` |

A device is a `<button aria-pressed>` with a visible mark (✓ selected, + not), so selection is not
told by colour alone. The All checkboxes get their mixed state through the DOM `indeterminate`
property, set in an effect, since React has no attribute for it. Every checkbox is named with its
platform ("Run Android mobile") and every device group with its platform ("iOS mobile devices"), so
seven identical columns stay distinguishable to tests and screen readers.

The selection is the view's state: kept across tab switches because the panel stays mounted, never
persisted.

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| GH-001 | The seven platforms, in order, with unique ids | automated | unit |
| GH-002 – GH-012 | Every rule in the table above, without rendering | automated | unit |
| GH-013 | Open the tab -> sample-data notice | automated | component |
| GH-014 | Defaults: Run enabled, the rest disabled until Run | automated | component |
| GH-015 | Run off disables and keeps values; Run on restores them | automated | component |
| GH-016 | Mixed All; Prod env All touches Run-on rows only | automated | component |
| GH-017 | Selected devices show a mark and a pressed state | automated | component |
| GH-018 | Branch change resets, and returning restores nothing | automated | component |
| GH-019 | Release is described and changes nothing else | automated | component |
| GH-020 | The Run button's label and reason | automated | component |
| GH-021 | The selection survives a tab switch | automated | component |
| GH-022 | Render the tab -> axe finds no violations | automated | component |
| GH-023 | Mouse and keyboard in WebKit, then a branch change | automated | flow |

## Layout

The content is capped at 760 px, which fits the 800 px window. Tables sit in a `.table-wrap` box
with `overflow-x: auto`, so in a narrow window only the table scrolls, never the page. The tab row
wraps rather than scrolls.

## Tests

Every case is in the test catalog — the [`TAB` cases](../../tests/catalog.md#window-tabs--tab) and,
per tab, the [`SET`](../../tests/catalog.md#settings-previews--set),
[`SYNC`](../../tests/catalog.md#qa-portal-sync--sync), [`TIME`](../../tests/catalog.md#timesheet--time)
and [`GH`](../../tests/catalog.md#github-jobs--gh) cases. The automated tests that carry each ID are
listed in the generated [inventory](../../tests/inventory.md).

| Case | Behaviour | Status | Levels |
|---|---|---|---|
| TAB-001 | Open the window -> tabs Settings, QA Portal sync, Timesheet, GitHub jobs, in that order | automated | component |
| TAB-002 | Open the window -> Settings is selected and launch at login is visible | automated | component |
| TAB-003 | Click a tab -> it is selected and only its panel is visible | automated | component |
| TAB-004 | Left/Right, Home/End on a tab -> focus and selection move, wrapping | automated | component, flow |
| TAB-005 | Tab on the selected tab -> focus moves into its panel | automated | flow |
| TAB-006 | Render the tabs -> roles, selected state, panels labelled by their tab | automated | component |
| [TAB-007](../../tests/cases/tab/TAB-007-voiceover.md) | Move through the tabs with VoiceOver -> name, selected state and position announced | manual | manual |
| TAB-008 | Type or toggle, switch away and back -> the input is kept and still works | automated | component |
| TAB-009 | Switch tabs, then reload -> nothing reaches the core, the page starts on Settings | automated | component, flow |
| TAB-010 | Select another tab -> heading and hide footer still visible | automated | component |
| TAB-011 | Each tab at 360 px -> no page overflow | automated | flow |
| TAB-012 | Each tab -> axe finds no violations | automated | component |
| [TAB-013](../../tests/cases/tab/TAB-013-appearance.md) | Each tab in Light and Dark -> readable, matches the approved screenshots | partial | flow, manual |
| [TAB-014](../../tests/cases/tab/TAB-014-built-app-tabs.md) | Built app: four tabs, Settings selected, each shows its own panel | automated | e2e |
| [TAB-015](../../tests/cases/tab/TAB-015-built-app-launch-at-login.md) | Built app: launch at login still toggles and persists after visiting another tab | automated | e2e |
