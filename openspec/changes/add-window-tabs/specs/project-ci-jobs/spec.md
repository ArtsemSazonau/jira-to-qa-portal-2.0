# Spec Delta

## Purpose

Defines how the user chooses what the project's CI jobs build and where they deploy: branch,
release mode, platforms, environment, mode and target devices, and the rules that keep that
selection consistent before it is dispatched.

## ADDED Requirements

### Requirement: The tab states which parts are sample data
Until dispatch exists, the GitHub jobs tab SHALL say, in visible text at its top, that its branches
and devices are sample data and that jobs cannot be started yet.

#### Scenario: Sample data notice
- **WHEN** the GitHub jobs tab is shown
- **THEN** a notice says branches and devices are sample data and dispatch is not wired yet

### Requirement: A branch is chosen from a list
The tab SHALL show a branch dropdown at the top, with the default branch selected when the tab is
first shown.

#### Scenario: Default branch
- **WHEN** the tab is first shown
- **THEN** the branch dropdown shows the default branch

### Requirement: One row per platform with Run, Prod env and Dev mode
The tab SHALL show a row for each of the seven platforms — Android mobile, iOS mobile, Android TV,
Fire TV, Apple TV, Samsung, LG — in that order, each with Run, Prod env and Dev mode checkboxes, all
unchecked by default. Prod env and Dev mode SHALL be independent of each other.

#### Scenario: Defaults
- **WHEN** the tab is first shown
- **THEN** seven platform rows appear in order and every Run, Prod env and Dev mode checkbox is unchecked

#### Scenario: Prod env and Dev mode together
- **WHEN** Run is on for Android mobile and the user checks both Prod env and Dev mode
- **THEN** both stay checked

### Requirement: Release is a single choice for all platforms
The tab SHALL show one Release checkbox, unchecked by default, applying to every platform, with a
description saying that Android builds go to Play Console instead of a local build. Release SHALL
NOT disable or change any other control.

#### Scenario: Release on
- **WHEN** the user checks Release
- **THEN** Release is checked, its description is visible, and every other control keeps its state and availability

### Requirement: Devices are chosen per platform
Each platform row SHALL list that platform's devices as toggle buttons, none selected by default.
Clicking a device SHALL toggle its selection; any number, from none to all, MAY be selected.
Selection SHALL be shown by a visible mark, not by colour alone, and exposed as a pressed state.

#### Scenario: Select two devices
- **WHEN** Run is on for iOS mobile and the user clicks iPhone 15 and iPad Air
- **THEN** both are shown selected with a mark and reported as pressed, and the other iOS devices are not

#### Scenario: Deselect
- **WHEN** a selected device is clicked again
- **THEN** it is no longer selected

### Requirement: Run off disables a platform's other controls and keeps their values
While a platform's Run is unchecked, its Prod env, Dev mode and device buttons SHALL be disabled.
Their values SHALL be kept, and SHALL be shown again when Run is checked.

#### Scenario: Values return
- **WHEN** Android mobile has Prod env checked and Pixel 7 selected, and the user unchecks then rechecks Run
- **THEN** Prod env is checked and Pixel 7 is selected again, and both are enabled

#### Scenario: Disabled while Run is off
- **WHEN** Run is unchecked for Fire TV
- **THEN** Fire TV's Prod env, Dev mode and device buttons cannot be changed

### Requirement: Only platforms with Run on are dispatched
The selection to dispatch SHALL include only platforms whose Run is checked, with their Prod env,
Dev mode and selected devices. A platform with Run on and no devices SHALL be included as build
only, with no deployment.

#### Scenario: Kept values of a disabled platform are ignored
- **WHEN** Samsung has Prod env checked and a device selected but Run unchecked, and Android mobile has Run checked
- **THEN** the selection to dispatch contains Android mobile only

#### Scenario: Build only
- **WHEN** Run is on for LG and no LG device is selected
- **THEN** the selection to dispatch contains LG with no devices

### Requirement: Each column has a tri-state All
The Run, Prod env and Dev mode columns SHALL each have an All checkbox. It SHALL read checked when
every counted row is checked, unchecked when none is, and mixed otherwise. Clicking it when unchecked
or mixed SHALL check every counted row; clicking it when checked SHALL uncheck them.

#### Scenario: Mixed Run
- **WHEN** Run is checked for two of the seven platforms
- **THEN** the Run All checkbox reads mixed

#### Scenario: Mixed becomes all
- **WHEN** the Run All checkbox is mixed and the user clicks it
- **THEN** Run is checked for all seven platforms

#### Scenario: All off
- **WHEN** the Run All checkbox is checked and the user clicks it
- **THEN** Run is unchecked for all seven platforms

### Requirement: Prod env and Dev mode All count only platforms with Run on
The Prod env and Dev mode All checkboxes SHALL count and change only platforms whose Run is checked.
When no platform has Run checked, both SHALL be disabled.

#### Scenario: All covers enabled rows only
- **WHEN** Run is checked for Android mobile and iOS mobile only, and the user clicks the Prod env All checkbox
- **THEN** Prod env is checked for Android mobile and iOS mobile, and no other platform's Prod env changes

#### Scenario: No platform running
- **WHEN** no platform has Run checked
- **THEN** the Prod env and Dev mode All checkboxes are disabled

### Requirement: Changing the branch resets the selection
Choosing a different branch SHALL reset Release, every Run, Prod env and Dev mode checkbox and every
device selection to their defaults. A selection SHALL NOT be remembered per branch.

#### Scenario: Reset on branch change
- **WHEN** the user has checked Release, Run for iOS mobile and selected a device, then picks another branch
- **THEN** Release, every checkbox and every device are back to unselected

#### Scenario: Returning to a branch does not restore it
- **WHEN** the user makes a selection on branch A, switches to branch B, then back to branch A
- **THEN** every control is at its default

### Requirement: The selection lasts for the window's page
The selection SHALL be kept while the user switches tabs, and SHALL NOT be written to the settings
file or the core.

#### Scenario: Survives a tab switch
- **WHEN** the user checks Run for Apple TV, opens Settings, then returns to GitHub jobs
- **THEN** Run is still checked for Apple TV

### Requirement: The Run jobs button summarises the selection
The tab SHALL show a Run jobs button labelled with the number of jobs and the number of devices in
the selection to dispatch. It SHALL be disabled when no platform has Run checked and, until dispatch
exists, always, with an associated explanation.

#### Scenario: Summary label
- **WHEN** Run is checked for Android mobile and iOS mobile and three devices are selected across them
- **THEN** the button reads "Run 2 jobs, deploy to 3 devices"

#### Scenario: Nothing selected
- **WHEN** no platform has Run checked
- **THEN** the button is disabled and says no platform is selected
