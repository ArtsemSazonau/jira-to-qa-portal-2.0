/**
 * Every step that changes the app's state is followed by an assertion of that change, retried
 * until it holds or times out. A step that silently did nothing therefore fails *where it happened*
 * — the lesson of three 50-cycle runs that measured nothing because the window never opened.
 *
 *   await step('click the close button', () => os.clickCloseButton(), async () => {
 *     expect((await snapshot()).core.window_visible).toBe(false)
 *   })
 */

let current: string | undefined

/** The step running now, for the failure report. */
export const currentStep = () => current

export class StepError extends Error {
  constructor(step: string, phase: 'act' | 'verify', cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    super(phase === 'act' ? `Step "${step}" failed: ${reason}` : `Step "${step}" did not take effect: ${reason}`)
    this.name = 'StepError'
  }
}

export async function step(
  name: string,
  act: () => Promise<unknown>,
  verify: () => Promise<void>,
  { timeout = 5_000, interval = 250 } = {},
) {
  current = name
  console.log(`  → ${name}`)
  try {
    await act()
  } catch (error) {
    throw new StepError(name, 'act', error)
  }

  const deadline = Date.now() + timeout
  let lastError: unknown
  while (Date.now() <= deadline) {
    try {
      await verify()
      current = undefined
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }
  throw new StepError(name, 'verify', lastError)
}
