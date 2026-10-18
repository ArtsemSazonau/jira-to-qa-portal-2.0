# sync-status-view Specification

## Purpose

Defines the QA Portal sync tab: what the user can see about the Jira to QA Portal sync — its state,
its timing, the counts it last wrote, and the generated report — and where they start a run.

## Requirements

### Requirement: The tab states that it shows sample data
Until the sync feature exists, the QA Portal sync tab SHALL say, in visible text at its top, that
what it shows is sample data.

#### Scenario: Sample data notice
- **WHEN** the QA Portal sync tab is shown
- **THEN** a notice says the tab shows sample data and the sync is not wired yet

### Requirement: Sync status and timing are shown
The tab SHALL show the sync's current status (idle, running, succeeded or failed), the date and time
of the last sync with its outcome, and the date and time of the next scheduled sync.

#### Scenario: Status line
- **WHEN** the tab is shown
- **THEN** the status, the last sync's date, time and outcome, and the next sync's date and time are visible

### Requirement: Run now and dry run are present but disabled
The tab SHALL show a "Run now" button and a "Dry run" option next to it. Until the sync exists, the
button SHALL be disabled with an associated explanation.

#### Scenario: Run now disabled
- **WHEN** the tab is shown
- **THEN** "Run now" is disabled and its description says the sync is not wired yet

### Requirement: The run's steps are shown
The tab SHALL show the sync's steps in order — Jira, Group, Portal login, Update, Verify — each with
its outcome for the last run, stated in text as well as by icon or colour.

#### Scenario: Steps of the last run
- **WHEN** the tab is shown
- **THEN** the five steps appear in order, each with a textual outcome

### Requirement: Synced counts are shown per platform and severity
The tab SHALL show a table with one row per platform, in the shared platform order, and columns
Blocker, Critical, Major, Minor, Trivial and Total, followed by a Total row. A count that changed
since the previous sync SHALL show the change as a signed delta.

#### Scenario: Totals add up
- **WHEN** the table is shown
- **THEN** each row's Total is the sum of its five counts and the Total row is the column sums

#### Scenario: Delta shown
- **WHEN** a count rose from 4 to 5 since the previous sync
- **THEN** the cell shows 5 together with +1

#### Scenario: No change, no delta
- **WHEN** a count is the same as in the previous sync
- **THEN** the cell shows the count alone

### Requirement: Skipped tickets are reported
When the last sync skipped tickets because their platform was not recognised, the tab SHALL show a
warning with the number skipped.

#### Scenario: Unknown platform
- **WHEN** the last sync skipped 3 tickets with an unknown platform
- **THEN** a warning says 3 tickets were skipped because of an unknown platform

### Requirement: The report area holds generated text
The tab SHALL show a read-only report area with a period selector and Generate and Copy buttons.
Until report generation exists, Generate and Copy SHALL be disabled, each with an associated
explanation.

#### Scenario: Report area
- **WHEN** the tab is shown
- **THEN** the report text is visible and read-only, and Generate and Copy are disabled
