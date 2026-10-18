/**
 * The settings window in WebKit, against the scripted backend. Each test names the catalog case it
 * covers; see documentation/tests/catalog.md.
 */
import { expect, test } from '@playwright/test'
import { ipcCalls, launchAtLogin, openWith, ready } from './support'

test('[UI-001] shows the heading, the launch-at-login row and the hide button with its hint', async ({ page }) => {
  await openWith(page)
  await ready(page)

  await expect(page.getByRole('heading', { level: 1, name: 'QA Portal Sync' })).toBeVisible()
  await expect(page.getByText('Keeps running in the menu bar so scheduled syncs can continue.')).toBeVisible()
  await expect(page.getByText('Launch at login', { exact: true })).toBeVisible()
  await expect(page.getByText(/Start automatically when you log in to macOS/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hide to menu bar' })).toBeVisible()
  await expect(page.getByText(/⌘Q, to exit/)).toBeVisible()
})

test('[UI-002] keeps the switch disabled until the backend has answered', async ({ page }) => {
  await openWith(page, { autostart: true, latencyMs: 600 })

  await expect(launchAtLogin(page)).toBeDisabled()
  await ready(page)
  await expect(launchAtLogin(page)).toBeChecked()
})

test('[UI-004] fits a 360 px wide window with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await openWith(page)
  await ready(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  for (const control of [launchAtLogin(page), page.getByRole('button', { name: 'Hide to menu bar' })]) {
    const box = (await control.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(360)
  }
})

test('[UI-005] toggles from the keyboard, and the backend receives the change', async ({ page }) => {
  await openWith(page, { autostart: false })
  await ready(page)

  // WebKit on macOS only stops on checkboxes and buttons with plain Tab when System Settings →
  // Keyboard → "Keyboard navigation" is on; Option-Tab reaches every control regardless. The app's
  // WKWebView behaves the same way.
  const tabKey = process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
  // The selected tab comes first in the Tab order, then its panel: Settings, then the switch.
  await page.keyboard.press(tabKey)
  await expect(page.getByRole('tab', { name: 'Settings' })).toBeFocused()
  await page.keyboard.press(tabKey)
  await expect(launchAtLogin(page)).toBeFocused()
  await page.keyboard.press('Space')

  await expect(launchAtLogin(page)).toBeChecked()
  expect(await ipcCalls(page)).toContainEqual({ cmd: 'set_autostart_enabled', args: { enabled: true } })
})

test('[UI-009] reverts the switch and shows the message when registration fails', async ({ page }) => {
  await openWith(page, { autostart: false, failRegistration: 'could not write the LaunchAgent plist' })
  await ready(page)

  await launchAtLogin(page).click()

  await expect(page.getByRole('alert')).toHaveText('could not write the LaunchAgent plist')
  await expect(launchAtLogin(page)).not.toBeChecked()
})

test('[TRAY-010] warns that closing quits, and offers no hide button, when there is no tray', async ({ page }) => {
  await openWith(page, { tray: false })
  await ready(page)

  await expect(page.getByRole('alert')).toContainText('closing this window quits the app')
  await expect(page.getByRole('button', { name: 'Hide to menu bar' })).toHaveCount(0)
})

test('[HIDE-008] asks the backend to hide when the hide button is clicked', async ({ page }) => {
  await openWith(page)
  await ready(page)

  await page.getByRole('button', { name: 'Hide to menu bar' }).click()

  await expect.poll(() => ipcCalls(page)).toContainEqual({ cmd: 'hide_main_window', args: {} })
})
