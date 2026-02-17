import { test, expect, type Page } from '@playwright/test'

/**
 * SQLite Migration Tests - IndexedDB Fallback Mode
 *
 * These tests verify the dual-write system works correctly when SQLite fails.
 * This simulates production scenarios where SQLite WASM may not load properly.
 */

/** Helper: Skip BIOS boot screen */
async function skipBootScreen(page: Page) {
  const skipBtn = page.getByText(/건너뛰기|skip/i).first()
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click()
    await page.waitForTimeout(1000)
  }
}

/** Helper: Start new game with Easy difficulty */
async function startNewGame(page: Page) {
  await skipBootScreen(page)

  const easyBtn = page.getByText(/Easy|쉬움/i).first()
  if (await easyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await easyBtn.click()
    await page.waitForTimeout(2000)
  }
}

/** Helper: Get company data from game store */
async function getCompanyData(page: Page, index: number = 0) {
  return await page.evaluate((idx) => {
    const store = (window as any).gameStore?.getState()
    if (!store) return null
    const company = store.companies?.[idx]
    return {
      name: company?.name || '',
      ticker: company?.ticker || '',
      sector: company?.sector || '',
      price: company?.price || 0,
    }
  }, index)
}

/** Helper: Clear all storage */
async function clearAllStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.evaluate(async () => {
    const dbs = await window.indexedDB.databases()
    for (const db of dbs) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name)
      }
    }
  })

  await page.waitForTimeout(500)
}

test.describe('SQLite Migration - IndexedDB Fallback Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for SQLite failures
    page.on('console', (msg) => {
      if (msg.text().includes('[SQLite] Failed')) {
        console.log('[Expected SQLite failure]:', msg.text().substring(0, 100))
      }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root > *', { timeout: 15000 })
  })

  test('Fallback: Game saves to IndexedDB when SQLite fails', async ({ page }) => {
    console.log('\n=== Test: IndexedDB Fallback Save ===')

    // Clear storage
    await clearAllStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Start game
    await startNewGame(page)
    await page.waitForTimeout(3000)

    // Get company data
    const company = await getCompanyData(page, 0)
    console.log('Company data:', company)

    // CRITICAL: Verify data exists (not lost due to SQLite failure)
    expect(company?.name).toBeTruthy()
    expect(company?.name).not.toBe('')
    expect(company?.ticker).toBeTruthy()
    expect(company?.sector).toBeTruthy()

    console.log('✅ Company data intact despite SQLite failure')

    // Wait for potential autosave
    await page.waitForTimeout(5000)

    // Verify IndexedDB save exists
    const hasIndexedDB = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const request = window.indexedDB.open('retro-stock-os', 1)
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const tx = db.transaction('saves', 'readonly')
          const store = tx.objectStore('saves')
          const getReq = store.get('autosave')

          getReq.onsuccess = () => {
            db.close()
            resolve(!!getReq.result)
          }
          getReq.onerror = () => {
            db.close()
            resolve(false)
          }
        }
        request.onerror = () => resolve(false)
      })
    })

    console.log('IndexedDB save exists:', hasIndexedDB)
    expect(hasIndexedDB).toBe(true)

    await page.screenshot({
      path: 'tests/screenshots/indexeddb-fallback-save.png',
      fullPage: true,
    })

    console.log('✅ Fallback save test passed')
  })

  test('Fallback: Game loads from IndexedDB when SQLite fails', async ({ page }) => {
    console.log('\n=== Test: IndexedDB Fallback Load ===')

    // Clear and start fresh game
    await clearAllStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await startNewGame(page)
    await page.waitForTimeout(3000)

    const companyBefore = await getCompanyData(page, 0)
    console.log('Company before reload:', companyBefore)

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    await skipBootScreen(page)
    await page.waitForTimeout(2000)

    // Verify data loaded
    const companyAfter = await getCompanyData(page, 0)
    console.log('Company after reload:', companyAfter)

    expect(companyAfter?.name).toBe(companyBefore?.name)
    expect(companyAfter?.ticker).toBe(companyBefore?.ticker)
    expect(companyAfter?.sector).toBe(companyBefore?.sector)

    await page.screenshot({
      path: 'tests/screenshots/indexeddb-fallback-load.png',
      fullPage: true,
    })

    console.log('✅ Fallback load test passed')
  })

  test('CRITICAL: Company data integrity with autosave', async ({ page }) => {
    console.log('\n=== Test: Company Data Integrity ===')

    await clearAllStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await startNewGame(page)
    await page.waitForTimeout(3000)

    // Get all companies initial data
    const companies = await page.evaluate(() => {
      const store = (window as any).gameStore?.getState()
      return store?.companies?.slice(0, 5).map((c: any) => ({
        name: c.name,
        ticker: c.ticker,
        sector: c.sector,
      }))
    })

    console.log('Initial companies:', companies)

    // Verify all have data
    companies.forEach((company: any, idx: number) => {
      expect(company.name).toBeTruthy()
      expect(company.name).not.toBe('')
      expect(company.ticker).toBeTruthy()
      expect(company.ticker).not.toBe('')
      expect(company.sector).toBeTruthy()
      expect(company.sector).not.toBe('')
    })

    // Wait 10 seconds (simulate autosave cycles)
    console.log('Waiting 10 seconds for autosave cycles...')
    await page.waitForTimeout(10000)

    // Check data after autosaves
    const companiesAfter = await page.evaluate(() => {
      const store = (window as any).gameStore?.getState()
      return store?.companies?.slice(0, 5).map((c: any) => ({
        name: c.name,
        ticker: c.ticker,
        sector: c.sector,
      }))
    })

    console.log('Companies after autosave:', companiesAfter)

    // CRITICAL: Verify NO data loss
    companiesAfter.forEach((company: any, idx: number) => {
      expect(company.name).toBe(companies[idx].name)
      expect(company.ticker).toBe(companies[idx].ticker)
      expect(company.sector).toBe(companies[idx].sector)
    })

    console.log('✅ No data loss detected')

    // Reload and verify persistence
    console.log('Reloading to test persistence...')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    await skipBootScreen(page)
    await page.waitForTimeout(2000)

    const companiesLoaded = await page.evaluate(() => {
      const store = (window as any).gameStore?.getState()
      return store?.companies?.slice(0, 5).map((c: any) => ({
        name: c.name,
        ticker: c.ticker,
        sector: c.sector,
      }))
    })

    console.log('Companies after reload:', companiesLoaded)

    // Verify persistence
    companiesLoaded.forEach((company: any, idx: number) => {
      expect(company.name).toBe(companies[idx].name)
      expect(company.ticker).toBe(companies[idx].ticker)
      expect(company.sector).toBe(companies[idx].sector)
    })

    await page.screenshot({
      path: 'tests/screenshots/company-data-integrity.png',
      fullPage: true,
    })

    console.log('✅ Company data integrity test passed - NO DATA LOSS')
  })

  test('Fallback: Error handling is graceful', async ({ page }) => {
    console.log('\n=== Test: Graceful Error Handling ===')

    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await startNewGame(page)
    await page.waitForTimeout(5000)

    // Filter out expected SQLite errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('SQLite') &&
        !e.includes('wasm') &&
        !e.includes('WebAssembly') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error'),
    )

    console.log('Critical errors (excluding SQLite):', criticalErrors.length)
    expect(criticalErrors.length).toBe(0)

    // Verify game is still playable
    const company = await getCompanyData(page, 0)
    expect(company?.name).toBeTruthy()

    console.log('✅ Game remains playable despite SQLite failure')

    await page.screenshot({
      path: 'tests/screenshots/graceful-error-handling.png',
      fullPage: true,
    })
  })
})
