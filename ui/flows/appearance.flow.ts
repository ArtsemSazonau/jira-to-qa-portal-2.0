/**
 * Screenshot baselines of the settings window in light and dark appearance, with the switch off and
 * on. A rendering that differs beyond the tolerance in playwright.config.ts fails, and Playwright
 * saves the expected, actual and diff images under ui/test-results/.
 *
 * Baselines live in appearance.flow.ts-snapshots/, one per platform. After an intended visual
 * change, approve new ones with `npx playwright test appearance --update-snapshots` (from ui/) and
 * review the image diff like code.
 */
import { expect, test, type Page } from '@playwright/test'
import { launchAtLogin, openWith, ready } from './support'

async function bothSwitchStates(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme })
  await openWith(page, { autostart: false })
  await ready(page)
  await expect(page).toHaveScreenshot(`settings-${scheme}-off.png`, { fullPage: true })

  await launchAtLogin(page).click()
  await expect(launchAtLogin(page)).toBeChecked()
  await expect(page).toHaveScreenshot(`settings-${scheme}-on.png`, { fullPage: true })
}

test('[UI-003] matches the approved light-appearance screenshots, switch off and on', async ({ page }) => {
  await bothSwitchStates(page, 'light')
})

test('[UI-003] matches the approved dark-appearance screenshots, switch off and on', async ({ page }) => {
  await bothSwitchStates(page, 'dark')
})
