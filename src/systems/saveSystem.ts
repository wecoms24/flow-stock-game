import type { SaveData } from '../types'

/* ── IndexedDB Auto-Save System ── */

const DB_NAME = 'retro-stock-os'
const DB_VERSION = 1
const STORE_NAME = 'saves'
const AUTO_SAVE_KEY = 'autosave'
const SAVE_VERSION = 1

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
        const data = request.result as SaveData | undefined
        if (data && data.version === SAVE_VERSION) {
          resolve(data)
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
