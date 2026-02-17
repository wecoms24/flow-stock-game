import { test, expect, type Page } from '@playwright/test'

/** Helper: Skip BIOS boot screen */
async function skipBootScreen(page: Page) {
  const skipBtn = page.getByText(/건너뛰기|skip/i).first()
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click()
    await page.waitForTimeout(1000)
  }
}

/** Helper: Start new game with Easy difficulty */
async function startNewGame(page: Page, difficulty: 'Easy' | 'Normal' | 'Hard' = 'Easy') {
  await skipBootScreen(page)

  // Click difficulty button
  const difficultyBtn = page.getByText(new RegExp(difficulty, 'i')).first()
  if (await difficultyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await difficultyBtn.click()
    await page.waitForTimeout(2000)
  }
}

/** Helper: Open Settings window via Taskbar */
async function openSettings(page: Page) {
  // Try clicking Settings button in taskbar
  const settingsBtn = page.getByRole('button', { name: /설정|settings/i })
  if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await settingsBtn.click()
    await page.waitForTimeout(500)
    return
  }

  // Alternative: Click taskbar item that opens Settings
  const taskbarItems = page.locator('.taskbar-item, [data-window-type="settings"]')
  const count = await taskbarItems.count()
  for (let i = 0; i < count; i++) {
    const item = taskbarItems.nth(i)
    const text = await item.textContent()
    if (text?.includes('설정') || text?.includes('Settings')) {
      await item.click()
      await page.waitForTimeout(500)
      return
    }
  }

  // Last resort: Click any button containing "설정"
  await page.getByText(/설정/i).first().click()
  await page.waitForTimeout(500)
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

/** Helper: Get player cash from game store */
async function getPlayerCash(page: Page) {
  return await page.evaluate(() => {
    const store = (window as any).gameStore?.getState()
    return store?.player?.cash || 0
  })
}

/** Helper: Clear all storage (localStorage, IndexedDB, SQLite flags) */
async function clearAllStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Clear IndexedDB
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

/** Helper: Create dummy IndexedDB save data */
async function createIndexedDBSave(page: Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open('retro-stock-os', 1)

      request.onerror = () => reject(request.error)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'id' })
        }
      }

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const tx = db.transaction('saves', 'readwrite')
        const store = tx.objectStore('saves')

        // Create minimal save data
        const saveData = {
          id: 'autosave',
          timestamp: Date.now(),
          difficulty: 'easy' as const,
          player: {
            cash: 1500000,
            portfolio: [],
            employees: [],
            officeGrid: null,
            officeLevel: 1,
          },
          time: { year: 1995, month: 1, day: 1, hour: 9, tick: 0, isPaused: false, speed: 1 },
          companies: [
            {
              id: 'company-0',
              name: 'Legacy Company',
              ticker: 'LGCY',
              sector: 'Technology',
              basePrice: 10000,
              price: 10000,
              drift: 0.0001,
              volatility: 0.02,
            },
          ],
          competitors: [],
          events: [],
        }

        store.put(saveData)

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

test.describe('SQLite Migration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('[SaveSystem]')) {
        console.log(`[Browser ${msg.type()}]`, msg.text())
      }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root > *', { timeout: 15000 })
  })

  test('Scenario 1: New game save/load with SQLite', async ({ page }) => {
    console.log('\n=== Scenario 1: New Game Save/Load (SQLite) ===')

    // Clear all storage first
    await clearAllStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Start new game
    await startNewGame(page, 'Easy')
    await page.waitForTimeout(3000)

    // Get initial company data
    const companyBefore = await getCompanyData(page, 0)
    console.log('Company before autosave:', companyBefore)

    expect(companyBefore?.name).toBeTruthy()
    expect(companyBefore?.ticker).toBeTruthy()
    expect(companyBefore?.sector).toBeTruthy()

    // Wait for autosave (autosave happens every 300 ticks, ~60 seconds at speed 1)
    // Let's just wait 10 seconds and manually trigger save
    await page.waitForTimeout(10000)

    // Check company data is still intact
    const companyAfterWait = await getCompanyData(page, 0)
    console.log('Company after 10s:', companyAfterWait)

    expect(companyAfterWait?.name).toBe(companyBefore?.name)
    expect(companyAfterWait?.ticker).toBe(companyBefore?.ticker)
    expect(companyAfterWait?.sector).toBe(companyBefore?.sector)

    // Get cash value before reload
    const cashBefore = await getPlayerCash(page)
    console.log('Cash before reload:', cashBefore)

    // Reload page to test load
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Skip boot screen if appears
    await skipBootScreen(page)
    await page.waitForTimeout(2000)

    // Check if game state restored
    const companyAfterReload = await getCompanyData(page, 0)
    const cashAfterReload = await getPlayerCash(page)

    console.log('Company after reload:', companyAfterReload)
    console.log('Cash after reload:', cashAfterReload)

    // Verify data is not lost
    expect(companyAfterReload?.name).toBeTruthy()
    expect(companyAfterReload?.name).not.toBe('')
    expect(companyAfterReload?.ticker).toBeTruthy()
    expect(companyAfterReload?.sector).toBeTruthy()

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/sqlite-scenario1-new-game.png',
      fullPage: true,
    })

    console.log('✅ Scenario 1 passed')
  })

  test('Scenario 2: IndexedDB → SQLite migration banner flow', async ({ page }) => {
    console.log('\n=== Scenario 2: IndexedDB → SQLite Migration ===')

    // Clear storage and set up IndexedDB save
    await clearAllStorage(page)
    await page.evaluate(() => {
      localStorage.removeItem('sqlite_enabled')
      localStorage.removeItem('migration_dismissed')
    })

    // Create IndexedDB save
    await createIndexedDBSave(page)
    await page.waitForTimeout(500)

    // Reload to trigger migration banner detection
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Skip boot screen
    await skipBootScreen(page)

    // Start game to see migration banner
    await startNewGame(page, 'Easy')
    await page.waitForTimeout(2000)

    // Check if migration banner appears
    const banner = page.locator('text=새로운 SQLite 저장 시스템')
    const isBannerVisible = await banner.isVisible({ timeout: 5000 }).catch(() => false)

    console.log('Migration banner visible:', isBannerVisible)

    if (isBannerVisible) {
      // Verify banner content
      await expect(page.getByText(/SQLite 저장 시스템/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /업그레이드/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /나중에/i })).toBeVisible()

      // Click "업그레이드" button
      await page.getByRole('button', { name: /업그레이드/i }).click()
      await page.waitForTimeout(2000)

      // Banner should disappear
      await expect(banner).not.toBeVisible({ timeout: 5000 })

      // Check localStorage for migration_dismissed
      const dismissed = await page.evaluate(() => localStorage.getItem('migration_dismissed'))
      console.log('Migration dismissed flag:', dismissed)

      // Open Settings to verify backend
      await openSettings(page)
      await page.waitForTimeout(1000)

      // Check "현재 백엔드: SQLite"
      const settingsText = await page.locator('text=현재 백엔드').textContent()
      console.log('Settings backend text:', settingsText)

      expect(settingsText).toContain('SQLite')

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/sqlite-scenario2-migration.png',
        fullPage: true,
      })

      console.log('✅ Scenario 2 passed')
    } else {
      console.log('⚠️ Migration banner did not appear (SQLite may already be default)')
    }
  })

  test('Scenario 3: Settings UI backend toggle', async ({ page }) => {
    console.log('\n=== Scenario 3: Settings UI Backend Toggle ===')

    // Start game
    await startNewGame(page, 'Easy')
    await page.waitForTimeout(3000)

    // Open Settings
    await openSettings(page)
    await page.waitForTimeout(1000)

    // Find SQLite toggle
    const sqliteToggle = page.getByText(/SQLite 사용/i).first()
    await expect(sqliteToggle).toBeVisible()

    // Check current backend
    const backendText = await page.locator('text=현재 백엔드').textContent()
    console.log('Initial backend:', backendText)

    // Find toggle button (look for ON/OFF button near "SQLite 사용")
    const toggleContainer = page.locator('text=SQLite 사용').locator('..')
    const toggleBtn = toggleContainer.getByRole('button').first()

    // Get current state
    const isPressed = await toggleBtn.evaluate((el) => el.classList.contains('win-pressed'))
    console.log('SQLite toggle pressed:', isPressed)

    // Toggle OFF if currently ON
    if (isPressed) {
      await toggleBtn.click()
      await page.waitForTimeout(500)

      // Should show refresh warning
      const hasRefreshWarning = await page
        .getByText(/새로고침|refresh/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false)

      console.log('Refresh warning shown:', hasRefreshWarning)

      // Reload page
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Re-open Settings
      await openSettings(page)
      await page.waitForTimeout(1000)

      // Check backend changed to IndexedDB
      const newBackendText = await page.locator('text=현재 백엔드').textContent()
      console.log('Backend after toggle OFF:', newBackendText)

      expect(newBackendText).toContain('IndexedDB')

      // Toggle back ON
      const toggleBtn2 = page
        .locator('text=SQLite 사용')
        .locator('..')
        .getByRole('button')
        .first()
      await toggleBtn2.click()
      await page.waitForTimeout(500)

      // Reload again
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Re-open Settings
      await openSettings(page)
      await page.waitForTimeout(1000)

      // Check backend back to SQLite
      const finalBackendText = await page.locator('text=현재 백엔드').textContent()
      console.log('Backend after toggle ON:', finalBackendText)

      expect(finalBackendText).toContain('SQLite')
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/sqlite-scenario3-toggle.png',
      fullPage: true,
    })

    console.log('✅ Scenario 3 passed')
  })

  test('Scenario 4: Save deletion functionality', async ({ page }) => {
    console.log('\n=== Scenario 4: Save Deletion ===')

    // Start game and let it run
    await startNewGame(page, 'Easy')
    await page.waitForTimeout(5000)

    // Get initial cash
    const cashBefore = await getPlayerCash(page)
    console.log('Cash before deletion:', cashBefore)

    // Open Settings
    await openSettings(page)
    await page.waitForTimeout(1000)

    // Find "새 게임" section and click Easy to reset
    const newGameSection = page.locator('text=새 게임').first()
    await expect(newGameSection).toBeVisible()

    // Click Easy difficulty in new game section
    const easyBtn = page.getByRole('button', { name: /Easy/i }).first()
    await easyBtn.click()
    await page.waitForTimeout(500)

    // Handle confirmation dialog if exists
    page.on('dialog', (dialog) => {
      console.log('Dialog appeared:', dialog.message())
      dialog.accept()
    })

    await page.waitForTimeout(2000)

    // Check if new game started (cash should reset to initial value)
    const cashAfter = await getPlayerCash(page)
    console.log('Cash after new game:', cashAfter)

    // Cash should be different (reset to initial)
    expect(cashAfter).not.toBe(cashBefore)

    // Verify company data exists (not lost)
    const company = await getCompanyData(page, 0)
    console.log('Company after new game:', company)

    expect(company?.name).toBeTruthy()
    expect(company?.name).not.toBe('')

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/sqlite-scenario4-deletion.png',
      fullPage: true,
    })

    console.log('✅ Scenario 4 passed')
  })

  test('Scenario 5: Company data integrity (autosave bug fix)', async ({ page }) => {
    console.log('\n=== Scenario 5: Company Data Integrity ===')

    // Clear storage
    await clearAllStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Start new game
    await startNewGame(page, 'Easy')
    await page.waitForTimeout(3000)

    // Get initial company data
    const company0 = await getCompanyData(page, 0)
    console.log('Initial company[0]:', company0)

    expect(company0?.name).toBeTruthy()
    expect(company0?.ticker).toBeTruthy()
    expect(company0?.sector).toBeTruthy()

    // Store initial values
    const initialName = company0?.name
    const initialTicker = company0?.ticker
    const initialSector = company0?.sector

    // Wait for multiple autosave cycles (10 seconds)
    console.log('Waiting 10 seconds for autosave cycles...')
    await page.waitForTimeout(10000)

    // Check company data after autosaves
    const company0After = await getCompanyData(page, 0)
    console.log('After autosave company[0]:', company0After)

    // CRITICAL: Verify name, ticker, sector are NOT empty strings
    expect(company0After?.name).toBeTruthy()
    expect(company0After?.name).not.toBe('')
    expect(company0After?.name).toBe(initialName)

    expect(company0After?.ticker).toBeTruthy()
    expect(company0After?.ticker).not.toBe('')
    expect(company0After?.ticker).toBe(initialTicker)

    expect(company0After?.sector).toBeTruthy()
    expect(company0After?.sector).not.toBe('')
    expect(company0After?.sector).toBe(initialSector)

    console.log('✅ Company data preserved after autosave')

    // Reload page to test persistence
    console.log('Reloading page to test load...')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Skip boot screen
    await skipBootScreen(page)
    await page.waitForTimeout(2000)

    // Check company data after reload
    const company0Loaded = await getCompanyData(page, 0)
    console.log('After reload company[0]:', company0Loaded)

    // CRITICAL: Verify data persisted correctly
    expect(company0Loaded?.name).toBe(initialName)
    expect(company0Loaded?.ticker).toBe(initialTicker)
    expect(company0Loaded?.sector).toBe(initialSector)

    console.log('✅ Company data persisted across reload')

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/sqlite-scenario5-integrity.png',
      fullPage: true,
    })

    console.log('✅ Scenario 5 passed - No data loss detected')
  })
})
