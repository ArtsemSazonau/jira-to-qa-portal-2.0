# Design

## Context

See proposal.md — Why. Today `ui/src/App.tsx` is the whole window: it loads `getAutostartEnabled`
and `getTrayAvailable` together on mount, owns the load/save/error states, and renders the heading,
the launch-at-login row, the notices and the "Hide to menu bar" footer. The content is capped at
560 px in an 800×600 window.

Constraints that shape the approach:

- **The webview is disposable** (CLAUDE.md conventions). State that must survive the window lives in
  Rust; React state is for what is on screen. Today hiding keeps the page alive, and a planned
  change will destroy and rebuild it. Nothing in this change may depend on either behaviour.
- **Existing tests must keep passing untouched**: component tests find the switch by role, the flows
  look for the heading and the hide button, and e2e reaches the switch by `#autostart`.
- **The coverage floor** in `ui/vite.config.ts` (functions 100 %, lines 100 %, statements 90 %,
  branches 85 %) applies to every new file under `ui/src`.
- **The UI calls no IPC** except through `lib/ipc.ts`, and this change adds no commands.

## Goals / Non-Goals

**Goals:**

- A shell later features fill by replacing a fixture with an IPC call, without touching layout or
  navigation.
- The GitHub selection rules implemented once, as pure code, so real dispatch reuses them unchanged.
- Every new behaviour traceable from a catalog case to a test.

**Non-Goals:**

- Persisting any preview value, or the selected tab.
- A routing library, a UI component library, or a state-management library.
- Sharing unsaved edits between tabs. The Timesheet tab does not reflect projects typed into the
  Settings tab; both read sample data until the template is stored in Rust.
- Changing the window size, the Rust core, IPC, config, capabilities or CSP.

## Decisions

### 1. File layout

```
ui/src/
  App.tsx                    shell: heading, Tabs, panels, notices, footer; owns the backend load
  components/
    Tabs.tsx                 tab list + panels, ARIA wiring, keyboard
    NotWired.tsx             "Not wired yet" badge and the sample-data notice
  domain/
    platforms.ts             the seven platforms: id + display label, in display order
  views/
    SettingsView.tsx         launch-at-login row + preview sections
    SyncView.tsx
    TimesheetView.tsx
    GitHubJobsView.tsx
    github/selection.ts      pure selection model (decision 6)
    totals.ts                pure row/column totals and deltas (sync table, week grid)
  fixtures/
    sample-data.ts           typed sample data for the three preview tabs
```

PLAN.md §3 lists separate `Credentials.tsx`, `Schedule.tsx`, `SyncStatus.tsx` and `Report.tsx`
views. They become sections of `SettingsView` (credentials, schedule) and `SyncView` (status,
report), matching the tabs the user asked for; §3 is updated accordingly.

*Alternative:* one file per tab with logic inline. Rejected: the selection and totals rules are the
part worth unit-testing in isolation, and the part that survives when real data arrives.

### 2. The shell keeps the backend load

`App.tsx` keeps the single `Promise.all([getAutostartEnabled(), getTrayAvailable()])` it has today
and passes the autostart state and toggle handler down to `SettingsView`. The no-backend notice, the
no-tray alert and the footer stay in the shell, outside the panels, so they show on every tab.

*Alternative:* `SettingsView` loads autostart itself and the shell loads only tray availability.
Rejected for now: two load paths would change the loading timeline the existing UI-002 and UI-007
tests pin down, for no user-visible gain. It is a contained move when the settings panel starts
reading more from Rust.

### 3. Hand-rolled ARIA tabs with automatic activation

`Tabs` renders `role="tablist"`, `role="tab"` buttons with `aria-selected`, `aria-controls` and a
roving `tabIndex`, and `role="tabpanel"` elements with `aria-labelledby`. Left/Right (wrapping),
Home and End move focus and select at once — the WAI-ARIA "automatic activation" variant, suitable
because every panel is already rendered.

*Alternative:* a headless library (Radix, React Aria). Rejected: one component, about sixty lines,
does not justify a dependency, and the existing UI uses none.

### 4. Inactive panels stay mounted and are hidden

All four panels render on mount; inactive ones carry the `hidden` attribute. This keeps typed input
and the GitHub selection across tab switches with plain component state, and keeps the
launch-at-login switch in the DOM, which the e2e helper relies on.

*Alternative:* render only the active panel and lift state up. Rejected: lifting every preview
field into the shell is churn that the real features would undo, and unmounting would drop the
switch from the DOM.

### 5. Sample data is typed TypeScript, imported as a default prop

`fixtures/sample-data.ts` exports `SyncSnapshot`, `TimesheetWeek` and `CiCatalog` (branches, default
branch, devices per platform), typed as the shapes the future IPC wrappers will return. Each view
takes its data as a prop defaulting to the fixture, so component tests can pass edge cases (no
projects, no skipped tickets) and a later change swaps the default for an IPC call in one place.

The sample data ships in the release bundle. Every preview tab says so in text (spec requirements on
sample-data notices), which is what keeps it from being mistaken for real data.

*Alternative:* Rust commands returning fixtures. Rejected: it would fix an IPC contract before the
real data is known, and add Rust surface for fake data.

### 6. GitHub selection as a pure model

`github/selection.ts` holds the state and every rule from the `project-ci-jobs` spec:

```
type Column = 'run' | 'prodEnv' | 'devMode'
type PlatformChoice = { run: boolean; prodEnv: boolean; devMode: boolean; devices: string[] }
type Selection = { branch: string; release: boolean; platforms: Record<PlatformId, PlatformChoice> }

initialSelection(branch)              all off, no devices
withBranch(sel, branch)               -> initialSelection(branch)       // reset, nothing remembered
toggle(sel, platform, column)         prodEnv/devMode ignored while run is off
toggleDevice(sel, platform, device)   ignored while run is off
allState(sel, column)                 -> 'on' | 'off' | 'mixed' | 'disabled'
toggleAll(sel, column)                mixed/off -> on, on -> off; prodEnv/devMode touch run rows only
effectiveJobs(sel)                    run-on platforms only, with their values  -> dispatch payload
summary(sel)                          -> { jobs, devices } from effectiveJobs
```

Turning Run off changes nothing but `run`; the kept values are hidden by `effectiveJobs` and by the
view's `disabled`, which is how they come back when Run is turned on again. The view keeps a
`Selection` in `useState` and calls these functions; it holds no rules of its own.

The button label is built from `summary`: "Run 2 jobs, deploy to 3 devices", singular forms for one
("Run 1 job, deploy to 1 device"), "Run 1 job, no deployment" when no device is selected, and
"No platform selected" when there are no jobs.

### 7. Platform-scoped device buttons and tri-state All

A device is a `<button type="button" aria-pressed>` showing a check mark when pressed, so the state
is not colour-only. The All checkbox is a native checkbox whose `indeterminate` property is set from
`allState` in an effect, since React has no attribute for it; its accessible state is therefore
"mixed" natively. Each row's controls are named with the platform, for example "Run Android mobile",
so tests and screen readers can tell seven identical columns apart.

### 8. Marking unfinished features

- `NotWired` badge: visible text "Not wired yet" in each preview section heading.
- Preview labels use `--text` (≈5.7:1 on the light background, ≈7:1 on dark) instead of `--text-h`;
  that is the "greyed" look while staying above 4.5:1 for enabled controls.
- Disabled action buttons point to their explanation with `aria-describedby`.
- Secret fields are `type="password"` with `autoComplete="off"`, so WebKit offers neither autofill
  nor to save them to the keychain.

### 9. Layout

The 560 px cap is raised to 760 px, which fits the 800 px window with its padding. Tables (sync
counts, the week grid) sit in a wrapper with `overflow-x: auto`, so at 360 px only the table
scrolls, never the page. The GitHub rows are a CSS grid of platform name plus three checkbox
columns; device buttons wrap on the line below the row, so the grid needs no horizontal room for
them. The tab list wraps rather than scrolls if the labels do not fit.

### 10. Test placement

| Layer | New tests |
|---|---|
| Unit (vitest) | `selection.test.ts` — every rule in decision 6; `totals.test.ts` — sums and deltas |
| Component (vitest + Testing Library + axe) | `App.test.tsx` gains shell cases (four tabs, Settings first, click and keyboard selection, input kept across switches, no IPC on switch); one test file per view; `App.a11y.test.tsx` runs axe on every tab |
| UI flow (Playwright, WebKit) | `tabs.flow.ts` — keyboard through the tab list, 360 px on every tab, GitHub selection end to end; `appearance.flow.ts` — light and dark screenshots per tab |
| E2E (WebdriverIO, built app) | `tabs.e2e.ts` — the four tabs render in WKWebView, Settings is first, switching shows each panel, launch at login still toggles from the Settings tab after visiting another tab |

No Rust test changes: the core is untouched. The IPC wrapper and contract tests are unchanged and
must stay green, which is the check that no command was added.

New catalog areas: `TAB` (navigation), `SET` (Settings previews), `SYNC`, `TIME`, `GH`. Existing
`UI-*` cases keep their IDs; `UI-001` and `UI-004` are reworded only where the layout they describe
moved.

## Risks / Trade-offs

- [Sample data in a release build mistaken for real numbers] → A sample-data notice at the top of
  every preview tab, required by each view's spec and asserted in its component test.
- [A user types a real password into a field that saves nothing] → "Not wired yet" on each section,
  no autofill or keychain prompt, and nothing leaves the page.
- [Screenshot baselines change for the whole window] → Regenerated in the same task that changes the
  layout, and reviewed by eye before committing.
- [Coverage floor: functions at 100 % across new files] → Every exported function in `selection.ts`
  and `totals.ts` has a unit test; views have no helper functions outside what their component tests
  exercise.
- [The platform list will also exist in Rust once Jira grouping lands] → `domain/platforms.ts` holds
  only id and display label. Mapping from Jira and QA Portal names belongs to the Rust grouping, and
  the IDs are what the two sides will share.
- [Panels mounted all at once will each fetch from the core once wired] → Acceptable at four panels;
  revisit when a panel's load becomes expensive.
