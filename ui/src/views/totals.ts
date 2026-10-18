/**
 * Row and column arithmetic shared by the sync table and the week grid. Pure, so the numbers a table
 * shows are tested without rendering it.
 */

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** The sum of each column. `width` is the column count, so an empty table still has its zeros. */
export function columnTotals(rows: readonly (readonly number[])[], width: number): number[] {
  return Array.from({ length: width }, (_, column) => sum(rows.map((row) => row[column] ?? 0)))
}

/** How far a count moved since the previous sync; 0 when there is no previous value. */
export function delta(current: number, previous: number | undefined): number {
  return previous === undefined ? 0 : current - previous
}

/** A signed delta for display ("+1", "−2"), or null when nothing changed. */
export function formatDelta(change: number): string | null {
  if (change === 0) return null
  return change > 0 ? `+${change}` : `−${Math.abs(change)}`
}
