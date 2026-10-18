/**
 * The GitHub jobs selection rules (spec `project-ci-jobs`), without rendering anything.
 */
import { describe, expect, it } from 'vitest'
import { PLATFORM_IDS, type PlatformId } from '../../domain/platforms'
import {
  allState,
  effectiveJobs,
  initialSelection,
  setRelease,
  summary,
  summaryLabel,
  toggle,
  toggleAll,
  toggleDevice,
  withBranch,
  type Selection,
} from './selection'

/** Apply several steps in order, to keep the scenarios readable. */
const apply = (selection: Selection, ...steps: ((s: Selection) => Selection)[]) =>
  steps.reduce((current, step) => step(current), selection)

const run = (platform: PlatformId) => (s: Selection) => toggle(s, platform, 'run')
const prod = (platform: PlatformId) => (s: Selection) => toggle(s, platform, 'prodEnv')
const dev = (platform: PlatformId) => (s: Selection) => toggle(s, platform, 'devMode')
const device = (platform: PlatformId, name: string) => (s: Selection) => toggleDevice(s, platform, name)

const start = () => initialSelection('main')

describe('defaults', () => {
  it('[GH-002] starts with every checkbox off, no devices and Release off', () => {
    const selection = start()

    expect(selection.branch).toBe('main')
    expect(selection.release).toBe(false)
    for (const platform of PLATFORM_IDS) {
      expect(selection.platforms[platform]).toEqual({ run: false, prodEnv: false, devMode: false, devices: [] })
    }
    expect(effectiveJobs(selection)).toEqual([])
  })
})

describe('per-platform checkboxes', () => {
  it('[GH-003] keeps Prod env and Dev mode independent of each other', () => {
    const selection = apply(start(), run('android'), prod('android'), dev('android'))

    expect(selection.platforms.android).toMatchObject({ prodEnv: true, devMode: true })
    expect(apply(selection, prod('android')).platforms.android).toMatchObject({ prodEnv: false, devMode: true })
  })

  it('[GH-004] keeps a platform\'s values when Run goes off, and shows them again when it comes back', () => {
    const chosen = apply(start(), run('android'), prod('android'), device('android', 'Pixel 7'))
    const off = apply(chosen, run('android'))

    expect(off.platforms.android).toEqual({ run: false, prodEnv: true, devMode: false, devices: ['Pixel 7'] })
    expect(apply(off, run('android')).platforms.android).toEqual(chosen.platforms.android)
  })

  it('[GH-005] ignores Prod env, Dev mode and device changes while Run is off', () => {
    const selection = start()

    expect(apply(selection, prod('fireTv'), dev('fireTv'), device('fireTv', 'Fire TV Stick 4K'))).toBe(selection)
  })

  it('[GH-006] toggles any number of devices, from none to all, and deselects on a second click', () => {
    const selection = apply(start(), run('ios'), device('ios', 'iPhone 15'), device('ios', 'iPad Air'))
    expect(selection.platforms.ios.devices).toEqual(['iPhone 15', 'iPad Air'])

    expect(apply(selection, device('ios', 'iPhone 15')).platforms.ios.devices).toEqual(['iPad Air'])
    expect(apply(selection, device('ios', 'iPhone 15'), device('ios', 'iPad Air')).platforms.ios.devices).toEqual([])
  })

  it('[GH-006] leaves other platforms untouched when one changes', () => {
    const selection = apply(start(), run('lg'), device('lg', 'OLED C3'))

    for (const platform of PLATFORM_IDS.filter((id) => id !== 'lg')) {
      expect(selection.platforms[platform]).toEqual(start().platforms[platform])
    }
  })
})

describe('what gets dispatched', () => {
  it('[GH-007] includes only Run-on platforms and ignores the kept values of the others', () => {
    const selection = apply(
      start(),
      run('samsung'),
      prod('samsung'),
      device('samsung', 'Tizen 2023'),
      run('samsung'),
      run('android'),
    )

    expect(effectiveJobs(selection)).toEqual([{ platform: 'android', prodEnv: false, devMode: false, devices: [] }])
  })

  it('[GH-007] dispatches a Run-on platform with no devices as build only', () => {
    expect(effectiveJobs(apply(start(), run('lg')))).toEqual([
      { platform: 'lg', prodEnv: false, devMode: false, devices: [] },
    ])
  })

  it('[GH-007] lists jobs in platform order, whatever order they were chosen in', () => {
    const jobs = effectiveJobs(apply(start(), run('lg'), run('android'), run('appleTv')))

    expect(jobs.map((job) => job.platform)).toEqual(['android', 'appleTv', 'lg'])
  })
})

describe('All checkboxes', () => {
  it('[GH-008] reads off, mixed and on for Run', () => {
    expect(allState(start(), 'run')).toBe('off')
    expect(allState(apply(start(), run('android'), run('ios')), 'run')).toBe('mixed')
    expect(allState(PLATFORM_IDS.reduce((s, id) => toggle(s, id, 'run'), start()), 'run')).toBe('on')
  })

  it('[GH-008] checks every platform from off or mixed, and unchecks them all from on', () => {
    const mixed = apply(start(), run('android'), run('ios'))
    const all = toggleAll(mixed, 'run')
    expect(PLATFORM_IDS.every((id) => all.platforms[id].run)).toBe(true)

    expect(PLATFORM_IDS.every((id) => toggleAll(start(), 'run').platforms[id].run)).toBe(true)

    const none = toggleAll(all, 'run')
    expect(PLATFORM_IDS.some((id) => none.platforms[id].run)).toBe(false)
  })

  it('[GH-009] Prod env and Dev mode All count and change only Run-on platforms', () => {
    const selection = apply(start(), run('android'), run('ios'))
    const prodAll = toggleAll(selection, 'prodEnv')

    expect(prodAll.platforms.android.prodEnv).toBe(true)
    expect(prodAll.platforms.ios.prodEnv).toBe(true)
    for (const platform of PLATFORM_IDS.filter((id) => id !== 'android' && id !== 'ios')) {
      expect(prodAll.platforms[platform].prodEnv).toBe(false)
    }
    expect(allState(prodAll, 'prodEnv')).toBe('on')
    expect(allState(apply(prodAll, prod('ios')), 'prodEnv')).toBe('mixed')
    expect(allState(toggleAll(selection, 'devMode'), 'devMode')).toBe('on')
  })

  it('[GH-009] a kept Prod env value on a Run-off platform does not count towards All', () => {
    const selection = apply(start(), run('android'), prod('android'), run('android'), run('ios'))

    expect(allState(selection, 'prodEnv')).toBe('off')
  })

  it('[GH-009] Prod env and Dev mode All are disabled when no platform runs', () => {
    const selection = start()

    expect(allState(selection, 'prodEnv')).toBe('disabled')
    expect(allState(selection, 'devMode')).toBe('disabled')
    expect(toggleAll(selection, 'prodEnv')).toBe(selection)
  })
})

describe('branch and release', () => {
  it('[GH-010] resets everything, Release included, when the branch changes', () => {
    const chosen = apply(start(), (s) => setRelease(s, true), run('ios'), device('ios', 'iPhone 15'))

    expect(withBranch(chosen, 'develop')).toEqual(initialSelection('develop'))
  })

  it('[GH-010] remembers nothing per branch: going back gives the defaults', () => {
    const onA = apply(initialSelection('a'), run('android'))
    const backToA = withBranch(withBranch(onA, 'b'), 'a')

    expect(backToA).toEqual(initialSelection('a'))
  })

  it('[GH-012] Release changes no other value', () => {
    const chosen = apply(start(), run('android'), prod('android'))
    const released = setRelease(chosen, true)

    expect(released.release).toBe(true)
    expect(released.platforms).toBe(chosen.platforms)
  })
})

describe('Run jobs label', () => {
  it('[GH-011] counts jobs and devices across Run-on platforms', () => {
    const selection = apply(
      start(),
      run('android'),
      device('android', 'Pixel 7'),
      run('ios'),
      device('ios', 'iPhone 15'),
      device('ios', 'iPad Air'),
    )

    expect(summary(selection)).toEqual({ jobs: 2, devices: 3 })
    expect(summaryLabel(summary(selection))).toBe('Run 2 jobs, deploy to 3 devices')
  })

  it('[GH-011] uses singular forms, says when nothing deploys, and when nothing is selected', () => {
    expect(summaryLabel({ jobs: 1, devices: 1 })).toBe('Run 1 job, deploy to 1 device')
    expect(summaryLabel({ jobs: 1, devices: 0 })).toBe('Run 1 job, no deployment')
    expect(summaryLabel({ jobs: 0, devices: 0 })).toBe('No platform selected')
  })
})
