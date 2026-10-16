/**
 * The one-time notices (feature 06, catalog area NOTE), asserted through the flags that record them.
 * Whether a banner actually appears stays a manual check: macOS may suppress it (Do Not Disturb,
 * notifications denied), and the app degrades silently by design.
 */
import { expect } from '@wdio/globals'
import fs from 'node:fs'
import { ensureShown, expectHidden, quitViaTray } from '../support/fixtures.ts'
import { relaunch } from '../support/launch.ts'
import * as os from '../support/os.ts'
import { APP_BINARY, CONFIG_FILE, PRODUCT_NAME } from '../support/paths.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import { writeLoginItemExternally } from '../support/system.ts'
import { removeLoginItem } from '../support/clean.ts'

const flags = async () => {
  const { config } = await snapshot()
  return { firstRun: config.first_run_prompt_shown, firstClose: config.first_close_notice_shown }
}

describe('[Notifications]', () => {
  it('[NOTE-001] Fresh install, first launch -> the launch-at-login offer is shown once', async () => {
    await step('first launch on a fresh install', async () => {}, async () => {
      expect(await flags()).toEqual({ firstRun: true, firstClose: false })
    }, { timeout: 20_000 })
  })

  it('[NOTE-002] Fresh install, first window close -> the still-running notice is shown', async () => {
    await ensureShown()
    await step('first close', () => os.clickCloseButton(), async () => {
      await expectHidden()
      expect((await flags()).firstClose).toBe(true)
    })
  })

  it('[NOTE-003] Close the window a second time -> no repeat', async () => {
    await ensureShown()
    const before = fs.readFileSync(CONFIG_FILE, 'utf8')
    await step('second close', () => os.clickCloseButton(), async () => {
      await expectHidden()
      expect((await flags()).firstClose).toBe(true)
      expect(fs.readFileSync(CONFIG_FILE, 'utf8')).toBe(before) // nothing re-recorded
    })
  })

  it('[NOTE-004] Relaunch once config exists -> no first-run offer again', async () => {
    await quitViaTray()
    const before = fs.readFileSync(CONFIG_FILE, 'utf8')
    await step('relaunch', () => relaunch(), async () => {
      expect(await flags()).toEqual({ firstRun: true, firstClose: true })
      expect(fs.readFileSync(CONFIG_FILE, 'utf8')).toBe(before)
    }, { timeout: 15_000 })
  })

  it('[NOTE-005] Delete app-config.json and relaunch -> both notices fire again', async () => {
    await quitViaTray()
    fs.rmSync(CONFIG_FILE, { force: true })
    await step('relaunch on a reset config', () => relaunch(), async () => {
      expect(await flags()).toEqual({ firstRun: true, firstClose: false })
    }, { timeout: 15_000 })
    await step('first close after the reset', () => os.clickCloseButton(), async () => {
      expect((await flags()).firstClose).toBe(true)
    })
  })

  it('[NOTE-006] Fresh install with autostart already registered -> the first-run offer is skipped', async () => {
    await quitViaTray()
    fs.rmSync(CONFIG_FILE, { force: true })
    writeLoginItemExternally({ Label: PRODUCT_NAME, ProgramArguments: [APP_BINARY, '--hidden'], RunAtLoad: true })
    try {
      await step('relaunch on a fresh install that is already registered', () => relaunch(), async () => {
        const { config, login_item_registered } = await snapshot()
        expect(login_item_registered).toBe(true)
        expect(config.autostart_enabled).toBe(true)
        expect(config.first_run_prompt_shown).toBe(false)
      }, { timeout: 15_000 })
    } finally {
      removeLoginItem()
    }
  })
})
