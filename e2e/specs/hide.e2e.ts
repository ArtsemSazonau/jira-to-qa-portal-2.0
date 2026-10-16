/**
 * Hiding to the menu bar and coming back (feature 02, catalog area HIDE).
 */
import { expect } from '@wdio/globals'
import { backgroundOnly, isRunning } from '../support/app.ts'
import { ensureShown, expectHidden, expectShown } from '../support/fixtures.ts'
import * as os from '../support/os.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import * as win from '../support/window.ts'

describe('[Hide to tray]', () => {
  it('[HIDE-001, HIDE-002, HIDE-003, HIDE-004] Click the close button -> hidden, no Dock icon, tray kept, process alive', async () => {
    await ensureShown()
    const { pid } = await snapshot()
    await step('click the close button', () => os.clickCloseButton(), async () => {
      await expectHidden() // window gone, Accessory (no Dock icon / ⌘-Tab entry), tray present
      expect(await os.windowCount()).toBe(0)
      expect(isRunning(pid)).toBe(true)
      expect((await snapshot()).pid).toBe(pid)
    })
  })

  it('[HIDE-005, HIDE-006] Tray Show Window after a hide -> Dock icon back, same window in front', async () => {
    await ensureShown()
    await win.markPage('hide-006')
    await step('click the close button', () => os.clickCloseButton(), expectHidden)

    await step('tray -> Show Window', () => os.chooseTrayItem('Show Window'), async () => {
      await expectShown() // Regular again: Dock icon and ⌘-Tab entry back
      expect(await os.appState()).toBe(4) // foreground, in front of other apps
      expect(await win.pageMark()).toBe('hide-006') // the same webview, not a fresh one
    })
  })

  it('[HIDE-007] Press ⌘W with the window focused -> it hides, the app does not quit', async () => {
    await ensureShown()
    const { pid } = await snapshot()
    await step('press ⌘W', () => os.pressKeyInWindow('w', os.CMD), async () => {
      await expectHidden()
      expect(isRunning(pid)).toBe(true)
    })
  })

  it('[HIDE-008] Click "Hide to menu bar" in the window -> the window hides as with the close button', async () => {
    await ensureShown()
    await step('click Hide to menu bar', () => win.clickHideButton(), expectHidden)
  })

  it('[HIDE-009] Hide then show 5 times quickly -> never more than one window, always focused in front', async () => {
    await ensureShown()
    await win.markPage('hide-009')
    for (let cycle = 1; cycle <= 5; cycle++) {
      await step(`cycle ${cycle}: close`, () => os.clickCloseButton(), async () => {
        expect((await snapshot()).core.window_visible).toBe(false)
        expect(backgroundOnly((await snapshot()).pid)).toBe(true)
      })
      await step(`cycle ${cycle}: show`, () => os.chooseTrayItem('Show Window'), async () => {
        await expectShown()
        expect(await os.appState()).toBe(4)
      })
    }
    expect(await win.pageMark()).toBe('hide-009')
  })
})
