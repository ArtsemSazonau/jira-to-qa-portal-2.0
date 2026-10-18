/**
 * Screenshot baselines of the window in light and dark appearance: the Settings tab with the switch
 * off and on, and each other tab. A rendering that differs beyond the tolerance in
 * playwright.config.ts fails, and Playwright saves the expected, actual and diff images under
 * ui/test-results/.
 *
 * Baselines live in appearance.flow.ts-snapshots/, one per platform. After an intended visual
 * change, approve new ones with `npx playwright test appearance --update-snapshots` (from ui/) and
 * review the image diff like code.
 */
import { expect, test, type Page } from '@playwright/test'
import { launchAtLogin, openWith, ready } from './support'

const OTHER_TABS = [
  { name: 'QA Portal sync', file: 'sync' },
  { name: 'Timesheet', file: 'timesheet' },
  { name: 'GitHub jobs', file: 'github' },
] as const

async function bothSwitchStates(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme })
  await openWith(page, { autostart: false })
  await ready(page)
  await expect(page).toHaveScreenshot(`settings-${scheme}-off.png`, { fullPage: true })

  await launchAtLogin(page).click()
  await expect(launchAtLogin(page)).toBeChecked()
  await expect(page).toHaveScreenshot(`settings-${scheme}-on.png`, { fullPage: true })
}

async function everyOtherTab(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme })
  await openWith(page)
  await ready(page)
  for (const { name, file } of OTHER_TABS) {
    await page.getByRole('tab', { name }).click()
    await expect(page.getByRole('tabpanel', { name })).toBeVisible()
    await expect(page).toHaveScreenshot(`${file}-${scheme}.png`, { fullPage: true })
  }
}

test('[UI-003] matches the approved light-appearance screenshots, switch off and on', async ({ page }) => {
  await bothSwitchStates(page, 'light')
})

test('[UI-003] matches the approved dark-appearance screenshots, switch off and on', async ({ page }) => {
  await bothSwitchStates(page, 'dark')
})

test('[TAB-013] matches the approved light-appearance screenshots of every other tab', async ({ page }) => {
  await everyOtherTab(page, 'light')
})

test('[TAB-013] matches the approved dark-appearance screenshots of every other tab', async ({ page }) => {
  await everyOtherTab(page, 'dark')
})
