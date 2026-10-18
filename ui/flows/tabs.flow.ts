/**
 * The window's tabs in WebKit, against the scripted backend. Each test names the catalog case it
 * covers; see documentation/tests/catalog.md.
 */
import { expect, test, type Page } from '@playwright/test'
import { ipcCalls, launchAtLogin, openWith, ready } from './support'

const TAB_NAMES = ['Settings', 'QA Portal sync', 'Timesheet', 'GitHub jobs'] as const

const tab = (page: Page, name: string) => page.getByRole('tab', { name })

/** WebKit on macOS reaches every control with Option-Tab; see settings.flow.ts (UI-005). */
const TAB_KEY = process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'

test('[TAB-004] moves between tabs with the arrow keys, wrapping, and with Home and End', async ({ page }) => {
  await openWith(page)
  await ready(page)
  await tab(page, 'Settings').focus()

  await page.keyboard.press('ArrowLeft')
  await expect(tab(page, 'GitHub jobs')).toBeFocused()
  await expect(tab(page, 'GitHub jobs')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: 'GitHub jobs' })).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'Settings')).toBeFocused()

  await page.keyboard.press('End')
  await expect(tab(page, 'GitHub jobs')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(tab(page, 'Settings')).toHaveAttribute('aria-selected', 'true')
})

test('[TAB-005] Tab moves focus from the selected tab into its panel', async ({ page }) => {
  await openWith(page)
  await ready(page)
  await tab(page, 'Settings').focus()

  await page.keyboard.press(TAB_KEY)

  await expect(launchAtLogin(page)).toBeFocused()
})

test('[TAB-009] starts on Settings again after a reload, and switching tabs calls nothing', async ({ page }) => {
  await openWith(page)
  await ready(page)
  const before = (await ipcCalls(page)).length

  await tab(page, 'GitHub jobs').click()
  await tab(page, 'Timesheet').click()
  expect(await ipcCalls(page)).toHaveLength(before)

  await page.reload()
  await ready(page)
  await expect(tab(page, 'Settings')).toHaveAttribute('aria-selected', 'true')
})

test('[TAB-011] fits a 360 px wide window on every tab with no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await openWith(page)
  await ready(page)

  for (const name of TAB_NAMES) {
    await tab(page, name).click()
    await expect(page.getByRole('tabpanel', { name })).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `page overflow on ${name}`).toBeLessThanOrEqual(0)

    // Tables may scroll inside their own box; every other control must lie within the window.
    const controls = page.locator(
      '[role="tab"], [role="tabpanel"]:not([hidden]) :is(button, input, select, textarea):not(.table-wrap *)',
    )
    for (const control of await controls.all()) {
      if (!(await control.isVisible())) continue
      const box = (await control.boundingBox())!
      expect(box.x + box.width, `${await control.evaluate((el) => el.outerHTML.slice(0, 80))} on ${name}`).toBeLessThanOrEqual(360)
    }
  }
})

test('[GH-023] chooses platforms and devices with mouse and keyboard, and a branch change resets them', async ({ page }) => {
  await openWith(page)
  await ready(page)
  await tab(page, 'GitHub jobs').click()
  const runButton = page.getByRole('button', { name: /^Run \d|^No platform selected/ })
  await expect(runButton).toHaveText('No platform selected')

  await page.getByRole('checkbox', { name: 'Run Android mobile' }).click()
  await page.getByRole('group', { name: 'Android mobile devices' }).getByRole('button', { name: 'Pixel 7' }).click()

  // Keyboard: Space toggles a checkbox, Enter presses a device button.
  await page.getByRole('checkbox', { name: 'Run iOS mobile' }).focus()
  await page.keyboard.press('Space')
  const iphone = page.getByRole('group', { name: 'iOS mobile devices' }).getByRole('button', { name: 'iPhone 15' })
  await iphone.focus()
  await page.keyboard.press('Enter')
  await expect(iphone).toHaveAttribute('aria-pressed', 'true')

  await expect(runButton).toHaveText('Run 2 jobs, deploy to 2 devices')
  await expect(runButton).toBeDisabled()

  await page.getByRole('combobox', { name: 'Branch' }).selectOption('develop')
  await expect(runButton).toHaveText('No platform selected')
  await expect(page.getByRole('checkbox', { name: 'Run Android mobile' })).not.toBeChecked()
  expect(await ipcCalls(page)).not.toContainEqual(expect.objectContaining({ cmd: expect.stringMatching(/job|dispatch/) }))
})
