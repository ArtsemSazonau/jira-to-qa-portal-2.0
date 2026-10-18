/** QA Portal severity levels, in the order the portal and the sync table list them. */
export const SEVERITIES = [
  { id: 'blocker', label: 'Blocker' },
  { id: 'critical', label: 'Critical' },
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: 'trivial', label: 'Trivial' },
] as const

export type Severity = (typeof SEVERITIES)[number]['id']
