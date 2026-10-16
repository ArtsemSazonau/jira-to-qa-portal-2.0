/**
 * A scripted Tauri backend for the UI flows.
 *
 * Loaded only by `vite --mode mock` (see `main.tsx`); the production build drops the import, and
 * `scripts/test/check-mock-leak.mjs` fails the fast suite if any of it reaches `ui/dist`.
 *
 * A flow picks the backend's behaviour by setting `window.__MOCK_SCENARIO__` before the page loads
 * (Playwright's `addInitScript`), and asserts on `window.__IPC_CALLS__`, which records every command
 * the UI invoked, in order.
 */
import { mockIPC } from '@tauri-apps/api/mocks'

/** Searched for in `ui/dist` by the leak check. Keep it unique to this module. */
export const MOCK_MARKER = 'qa-portal-mock-backend'

export interface MockScenario {
  /** What the OS reports for the login item at start. Default `false`. */
  autostart?: boolean
  /** Whether the tray icon exists. Default `true`. */
  tray?: boolean
  /** When set, `set_autostart_enabled` rejects with this message. */
  failRegistration?: string
  /** Delay before every answer, to make loading and saving states observable. */
  latencyMs?: number
}

export interface IpcCall {
  cmd: string
  args: Record<string, unknown>
}

declare global {
  interface Window {
    __MOCK_SCENARIO__?: MockScenario
    __IPC_CALLS__?: IpcCall[]
  }
}

const scenario: Required<Omit<MockScenario, 'failRegistration'>> & MockScenario = {
  autostart: false,
  tray: true,
  latencyMs: 0,
  ...window.__MOCK_SCENARIO__,
}
let registered = scenario.autostart
const calls: IpcCall[] = []
window.__IPC_CALLS__ = calls

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

mockIPC(async (cmd, payload) => {
  const args = (payload ?? {}) as Record<string, unknown>
  calls.push({ cmd, args })
  if (scenario.latencyMs) await sleep(scenario.latencyMs)

  switch (cmd) {
    case 'get_autostart_enabled':
      return registered
    case 'get_tray_available':
      return scenario.tray
    case 'set_autostart_enabled':
      if (scenario.failRegistration) throw scenario.failRegistration
      registered = Boolean(args.enabled)
      return undefined
    case 'hide_main_window':
    case 'show_main_window':
      return undefined
    default:
      // A command the UI calls but this mock does not know is a gap in the mock, not a pass.
      throw new Error(`${MOCK_MARKER}: no scripted answer for "${cmd}"`)
  }
})

console.info(`${MOCK_MARKER}: active`, scenario)
