# e2e-test-build Specification

## Purpose

Defines the test variant of the desktop app: the extra access an automated end-to-end run needs, the
isolation that keeps it away from the user's real installation, and the guarantee that none of it
reaches a release build.

## Requirements

### Requirement: Test access exists only in the test build
The app SHALL expose automation access (a WebDriver endpoint into the window and test-only IPC
commands) only when built as the test variant. A release build and an ordinary development run SHALL
contain neither.

#### Scenario: Release build has no automation access
- **WHEN** the release bundle is built and launched
- **THEN** no WebDriver endpoint is served and no test-only IPC command is registered

#### Scenario: Ordinary development run has no automation access
- **WHEN** the app is started with the normal development command
- **THEN** no WebDriver endpoint is served

#### Scenario: Test build exposes automation access
- **WHEN** the test variant is built and launched
- **THEN** an automated client can connect over WebDriver and call the test-only IPC commands

### Requirement: Absence of test access is verified
The release build process SHALL include a check that fails if any test-only command or the WebDriver
component is present in the release binary.

#### Scenario: Test code leaks into a release
- **WHEN** a change accidentally enables test access in a release build
- **THEN** the release smoke stage fails and names what leaked

### Requirement: Test build is isolated from the real installation
The test variant SHALL use its own application identity, so that its settings file, its launch-at-login
registration and its single-instance lock never coincide with those of the user's real copy of the
app.

#### Scenario: Real app is running during a test run
- **WHEN** the user's real copy of the app is running and the test variant is launched
- **THEN** the test variant starts as its own process with its own window and tray icon, and the real
  copy is not focused, shown or otherwise affected

#### Scenario: Test run leaves real settings untouched
- **WHEN** a test run toggles launch at login and writes settings
- **THEN** the real app's settings file and login-item registration are unchanged

### Requirement: Test runs start from a clean state and clean up after themselves
Before and after a test run, the harness SHALL remove the test variant's settings file and any
launch-at-login registration the test variant created, including ones left behind by an earlier
interrupted run.

#### Scenario: Interrupted previous run
- **WHEN** a previous run was killed after registering the test variant to launch at login
- **THEN** the next run removes that registration before its first scenario starts

#### Scenario: Fresh-install behaviour is reproducible
- **WHEN** any scenario starts
- **THEN** the test variant behaves as a first launch on a fresh install unless the scenario sets up
  prior state explicitly

### Requirement: Core state is observable from tests
The test variant SHALL provide a test-only command returning the core's current state: whether the
window is visible, whether the tray icon exists, whether the app is quitting, the stored settings,
and whether the OS reports a launch-at-login registration.

#### Scenario: Asserting a hide
- **WHEN** a test clicks the window's close button and then requests the state snapshot
- **THEN** the snapshot reports the window as not visible and the tray as available

#### Scenario: Asserting a persisted setting
- **WHEN** a test turns launch at login on through the window and then requests the state snapshot
- **THEN** the snapshot reports the stored setting as on and the OS registration as present

### Requirement: External systems are reachable only through replaceable addresses
Every external system the app talks to SHALL be addressed through a setting the test variant can
point at a local fake, so that no automated run contacts a real Jira, QA Portal or time tracker.

#### Scenario: Feature that calls an external system
- **WHEN** a feature that calls an external system is added
- **THEN** the test variant can redirect that call to a local fake without rebuilding the app, and the
  feature's end-to-end tests use the fake

#### Scenario: No live system in automated runs
- **WHEN** any automated test stage runs
- **THEN** no request is sent to a real Jira, QA Portal or time tracker
