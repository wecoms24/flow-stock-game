# Playwright E2E Test Suite

## Overview

This directory contains end-to-end tests for the Retro Stock OS game, with a focus on SQLite migration scenarios and data integrity verification.

## Test Files

### `game-core.spec.ts`
Basic smoke tests for core game functionality:
- Game loads without crashes
- BIOS boot screen appears
- UI elements render correctly
- No critical runtime errors

### `sqlite-migration.spec.ts`
Comprehensive SQLite migration scenarios (5 tests):
1. New game save/load with SQLite backend
2. IndexedDB → SQLite migration banner flow
3. Settings UI backend toggle functionality
4. Save deletion across both backends
5. **CRITICAL**: Company data integrity during autosave cycles

**Note**: These tests currently fail in dev environment due to WASM loading issues. See "Known Issues" below.

### `sqlite-migration-indexeddb.spec.ts`
Fallback mode verification (4 tests):
1. Game saves to IndexedDB when SQLite fails
2. Game loads from IndexedDB after reload
3. Company data integrity in fallback mode
4. Graceful error handling when SQLite unavailable

**Status**: Partially working - demonstrates dual-write fallback mechanism

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Development Server

Tests require a running dev server:

```bash
# Terminal 1: Start dev server
npm run dev -- --port 5175

# Terminal 2: Run tests
npx playwright test
```

### Run Specific Test Suite

```bash
# Core game tests (smoke tests)
npx playwright test game-core.spec.ts

# SQLite migration tests
npx playwright test sqlite-migration.spec.ts

# Fallback tests
npx playwright test sqlite-migration-indexeddb.spec.ts
```

### Run with UI (Headed Mode)

```bash
npx playwright test --headed
```

### Debug Mode

```bash
npx playwright test --debug
```

## Known Issues

### WASM Loading Failure in Dev Server

**Symptom**:
```
WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 64 6f
[SQLite] Failed to initialize database
```

**Cause**: Vite dev server serves `.wasm` files with incorrect MIME type

**Impact**:
- SQLite tests cannot run in dev environment
- System falls back to IndexedDB (gracefully)
- Tests verify fallback behavior instead

**Workaround**: Use production build for full SQLite testing

```bash
npm run build
npm run preview
npx playwright test --config=playwright-prod.config.ts
```

### Game Store Access Limitation

**Symptom**:
```
Company data: null
Initial companies: undefined
```

**Cause**: `window.gameStore` is not exposed in the application

**Impact**: Cannot programmatically verify internal game state

**Workaround**: Use UI-based assertions or integration tests

**Future Solution**: Add development-mode store exposure
```typescript
// In src/stores/gameStore.ts
if (import.meta.env.DEV) {
  (window as any).gameStore = useGameStore
}
```

## Test Helper Functions

### Navigation Helpers

```typescript
async function skipBootScreen(page: Page)
// Skips the BIOS boot animation

async function startNewGame(page: Page, difficulty?: 'Easy' | 'Normal' | 'Hard')
// Starts a new game with specified difficulty

async function openSettings(page: Page)
// Opens the Settings window via taskbar
```

### Storage Helpers

```typescript
async function clearAllStorage(page: Page)
// Clears localStorage, sessionStorage, and IndexedDB

async function createIndexedDBSave(page: Page)
// Creates dummy save data in IndexedDB
```

### Verification Helpers

```typescript
async function getCompanyData(page: Page, index: number)
// Retrieves company data from game store
// Returns: { name, ticker, sector, price }

async function getPlayerCash(page: Page)
// Gets current player cash amount
```

## Manual Testing Checklist

For scenarios that cannot be automated:

### Production Build Verification

1. Build and preview:
   ```bash
   npm run build
   npm run preview
   ```

2. Navigate to `http://localhost:4173`

3. Check console for SQLite initialization:
   - [ ] No WASM errors
   - [ ] "[SQLite] Database initialized" message appears

4. Save/Load cycle:
   - [ ] Start new game
   - [ ] Wait 30 seconds
   - [ ] Reload page
   - [ ] Game resumes from saved state

5. Company data persistence:
   - [ ] Note company[0] name
   - [ ] Wait 1 minute (multiple autosaves)
   - [ ] Reload page
   - [ ] Verify company name unchanged

6. Migration banner:
   - [ ] Create IndexedDB save first
   - [ ] Enable SQLite
   - [ ] Yellow banner appears
   - [ ] Click "업그레이드"
   - [ ] Banner disappears

7. Settings UI:
   - [ ] Open Settings
   - [ ] Verify "현재 백엔드: SQLite"
   - [ ] Toggle backend switch
   - [ ] Reload and verify change

8. Save deletion:
   - [ ] Settings → "새 게임" → Easy
   - [ ] Fresh game starts
   - [ ] Old save removed from DevTools → IndexedDB

## Screenshots

Test failures automatically capture screenshots to:
```
test-results/<test-name>-<browser>/test-failed-1.png
```

Successful tests can capture screenshots programmatically:
```typescript
await page.screenshot({
  path: 'tests/screenshots/scenario-name.png',
  fullPage: true
})
```

## Configuration

### `playwright.config.ts`

```typescript
{
  testDir: './tests/e2e/playwright',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5175',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5175',
    port: 5175,
    reuseExistingServer: true,
  }
}
```

## Test Coverage

| Feature | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-----------|-------------------|-----------|--------|
| Dual-Write Save | ✅ | ✅ | ⚠️ | Covered |
| SQLite Serialization | ✅ | ✅ | ⚠️ | Covered |
| IndexedDB Fallback | ✅ | ✅ | ⚠️ | Covered |
| Migration Logic | ✅ | ✅ | 🔄 | Needs manual test |
| Settings UI | ❌ | ❌ | 🔄 | Needs automation |
| Company Data Integrity | ✅ | ✅ | ⚠️ | Limited by store access |

**Legend**:
- ✅ Full coverage
- ⚠️ Partial coverage
- 🔄 Manual testing only
- ❌ No coverage

## Debugging Tips

### View Browser Console

```bash
npx playwright test --headed
# Browser DevTools automatically open
```

### Slow Down Test Execution

```typescript
test.use({
  launchOptions: {
    slowMo: 1000 // 1 second delay between actions
  }
})
```

### Keep Browser Open on Failure

```bash
npx playwright test --headed --debug
```

### Inspect Element Selectors

```bash
npx playwright codegen http://localhost:5175
# Opens browser with selector picker tool
```

## Contributing

### Adding New Tests

1. Create test file in `tests/e2e/playwright/`
2. Import common helpers from existing tests
3. Add to this README's coverage table
4. Update manual testing checklist if needed

### Test Naming Convention

```typescript
test.describe('Feature Name', () => {
  test('specific behavior being tested', async ({ page }) => {
    // Test implementation
  })
})
```

### Assertion Patterns

```typescript
// Prefer specific assertions
expect(value).toBe(expected)
expect(element).toBeVisible()

// Avoid loose assertions
expect(value).toBeTruthy() // Too vague
expect(element).not.toBeHidden() // Double negative
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run preview &
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-screenshots
          path: test-results/
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Project CLAUDE.md](../../../CLAUDE.md) - Architecture overview
- [SQLite Migration Report](../../../claudedocs/sqlite_migration_test_report.md)
- [E2E Test Summary](../../../claudedocs/e2e_test_summary.md)

---

**Last Updated**: 2026-02-17
**Maintainer**: Development Team
