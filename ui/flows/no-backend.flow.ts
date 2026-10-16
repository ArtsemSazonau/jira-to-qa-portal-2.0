/**
 * The frontend opened in a plain browser, with no Tauri backend and no mock: what a developer sees
 * after `npm --prefix ui run dev`. Runs in the `webkit-no-backend` project, against plain `vite`.
 */
import { expect, test } from '@playwright/test'

test('[UI-007] explains that the desktop backend is missing instead of showing a dead toggle', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('status')).toContainText('The desktop backend is not available')
  await expect(page.getByRole('status')).toContainText('npm run tauri dev')
  await expect(page.getByRole('switch', { name: 'Launch at login' })).toBeDisabled()
})
