/**
 * The config file on disk (feature 07, catalog area CONF): created, persisted, recovered from damage.
 * Relaunches go through the binary so each test can read the app's log.
 */
import { expect } from '@wdio/globals'
import fs from 'node:fs'
import { quitViaTray } from '../support/fixtures.ts'
import { readLastAppLog, relaunch } from '../support/launch.ts'
import { CONFIG_DIR, CONFIG_FILE } from '../support/paths.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import * as win from '../support/window.ts'

const stored = () => JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))

describe('[Config]', () => {
  it('[CONF-001] First launch -> app-config.json is created in Application Support', async () => {
    await step('first launch on a fresh install', async () => {}, async () => {
      expect(fs.existsSync(CONFIG_FILE)).toBe(true)
      expect((await snapshot()).config_path).toBe(CONFIG_FILE)
    }, { timeout: 20_000 })
  })

  it('[CONF-002] Toggle autostart on and quit -> the file has "autostart_enabled": true', async () => {
    if (!(await snapshot()).config.autostart_enabled) {
      await step('turn launch at login on', () => win.toggleLaunchAtLogin(), async () => {
        expect((await snapshot()).config.autostart_enabled).toBe(true)
      }, { timeout: 10_000 })
    }
    await quitViaTray()
    expect(stored().autostart_enabled).toBe(true)

    // Leave launch at login off for the tests below.
    await relaunch()
    await step('turn launch at login off', () => win.toggleLaunchAtLogin(), async () => {
      expect(stored().autostart_enabled).toBe(false)
    }, { timeout: 10_000 })
  })

  it('[CONF-003] Corrupt the file and relaunch -> app starts with defaults and logs a parse warning', async () => {
    await quitViaTray()
    fs.writeFileSync(CONFIG_FILE, '{')
    await step('relaunch with a corrupt config', () => relaunch(), async () => {
      const state = await snapshot()
      expect(state.config.autostart_enabled).toBe(false)
      expect(readLastAppLog()).toMatch(/config parse error at .*starting from defaults/)
    }, { timeout: 15_000 })
  })

  it('[CONF-004] Delete the file and relaunch -> app starts and the file is recreated', async () => {
    await quitViaTray()
    fs.rmSync(CONFIG_FILE, { force: true })
    await step('relaunch with no config', () => relaunch(), async () => {
      expect(fs.existsSync(CONFIG_FILE)).toBe(true)
    }, { timeout: 15_000 })
  })

  it('[CONF-005] Add an unknown key by hand and relaunch -> app starts and ignores it', async () => {
    await quitViaTray()
    const before = stored()
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...before, sync_interval_minutes: 30 }, null, 2))
    await step('relaunch with an unknown key', () => relaunch(), async () => {
      const { config } = await snapshot()
      expect(config).toEqual({
        autostart_enabled: before.autostart_enabled,
        first_close_notice_shown: before.first_close_notice_shown,
        first_run_prompt_shown: before.first_run_prompt_shown,
      })
    }, { timeout: 15_000 })
  })

  it('[CONF-006] Launch and toggle several times -> no .json.tmp left in the config dir', async () => {
    for (let i = 0; i < 2; i++) await win.toggleLaunchAtLogin()
    await step('toggling settled', async () => {}, async () => {
      expect(fs.readdirSync(CONFIG_DIR)).toEqual(['app-config.json'])
    })
  })

  it('[CONF-007] Make the config dir read-only and toggle -> the toggle still works and the log says "could not persist config"', async () => {
    const before = (await snapshot()).config.autostart_enabled
    fs.chmodSync(CONFIG_DIR, 0o555)
    try {
      await step('toggle with an unwritable config dir', () => win.toggleLaunchAtLogin(), async () => {
        expect((await snapshot()).login_item_registered).toBe(!before)
        expect(await win.isLaunchAtLoginOn()).toBe(!before)
        expect(readLastAppLog()).toContain('could not persist config')
      }, { timeout: 10_000 })
    } finally {
      fs.chmodSync(CONFIG_DIR, 0o755)
    }
  })
})
