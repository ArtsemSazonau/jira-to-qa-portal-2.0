/**
 * The window's tabs in the built app's WKWebView (feature 09, catalog area TAB). The component tests
 * and UI flows cover the behaviour in jsdom and WebKit; this checks the real window renders and
 * switches them, and that the one real setting still works from its tab.
 */
import { expect } from '@wdio/globals'
import { expectShown } from '../support/fixtures.ts'
import { snapshot } from '../support/state.ts'
import { step } from '../support/step.ts'
import * as win from '../support/window.ts'

describe('[Window tabs]', () => {
  it('[TAB-014] Open the window -> four tabs in order, Settings selected, each tab shows its own panel', async () => {
    await step('the app is up on a fresh install', async () => {}, expectShown, { timeout: 20_000 })

    await step('the tab list is rendered', async () => {}, async () => {
      expect(await win.tabNames()).toEqual(['Settings', 'QA Portal sync', 'Timesheet', 'GitHub jobs'])
      expect(await win.selectedTab()).toBe('Settings')
      expect(await win.isPanelShown('Settings')).toBe(true)
    }, { timeout: 10_000 })

    const names = Object.keys(win.TABS) as win.TabName[]
    for (const name of [...names.slice(1), names[0]]) {
      await step(`select the ${name} tab`, () => win.selectTab(name), async () => {
        expect(await win.selectedTab()).toBe(name)
        for (const other of names) expect(await win.isPanelShown(other)).toBe(other === name)
      })
    }
  })

  it('[TAB-015] Visit GitHub jobs, return to Settings, toggle launch at login -> the setting is persisted', async () => {
    await win.selectTab('GitHub jobs')
    await step('return to the Settings tab', () => win.selectTab('Settings'), async () => {
      expect(await win.selectedTab()).toBe('Settings')
    })

    const before = (await snapshot()).config.autostart_enabled
    await step('toggle launch at login', () => win.toggleLaunchAtLogin(), async () => {
      expect((await snapshot()).config.autostart_enabled).toBe(!before)
    }, { timeout: 10_000 })

    // Leave it as found, so no login item outlives the spec.
    await step('toggle it back', () => win.toggleLaunchAtLogin(), async () => {
      expect((await snapshot()).config.autostart_enabled).toBe(before)
    }, { timeout: 10_000 })
  })
})
