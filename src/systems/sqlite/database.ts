/* ── SQLite Database Initialization and Schema ── */

import { initSQLite } from '@subframe7536/sqlite-wasm'
import { useIdbStorage } from '@subframe7536/sqlite-wasm/idb'
import type { SQLiteDB } from '@subframe7536/sqlite-wasm'
import wasmUrl from '@subframe7536/sqlite-wasm/wasm-async?url'

let dbInstance: SQLiteDB | null = null

/** Current schema version -- bump this when adding migrations */
const SCHEMA_VERSION = 6

/**
 * Initialize SQLite database with IndexedDB persistence
 * Uses IDBBatchAtomicVFS for best compatibility across browsers
 */
export async function initializeDB(): Promise<SQLiteDB> {
  if (dbInstance) {
    return dbInstance
  }

  try {
    // Initialize with IndexedDB storage + async WASM
    const db = await initSQLite(useIdbStorage('retro-stock-os.db', { url: wasmUrl }))

    // Create schema if tables don't exist
    await createSchema(db)

    // Run migrations for schema evolution
    await runMigrations(db)

    dbInstance = db
    return db
  } catch (error) {
    console.error('[SQLite] Failed to initialize database:', error)
    throw error
  }
}

/**
 * Create all tables and indexes if they don't exist
 */
async function createSchema(db: SQLiteDB): Promise<void> {
  // Enable foreign key constraints
  await db.run('PRAGMA foreign_keys = ON;')

  // Main saves table (세이브 슬롯 메타데이터 + 플레이어 상태)
  await db.run(`
    CREATE TABLE IF NOT EXISTS saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_name TEXT NOT NULL UNIQUE,
      schema_version INTEGER DEFAULT 5,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,

      -- Game config
      difficulty TEXT CHECK(difficulty IN ('easy', 'normal', 'hard')) NOT NULL,
      start_year INTEGER NOT NULL,
      end_year INTEGER NOT NULL,
      initial_cash REAL NOT NULL,

      -- Game time
      current_tick INTEGER DEFAULT 0,
      year INTEGER NOT NULL,
      quarter INTEGER CHECK(quarter BETWEEN 1 AND 4) NOT NULL,
      month INTEGER CHECK(month BETWEEN 1 AND 12) NOT NULL,
      day INTEGER CHECK(day BETWEEN 1 AND 30) NOT NULL,
      hour INTEGER CHECK(hour BETWEEN 9 AND 18) NOT NULL,
      speed INTEGER CHECK(speed IN (1, 2, 4)) DEFAULT 1,
      is_paused INTEGER DEFAULT 0,

      -- Player state
      player_cash REAL CHECK(player_cash >= 0) NOT NULL,
      player_total_assets REAL CHECK(player_total_assets >= 0) NOT NULL,
      player_monthly_expenses REAL DEFAULT 0,
      player_office_level INTEGER DEFAULT 1,
      player_portfolio TEXT DEFAULT '{}',
      player_office_grid TEXT,
      player_office_layout TEXT,
      player_last_day_change REAL DEFAULT 0,
      player_previous_day_assets REAL DEFAULT 0,

      -- System state
      last_processed_month INTEGER DEFAULT 0,
      last_mna_quarter INTEGER DEFAULT 0,
      auto_sell_enabled INTEGER DEFAULT 0,
      auto_sell_percent REAL,

      -- JSON columns for complex objects
      market_regime TEXT,
      market_index_history TEXT,
      circuit_breaker TEXT,

      -- v6: Cash Flow Tracking
      cash_flow_log TEXT,
      realized_trades TEXT,
      monthly_summaries TEXT
    );
  `)

  // Companies table (20개 회사)
  await db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      sector TEXT NOT NULL,
      price REAL NOT NULL,
      previous_price REAL NOT NULL,
      base_price REAL NOT NULL,
      session_open_price REAL NOT NULL,
      volatility REAL NOT NULL,
      drift REAL NOT NULL,
      market_cap REAL NOT NULL,
      description TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'acquired', 'delisted')) DEFAULT 'active',
      parent_company_id TEXT,
      acquired_at_tick INTEGER,
      headcount INTEGER DEFAULT 0,
      layoff_rate_on_acquisition REAL DEFAULT 0,

      -- JSON columns
      price_history TEXT NOT NULL,
      financials TEXT NOT NULL,
      institution_flow TEXT NOT NULL,
      institution_flow_history TEXT,
      accumulated_institutional_shares REAL,
      regime_volatilities TEXT,
      event_sensitivity TEXT,
      mna_history TEXT DEFAULT '[]',
      vi_triggered INTEGER DEFAULT 0,
      vi_cooldown INTEGER DEFAULT 0,
      vi_recent_prices TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, company_id)
    );
  `)

  // Employees table (직원)
  await db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      salary REAL NOT NULL,
      stamina REAL NOT NULL,
      max_stamina REAL NOT NULL,
      sprite TEXT NOT NULL,
      hired_month INTEGER NOT NULL,
      stress REAL DEFAULT 0,
      satisfaction REAL DEFAULT 50,
      level INTEGER DEFAULT 1,
      xp REAL DEFAULT 0,
      xp_to_next_level REAL DEFAULT 100,
      title TEXT DEFAULT 'intern',
      badge TEXT DEFAULT 'gray',
      seat_index INTEGER,
      desk_id TEXT,
      praise_cooldown INTEGER,
      scold_cooldown INTEGER,
      mood REAL DEFAULT 50,

      -- JSON columns
      bonus TEXT NOT NULL,
      traits TEXT,
      skills TEXT NOT NULL,
      badges TEXT,
      assigned_sectors TEXT,
      growth_log TEXT,
      progression TEXT,
      unlocked_skills TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, employee_id)
    );
  `)

  // Competitors table (AI 경쟁자)
  await db.run(`
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      competitor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      style TEXT NOT NULL,
      cash REAL NOT NULL,
      total_asset_value REAL NOT NULL,
      roi REAL NOT NULL,
      initial_assets REAL NOT NULL,
      last_day_change REAL DEFAULT 0,
      panic_sell_cooldown INTEGER DEFAULT 0,
      is_mirror_rival INTEGER DEFAULT 0,

      -- JSON columns
      portfolio TEXT DEFAULT '{}',

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, competitor_id)
    );
  `)

  // Market events table (이벤트)
  await db.run(`
    CREATE TABLE IF NOT EXISTS market_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      event_type TEXT,
      duration INTEGER NOT NULL,
      remaining_ticks INTEGER NOT NULL,
      source TEXT,
      chain_parent_id TEXT,
      historical_year INTEGER,
      propagation_phase REAL,

      -- JSON columns
      impact TEXT NOT NULL,
      affected_sectors TEXT,
      affected_companies TEXT,
      start_timestamp TEXT NOT NULL,
      price_impact_snapshot TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, event_id)
    );
  `)

  // News items table (뉴스)
  await db.run(`
    CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      news_id TEXT NOT NULL,
      headline TEXT NOT NULL,
      body TEXT NOT NULL,
      event_id TEXT,
      is_breaking INTEGER DEFAULT 0,
      sentiment TEXT NOT NULL,

      -- JSON columns
      timestamp TEXT NOT NULL,
      related_companies TEXT,
      impact_summary TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, news_id)
    );
  `)

  // Trade proposals table (거래 제안)
  await db.run(`
    CREATE TABLE IF NOT EXISTS trade_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      proposal_id TEXT NOT NULL,
      company_id INTEGER,
      ticker TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('buy', 'sell')) NOT NULL,
      quantity INTEGER NOT NULL,
      target_price REAL NOT NULL,
      confidence REAL NOT NULL,
      created_by_employee_id INTEGER,
      reviewed_by_employee_id INTEGER,
      executed_by_employee_id INTEGER,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      reviewed_at INTEGER,
      executed_at INTEGER,
      executed_price REAL,
      slippage REAL,
      is_mistake INTEGER DEFAULT 0,
      reject_reason TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (executed_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      UNIQUE(save_id, proposal_id)
    );
  `)

  // Institutions table (기관 투자자)
  await db.run(`
    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      institution_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      risk_appetite REAL NOT NULL,
      capital REAL NOT NULL,
      algo_strategy TEXT,

      -- JSON columns
      trade_cooldowns TEXT,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, institution_id)
    );
  `)

  // Pending IPOs table (예정된 IPO)
  await db.run(`
    CREATE TABLE IF NOT EXISTS pending_ipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      save_id INTEGER NOT NULL,
      slot_index INTEGER NOT NULL,
      spawn_tick INTEGER NOT NULL,

      -- JSON column (entire Company object)
      new_company TEXT NOT NULL,

      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, slot_index)
    );
  `)

  // Create indexes for high-frequency queries
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_saves_slot_name ON saves(slot_name);
    CREATE INDEX IF NOT EXISTS idx_saves_updated_at ON saves(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_companies_save_id ON companies(save_id);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_employees_save_id ON employees(save_id);
    CREATE INDEX IF NOT EXISTS idx_competitors_save_id ON competitors(save_id);
    CREATE INDEX IF NOT EXISTS idx_market_events_save_id ON market_events(save_id);
    CREATE INDEX IF NOT EXISTS idx_news_items_save_id ON news_items(save_id);
    CREATE INDEX IF NOT EXISTS idx_trade_proposals_save_id ON trade_proposals(save_id);
    CREATE INDEX IF NOT EXISTS idx_trade_proposals_status ON trade_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_institutions_save_id ON institutions(save_id);
    CREATE INDEX IF NOT EXISTS idx_pending_ipos_save_id ON pending_ipos(save_id);
  `)

  console.log('[SQLite] Schema created successfully')
}

/**
 * Get existing DB instance (must call initializeDB first)
 */
export function getDB(): SQLiteDB {
  if (!dbInstance) {
    throw new Error('[SQLite] Database not initialized. Call initializeDB() first.')
  }
  return dbInstance
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log('[SQLite] Database closed')
  }
}

/**
 * Schema migration system -- runs ALTER TABLE scripts for version upgrades
 * Each migration is idempotent (safe to re-run) thanks to IF NOT EXISTS checks
 */
async function runMigrations(db: SQLiteDB): Promise<void> {
  // Create schema_versions tracking table
  await db.run(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `)

  // Get current version
  const rows = await db.run('SELECT MAX(version) as v FROM schema_versions;')
  const currentVersion = (rows[0] as { v: number | null })?.v ?? 0

  if (currentVersion >= SCHEMA_VERSION) {
    return // Already up to date
  }

  console.log(`[SQLite] Running migrations from v${currentVersion} to v${SCHEMA_VERSION}...`)

  // Migration v6: Add cash flow tracking columns to saves table
  if (currentVersion < 6) {
    try {
      // SQLite ALTER TABLE ADD COLUMN is idempotent if column already exists (will error)
      // We catch and ignore "duplicate column" errors
      const v6Columns = [
        'ALTER TABLE saves ADD COLUMN cash_flow_log TEXT;',
        'ALTER TABLE saves ADD COLUMN realized_trades TEXT;',
        'ALTER TABLE saves ADD COLUMN monthly_summaries TEXT;',
      ]
      for (const sql of v6Columns) {
        try {
          await db.run(sql)
        } catch (e: unknown) {
          // Ignore "duplicate column name" errors (column already exists)
          const msg = e instanceof Error ? e.message : String(e)
          if (!msg.includes('duplicate column')) {
            throw e
          }
        }
      }

      await db.run('INSERT OR REPLACE INTO schema_versions (version, applied_at) VALUES (?, ?);', [
        6,
        Date.now(),
      ])
      console.log('[SQLite] Migration v6 applied: cash flow tracking columns')
    } catch (error) {
      console.error('[SQLite] Migration v6 failed:', error)
      throw error
    }
  }
}
