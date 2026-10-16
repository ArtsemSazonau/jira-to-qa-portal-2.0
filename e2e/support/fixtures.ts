/**
 * State checks and set-ups shared by the specs. Tests in one spec file share one app process, and a
 * retried test starts from wherever the failed attempt left off, so each test re-establishes the
 * state it needs instead of assuming the previous test's.
 */
import { expect } from '@wdio/globals'
import { backgroundOnly, isRunning } from './app.ts'
import * as os from './os.ts'
import { snapshot } from './state.ts'
import { step } from './step.ts'

/** Shown: the core and the platform agree, Regular policy, one window, the app in front. */
export async function expectShown() {
  const state = await snapshot()
  expect(state.core.window_visible).toBe(true)
  expect(state.platform.window_visible).toBe(true)
  expect(backgroundOnly(state.pid)).toBe(false)
  expect(await os.windowCount()).toBe(1)
}

/** Hidden to the tray: no window, Accessory policy (no Dock icon, not in ⌘-Tab), tray kept, alive. */
export async function expectHidden() {
  const state = await snapshot()
  expect(state.core.window_visible).toBe(false)
  expect(state.platform.window_visible).toBe(false)
  expect(state.platform.tray_exists).toBe(true)
  expect(isRunning(state.pid)).toBe(true)
  expect(backgroundOnly(state.pid)).toBe(true)
}

/** Make sure the window is shown, through the tray, before a test that needs it. */
export async function ensureShown() {
  if ((await snapshot()).core.window_visible) return
  await step('show the window (set-up)', () => os.chooseTrayItem('Show Window'), expectShown)
}

/** Make sure the window is hidden, through the close button, before a test that needs it. */
export async function ensureHidden() {
  if (!(await snapshot()).core.window_visible) return
  await step('hide the window (set-up)', () => os.clickCloseButton(), expectHidden)
}

/** Quit through the tray menu and wait until the process is gone. */
export async function quitViaTray() {
  const { pid } = await snapshot()
  await step('tray -> Quit', () => os.chooseTrayItem('Quit'), async () => {
    expect(isRunning(pid)).toBe(false)
  }, { timeout: 10_000 })
}
