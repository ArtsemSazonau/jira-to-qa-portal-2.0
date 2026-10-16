/**
 * End-to-end tests against the test build (`npm run build:e2e` at the repo root).
 *
 * Two WebDriver sessions per scenario:
 * - `browser` — the embedded WebDriver server inside the app (`tauri-plugin-wdio-webdriver`),
 *   started by @wdio/tauri-service; drives the webview through DOM selectors (support/window.ts).
 * - the `os` session — Appium's Mac2 driver against the same app's Accessibility tree, for the menu
 *   bar icon, the close button and the Dock (support/os.ts). Appium is started here.
 *
 * Specs run one at a time (one menu bar, one single-instance lock). The app is launched once by the
 * service; a spec file that ends the app gets a fresh one for the next spec file.
 *
 *   npm run test:e2e      from the repo root: cleanup, then this config
 */
import fs from 'node:fs'
import path from 'node:path'
import { startAppium, stopAppium } from './support/appium.ts'
import { endProcess, testBuildPids } from './support/app.ts'
import { cleanAll, removeLoginItem, wipeConfig } from './support/clean.ts'
import { registerOnlyThisTestBundle } from './support/launchservices.ts'
import { endOsSession, openOsSessionEagerly } from './support/os.ts'
import { APP_BINARY, REPORT_DIR } from './support/paths.ts'
import { attachFailure, writeIndex } from './support/report.ts'

const LOG_DIR = path.join(REPORT_DIR, 'logs')

/** Failed attempts per test title in this worker, so each retry gets its own failure directory. */
const failedAttempts = new Map<string, number>()

function resetAppState() {
  removeLoginItem()
  wipeConfig()
}

function latestWorkerLog(): string | undefined {
  if (!fs.existsSync(LOG_DIR)) return undefined
  const logs = fs
    .readdirSync(LOG_DIR)
    .filter((f) => f.startsWith('wdio-') && f.endsWith('.log'))
    .map((f) => path.join(LOG_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return logs[0] ? fs.readFileSync(logs[0], 'utf8') : undefined
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./specs/**/*.e2e.ts'],
  maxInstances: 1,
  outputDir: LOG_DIR,
  logLevel: 'info',

  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': {
        application: APP_BINARY,
      },
      'wdio:tauriServiceOptions': {
        driverProvider: 'embedded',
        // The app's Rust log (tauri-plugin-log, Info in debug builds) lands in the worker log.
        captureBackendLogs: true,
        backendLogLevel: 'info',
        captureFrontendLogs: true,
      },
    } as WebdriverIO.Capabilities,
  ],
  services: ['@wdio/tauri-service'],

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
    // One retry per test; a pass on the retry is recorded as flaky (afterTest below).
    retries: 1,
  },
  reporters: ['spec', ['junit', { outputDir: path.join(REPORT_DIR, 'junit') }]],

  onPrepare() {
    // Not cleared here: WebdriverIO has already opened its log in report/logs. scripts/test/e2e.sh
    // clears the report before it starts WebdriverIO.
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    // Appium finds the app through Launch Services; make sure it finds this checkout's bundle.
    registerOnlyThisTestBundle()
    // Cleanup before the first spec happens in scripts/test/e2e.sh, before WebdriverIO starts: doing
    // it here could race the service, which launches the app in its own onPrepare.
    return startAppium()
  },

  async afterTest(test, _context, result) {
    if (!result.passed) {
      const spec = test.file ?? test.parent ?? 'spec'
      const title = test.fullTitle ?? `${test.parent ?? ''} ${test.title ?? ''}`.trim()
      // One directory per attempt: a retry starts from the failed attempt's state and usually fails
      // differently, so it must not overwrite the first, real failure.
      const attempt = (failedAttempts.get(title) ?? 0) + 1
      failedAttempts.set(title, attempt)
      const dir = await attachFailure(spec, title, result.error, latestWorkerLog(), attempt)
      console.error(`e2e failure details: ${path.relative(process.cwd(), dir)}`)
    } else if (failedAttempts.has(test.fullTitle ?? test.title)) {
      fs.appendFileSync(path.join(REPORT_DIR, 'flaky.txt'), `${test.fullTitle ?? test.title} — passed on a retry\n`)
    }
  },

  // Not under mocha's per-test timeout, so a first-run runner build and the Accessibility prompt can
  // take their time here; a test then never waits on them.
  async before() {
    await openOsSessionEagerly()
  },

  async after() {
    await endOsSession()
    // A spec that ended the app itself (a Quit test) leaves a session whose server is gone, and the
    // runner's deleteSession() would throw and fail the whole spec file. Drop the dead session; the
    // runner then skips the delete — and afterSession with it — so tear down here.
    if (testBuildPids().length === 0) {
      // The real browser object: @wdio/globals' `browser` is a proxy, and a property set on it never
      // reaches the instance the runner holds.
      ;(globalThis as unknown as { browser: { sessionId?: string } }).browser.sessionId = undefined
      resetAppState()
    }
  },

  // After each spec file's session: end the app and wipe its state. The service relaunches it before
  // the next spec file (onWorkerStart), so every spec file starts as a first launch on a fresh install.
  async afterSession() {
    for (const pid of testBuildPids()) await endProcess(pid)
    resetAppState()
  },

  onComplete() {
    writeIndex()
    stopAppium()
    // After the last spec: leave no test-build login item, config or process behind.
    cleanAll()
  },
}
