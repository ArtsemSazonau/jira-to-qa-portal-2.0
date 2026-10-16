# Spec Delta

## Purpose

Defines the staged automated test runs a developer uses on their own machine: a fast suite for the
test-first loop, a full regression before a change is called done, and a smoke check of the release
bundle. Each stage has one command, a defined scope, and a report.

## ADDED Requirements

### Requirement: Fast suite for the test-first loop
A single command SHALL run every test that needs no built app and no OS permissions: Rust unit and
integration tests, Rust lint, UI component tests, UI type-check and lint, UI flows in a browser, the
IPC contract check and the catalog check. It SHALL stop at the first failing step and say which.

#### Scenario: All green
- **WHEN** the developer runs the fast suite on a clean checkout with dependencies installed
- **THEN** every step runs and the command exits successfully with a summary per step

#### Scenario: A step fails
- **WHEN** one step fails
- **THEN** the command exits with failure, names the failed step, and does not run the steps after it

#### Scenario: Watch mode while writing a feature
- **WHEN** the developer starts the UI tests in watch mode and saves a file
- **THEN** the affected tests re-run without restarting the command

### Requirement: Fast suite stays fast
The fast suite SHALL complete in under three minutes on a warm build on the development machine. A
test that needs a built app, a real window or an OS permission SHALL NOT be part of it.

#### Scenario: A slow test is added to the fast suite
- **WHEN** a test that launches the app is placed in a fast-suite location
- **THEN** it is rejected in review against the strategy document's placement rules

### Requirement: Fast suite runs before every push
A git pre-push hook SHALL run the fast suite and block the push when it fails. The hook SHALL be
installed by the normal dependency installation, and skipping it SHALL require an explicit,
visible override.

#### Scenario: Pushing with a failing test
- **WHEN** the developer pushes while a fast-suite test fails
- **THEN** the push is refused and the failing step is shown

#### Scenario: Fresh clone
- **WHEN** the repository is cloned and dependencies are installed with the documented commands
- **THEN** the pre-push hook is active without further setup

### Requirement: UI flows run against a mocked backend in a real browser engine
UI flows SHALL run the real frontend in the WebKit browser engine with the backend replaced by
scripted IPC responses, covering rendering, keyboard operation, layout at narrow widths, light and
dark appearance, and the no-backend state. The mock SHALL be absent from the production frontend
bundle.

#### Scenario: Keyboard operation
- **WHEN** a flow tabs to the launch-at-login switch and presses Space
- **THEN** the scripted backend receives the request to change the setting and the switch shows the
  new state

#### Scenario: Appearance regression
- **WHEN** the settings window's rendering in light or dark appearance differs from the approved
  screenshot beyond the tolerance
- **THEN** the flow fails and saves the expected, actual and difference images

#### Scenario: Mock stays out of production
- **WHEN** the production frontend bundle is built
- **THEN** it contains no IPC mock code

### Requirement: Full regression with one command
A single command SHALL build the test variant of the app, run the fast suite, then run every
end-to-end scenario against the test variant, and produce a report. It SHALL check the required
local prerequisites first and explain any that are missing.

#### Scenario: Regression passes
- **WHEN** the developer runs the regression command with prerequisites in place
- **THEN** the fast suite and all end-to-end scenarios run and the command exits successfully

#### Scenario: Missing prerequisite
- **WHEN** Xcode, the Mac2 automation driver or the Accessibility permission is missing
- **THEN** the command stops before building and names the missing prerequisite and how to fix it

#### Scenario: Fast suite fails inside regression
- **WHEN** the fast suite fails during a regression run
- **THEN** the end-to-end stage is not started

### Requirement: End-to-end scenarios drive both the window and the OS surface
End-to-end scenarios SHALL be able to act on and assert both the window's contents and the
surfaces outside it — the menu bar icon and its menu, the window's close button, the Dock and
application switching — within one scenario.

#### Scenario: Hide and restore through the menu bar
- **WHEN** a scenario clicks the window's close button and then chooses Show Window from the menu bar
  icon's menu
- **THEN** it can assert that the window was hidden, that the same single window returned, and that
  the window's controls still work

### Requirement: Failures are diagnosable from the report
Every end-to-end and UI-flow failure SHALL leave a report entry with the failed step, a screenshot,
the app's log for that scenario, and for end-to-end runs the core state snapshot at the moment of
failure.

#### Scenario: A scenario fails
- **WHEN** an end-to-end scenario fails
- **THEN** the report shows the failed step, a screenshot, the app log and the state snapshot for
  that scenario

### Requirement: End-to-end steps verify their own effect
Every end-to-end step that changes the app's state SHALL be followed by an assertion of that change
before the next step runs, so a step that silently did nothing fails the scenario.

#### Scenario: A click that did not land
- **WHEN** a scenario's click on the close button has no effect
- **THEN** the scenario fails at that step rather than at a later, unrelated assertion

### Requirement: Release smoke check
A separate command SHALL launch the release bundle and verify, without any test access compiled in,
that the app starts, its menu bar icon appears, and Quit ends the process with no leftover
processes.

#### Scenario: Release bundle smoke
- **WHEN** the developer runs the release smoke command after building the release bundle
- **THEN** it reports launch, menu bar icon and clean quit as passed or failed

### Requirement: Regression is part of every change's definition of done
Every OpenSpec change that alters behaviour SHALL include tasks to add or update the end-to-end or
UI-flow scenarios for that behaviour, to update the test catalog, and to run the full regression
before the change is considered complete.

#### Scenario: Planning a feature
- **WHEN** a change with UI or cross-process behaviour is planned
- **THEN** its task list contains the scenario, catalog and regression items
