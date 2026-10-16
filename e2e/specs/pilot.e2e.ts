/**
 * The pilot: one scenario across both surfaces, and the gate for the rest of the e2e harness
 * (design §6). It passes the gate when:
 *   a) the WebDriver session reaches the settings switch,
 *   b) Appium opens the menu bar icon's menu and clicks Show Window,
 *   c) the close-button click hides the window, confirmed by the snapshot,
 *   d) it is green 10 times in a row.
 */
import { expect } from '@wdio/globals'
import * as os from '../support/os.ts'
import { LOGIN_ITEM_PLIST } from '../support/paths.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import * as win from '../support/window.ts'
import fs from 'node:fs'

describe('[Hide to tray][Pilot]', () => {
  it('[HIDE-013] Launch -> close -> tray Show Window -> toggle launch at login -> setting persisted', async () => {
    await step(
      'the app is up on a fresh install',
      async () => {},
      async () => {
        const state = await snapshot()
        expect(state.core).toEqual({ window_visible: true, tray_available: true, is_quitting: false })
        expect(state.platform).toEqual({ window_visible: true, tray_exists: true })
        expect(state.config.autostart_enabled).toBe(false)
      },
      { timeout: 20_000 },
    )

    // gate (a)
    await step(
      'the settings switch is reachable and off',
      () => win.launchAtLogin().then((toggle) => toggle.waitForEnabled({ timeout: 10_000 })),
      async () => expect(await win.isLaunchAtLoginOn()).toBe(false),
    )

    // gate (c)
    await step(
      'click the window close button',
      () => os.clickCloseButton(),
      async () => {
        const state = await snapshot()
        expect(state.core.window_visible).toBe(false)
        expect(state.platform.window_visible).toBe(false)
        expect(state.core.tray_available).toBe(true)
      },
    )

    // gate (b)
    await step(
      'tray icon -> Show Window',
      () => os.chooseTrayItem('Show Window'),
      async () => {
        const state = await snapshot()
        expect(state.core.window_visible).toBe(true)
        expect(state.platform.window_visible).toBe(true)
      },
    )

    await step(
      'turn launch at login on',
      () => win.toggleLaunchAtLogin(),
      async () => {
        const state = await snapshot()
        expect(state.config.autostart_enabled).toBe(true)
        expect(state.login_item_registered).toBe(true)
        expect(await win.isLaunchAtLoginOn()).toBe(true)
      },
      { timeout: 10_000 },
    )

    await step(
      'the setting is persisted to disk and the login item exists',
      async () => {},
      async () => {
        const state = await snapshot()
        const stored = JSON.parse(fs.readFileSync(state.config_path, 'utf8'))
        expect(stored.autostart_enabled).toBe(true)
        expect(fs.existsSync(LOGIN_ITEM_PLIST)).toBe(true)
      },
    )

    // Leave the machine as found: the login item points at a debug bundle under target/.
    await step(
      'turn launch at login off again',
      () => win.toggleLaunchAtLogin(),
      async () => {
        expect((await snapshot()).login_item_registered).toBe(false)
        expect(fs.existsSync(LOGIN_ITEM_PLIST)).toBe(false)
      },
      { timeout: 10_000 },
    )
  })
})
