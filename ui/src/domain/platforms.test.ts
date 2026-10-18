import { describe, expect, it } from 'vitest'
import { PLATFORM_IDS, PLATFORMS } from './platforms'

describe('platforms', () => {
  it('[GH-001] lists the seven platforms in display order', () => {
    expect(PLATFORMS.map((platform) => platform.label)).toEqual([
      'Android mobile',
      'iOS mobile',
      'Android TV',
      'Fire TV',
      'Apple TV',
      'Samsung',
      'LG',
    ])
  })

  it('[GH-001] gives each platform a unique id', () => {
    expect(new Set(PLATFORM_IDS).size).toBe(PLATFORMS.length)
  })
})
