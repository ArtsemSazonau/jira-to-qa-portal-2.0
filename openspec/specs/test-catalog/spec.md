# test-catalog Specification

## Purpose

Defines the human-readable inventory of everything the project tests: one hierarchy of named test
cases with their status and links, a detailed file per case that needs one, and a check that keeps
the inventory's claims about automation true.

## Requirements

### Requirement: Every test case is listed in one catalog
The project SHALL keep one catalog listing every test case, grouped by area and then feature. Each
entry SHALL carry a stable ID, a name, the test level, the automation status, the code module under
test, the feature or story it belongs to, and a link to its case file when one exists.

#### Scenario: Finding what covers a feature
- **WHEN** a reader looks up a feature in the catalog
- **THEN** they see every case for it, which are automated, which are manual, and where each is
  described

#### Scenario: New feature adds cases
- **WHEN** a feature change adds behaviour
- **THEN** the catalog gains entries for that behaviour in the same change

### Requirement: Test case names say what is checked, how, and the expected result
A test case name SHALL take the form `[Area][Feature] action -> expected result`, readable without
opening the case file.

#### Scenario: Reading a name
- **WHEN** a reader sees `[OS tray][Menu] Right click icon -> Quit -> app process exits`
- **THEN** they know the area, the feature, the action and the expected result without further
  context

### Requirement: Status marks are limited and defined
Each case SHALL have exactly one status: `automated` (fully checked by an automated test), `partial`
(automated in part, with a stated manual remainder), `manual` (needs a person, with the reason
stated), or `planned` (described, not yet checked by anything).

#### Scenario: Partly automatable check
- **WHEN** a case's state change can be asserted automatically but its visual result cannot
- **THEN** it is marked `partial` and its case file says which part remains manual and why

### Requirement: Detailed case files for non-trivial cases
Every case with status `manual` or `partial`, every end-to-end case and every performance case SHALL
have its own file stating its purpose, preconditions, steps, expected result, the automated tests
that cover it, and links to the related feature document, code module and change.

#### Scenario: Running a manual case
- **WHEN** a person who did not write the case opens its file
- **THEN** they can set up the preconditions, perform the steps and judge pass or fail without other
  sources

### Requirement: Performance and load cases explain their measurements
Each performance case file SHALL state what is being tested and why, the setup, the exact procedure,
each metric taken and how, the target or pass criterion for each metric, the latest recorded result,
and known measurement pitfalls.

#### Scenario: Repeating a measurement
- **WHEN** a person repeats a performance case months later
- **THEN** they take the same metrics the same way and can compare against the recorded baseline and
  target

### Requirement: Automated tests reference their catalog case
Every automated test that covers a catalog case SHALL carry that case's ID in its title or an
adjacent marker, so a case can be traced to its tests and a test to its case.

#### Scenario: Tracing a failure
- **WHEN** an automated test fails
- **THEN** its output shows the case ID, which leads to the case file and the feature

### Requirement: The catalog's automation claims are checked
A catalog check SHALL fail when a case marked `automated` or `partial` has no automated test carrying
its ID, when a test carries an ID the catalog does not contain, or when a required case file is
missing. The check SHALL run in the fast suite.

#### Scenario: Claim without a test
- **WHEN** a case is marked `automated` but no test carries its ID
- **THEN** the catalog check fails and names the case

#### Scenario: Orphan test reference
- **WHEN** a test carries an ID that is not in the catalog
- **THEN** the catalog check fails and names the test and the ID

### Requirement: Manual passes are recorded
A manual pass SHALL be recorded as a dated run record listing the app version, each manual and
partial case run, its result, and notes on any failure.

#### Scenario: Before a release
- **WHEN** a manual pass is done before a release
- **THEN** a run record exists that shows which cases were run and their results
