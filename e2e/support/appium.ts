/**
 * The Appium server the `os` session talks to, started and stopped by wdio.conf.ts.
 *
 * Appium is a local dependency of e2e/, and so is the Mac2 driver (`appium-mac2-driver` in
 * package.json), so no global install or `appium driver install` is needed.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { E2E_DIR, REPORT_DIR } from './paths.ts'

export const APPIUM_HOST = '127.0.0.1'
export const APPIUM_PORT = Number(process.env.E2E_APPIUM_PORT ?? 4723)

let server: ChildProcess | undefined

const answers = async () => {
  try {
    return (await fetch(`http://${APPIUM_HOST}:${APPIUM_PORT}/status`)).ok
  } catch {
    return false
  }
}

export async function startAppium(timeoutMs = 60_000) {
  // Never reuse a server we did not start: a stale one from an interrupted run hangs new sessions.
  if (await answers()) {
    throw new Error(
      `something already answers on ${APPIUM_HOST}:${APPIUM_PORT} — probably Appium left by an interrupted run. ` +
        'Run `node e2e/support/clean.ts`, or find it with `lsof -nP -iTCP:4723 -sTCP:LISTEN`.',
    )
  }
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const log = fs.openSync(path.join(REPORT_DIR, 'appium.log'), 'w')
  server = spawn(
    path.join(E2E_DIR, 'node_modules/.bin/appium'),
    ['--address', APPIUM_HOST, '--port', String(APPIUM_PORT), '--log-no-colors'],
    { cwd: E2E_DIR, stdio: ['ignore', log, log] },
  )

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Appium exited early (${server.exitCode}); see e2e/report/appium.log`)
    if (await answers()) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Appium did not answer on ${APPIUM_HOST}:${APPIUM_PORT} within ${timeoutMs} ms; see e2e/report/appium.log`)
}

export function stopAppium() {
  server?.kill()
  server = undefined
}
