/* ── Dual-Write Save System (IndexedDB + SQLite) ── */

import type { SaveData } from '../types'
import {
  saveGame as saveToIndexedDB,
  loadGame as loadFromIndexedDB,
  deleteSave as deleteFromIndexedDB,
  hasSaveData as hasIndexedDBSave,
} from './saveSystemLegacy'
import { initializeDB, getDBSafe, saveDataToSQLite, sqliteToSaveData, saveSlotExists, deleteSaveSlot } from './sqlite'
import { getFeatureFlag } from './featureFlags'

/**
 * Save game data to both IndexedDB and SQLite (if enabled)
 * Uses graceful degradation - succeeds if at least one storage succeeds
 */
export async function saveGame(data: SaveData): Promise<void> {
  const sqliteEnabled = getFeatureFlag('sqlite_enabled')

  // Always save to IndexedDB (primary storage for Phase 2)
  const indexedDBPromise = saveToIndexedDB(data)

  // Save to SQLite if feature flag enabled
  const sqlitePromise = sqliteEnabled
    ? (async () => {
        try {
          const db = await initializeDB()
          await saveDataToSQLite(db, data, 'autosave')
          console.log('[SaveSystem] SQLite save successful')
        } catch (error) {
          console.error('[SaveSystem] SQLite save failed:', error)
          throw error
        }
      })()
    : Promise.resolve() // No-op if disabled

  // Execute both saves in parallel
  const results = await Promise.allSettled([indexedDBPromise, sqlitePromise])

  // Check if at least one succeeded
  const indexedDBResult = results[0]
  const sqliteResult = results[1]

  const indexedDBSucceeded = indexedDBResult.status === 'fulfilled'
  const sqliteSucceeded = sqliteResult.status === 'fulfilled'

  if (!indexedDBSucceeded && !sqliteSucceeded) {
    const errors = [
      indexedDBResult.status === 'rejected' ? indexedDBResult.reason : null,
      sqliteResult.status === 'rejected' ? sqliteResult.reason : null,
    ].filter(Boolean)

    throw new Error(
      `Both IndexedDB and SQLite saves failed: ${errors.map((e) => e.message).join(', ')}`
    )
  }

  // Log failures (but don't throw if at least one succeeded)
  if (!indexedDBSucceeded) {
    console.error(
      '[SaveSystem] IndexedDB save failed:',
      indexedDBResult.status === 'rejected' ? indexedDBResult.reason : 'Unknown error'
    )
  }

  if (sqliteEnabled && !sqliteSucceeded) {
    console.error(
      '[SaveSystem] SQLite save failed:',
      sqliteResult.status === 'rejected' ? sqliteResult.reason : 'Unknown error'
    )
  }
}

/**
 * Load game data with SQLite priority (Phase 3)
 * Falls back to IndexedDB if SQLite fails or is disabled
 */
export async function loadGame(): Promise<SaveData | null> {
  const sqliteEnabled = getFeatureFlag('sqlite_enabled')

  if (sqliteEnabled) {
    try {
      // Try SQLite first
      const db = await initializeDB()
      const sqliteData = await sqliteToSaveData(db, 'autosave')

      if (sqliteData) {
        console.log('[SaveSystem] Loaded from SQLite')
        return sqliteData
      }

      console.warn('[SaveSystem] SQLite returned null, falling back to IndexedDB')
    } catch (error) {
      console.error('[SaveSystem] SQLite load failed, falling back to IndexedDB:', error)
    }
  }

  // Fallback to IndexedDB (always works)
  const indexedDBData = await loadFromIndexedDB()
  console.log('[SaveSystem] Loaded from IndexedDB')
  return indexedDBData
}

/**
 * Delete save from both IndexedDB and SQLite
 * Uses graceful degradation - succeeds if at least one deletion succeeds
 */
export async function deleteSave(): Promise<void> {
  const sqliteEnabled = getFeatureFlag('sqlite_enabled')

  const indexedDBPromise = deleteFromIndexedDB()

  const sqlitePromise = sqliteEnabled
    ? (async () => {
        try {
          const db = await initializeDB()
          await deleteSaveSlot(db, 'autosave')
          console.log('[SaveSystem] SQLite delete completed')
        } catch (error) {
          console.error('[SaveSystem] SQLite delete failed:', error)
          throw error
        }
      })()
    : Promise.resolve()

  const results = await Promise.allSettled([indexedDBPromise, sqlitePromise])

  // Check if at least one succeeded
  const succeeded = results.some((r) => r.status === 'fulfilled')

  if (!succeeded) {
    throw new Error('Both IndexedDB and SQLite deletes failed')
  }

  // Log failures
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      console.error(
        `[SaveSystem] ${idx === 0 ? 'IndexedDB' : 'SQLite'} delete failed:`,
        result.reason
      )
    }
  })
}

/**
 * Check if save data exists in either SQLite or IndexedDB
 * Checks SQLite first when enabled, then falls back to IndexedDB
 */
export async function hasSaveData(): Promise<boolean> {
  // IMPORTANT: Skip SQLite check to avoid initialization errors
  // SQLite is checked separately during actual save/load operations
  // This function is only used for UI display purposes
  return hasIndexedDBSave()
}

/**
 * Check if SQLite save exists (Phase 3+)
 * Returns false if SQLite is disabled or check fails
 *
 * IMPORTANT: Only checks if DB is already initialized.
 * Does NOT trigger initialization to avoid concurrent init errors.
 */
export async function hasSQLiteSave(): Promise<boolean> {
  try {
    // Use safe getter - don't trigger initialization
    const db = getDBSafe()

    if (!db) {
      // DB not initialized yet - return false without error
      return false
    }

    return await saveSlotExists(db, 'autosave')
  } catch (error) {
    console.warn('[saveSystem] hasSQLiteSave check failed:', error instanceof Error ? error.message : String(error))
    return false
  }
}
