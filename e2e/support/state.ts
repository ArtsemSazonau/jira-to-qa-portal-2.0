/**
 * The core's state, from the test build's `e2e_snapshot` command (src-tauri/src/e2e.rs).
 *
 * Called through `window.__TAURI_INTERNALS__.invoke`, which every Tauri 2 webview has, over the
 * embedded WebDriver session — no extra plugin, frontend import or capability needed.
 */
import { browser } from '@wdio/globals'

export interface Snapshot {
  pid: number
  /** What the core believes: the inputs `policy::decide` sees. */
  core: { window_visible: boolean; tray_available: boolean; is_quitting: boolean }
  /** What the platform reports, asked independently. */
  platform: { window_visible: boolean | null; tray_exists: boolean }
  config: { autostart_enabled: boolean; first_close_notice_shown: boolean; first_run_prompt_shown: boolean }
  config_path: string
  login_item_registered: boolean | null
}

export async function snapshot(): Promise<Snapshot> {
  const result: unknown = await browser.execute(async () => {
    // @ts-expect-error - injected by Tauri into every webview
    return window.__TAURI_INTERNALS__.invoke('e2e_snapshot')
  })
  return result as Snapshot
}
