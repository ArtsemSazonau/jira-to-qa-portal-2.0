/** Shared helpers for the UI flows. */
import { expect, type Page } from '@playwright/test'
import type { IpcCall, MockScenario } from '../src/test/mock-backend'

/** Open the settings window with the mock backend scripted to `scenario`. */
export async function openWith(page: Page, scenario: MockScenario = {}) {
  await page.addInitScript((s) => {
    window.__MOCK_SCENARIO__ = s
  }, scenario)
  await page.goto('/')
}

/** Every command the UI invoked so far, in order. */
export function ipcCalls(page: Page): Promise<IpcCall[]> {
  return page.evaluate(() => window.__IPC_CALLS__ ?? [])
}

export const launchAtLogin = (page: Page) => page.getByRole('switch', { name: 'Launch at login' })

/** Wait until the panel has its real state from the backend. */
export async function ready(page: Page) {
  await expect(launchAtLogin(page)).toBeEnabled()
}
