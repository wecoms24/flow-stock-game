import type { SaveData } from '../types'
import { COMPANIES } from '../data/companies'

/* ── IndexedDB Auto-Save System ── */

const DB_NAME = 'retro-stock-os'
const DB_VERSION = 1
const STORE_NAME = 'saves'
const AUTO_SAVE_KEY = 'autosave'
const SAVE_VERSION = 4

/** Build ticker→companyId lookup from COMPANIES data */
const TICKER_TO_ID: Record<string, string> = {}
for (const c of COMPANIES) {
  TICKER_TO_ID[c.ticker] = c.id
}

/** Migrate save data through all versions */
function migrateSaveData(data: Record<string, unknown>): SaveData {
  if (!data) return data as SaveData

  // v1 → v2: tick (0-9) → hour (9-18)
  if ((data.version as number) < 2) {
    const time = data.time as Record<string, unknown> | undefined
    if (time && 'tick' in time) {
      time.hour = ((time.tick as number) ?? 0) + 9
      delete time.tick
    }
    data.version = 2
  }

  // v2 → v3: competitor portfolio keys ticker → companyId
  if ((data.version as number) < 3) {
    const competitors = data.competitors as Array<Record<string, unknown>> | undefined
    if (competitors && Array.isArray(competitors)) {
      for (const competitor of competitors) {
        if (!competitor.portfolio) continue
        const oldPortfolio = competitor.portfolio as Record<string, Record<string, unknown>>
        const newPortfolio: Record<string, Record<string, unknown>> = {}
        for (const [key, position] of Object.entries(oldPortfolio)) {
          // If key looks like a ticker (not an id pattern like "tech-01"), convert it
          const companyId = TICKER_TO_ID[key] ?? key
          newPortfolio[companyId] = {
            ...position,
            companyId,
          }
        }
        competitor.portfolio = newPortfolio
      }
    }
    data.version = 3
  }

  // v3 → v4: add sessionOpenPrice to companies
  if ((data.version as number) < 4) {
    const companies = data.companies as Array<Record<string, unknown>> | undefined
    if (companies && Array.isArray(companies)) {
      for (const company of companies) {
        // If sessionOpenPrice doesn't exist, set it to current price
        if (!('sessionOpenPrice' in company)) {
          company.sessionOpenPrice = company.price
        }
      }
    }
    data.version = 4
  }

  return data as unknown as SaveData
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveGame(data: SaveData): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ ...data, version: SAVE_VERSION }, AUTO_SAVE_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch {
    // IndexedDB may not be available in all environments
    console.warn('[SaveSystem] Failed to save game')
  }
}

export async function loadGame(): Promise<SaveData | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(AUTO_SAVE_KEY)
      request.onsuccess = () => {
        db.close()
        const data = request.result as Record<string, unknown> | undefined
        if (!data) {
          resolve(null)
        } else if (data.version === SAVE_VERSION) {
          resolve(data as unknown as SaveData)
        } else if (data.version && (data.version as number) < SAVE_VERSION) {
          resolve(migrateSaveData(data))
        } else {
          resolve(null)
        }
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch {
    console.warn('[SaveSystem] Failed to load game')
    return null
  }
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(AUTO_SAVE_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch {
    console.warn('[SaveSystem] Failed to delete save')
  }
}

export function hasSaveData(): Promise<boolean> {
  return loadGame().then((data) => data !== null)
}
