/**
 * Launch at login (feature 04, catalog area LOGIN), against the test build's own LaunchAgent
 * (`jira-to-qa-portal-e2e.plist`). The real app's login item is never touched.
 *
 * The test build lives under `target/debug/`, so the `/Applications` path half of LOGIN-003 stays
 * manual — and the dev-binary warning (LOGIN-014) fires here by design.
 */
import { expect } from '@wdio/globals'
import fs from 'node:fs'
import { quitViaTray } from '../support/fixtures.ts'
import { readLastAppLog, relaunch } from '../support/launch.ts'
import { APP_BINARY, LOGIN_ITEM_PLIST, PRODUCT_NAME } from '../support/paths.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import { loginItemPlists, readLoginItem, writeLoginItemExternally } from '../support/system.ts'
import * as win from '../support/window.ts'

async function expectLoginItem(on: boolean) {
  const state = await snapshot()
  expect(state.config.autostart_enabled).toBe(on)
  expect(state.login_item_registered).toBe(on)
  expect(await win.isLaunchAtLoginOn()).toBe(on)
  expect(fs.existsSync(LOGIN_ITEM_PLIST)).toBe(on)
}

describe('[Launch at login]', () => {
  it('[LOGIN-001] Fresh install, first launch -> the toggle reads off and no plist exists', async () => {
    await step('first launch on a fresh install', async () => {}, () => expectLoginItem(false), { timeout: 20_000 })
  })

  it('[LOGIN-002, LOGIN-003, LOGIN-014] Turn the toggle on -> plist with --hidden appears, and the dev-binary warning is logged', async () => {
    // A launch whose log this test can read.
    await quitViaTray()
    await relaunch({ via: 'binary' })

    await step('turn launch at login on', () => win.toggleLaunchAtLogin(), async () => {
      await expectLoginItem(true)
      const item = readLoginItem()!
      expect(item.ProgramArguments?.[0]).toBe(APP_BINARY)
      expect(item.ProgramArguments).toContain('--hidden')
      expect(item.RunAtLoad).toBe(true)
      expect(readLastAppLog()).toContain('registered a login item for a development binary')
    }, { timeout: 10_000 })
  })

  it('[LOGIN-006] Quit and relaunch with the toggle on -> still on, exactly one plist', async () => {
    if (!(await snapshot()).config.autostart_enabled) await win.toggleLaunchAtLogin()
    await quitViaTray()
    await step('relaunch', () => relaunch(), async () => {
      await expectLoginItem(true)
      expect(loginItemPlists()).toEqual([`${PRODUCT_NAME}.plist`])
    }, { timeout: 15_000 })
  })

  it('[LOGIN-010] Turn the toggle off -> the plist is removed', async () => {
    if (!(await snapshot()).config.autostart_enabled) await win.toggleLaunchAtLogin()
    await step('turn launch at login off', () => win.toggleLaunchAtLogin(), () => expectLoginItem(false), { timeout: 10_000 })
  })

  it('[LOGIN-012] Login item added outside the app while the toggle is off, then restart -> toggle reads on', async () => {
    if ((await snapshot()).config.autostart_enabled) await win.toggleLaunchAtLogin()
    await quitViaTray()
    writeLoginItemExternally({ Label: PRODUCT_NAME, ProgramArguments: [APP_BINARY, '--hidden'], RunAtLoad: true })

    await step('relaunch with a login item the app did not create', () => relaunch(), () => expectLoginItem(true), { timeout: 15_000 })
  })

  it('[LOGIN-013] Plist deleted while the toggle is on, then restart -> toggle reads on and the plist is re-created', async () => {
    if (!(await snapshot()).config.autostart_enabled) await win.toggleLaunchAtLogin()
    await quitViaTray()
    fs.rmSync(LOGIN_ITEM_PLIST, { force: true })

    await step('relaunch with the plist gone', () => relaunch(), () => expectLoginItem(true), { timeout: 15_000 })
  })
})
