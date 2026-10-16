/**
 * Make this checkout's test bundle the one Launch Services knows.
 *
 * Appium's Mac2 driver finds the app by its bundle identifier, which Launch Services resolves to a
 * registered bundle. Two problems follow, both seen on a fresh clone:
 * - a bundle the test service spawns directly is never registered, so the lookup finds nothing
 *   ("The app representing … could not be found");
 * - every checkout's test bundle shares the identifier, so with another one registered the lookup
 *   can resolve to that copy, which is not running — Appium launches it, it hands off to the running
 *   one and exits, and the session never opens.
 *
 * Targeting the bundle by path (`appium:appPath`) would avoid both, but stops XCUITest key presses
 * from reaching the app. So: unregister every other test bundle, register ours. Run in onPrepare.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { APP_BUNDLE, PRODUCT_NAME } from './paths.ts'

const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

const real = (p: string) => {
  try {
    return fs.realpathSync(p)
  } catch {
    return p
  }
}

/** Paths of every registered bundle named `<PRODUCT_NAME>.app`, from any checkout. */
export function registeredTestBundles(): string[] {
  const dump = execFileSync(LSREGISTER, ['-dump'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 })
  const pattern = new RegExp(`^path:\\s+(.*/${PRODUCT_NAME}\\.app)(?: \\(0x[0-9a-f]+\\))?$`, 'gm')
  return [...new Set([...dump.matchAll(pattern)].map((m) => m[1]))]
}

export function registerOnlyThisTestBundle() {
  const ours = real(APP_BUNDLE)
  for (const other of registeredTestBundles()) {
    if (real(other) === ours) continue
    try {
      execFileSync(LSREGISTER, ['-u', other], { stdio: 'ignore' })
      console.log(`e2e: unregistered another checkout's test bundle: ${other}`)
    } catch {
      // Already gone from disk is fine; Launch Services drops it on its own.
    }
  }
  execFileSync(LSREGISTER, ['-f', APP_BUNDLE], { stdio: 'ignore' })
}
