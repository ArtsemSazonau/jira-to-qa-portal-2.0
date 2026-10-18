/**
 * What the user has chosen on the GitHub jobs tab, and every rule that keeps it consistent.
 *
 * Pure: the view keeps a `Selection` in state and calls these functions, holding no rules of its
 * own, so real dispatch can reuse them unchanged. Turning Run off changes nothing but `run` — the
 * platform's other values are kept, ignored by `effectiveJobs` and shown disabled by the view, which
 * is how they come back when Run is turned on again.
 */
import { PLATFORM_IDS, type PlatformId } from '../../domain/platforms'

export type Column = 'run' | 'prodEnv' | 'devMode'

export interface PlatformChoice {
  run: boolean
  prodEnv: boolean
  devMode: boolean
  devices: readonly string[]
}

export interface Selection {
  branch: string
  release: boolean
  platforms: Readonly<Record<PlatformId, PlatformChoice>>
}

/** The state of a column's All checkbox. */
export type AllState = 'on' | 'off' | 'mixed' | 'disabled'

/** One platform as it would be dispatched. */
export interface Job {
  platform: PlatformId
  prodEnv: boolean
  devMode: boolean
  devices: readonly string[]
}

const OFF: PlatformChoice = { run: false, prodEnv: false, devMode: false, devices: [] }

function mapPlatforms(
  selection: Selection,
  change: (choice: PlatformChoice, platform: PlatformId) => PlatformChoice,
): Selection {
  const platforms = Object.fromEntries(
    PLATFORM_IDS.map((platform) => [platform, change(selection.platforms[platform], platform)]),
  ) as Record<PlatformId, PlatformChoice>
  return { ...selection, platforms }
}

/** Everything off, no devices, Release off. */
export function initialSelection(branch: string): Selection {
  const platforms = Object.fromEntries(PLATFORM_IDS.map((platform) => [platform, OFF])) as Record<
    PlatformId,
    PlatformChoice
  >
  return { branch, release: false, platforms }
}

/** Another branch starts from scratch: nothing is remembered per branch. */
export function withBranch(_selection: Selection, branch: string): Selection {
  return initialSelection(branch)
}

export function setRelease(selection: Selection, release: boolean): Selection {
  return { ...selection, release }
}

/** Flip one checkbox. Prod env and Dev mode cannot change while the platform's Run is off. */
export function toggle(selection: Selection, platform: PlatformId, column: Column): Selection {
  const choice = selection.platforms[platform]
  if (column !== 'run' && !choice.run) return selection
  return mapPlatforms(selection, (current, id) =>
    id === platform ? { ...current, [column]: !current[column] } : current,
  )
}

/** Select or deselect a device. Ignored while the platform's Run is off. */
export function toggleDevice(selection: Selection, platform: PlatformId, device: string): Selection {
  const choice = selection.platforms[platform]
  if (!choice.run) return selection
  const devices = choice.devices.includes(device)
    ? choice.devices.filter((name) => name !== device)
    : [...choice.devices, device]
  return mapPlatforms(selection, (current, id) => (id === platform ? { ...current, devices } : current))
}

/** The rows a column's All checkbox counts: every platform for Run, Run-on platforms otherwise. */
function countedRows(selection: Selection, column: Column): PlatformId[] {
  return column === 'run'
    ? [...PLATFORM_IDS]
    : PLATFORM_IDS.filter((platform) => selection.platforms[platform].run)
}

export function allState(selection: Selection, column: Column): AllState {
  const rows = countedRows(selection, column)
  if (rows.length === 0) return 'disabled'
  const checked = rows.filter((platform) => selection.platforms[platform][column]).length
  if (checked === 0) return 'off'
  return checked === rows.length ? 'on' : 'mixed'
}

/** Off or mixed checks every counted row; on unchecks them. Rows not counted are left alone. */
export function toggleAll(selection: Selection, column: Column): Selection {
  const state = allState(selection, column)
  if (state === 'disabled') return selection
  const rows = new Set(countedRows(selection, column))
  const value = state !== 'on'
  return mapPlatforms(selection, (current, id) => (rows.has(id) ? { ...current, [column]: value } : current))
}

/** What would be dispatched: Run-on platforms only, with their values. No devices means build only. */
export function effectiveJobs(selection: Selection): Job[] {
  return PLATFORM_IDS.filter((platform) => selection.platforms[platform].run).map((platform) => {
    const { prodEnv, devMode, devices } = selection.platforms[platform]
    return { platform, prodEnv, devMode, devices }
  })
}

export function summary(selection: Selection): { jobs: number; devices: number } {
  const jobs = effectiveJobs(selection)
  return { jobs: jobs.length, devices: jobs.reduce((total, job) => total + job.devices.length, 0) }
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** The Run jobs button's label. */
export function summaryLabel({ jobs, devices }: { jobs: number; devices: number }): string {
  if (jobs === 0) return 'No platform selected'
  const run = `Run ${plural(jobs, 'job')}`
  return devices === 0 ? `${run}, no deployment` : `${run}, deploy to ${plural(devices, 'device')}`
}
