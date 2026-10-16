/**
 * Puts the machine back to "the test build was never installed": no config, no login item, no
 * launchd job, no running test-build process. Never touches the real app — every path is derived
 * from the test build's own identifier and product name.
 *
 * Runs before WebdriverIO starts and whenever scripts/test/e2e.sh exits — including on Ctrl-C — and
 * after the last spec (wdio.conf.ts), so an interrupted run cannot leave the debug bundle starting at
 * login or a stale Appium server holding its port.
 *
 *   node support/clean.ts      from e2e/, to clean up by hand
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { CONFIG_DIR, E2E_DIR, LOGIN_ITEM_LABEL, LOGIN_ITEM_PLIST, TEST_BUILD_PROCESS } from './paths.ts'

const quietly = (file: string, args: string[]) => {
  try {
    execFileSync(file, args, { stdio: 'ignore' })
  } catch {
    // Nothing to stop or remove is the normal case.
  }
}

/** Remove the test build's config directory. The next launch is a fresh install. */
export function wipeConfig() {
  fs.rmSync(CONFIG_DIR, { recursive: true, force: true })
}

/** Remove the test build's login item: the plist, and the job launchd may have loaded from it. */
export function removeLoginItem() {
  quietly('launchctl', ['bootout', `gui/${process.getuid!()}/${LOGIN_ITEM_LABEL}`])
  fs.rmSync(LOGIN_ITEM_PLIST, { force: true })
}

/** Kill any test-build process still running — from this run, an interrupted one, or another checkout. */
export function killTestBuild() {
  quietly('pkill', ['-f', TEST_BUILD_PROCESS])
}

/**
 * Stop this harness's Appium server and the Mac2 driver's XCTest runner. A run that was interrupted
 * (Ctrl-C, a crash) never reaches `onComplete`; a stale server left on port 4723 then hangs the next
 * run's session request. Only the Appium started from e2e/ is matched; the runner is Mac2's own.
 */
export function stopAutomation() {
  // Either path form: the `.bin/appium` link we spawn, or the package file it resolves to.
  quietly('pkill', ['-f', `${path.join(E2E_DIR, 'node_modules')}/.*appium`])
  quietly('pkill', ['-f', 'WebDriverAgentRunner'])
  quietly('pkill', ['-f', 'xcodebuild.*WebDriverAgentMac'])
}

export function cleanAll() {
  stopAutomation()
  killTestBuild()
  removeLoginItem()
  wipeConfig()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  cleanAll()
  console.log('e2e clean: test-build config, login item, processes and automation servers removed')
}
