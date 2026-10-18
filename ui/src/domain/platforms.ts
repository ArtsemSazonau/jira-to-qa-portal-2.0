/**
 * The platforms the project ships to, in the order every screen lists them.
 *
 * Only an id and a display label live here. Mapping Jira and QA Portal names onto these ids belongs
 * to the Rust grouping once the sync lands; the ids are what the two sides will share.
 */
export const PLATFORMS = [
  { id: 'android', label: 'Android mobile' },
  { id: 'ios', label: 'iOS mobile' },
  { id: 'androidTv', label: 'Android TV' },
  { id: 'fireTv', label: 'Fire TV' },
  { id: 'appleTv', label: 'Apple TV' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'lg', label: 'LG' },
] as const

export type PlatformId = (typeof PLATFORMS)[number]['id']

export const PLATFORM_IDS: readonly PlatformId[] = PLATFORMS.map((platform) => platform.id)
