/* ── Feature Flag System ── */

const FLAGS_KEY = 'retro-stock-os:feature-flags'

interface FeatureFlags {
  sqlite_enabled: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  sqlite_enabled: true, // SQLite enabled by default (Phase 5 complete)
}

export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  try {
    const stored = localStorage.getItem(FLAGS_KEY)
    if (!stored) return DEFAULT_FLAGS[flag]
    const flags = JSON.parse(stored) as Partial<FeatureFlags>
    return flags[flag] ?? DEFAULT_FLAGS[flag]
  } catch {
    return DEFAULT_FLAGS[flag]
  }
}

export function setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
  try {
    const stored = localStorage.getItem(FLAGS_KEY)
    const flags = stored ? (JSON.parse(stored) as Partial<FeatureFlags>) : {}
    flags[flag] = value
    localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
  } catch (error) {
    console.error('[FeatureFlags] Failed to set flag:', error)
  }
}

export function getAllFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(FLAGS_KEY)
    if (!stored) return DEFAULT_FLAGS
    return { ...DEFAULT_FLAGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_FLAGS
  }
}
