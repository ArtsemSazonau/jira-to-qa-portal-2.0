/**
 * Launching the test build inside a spec, for scenarios that quit and relaunch the app.
 *
 * Every launch of the test build serves WebDriver on 4445 (`tauri-plugin-wdio-webdriver` defaults to
 * it when `TAURI_WEBDRIVER_PORT` is unset), so after a relaunch `browser.reloadSession()` simply opens
 * a new session against the new process. The Appium session is dropped and reopened lazily, because
 * it holds a reference to the old process.
 */
import { browser } from '@wdio/globals'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { testBuildPids, waitForExit } from './app.ts'
import { endOsSession } from './os.ts'
import { APP_BINARY, APP_BUNDLE, BUNDLE_ID, REPORT_DIR } from './paths.ts'

const WEBDRIVER_STATUS = 'http://127.0.0.1:4445/status'

let launches = 0
let lastLog: string | undefined

/** The log file of the most recent `launchBinary`, or undefined if the last launch went through `open`. */
export const lastAppLog = () => lastLog

export function readLastAppLog(): string {
  return lastLog && fs.existsSync(lastLog) ? fs.readFileSync(lastLog, 'utf8') : ''
}

/** PIDs of the WebKit helper processes on the machine (any app's). */
export function webKitHelperPids(): Set<number> {
  try {
    const out = execFileSync('pgrep', ['-f', 'WebKit.WebContent|WebKit.Networking|WebKit.GPU'], { encoding: 'utf8' })
    return new Set(out.split('\n').filter(Boolean).map(Number))
  } catch {
    return new Set()
  }
}

/** Launch through Launch Services, as Finder, Spotlight or `open -a` would. */
export function launchWithOpen(args: string[] = []) {
  lastLog = undefined
  execFileSync('open', ['-a', APP_BUNDLE, ...(args.length ? ['--args', ...args] : [])])
}

/**
 * Run the executable directly, as a second process would be started. Its log (tauri-plugin-log writes
 * to stdout in debug builds) goes to `report/logs/app-<n>.log`. Returns the child, whose exit tells
 * whether the single-instance plugin handed off and quit.
 */
export function launchBinary(args: string[] = [], env: Record<string, string> = {}) {
  launches += 1
  fs.mkdirSync(path.join(REPORT_DIR, 'logs'), { recursive: true })
  lastLog = path.join(REPORT_DIR, 'logs', `app-${launches}.log`)
  const log = fs.openSync(lastLog, 'w')
  const child = spawn(APP_BINARY, args, {
    env: { ...process.env, RUST_LOG: 'info', ...env },
    stdio: ['ignore', log, log],
    detached: true,
  })
  child.unref()
  return child
}

export async function waitForWebDriver(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(WEBDRIVER_STATUS)
      const body = (await res.json()) as { value?: { ready?: boolean } }
      if (body.value?.ready) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`the test build did not serve WebDriver on 4445 within ${timeoutMs} ms`)
}

export interface Launched {
  pid: number
  /** WebKit helpers that appeared with this launch — this app's own. */
  webKitHelpers: number[]
}

/**
 * Start the test build after it has quit, and reconnect both sessions to it. `via: 'binary'` captures
 * its log (see `readLastAppLog`); `via: 'open'` goes through Launch Services.
 */
export async function relaunch({ via = 'binary', args = [] }: { via?: 'binary' | 'open'; args?: string[] } = {}) {
  const running = testBuildPids()
  if (running.length) throw new Error(`relaunch: the test build is still running (${running.join(', ')})`)
  const before = webKitHelperPids()

  if (via === 'open') launchWithOpen(args)
  else launchBinary(args)

  await waitForWebDriver()
  await endOsSession()
  await browser.reloadSession()

  // The helpers are spawned by launchd shortly after the window loads.
  await new Promise((resolve) => setTimeout(resolve, 2_000))
  const [pid] = testBuildPids()
  const webKitHelpers = [...webKitHelperPids()].filter((p) => !before.has(p))
  lastLaunch = { pid, webKitHelpers }
  return lastLaunch
}

let lastLaunch: Launched | undefined

/** What the most recent `relaunch` started, if the running app came from one. */
export const lastLaunched = () => lastLaunch

/** Relaunch only if a test left the app quit, so the next test has one to work with. */
export async function ensureRunning() {
  if (testBuildPids().length === 0) await relaunch()
}

/** Wait for every test-build process to exit. */
export async function waitForAllExited(timeoutMs = 10_000) {
  for (const pid of testBuildPids()) await waitForExit(pid, timeoutMs)
  return testBuildPids().length === 0
}

/** A Quit AppleEvent, as logout, shutdown or a script sends. */
export function sendQuitAppleEvent() {
  execFileSync('osascript', ['-e', `tell application id "${BUNDLE_ID}" to quit`])
}
