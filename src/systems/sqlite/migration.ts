/* ── IndexedDB → SQLite Migration System ── */

import type { SaveData } from '../../types'
import { useGameStore } from '../../stores/gameStore'
import { initializeDB, saveDataToSQLite } from './index'
import type { SQLiteDB } from '@subframe7536/sqlite-wasm'
import { sqliteToSaveData } from './transformers'

const MIGRATION_KEY = 'retro-stock-os:migration-status'

interface MigrationStatus {
  completed: boolean
  timestamp: number
  version: number
  sourceDataHash?: string
}

/**
 * Migrate complete game state from IndexedDB to SQLite
 * CRITICAL: Never deletes IndexedDB data - it remains as backup until Phase 5
 */
export async function migrateIndexedDBToSQLite(): Promise<void> {
  // 1. Check if already migrated
  const status = getMigrationStatus()
  if (status.completed) {
    console.log('[Migration] Already completed, skipping')
    return
  }

  console.log('[Migration] Starting IndexedDB → SQLite migration...')

  try {
    // 2. Get FULL game state from store (not SaveData)
    const store = useGameStore.getState()

    // 3. Build complete SaveData with full Company objects
    const saveData: SaveData = {
      version: 6,
      timestamp: Date.now(),
      config: store.config,
      time: store.time,
      currentTick: store.currentTick,
      player: store.player,
      companies: store.companies,
      events: store.events,
      news: store.news,
      competitors: store.competitors,
      proposals: store.proposals,
      lastProcessedMonth: store.lastProcessedMonth,
      institutions: store.institutions,
      marketRegime: store.marketRegime,
      marketIndexHistory: store.marketIndexHistory,
      circuitBreaker: store.circuitBreaker,
      lastMnaQuarter: store.lastMnaQuarter,
      pendingIPOs: store.pendingIPOs,
      autoSellEnabled: store.autoSellEnabled,
      autoSellPercent: store.autoSellPercent,
      cashFlowLog: store.cashFlowLog,
      realizedTrades: store.realizedTrades,
      monthlyCashFlowSummaries: store.monthlyCashFlowSummaries,
    }

    // 4. Save to SQLite (saveDataToSQLite now handles full Company objects)
    const db = await initializeDB()
    await saveDataToSQLite(db, saveData, 'autosave')

    // 5. Validate migration
    const validated = await validateMigration(db, store)

    if (!validated) {
      throw new Error('Migration validation failed')
    }

    // 6. Mark as completed (but KEEP IndexedDB data)
    saveMigrationStatus({
      completed: true,
      timestamp: Date.now(),
      version: 6,
    })

    console.log('[Migration] ✅ Completed successfully')
  } catch (error) {
    console.error('[Migration] ❌ Failed:', error)
    // Don't mark as completed so it can be retried
    throw error
  }
}

/** Helper for floating-point comparison with epsilon tolerance */
function floatEquals(a: number, b: number, epsilon = 0.01): boolean {
  return Math.abs(a - b) < epsilon
}

/**
 * Validate critical fields after migration
 * Compares SQLite data against source gameStore state
 */
async function validateMigration(
  db: SQLiteDB,
  store: ReturnType<typeof useGameStore.getState>,
): Promise<boolean> {
  console.log('[Migration] Validating...')

  try {
    const sqliteData = await sqliteToSaveData(db, 'autosave')

    if (!sqliteData) {
      console.error('[Migration] Validation failed: SQLite data is null')
      return false
    }

    let allPassed = true
    const fail = (name: string, expected: unknown, actual: unknown) => {
      console.error(
        `[Migration] Validation failed for ${name}:`,
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      )
      allPassed = false
    }

    // Exact equality checks
    const exactValidations: Array<{ name: string; expected: unknown; actual: unknown }> = [
      { name: 'companies.length', expected: store.companies.length, actual: sqliteData.companies.length },
      { name: 'player.employees.length', expected: store.player.employees.length, actual: sqliteData.player.employees.length },
      { name: 'time.year', expected: store.time.year, actual: sqliteData.time.year },
      { name: 'time.month', expected: store.time.month, actual: sqliteData.time.month },
      { name: 'currentTick', expected: store.currentTick, actual: sqliteData.currentTick },
    ]

    for (const v of exactValidations) {
      if (v.expected !== v.actual) fail(v.name, v.expected, v.actual)
    }

    // Float equality checks (epsilon comparison for monetary values)
    const floatValidations: Array<{ name: string; expected: number; actual: number }> = [
      { name: 'player.cash', expected: store.player.cash, actual: sqliteData.player.cash },
      { name: 'player.totalAssetValue', expected: store.player.totalAssetValue, actual: sqliteData.player.totalAssetValue },
    ]

    for (const v of floatValidations) {
      if (!floatEquals(v.expected, v.actual)) fail(v.name, v.expected, v.actual)
    }

    // Company data integrity: verify name/ticker/sector are not empty
    for (const company of sqliteData.companies) {
      if (!company.name || company.name.trim() === '') {
        fail(`company[${company.id}].name`, 'non-empty string', company.name)
      }
      if (!company.ticker || company.ticker.trim() === '') {
        fail(`company[${company.id}].ticker`, 'non-empty string', company.ticker)
      }
      if (!company.sector || company.sector.trim() === '') {
        fail(`company[${company.id}].sector`, 'non-empty string', company.sector)
      }
    }

    // Company price data integrity
    for (let i = 0; i < store.companies.length; i++) {
      const source = store.companies[i]
      const loaded = sqliteData.companies.find((c) => c.id === source.id)
      if (!loaded) {
        fail(`company[${source.id}]`, 'exists', 'missing')
        continue
      }
      if (!floatEquals(source.price, loaded.price)) {
        fail(`company[${source.id}].price`, source.price, loaded.price)
      }
    }

    // Competitor data integrity
    if (store.competitors && store.competitors.length > 0) {
      const loadedCompetitors = sqliteData.competitors ?? []
      if (store.competitors.length !== loadedCompetitors.length) {
        fail('competitors.length', store.competitors.length, loadedCompetitors.length)
      }
    }

    if (allPassed) {
      console.log('[Migration] All validations passed')
    }

    return allPassed
  } catch (error) {
    console.error('[Migration] Validation error:', error)
    return false
  }
}

/**
 * Get migration status from localStorage
 */
function getMigrationStatus(): MigrationStatus {
  try {
    const stored = localStorage.getItem(MIGRATION_KEY)
    if (!stored) {
      return { completed: false, timestamp: 0, version: 0 }
    }
    return JSON.parse(stored) as MigrationStatus
  } catch {
    return { completed: false, timestamp: 0, version: 0 }
  }
}

/**
 * Save migration status to localStorage
 */
function saveMigrationStatus(status: MigrationStatus): void {
  try {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(status))
  } catch (error) {
    console.error('[Migration] Failed to save status:', error)
  }
}

/**
 * Reset migration status (for debugging/testing)
 */
export function resetMigrationStatus(): void {
  localStorage.removeItem(MIGRATION_KEY)
  console.log('[Migration] Status reset')
}

/**
 * Get current migration status (for debugging/UI)
 */
export function getMigrationStatusPublic(): MigrationStatus {
  return getMigrationStatus()
}
