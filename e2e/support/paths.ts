/** Where the test build and everything it touches live. One place, so cleanup and asserts agree. */
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const REPO_ROOT = path.resolve(E2E_DIR, '..')

/** From src-tauri/tauri.e2e.conf.json. */
export const BUNDLE_ID = 'dev.sazonau.jira-to-qa-portal.e2e'
export const PRODUCT_NAME = 'jira-to-qa-portal-e2e'

export const APP_BUNDLE = path.join(REPO_ROOT, 'src-tauri/target/debug/bundle/macos', `${PRODUCT_NAME}.app`)
/** The executable inside the bundle — the Cargo package is named `app`. */
export const APP_BINARY = path.join(APP_BUNDLE, 'Contents/MacOS/app')
/**
 * Matches a test-build process from *any* checkout. Every copy shares the identity, and with it the
 * single-instance lock and WebDriver port 4445, so one from another clone breaks this run just as
 * much as one from this checkout.
 */
export const TEST_BUILD_PROCESS = `${PRODUCT_NAME}.app/Contents/MacOS/app`

export const CONFIG_DIR = path.join(os.homedir(), 'Library/Application Support', BUNDLE_ID)
export const CONFIG_FILE = path.join(CONFIG_DIR, 'app-config.json')
/** tauri-plugin-autostart names the LaunchAgent after productName, not the bundle id. */
export const LOGIN_ITEM_LABEL = PRODUCT_NAME
export const LOGIN_ITEM_PLIST = path.join(os.homedir(), 'Library/LaunchAgents', `${PRODUCT_NAME}.plist`)

export const REPORT_DIR = path.join(E2E_DIR, 'report')
