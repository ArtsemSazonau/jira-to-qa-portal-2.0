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

export async function clickHideButton() {
  await focusMainWindow()
  await $('button=Hide to menu bar').click()
}

/** The text of any notice the panel shows (`role=status` or `role=alert`), for failure context. */
export async function notices(): Promise<string[]> {
  await focusMainWindow()
  return $$('[role="status"], [role="alert"]').map((el) => el.getText())
}
