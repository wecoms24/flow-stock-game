/* ── SQLite Query Helpers (Prepared Statements) ── */

import type { SQLiteDB } from '@subframe7536/sqlite-wasm'
import type { SaveSlotInfo } from './types'

/**
 * List all save slots with metadata
 * Ordered by most recently updated first
 */
export async function listSaveSlots(db: SQLiteDB): Promise<SaveSlotInfo[]> {
  const rows = await db.run(`
    SELECT
      id, slot_name, updated_at, player_cash, year, month, difficulty, player_total_assets
    FROM saves
    ORDER BY updated_at DESC;
  `)

  return rows as SaveSlotInfo[]
}

/**
 * Delete a save slot by name (CASCADE deletes all related data)
 */
export async function deleteSaveSlot(db: SQLiteDB, slotName: string): Promise<void> {
  await db.run('DELETE FROM saves WHERE slot_name = ?;', [slotName])
  console.log(`[SQLite] Deleted save slot: ${slotName}`)
}

/**
 * Check if a save slot exists
 */
export async function saveSlotExists(db: SQLiteDB, slotName: string): Promise<boolean> {
  const rows = await db.run('SELECT 1 FROM saves WHERE slot_name = ? LIMIT 1;', [slotName])
  return rows.length > 0
}

/**
 * Get save slot info by name
 */
export async function getSaveSlotInfo(
  db: SQLiteDB,
  slotName: string,
): Promise<SaveSlotInfo | null> {
  const rows = await db.run(
    `
    SELECT
      id, slot_name, updated_at, player_cash, year, month, difficulty, player_total_assets
    FROM saves
    WHERE slot_name = ?;
  `,
    [slotName],
  )

  if (rows.length === 0) {
    return null
  }

  return rows[0] as SaveSlotInfo
}

/**
 * Get total number of save slots
 */
export async function getSaveSlotCount(db: SQLiteDB): Promise<number> {
  const rows = await db.run('SELECT COUNT(*) as count FROM saves;')
  return (rows[0] as { count: number }).count
}
