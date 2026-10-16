/**
 * Everything outside the window — the menu bar icon and its menu, the window's close button, the
 * Dock — driven through Appium's Mac2 driver (XCUITest), which sees the app's Accessibility tree.
 *
 * This is a second WebDriver session beside the test runner's own `browser` (the embedded one, into
 * the webview). It is a standalone `remote()` client rather than a WebdriverIO multiremote instance
 * because @wdio/tauri-service treats every capability in the config as a Tauri app.
 *
 * If Appium cannot reach something (pilot gate b, design §6), the fallback goes in here — the
 * AppleScript primitives from the performance method page — and the specs stay as written.
 */
import { remote } from 'webdriverio'
import { APPIUM_HOST, APPIUM_PORT } from './appium.ts'
import { BUNDLE_ID } from './paths.ts'

type OsSession = WebdriverIO.Browser

let session: OsSession | undefined

/** XCUIKeyModifierFlags */
export const CMD = 1 << 4

export async function os(): Promise<OsSession> {
  session ??= await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    logLevel: 'warn',
    // Fail with a message rather than hang if the Mac2 runner never comes up.
    connectionRetryTimeout: 180_000,
    connectionRetryCount: 0,
    capabilities: {
      platformName: 'mac',
      'appium:automationName': 'Mac2',
      'appium:bundleId': BUNDLE_ID,
      // Identifier only: with `appium:appPath`, XCUITest key presses (⌘W, ⌘Q) stopped reaching the
      // app. Launch Services resolves the identifier; wdio.conf.ts registers this checkout's bundle as
      // the only one (support/launchservices.ts).
      // The test runner has already launched the app: activate it, never relaunch or kill it.
      'appium:noReset': true,
      'appium:skipAppKill': true,
      // Building WebDriverAgentMac the first time takes a while.
      'appium:serverStartupTimeout': 180_000,
    } as WebdriverIO.Capabilities,
  })
  return session
}

/**
 * Open the Appium session before any spec runs, so a session that cannot open fails here — once, with
 * what to check — instead of as a hang inside the first test that touches the menu bar.
 */
export async function openOsSessionEagerly() {
  console.log('  → opening the Appium (Mac2) session (a new checkout builds the Mac2 runner first)')
  const started = Date.now()
  try {
    await os()
  } catch (cause) {
    throw new Error(
      `Appium could not open a Mac2 session after ${Math.round((Date.now() - started) / 1000)} s. ` +
        'Check that no other copy of the test build is running (npm run test:doctor), that macOS has not ' +
        'shown a permission prompt behind other windows, and e2e/report/appium.log. ' +
        `Cause: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }
}

export async function endOsSession() {
  await session?.deleteSession().catch(() => {})
  session = undefined
}

// --- the window's own chrome -------------------------------------------------------------------

/** The red close button of the app's window. Same code path as ⌘W, per `on_window_event`. */
export async function clickCloseButton() {
  const s = await os()
  await s.$('//XCUIElementTypeWindow//XCUIElementTypeButton[@identifier="_XCUI:CloseWindow"]').click()
}

/** Number of app windows macOS reports — hidden windows are not listed. */
export async function windowCount(): Promise<number> {
  const s = await os()
  return s.$$('//XCUIElementTypeWindow').length
}

/** A key press synthesised by XCUITest, e.g. `pressKey('w', CMD)` for ⌘W. Goes to whatever has focus. */
export async function pressKey(key: string, modifierFlags = 0) {
  const s = await os()
  await s.execute('macos: keys', { keys: [{ key, modifierFlags }] })
}

/**
 * A key press aimed at the app's window: XCUITest focuses the element before typing, so the window
 * is key when the shortcut arrives. Right after a tray-driven show, focus is not reliably there yet.
 */
export async function pressKeyInWindow(key: string, modifierFlags = 0) {
  const s = await os()
  const window = await s.$('//XCUIElementTypeWindow')
  await window.waitForExist({ timeout: 5_000 })
  await s.execute('macos: keys', { elementId: window.elementId, keys: [{ key, modifierFlags }] })
}

// --- the menu bar icon -------------------------------------------------------------------------

const STATUS_ITEM = '//XCUIElementTypeStatusItem'

export async function trayIconExists(): Promise<boolean> {
  const s = await os()
  return (await s.$$(STATUS_ITEM).length) > 0
}

/** Open the tray menu with a left click (the default) or a right click. */
export async function openTrayMenu(button: 'left' | 'right' = 'left') {
  const s = await os()
  const icon = await s.$(STATUS_ITEM)
  await icon.waitForExist({ timeout: 10_000 })
  if (button === 'right') await s.execute('macos: rightClick', { elementId: icon.elementId })
  else await icon.click()
}

/** Close an open menu. */
export async function pressEscape() {
  await pressKey('\u001b')
}

/** The titles of the open tray menu's items, in order, separators omitted. */
export async function trayMenuTitles(): Promise<string[]> {
  const s = await os()
  const titles = await s.$$(`${STATUS_ITEM}//XCUIElementTypeMenuItem`).map((item) => item.getAttribute('title'))
  return titles.filter((title): title is string => Boolean(title))
}

/** Open the tray menu and choose an item by its title, e.g. `chooseTrayItem('Show Window')`. */
export async function chooseTrayItem(title: string) {
  await openTrayMenu()
  const s = await os()
  const item = await s.$(`${STATUS_ITEM}//XCUIElementTypeMenuItem[@title="${title}"]`)
  await item.waitForDisplayed({ timeout: 5_000 })
  await item.click()
}

// --- whole-app state ---------------------------------------------------------------------------

/** `macos: queryAppState`: 1 not running, 2 suspended, 3 background, 4 foreground. */
export async function appState(): Promise<number> {
  const s = await os()
  return (await s.execute('macos: queryAppState', { bundleId: BUNDLE_ID })) as number
}

export async function screenshot(file: string) {
  await (await os()).saveScreenshot(file)
}

// --- the app menu ------------------------------------------------------------------------------

/** App menu (the bold one, named after the app) → its Quit item. */
export async function chooseAppMenuQuit() {
  const s = await os()
  const appMenu = await s.$('//XCUIElementTypeMenuBar//XCUIElementTypeMenuBarItem[@title="jira-to-qa-portal-e2e"]')
  await appMenu.waitForExist({ timeout: 5_000 })
  await appMenu.click()
  const quit = await s.$('//XCUIElementTypeMenuBarItem[@title="jira-to-qa-portal-e2e"]//XCUIElementTypeMenuItem[starts-with(@title, "Quit")]')
  await quit.waitForDisplayed({ timeout: 5_000 })
  await quit.click()
}
