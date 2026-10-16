/**
 * The menu bar icon and its menu (feature 01, catalog area TRAY). The last test quits the app; the
 * harness relaunches it for the next spec file.
 */
import { expect } from '@wdio/globals'
import { isRunning, waitForExit } from '../support/app.ts'
import { ensureHidden, ensureShown, expectShown } from '../support/fixtures.ts'
import * as os from '../support/os.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import * as win from '../support/window.ts'

describe('[OS tray]', () => {
  it('[TRAY-001] Launch the app -> a tray icon appears in the menu bar', async () => {
    await step(
      'the app has launched',
      async () => {},
      async () => {
        expect((await snapshot()).platform.tray_exists).toBe(true)
        expect(await os.trayIconExists()).toBe(true)
      },
      { timeout: 20_000 },
    )
  })

  it('[TRAY-002] Left-click the icon -> menu shows Show Window, a separator, Quit', async () => {
    await step(
      'left-click the tray icon',
      () => os.openTrayMenu('left'),
      async () => expect(await os.trayMenuTitles()).toEqual(['Show Window', 'Quit']),
    )
    await os.pressEscape()
  })

  it('[TRAY-003] Right-click the icon -> the same menu opens', async () => {
    await step(
      'right-click the tray icon',
      () => os.openTrayMenu('right'),
      async () => expect(await os.trayMenuTitles()).toEqual(['Show Window', 'Quit']),
    )
    await os.pressEscape()
  })

  it('[TRAY-004] Show Window while the window is visible -> it comes forward, no second window', async () => {
    await ensureShown()
    await step('tray -> Show Window, already visible', () => os.chooseTrayItem('Show Window'), async () => {
      await expectShown()
      expect(await os.appState()).toBe(4) // foreground
    })
  })

  it('[TRAY-005] Show Window while hidden -> the same window reappears with its prior state', async () => {
    await ensureShown()
    await win.markPage('tray-005')
    const toggledOn = await win.isLaunchAtLoginOn()
    await ensureHidden()

    await step('tray -> Show Window, hidden', () => os.chooseTrayItem('Show Window'), async () => {
      await expectShown()
      expect(await win.pageMark()).toBe('tray-005')
      expect(await win.isLaunchAtLoginOn()).toBe(toggledOn)
    })
  })

  it('[TRAY-009] Quit the app -> the tray icon disappears immediately', async () => {
    const { pid } = await snapshot()
    await step('tray -> Quit', () => os.chooseTrayItem('Quit'), async () => {
      expect(await waitForExit(pid, 5_000)).toBe(true)
      expect(isRunning(pid)).toBe(false)
      expect(await os.appState()).toBe(1) // not running: its status item went with it
    })
  })
})
