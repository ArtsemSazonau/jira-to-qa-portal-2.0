/** Things the e2e specs read from the machine: the login item's plist, crash reports. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LOGIN_ITEM_PLIST, PRODUCT_NAME } from './paths.ts'

export interface LoginItem {
  Label?: string
  ProgramArguments?: string[]
  RunAtLoad?: boolean
}

/** The login item's plist, parsed, or undefined if it does not exist. */
export function readLoginItem(): LoginItem | undefined {
  if (!fs.existsSync(LOGIN_ITEM_PLIST)) return undefined
  return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', LOGIN_ITEM_PLIST], { encoding: 'utf8' }))
}

/** Every LaunchAgent plist that belongs to the test build — there must never be more than one. */
export function loginItemPlists(): string[] {
  const dir = path.dirname(LOGIN_ITEM_PLIST)
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(PRODUCT_NAME)) : []
}

/** Write a login item for the test build behind the app's back, as System Settings would. */
export function writeLoginItemExternally(item: LoginItem) {
  fs.mkdirSync(path.dirname(LOGIN_ITEM_PLIST), { recursive: true })
  const tmp = `${LOGIN_ITEM_PLIST}.json`
  fs.writeFileSync(tmp, JSON.stringify(item))
  execFileSync('plutil', ['-convert', 'xml1', '-o', LOGIN_ITEM_PLIST, tmp])
  fs.rmSync(tmp)
}

const REPORTS = path.join(os.homedir(), 'Library/Logs/DiagnosticReports')

/** Crash reports for the test build's executable (`app`) written after `since`. */
export function crashReportsSince(since: number): string[] {
  if (!fs.existsSync(REPORTS)) return []
  return fs
    .readdirSync(REPORTS)
    .filter((f) => /^app[-_].*\.(ips|crash)$/.test(f))
    .filter((f) => fs.statSync(path.join(REPORTS, f)).mtimeMs >= since)
}
