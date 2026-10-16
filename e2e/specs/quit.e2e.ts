/**
 * Every way out of the app (feature 03, catalog area QUIT). Each test quits the app; `afterEach`
 * relaunches it, so the next test has one to quit.
 */
import { expect } from '@wdio/globals'
import { isRunning, testBuildPids } from '../support/app.ts'
import { ensureHidden, ensureShown } from '../support/fixtures.ts'
import { ensureRunning, lastLaunched, sendQuitAppleEvent, webKitHelperPids } from '../support/launch.ts'
import * as os from '../support/os.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import { crashReportsSince } from '../support/system.ts'

/** The process is gone, nothing of the test build is left, and nothing crashed on the way out. */
async function expectQuitCleanly(pid: number, since: number) {
  expect(isRunning(pid)).toBe(false)
  expect(testBuildPids()).toEqual([])
  expect(crashReportsSince(since)).toEqual([])
}

describe('[Quit]', () => {
  afterEach(async () => {
    await ensureRunning()
  })

  it('[QUIT-001, QUIT-006, QUIT-008] Press ⌘Q with the window focused -> the process exits, nothing left, no crash', async () => {
    await ensureShown()
    const since = Date.now()
    const { pid } = await snapshot()
    await step('press ⌘Q', () => os.pressKeyInWindow('q', os.CMD), () => expectQuitCleanly(pid, since), { timeout: 10_000 })
  })

  it('[QUIT-002, QUIT-007] App menu → Quit -> the process exits and its WebKit helpers go with it', async () => {
    await ensureShown()
    const since = Date.now()
    const { pid } = await snapshot()
    const helpers = lastLaunched()?.webKitHelpers ?? []
    expect(helpers.length).toBeGreaterThan(0) // this instance came from a relaunch that recorded them

    await step('app menu -> Quit', () => os.chooseAppMenuQuit(), async () => {
      await expectQuitCleanly(pid, since)
      const alive = webKitHelperPids()
      expect(helpers.filter((p) => alive.has(p))).toEqual([])
    }, { timeout: 10_000 })
  })

  it('[QUIT-003] Tray → Quit with the window visible -> the process exits and the tray icon disappears', async () => {
    await ensureShown()
    const since = Date.now()
    const { pid } = await snapshot()
    await step('tray -> Quit (visible)', () => os.chooseTrayItem('Quit'), async () => {
      await expectQuitCleanly(pid, since)
      expect(await os.appState()).toBe(1)
    }, { timeout: 10_000 })
  })

  it('[QUIT-004] Tray → Quit with the window hidden -> the process exits and the tray icon disappears', async () => {
    await ensureHidden()
    const since = Date.now()
    const { pid } = await snapshot()
    await step('tray -> Quit (hidden)', () => os.chooseTrayItem('Quit'), async () => {
      await expectQuitCleanly(pid, since)
      expect(await os.appState()).toBe(1)
    }, { timeout: 10_000 })
  })

  it('[QUIT-005] Send a Quit AppleEvent -> the process exits', async () => {
    await ensureShown()
    const since = Date.now()
    const { pid } = await snapshot()
    await step('Quit AppleEvent', async () => sendQuitAppleEvent(), () => expectQuitCleanly(pid, since), { timeout: 10_000 })
  })

  it('[QUIT-009] ⌘Q while the window is hidden -> the app exits cleanly', async () => {
    await ensureHidden()
    const since = Date.now()
    const { pid } = await snapshot()
    // A hidden Accessory app has no window to type into; opening its tray menu makes it active.
    await os.openTrayMenu()
    await os.pressEscape()
    await step('press ⌘Q (hidden)', () => os.pressKey('q', os.CMD), () => expectQuitCleanly(pid, since), { timeout: 10_000 })
  })
})
