import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDay, weekdays } from './format'

describe('format', () => {
  it('[SYNC-004] shows a date-time as weekday, day, month and 24-hour time', () => {
    expect(formatDateTime('2026-10-16T09:00:00')).toBe('Fri 16 Oct, 09:00')
    expect(formatDateTime('2026-10-16T17:30:00')).toBe('Fri 16 Oct, 17:30')
  })

  it('[TIME-002] lists Monday to Friday of a week, across a month end', () => {
    expect(weekdays('2026-10-12').map(formatDay)).toEqual([
      'Mon 12 Oct',
      'Tue 13 Oct',
      'Wed 14 Oct',
      'Thu 15 Oct',
      'Fri 16 Oct',
    ])
    expect(weekdays('2026-10-26').map(formatDay).at(-1)).toBe('Fri 30 Oct')
    expect(weekdays('2026-11-30').map(formatDay).at(-1)).toBe('Fri 4 Dec')
  })
})
