# app-window-navigation Specification

## Purpose

Defines how the app window is organised into tabs: which tabs exist, which one the user sees first,
how they are reached by mouse and keyboard, and what the window shows regardless of the tab.

## Requirements

### Requirement: The window offers four tabs
The window SHALL present a tab list with exactly four tabs, in this order: Settings, QA Portal sync,
Timesheet, GitHub jobs. Exactly one tab SHALL be selected at any time, and only the selected tab's
panel SHALL be visible.

#### Scenario: Tabs in order
- **WHEN** the window opens
- **THEN** the tab list shows Settings, QA Portal sync, Timesheet and GitHub jobs, in that order

#### Scenario: Selecting a tab shows its panel
- **WHEN** the user clicks the Timesheet tab
- **THEN** the Timesheet tab is marked selected, its panel is visible, and no other panel is visible

### Requirement: Settings is the tab shown when the window loads
When the window's page loads, the Settings tab SHALL be selected.

#### Scenario: Fresh window
- **WHEN** the window's page loads
- **THEN** the Settings tab is selected and the launch-at-login control is visible without any click

### Requirement: Tab selection is not persisted
The selected tab SHALL live only in the window's page. It SHALL NOT be written to the settings file
or the core. A rebuilt window page SHALL start on the Settings tab.

#### Scenario: Reloaded page starts on Settings
- **WHEN** the user selects GitHub jobs and the window's page is then reloaded
- **THEN** the Settings tab is selected

#### Scenario: Nothing is stored
- **WHEN** the user switches between tabs
- **THEN** the settings file is unchanged and no command is sent to the core

### Requirement: Tabs are operable from the keyboard
The tabs SHALL follow the standard tab-list keyboard pattern: Left and Right arrows move to and
select the previous and next tab, wrapping at either end; Home and End select the first and last
tab; Tab moves focus from the selected tab into its panel.

#### Scenario: Arrow keys move and wrap
- **WHEN** focus is on the GitHub jobs tab and the user presses Right arrow
- **THEN** the Settings tab is focused and selected

#### Scenario: Home and End
- **WHEN** focus is on the Settings tab and the user presses End
- **THEN** the GitHub jobs tab is focused and selected

### Requirement: Tabs are exposed to assistive technology
The tab list, each tab and each panel SHALL carry the tab-list, tab and tab-panel roles, each tab
SHALL expose whether it is selected, and each panel SHALL be labelled by its tab.

#### Scenario: Screen reader names
- **WHEN** a screen reader reaches the QA Portal sync tab while Settings is selected
- **THEN** it announces a tab named "QA Portal sync", not selected, 2 of 4

### Requirement: Switching tabs keeps unsaved input for the page's lifetime
Switching away from a tab and back SHALL keep what the user typed or selected in that tab, for as
long as the window's page lives.

#### Scenario: Typed value survives a tab switch
- **WHEN** the user types into the Jira email field, opens the Timesheet tab, then returns to Settings
- **THEN** the Jira email field still holds the typed text

### Requirement: Heading and hide affordance are shared by every tab
The app heading and subtitle SHALL appear above the tab list, and the "Hide to menu bar" footer — or
the no-tray and no-backend notices that replace it — SHALL appear below the panels, whichever tab is
selected.

#### Scenario: Footer on another tab
- **WHEN** the tray icon exists and the user selects the GitHub jobs tab
- **THEN** the "Hide to menu bar" button and its explanation are visible

### Requirement: Every tab fits a narrow window
Each tab SHALL be usable in a window 360 px wide with no horizontal scrolling of the page. Wide
content such as a table MAY scroll horizontally inside its own container.

#### Scenario: Narrow window on each tab
- **WHEN** the window is 360 px wide and the user selects each tab in turn
- **THEN** the page never scrolls horizontally and every control lies within the window
