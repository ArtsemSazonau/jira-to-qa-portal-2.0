/**
 * The settings window, driven through the embedded WebDriver session (DOM selectors).
 *
 * The window handle is re-acquired before every interaction: today hiding keeps the same window,
 * but the planned destroy-on-close change would invalidate handles, and specs must not care.
 */
import { $, $$, browser } from '@wdio/globals'

async function focusMainWindow() {
  const [handle] = await browser.getWindowHandles()
  if (handle) await browser.switchToWindow(handle)
}

export async function launchAtLogin() {
  await focusMainWindow()
  return $('#autostart')
}

export async function isLaunchAtLoginOn(): Promise<boolean> {
  return (await launchAtLogin()).isSelected()
}

/** Click the switch once it is interactive (it is disabled until the backend has answered). */
export async function toggleLaunchAtLogin() {
  const toggle = await launchAtLogin()
  await toggle.waitForEnabled({ timeout: 10_000 })
  await toggle.click()
}

/**
 * Leave a token in the page, to tell later whether the same webview is still there (a reload or a
 * rebuilt window would lose it).
 */
export async function markPage(token: string) {
  await focusMainWindow()
  await browser.execute((t) => {
    ;(window as unknown as { __e2eMarker?: string }).__e2eMarker = t
  }, token)
}

export async function pageMark(): Promise<string | undefined> {
  await focusMainWindow()
  return browser.execute(() => (window as unknown as { __e2eMarker?: string }).__e2eMarker)
}

/** The window's tabs, by visible name, with the id suffix `components/Tabs.tsx` gives each. */
export const TABS = {
  Settings: 'settings',
  'QA Portal sync': 'sync',
  Timesheet: 'timesheet',
  'GitHub jobs': 'github',
} as const

export type TabName = keyof typeof TABS

/** The tab names in the order the tab list shows them. */
export async function tabNames(): Promise<string[]> {
  await focusMainWindow()
  return $$('[role="tab"]').map((el) => el.getText())
}

/** The name of the selected tab. */
export async function selectedTab(): Promise<string> {
  await focusMainWindow()
  return $('[role="tab"][aria-selected="true"]').getText()
}

export async function selectTab(name: TabName) {
  await focusMainWindow()
  await $(`#tab-${TABS[name]}`).click()
}

/** Whether a tab's panel is on screen (inactive panels are `hidden`). */
export async function isPanelShown(name: TabName): Promise<boolean> {
  await focusMainWindow()
  return $(`#panel-${TABS[name]}`).isDisplayed()
}

export async function clickHideButton() {
  await focusMainWindow()
  await $('button=Hide to menu bar').click()
}

/** The text of any notice the panel shows (`role=status` or `role=alert`), for failure context. */
export async function notices(): Promise<string[]> {
  await focusMainWindow()
  return $$('[role="status"], [role="alert"]').map((el) => el.getText())
}
