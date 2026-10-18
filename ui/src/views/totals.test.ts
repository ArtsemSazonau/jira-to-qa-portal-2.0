import { describe, expect, it } from 'vitest'
import { columnTotals, delta, formatDelta, sum } from './totals'

describe('totals', () => {
  it('[SYNC-001, TIME-001] sums a row', () => {
    expect(sum([0, 2, 5, 3, 1])).toBe(11)
    expect(sum([8, 0.5])).toBe(8.5)
    expect(sum([])).toBe(0)
  })

  it('[SYNC-001, TIME-001] sums each column, and gives zeros for an empty table', () => {
    expect(
      columnTotals(
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
        3,
      ),
    ).toEqual([5, 7, 9])
    expect(columnTotals([], 3)).toEqual([0, 0, 0])
  })

  it('[SYNC-002] reports a rise and a fall as signed deltas', () => {
    expect(formatDelta(delta(5, 4))).toBe('+1')
    expect(formatDelta(delta(2, 4))).toBe('−2')
  })

  it('[SYNC-002] shows no delta when the count is unchanged or has no previous value', () => {
    expect(formatDelta(delta(3, 3))).toBeNull()
    expect(delta(3, undefined)).toBe(0)
  })
})
