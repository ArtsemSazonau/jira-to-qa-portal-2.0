/**
 * Sample data for the preview tabs, until the features behind them exist.
 *
 * The types are the shapes the future IPC wrappers in `lib/ipc.ts` are expected to return; each view
 * takes its data as a prop defaulting to these values, so wiring a feature replaces one default.
 * Times are local ISO strings without a zone, so they render the same on every machine.
 *
 * This ships in the release bundle. Every view that shows it says so on screen.
 */
import type { PlatformId } from '../domain/platforms'
import type { Severity } from '../domain/severities'

export type SyncStatus = 'idle' | 'running' | 'succeeded' | 'failed'
export type StepOutcome = 'done' | 'failed' | 'skipped' | 'not run'
export type SyncStep = 'Jira' | 'Group' | 'Portal login' | 'Update' | 'Verify'
export type Counts = Record<PlatformId, Record<Severity, number>>

export interface SyncSnapshot {
  status: SyncStatus
  lastSync: { at: string; outcome: 'succeeded' | 'failed' } | null
  nextSync: string | null
  steps: { step: SyncStep; outcome: StepOutcome }[]
  counts: Counts
  /** The counts written by the sync before the last one, to show what moved. */
  previousCounts: Counts | null
  /** Tickets the last sync left out because their platform was not recognised. */
  skippedTickets: number
  report: string
}

export interface TimesheetProject {
  name: string
  hoursPerDay: number
}

export interface TimesheetWeek {
  /** The Monday of the week, as a local ISO date. */
  weekStart: string
  projects: TimesheetProject[]
  status: 'draft' | 'submitted'
  nextSubmission: string
}

export interface CiCatalog {
  branches: string[]
  defaultBranch: string
  devices: Record<PlatformId, string[]>
}

const counts = (rows: Record<PlatformId, [number, number, number, number, number]>): Counts =>
  Object.fromEntries(
    Object.entries(rows).map(([platform, [blocker, critical, major, minor, trivial]]) => [
      platform,
      { blocker, critical, major, minor, trivial },
    ]),
  ) as Counts

export const SAMPLE_SYNC: SyncSnapshot = {
  status: 'idle',
  lastSync: { at: '2026-10-16T09:00:00', outcome: 'succeeded' },
  nextSync: '2026-10-19T09:00:00',
  steps: [
    { step: 'Jira', outcome: 'done' },
    { step: 'Group', outcome: 'done' },
    { step: 'Portal login', outcome: 'done' },
    { step: 'Update', outcome: 'done' },
    { step: 'Verify', outcome: 'done' },
  ],
  counts: counts({
    android: [0, 2, 5, 3, 1],
    ios: [1, 1, 4, 2, 0],
    androidTv: [0, 0, 2, 1, 1],
    fireTv: [0, 1, 1, 0, 0],
    appleTv: [0, 0, 3, 2, 1],
    samsung: [0, 0, 2, 3, 0],
    lg: [0, 0, 1, 1, 0],
  }),
  previousCounts: counts({
    android: [0, 2, 4, 3, 1],
    ios: [1, 2, 4, 2, 0],
    androidTv: [0, 0, 2, 1, 1],
    fireTv: [0, 0, 1, 0, 0],
    appleTv: [0, 0, 3, 2, 1],
    samsung: [0, 0, 2, 4, 0],
    lg: [0, 0, 1, 1, 0],
  }),
  skippedTickets: 3,
  report: [
    'Done: login flow fixed on Android TV and Fire TV; subtitle sync on Apple TV.',
    'In progress: playback errors on Samsung Tizen 2021; iOS mini-player layout.',
    'Planned: LG webOS 23 certification pass; regression on the release branch.',
  ].join('\n'),
}

export const SAMPLE_TIMESHEET: TimesheetWeek = {
  weekStart: '2026-10-12',
  projects: [
    { name: 'Project A', hoursPerDay: 8 },
    { name: 'Project B', hoursPerDay: 0.5 },
  ],
  status: 'draft',
  nextSubmission: '2026-10-16T17:00:00',
}

export const SAMPLE_CI: CiCatalog = {
  branches: ['main', 'develop', 'release/2.4', 'feature/player-refactor'],
  defaultBranch: 'main',
  devices: {
    android: ['Pixel 7', 'Galaxy S23', 'Xiaomi 13'],
    ios: ['iPhone 15', 'iPhone SE', 'iPad Air'],
    androidTv: ['Shield TV', 'Chromecast with Google TV'],
    fireTv: ['Fire TV Stick 4K', 'Fire TV Cube'],
    appleTv: ['Apple TV 4K'],
    samsung: ['Tizen 2023', 'Tizen 2021'],
    lg: ['OLED C3', 'webOS 23'],
  },
}
