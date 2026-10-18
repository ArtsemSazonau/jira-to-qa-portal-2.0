# Spec Delta

## Purpose

Defines the Timesheet tab: the week of working hours the app will enter into the internal time
tracker, built from a template of projects with expected hours per day and submitted once a week.

## ADDED Requirements

### Requirement: The tab states that it shows sample data
Until time entry exists, the Timesheet tab SHALL say, in visible text at its top, that what it shows
is sample data.

#### Scenario: Sample data notice
- **WHEN** the Timesheet tab is shown
- **THEN** a notice says the tab shows sample data and time entry is not wired yet

### Requirement: The week is shown per project and weekday
The tab SHALL show the current week's dates, then a grid with one row per project and one column per
weekday from Monday to Friday, each cell holding that project's hours for that day, followed by a
Total column per project and a Total row per day.

#### Scenario: Template applied to the week
- **WHEN** the template has Project A at 8 hours and Project B at 0.5 hours per day
- **THEN** every weekday shows 8 for Project A and 0.5 for Project B, the project totals are 40 and 2.5, and each day totals 8.5

#### Scenario: No projects
- **WHEN** the template has no projects
- **THEN** the tab says no projects are configured, and no grid is shown

### Requirement: Status and next submission are shown
The tab SHALL show the week's status (draft or submitted) and the weekday and time of the next
automatic submission.

#### Scenario: Draft week
- **WHEN** the week has not been submitted
- **THEN** the status reads Draft and the next submission shows its weekday and time

### Requirement: Submit is present but disabled
The tab SHALL show a Submit button. Until time entry exists, it SHALL be disabled with an associated
explanation.

#### Scenario: Submit disabled
- **WHEN** the tab is shown
- **THEN** Submit is disabled and its description says time entry is not wired yet
