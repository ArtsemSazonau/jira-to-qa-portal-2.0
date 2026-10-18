/** Date formatting shared by the views. Fixed to en-GB so every machine renders the same text. */

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Fri 16 Oct, 09:00" from a local ISO date-time. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso))
}

/** "Mon 12 Oct" from a date. */
export function formatDay(date: Date): string {
  return DAY.format(date)
}

/** Monday to Friday of the week starting on `weekStart`, a local ISO date (YYYY-MM-DD). */
export function weekdays(weekStart: string): Date[] {
  const [year, month, day] = weekStart.split('-').map(Number)
  return Array.from({ length: 5 }, (_, offset) => new Date(year, month - 1, day + offset))
}
