# settings-view Specification

## Purpose

Defines the Settings tab: the place for every app setting — the working launch-at-login control and
the credentials, schedule, timesheet and project-CI settings that later features will wire up.

## Requirements

### Requirement: Launch at login keeps its current behaviour
The Settings tab SHALL contain the launch-at-login switch with the behaviour it has today: disabled
until the core answers, reflecting the OS registration, reverting with an alert when registration
fails, and disabled while a change is being saved.

#### Scenario: Toggle from the Settings tab
- **WHEN** the core reports launch at login off and the user turns the switch on
- **THEN** the core is asked to enable launch at login and the switch shows the state the core reads back

### Requirement: Preview sections list the planned settings
The Settings tab SHALL show these preview sections below launch at login: Jira (email, API token,
cloud ID, filter ID or JQL); QA Portal (URL, login, password); Sync schedule (interval or cron,
next-run preview, dry run); Timesheet; GitHub (token, repository, workflow).

#### Scenario: Sections present
- **WHEN** the Settings tab is shown
- **THEN** sections titled Jira, QA Portal, Sync schedule, Timesheet and GitHub are visible, each with its listed fields

### Requirement: The Timesheet section holds a list of projects with expected hours per day
The Timesheet section SHALL offer tracker URL, login and password, a submission weekday and time, an
automatic-or-reminder choice, and a list of projects. Each project row SHALL have a name and expected
hours per day, defaulting to 8, accepting 0 to 24 in steps of 0.5. Rows SHALL be addable and removable.

#### Scenario: Add a project
- **WHEN** the user clicks "Add project"
- **THEN** a new row appears with an empty name and 8 hours per day

#### Scenario: Remove the last project
- **WHEN** the list has one project and the user removes it
- **THEN** the list is empty and "Add project" is still available

#### Scenario: More than 8 hours is allowed
- **WHEN** the user enters 10 hours per day for a project
- **THEN** the value is accepted without a warning

### Requirement: Preview fields are editable but save nothing
Every field in a preview section SHALL accept input. Nothing typed or chosen there SHALL be sent to
the core, written to disk or kept beyond the window's page. Secret fields SHALL mask their input and
SHALL NOT offer browser autofill.

#### Scenario: Typing sends nothing
- **WHEN** the user fills in the Jira API token and the QA Portal password
- **THEN** no command is sent to the core and the settings file is unchanged

#### Scenario: Secrets are masked
- **WHEN** the user types into the API token, password or GitHub token field
- **THEN** the typed characters are not shown

### Requirement: Unfinished settings are marked in words, not only by colour
Each preview section SHALL carry a visible "Not wired yet" label, and its field labels SHALL be
shown in a muted colour that still meets the 4.5:1 text contrast ratio. The launch-at-login row
SHALL carry no such marking.

#### Scenario: Marked sections
- **WHEN** the Settings tab is shown
- **THEN** each preview section shows "Not wired yet" and the launch-at-login row does not

### Requirement: Actions of unfinished settings are disabled
Buttons that would act on an unfinished setting, such as "Test connection", SHALL be disabled and
SHALL say why in text associated with the button.

#### Scenario: Test connection
- **WHEN** the Jira section is shown
- **THEN** "Test connection" is disabled and its description says the connection is not wired yet
