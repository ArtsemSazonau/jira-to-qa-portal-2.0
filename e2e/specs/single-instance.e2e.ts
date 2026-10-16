/**
 * Launching an app that is already running (feature 05, catalog area INST). Two paths, both needed:
 * Launch Services activation (`open -a`, as Finder and Spotlight do) arrives as `RunEvent::Reopen`;
 * running the executable again starts a second process, which the single-instance plugin hands off.
 */
import { expect } from '@wdio/globals'
import { testBuildPids, waitForExit } from '../support/app.ts'
import { ensureHidden, ensureShown, expectShown } from '../support/fixtures.ts'
import { launchBinary, launchWithOpen } from '../support/launch.ts'
import * as os from '../support/os.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'

async function expectOneInstance() {
  expect(testBuildPids()).toHaveLength(1)
  expect((await snapshot()).platform.tray_exists).toBe(true)
  expect(await os.windowCount()).toBe(1)
}

describe('[Single instance]', () => {
  it('[INST-001, INST-002, INST-004] open -a while hidden -> the existing window appears, one process, one icon', async () => {
    await ensureHidden()
    const { pid } = await snapshot()
    await step('open -a (hidden)', async () => launchWithOpen(), async () => {
      await expectShown()
      await expectOneInstance()
      expect((await snapshot()).pid).toBe(pid)
    }, { timeout: 10_000 })
  })

  it('[INST-003] open -a while visible -> the existing window comes forward, no second window', async () => {
    await ensureShown()
    await step('open -a (visible)', async () => launchWithOpen(), async () => {
      await expectShown()
      await expectOneInstance()
      expect(await os.appState()).toBe(4)
    }, { timeout: 10_000 })
  })

  it('[INST-005] Run the binary directly while an instance runs -> the second exits, the first reveals its window', async () => {
    await ensureHidden()
    const { pid } = await snapshot()
    // Its own WebDriver port, in case it gets as far as starting the server before handing off.
    const second = launchBinary([], { TAURI_WEBDRIVER_PORT: '4446' })
    await step('run the executable again', async () => {}, async () => {
      expect(await waitForExit(second.pid!, 1_000)).toBe(true)
      await expectShown()
      await expectOneInstance()
      expect((await snapshot()).pid).toBe(pid)
    }, { timeout: 15_000 })
  })

  it('[INST-006] Relaunch 5 times quickly -> still one window and one tray icon', async () => {
    await ensureHidden()
    await step('open -a five times', async () => {
      for (let i = 0; i < 5; i++) launchWithOpen()
    }, async () => {
      await expectShown()
      await expectOneInstance()
    }, { timeout: 15_000 })
  })
})
