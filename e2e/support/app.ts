/**
 * The test build as an OS process: is it alive, is it a background app, end it.
 *
 * `backgroundOnly` reads System Events' `background only`, which reflects the activation policy
 * directly: `true` is `Accessory` (no Dock icon, not in ⌘-Tab), `false` is `Regular`. It is the probe
 * the performance cycle tests established, and needs the Automation grant the doctor checks.
 */
import { execFileSync } from 'node:child_process'
import { TEST_BUILD_PROCESS } from './paths.ts'

export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** PIDs of every running test-build process, from any checkout. */
export function testBuildPids(): number[] {
  try {
    return execFileSync('pgrep', ['-f', TEST_BUILD_PROCESS], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number)
  } catch {
    return [] // pgrep exits 1 when nothing matches
  }
}

export function backgroundOnly(pid: number): boolean {
  const out = execFileSync(
    'osascript',
    ['-e', `tell application "System Events" to get background only of first process whose unix id is ${pid}`],
    { encoding: 'utf8' },
  ).trim()
  if (out !== 'true' && out !== 'false') throw new Error(`unexpected "background only" answer: ${out}`)
  return out === 'true'
}

/** Wait until `pid` has exited. Resolves `true` if it did within the timeout. */
export async function waitForExit(pid: number, timeoutMs = 10_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isRunning(pid)) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return !isRunning(pid)
}

/** End the process without the app's cooperation — teardown only, never as a test action. */
export async function endProcess(pid: number) {
  if (!isRunning(pid)) return
  process.kill(pid, 'SIGTERM')
  if (!(await waitForExit(pid, 5_000))) process.kill(pid, 'SIGKILL')
}
