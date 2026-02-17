# Phase 2 Developer Guide: Dual-Write Save System

## Quick Start

### Enable SQLite Writes (Dev Console)
```javascript
// Open browser dev console
import { setFeatureFlag } from './systems/featureFlags'

// Enable SQLite writes
setFeatureFlag('sqlite_enabled', true)

// Verify
import { getFeatureFlag } from './systems/featureFlags'
console.log(getFeatureFlag('sqlite_enabled')) // true

// Disable
setFeatureFlag('sqlite_enabled', false)
```

### Monitor Save Operations
```javascript
// Watch console for these messages:
// "[SaveSystem] SQLite save successful" - Dual-write succeeded
// "[SaveSystem] IndexedDB save failed: ..." - IndexedDB failed (graceful fallback)
// "[SaveSystem] SQLite save failed: ..." - SQLite failed (graceful fallback)
```

## Architecture Overview

```
User Action (Auto-save every 300 ticks)
    ↓
saveGame(data: SaveData)
    ↓
Feature Flag Check: sqlite_enabled?
    ↓
┌─────────────────────────────────────┐
│   Promise.allSettled([              │
│     saveToIndexedDB(data),          │ ← Always executed
│     saveToSQLite(data)              │ ← Only if flag enabled
│   ])                                │
└─────────────────────────────────────┘
    ↓
Check Results
    ├─ Both succeeded → ✅ Success
    ├─ One succeeded → ✅ Success (log failure)
    └─ Both failed → ❌ Throw error
```

## API Reference

### Feature Flags (`src/systems/featureFlags.ts`)

```typescript
// Get single flag value
getFeatureFlag('sqlite_enabled'): boolean
// Returns: true if enabled, false otherwise

// Set flag value
setFeatureFlag('sqlite_enabled', value: boolean): void
// Side effect: Persists to localStorage

// Get all flags
getAllFlags(): FeatureFlags
// Returns: { sqlite_enabled: boolean }
```

### Save System (`src/systems/saveSystem.ts`)

```typescript
// Save game (dual-write)
saveGame(data: SaveData): Promise<void>
// Behavior:
// - Always writes to IndexedDB
// - Writes to SQLite if sqlite_enabled = true
// - Succeeds if at least one succeeds
// - Throws if both fail

// Load game (IndexedDB only in Phase 2)
loadGame(): Promise<SaveData | null>
// Behavior: Reads from IndexedDB only
// Returns: SaveData or null if no save exists

// Delete save (dual-delete)
deleteSave(): Promise<void>
// Behavior:
// - Deletes from IndexedDB
// - Deletes from SQLite if sqlite_enabled = true
// - Succeeds if at least one succeeds

// Check save exists
hasSaveData(): Promise<boolean>
// Behavior: Checks IndexedDB only
// Returns: true if save exists
```

## Testing Guide

### Unit Tests
```bash
# Run all Phase 2 tests
npx vitest run tests/phase2-dual-write.test.ts

# Watch mode
npx vitest tests/phase2-dual-write.test.ts
```

### Manual Testing Checklist
1. **Enable SQLite, trigger save**
   - Open dev console
   - `setFeatureFlag('sqlite_enabled', true)`
   - Play game, wait for autosave (300 ticks)
   - Check console for "SQLite save successful"

2. **Disable SQLite, trigger save**
   - `setFeatureFlag('sqlite_enabled', false)`
   - Trigger autosave
   - Should still succeed (IndexedDB only)

3. **Load game after dual-write**
   - Enable SQLite, save game
   - Reload page
   - Game should load from IndexedDB
   - No errors in console

4. **Delete save**
   - Enable SQLite, save game
   - Call `deleteSave()` from dev console
   - Verify both storages cleared
   - No save data on reload

### Error Testing
```javascript
// Simulate IndexedDB failure
// (Close IndexedDB manually in browser DevTools)
// Save should still succeed via SQLite

// Simulate SQLite failure
// (Disable WASM in browser settings)
// Save should still succeed via IndexedDB
```

## Troubleshooting

### SQLite Writes Not Working
**Symptom**: No "SQLite save successful" message

**Solutions**:
1. Check feature flag: `getFeatureFlag('sqlite_enabled')` should be `true`
2. Check browser console for errors
3. Verify WASM support: `typeof WebAssembly !== 'undefined'`
4. Check IndexedDB is working (fallback should succeed)

### Both Saves Failing
**Symptom**: "Both IndexedDB and SQLite saves failed" error

**Solutions**:
1. Check browser storage quota
2. Check IndexedDB permissions
3. Try incognito mode (clean state)
4. Clear browser storage and retry

### Performance Issues
**Symptom**: Noticeable lag during autosave

**Solutions**:
1. Check `sqlite_enabled` flag (should be false if not needed)
2. Monitor save latency in Network tab
3. Reduce autosave frequency if needed
4. Consider background worker for saves (Phase 3)

### Inconsistent State
**Symptom**: IndexedDB and SQLite have different data

**Expected in Phase 2**: This is normal! Phase 2 only writes to SQLite, doesn't validate consistency.
**Solution**: Phase 3 will add validation and migration tools.

## Code Examples

### Example 1: Toggle SQLite in Settings UI
```typescript
// SettingsWindow.tsx
import { getFeatureFlag, setFeatureFlag } from '../../systems/featureFlags'

function SettingsWindow() {
  const [sqliteEnabled, setSqliteEnabled] = useState(
    getFeatureFlag('sqlite_enabled')
  )

  const handleToggle = (enabled: boolean) => {
    setFeatureFlag('sqlite_enabled', enabled)
    setSqliteEnabled(enabled)
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={sqliteEnabled}
        onChange={(e) => handleToggle(e.target.checked)}
      />
      Enable SQLite Storage (Beta)
    </label>
  )
}
```

### Example 2: Monitor Save Success Rate
```typescript
// Add to saveSystem.ts for debugging
export async function saveGame(data: SaveData): Promise<void> {
  const startTime = performance.now()

  // ... existing dual-write logic ...

  const duration = performance.now() - startTime
  console.log(`[SaveSystem] Save completed in ${duration.toFixed(2)}ms`)

  // Track success rates
  if (indexedDBSucceeded && sqliteSucceeded) {
    console.log('[SaveSystem] Both storages succeeded')
  } else if (indexedDBSucceeded) {
    console.log('[SaveSystem] IndexedDB succeeded, SQLite failed')
  } else if (sqliteSucceeded) {
    console.log('[SaveSystem] SQLite succeeded, IndexedDB failed')
  }
}
```

### Example 3: Export Save Data for Debugging
```typescript
// Dev console helper
async function exportSaveData() {
  const { loadGame } = await import('./systems/saveSystem')
  const data = await loadGame()
  console.log('Save Data:', data)

  // Copy to clipboard
  const json = JSON.stringify(data, null, 2)
  await navigator.clipboard.writeText(json)
  console.log('Copied to clipboard')
}
```

## Migration Path

### Phase 2 (Current)
- Write: IndexedDB ✅ + SQLite (if enabled)
- Read: IndexedDB only ✅
- Delete: Both ✅

### Phase 3 (Next)
- Write: IndexedDB + SQLite
- Read: SQLite preferred (if enabled) → IndexedDB fallback
- Delete: Both
- New: Data validation and migration tools

### Phase 4 (Future)
- Write: SQLite only
- Read: SQLite only
- Delete: SQLite only
- Deprecated: IndexedDB (read-only for legacy saves)

## Performance Benchmarks

### Expected Latencies (Phase 2)
```
IndexedDB save:    5-15ms   (baseline)
SQLite save:       10-30ms  (WASM init + write)
Dual-write total:  10-30ms  (parallel, max of both)

Feature flag off:  5-15ms   (IndexedDB only)
Feature flag on:   10-30ms  (dual-write)
```

### Resource Usage
```
IndexedDB:  ~0 memory overhead (browser native)
SQLite:     ~2-5 MB WASM runtime + data
Feature flags: ~100 bytes localStorage
```

## Security Considerations

### Safe Practices
- ✅ Feature flags are user-controlled (localStorage)
- ✅ No sensitive data in feature flags
- ✅ SQLite runs in sandboxed WASM
- ✅ Both storages respect same-origin policy

### Unsafe Practices
- ❌ Don't store credentials in feature flags
- ❌ Don't bypass storage security (CSP headers)
- ❌ Don't expose raw SQL queries to users

## Support Channels

### Internal
- Phase 2 implementation doc: `claudedocs/phase2_dual_write_implementation.md`
- Validation report: `claudedocs/phase2_validation_report.md`
- Test suite: `tests/phase2-dual-write.test.ts`

### External
- IndexedDB docs: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- wa-sqlite docs: https://github.com/rhashimoto/wa-sqlite

## FAQ

**Q: Should I enable SQLite in production?**
A: Not yet. Phase 2 is for testing only. Wait for Phase 3 validation tools.

**Q: What happens if I enable SQLite mid-game?**
A: Next save will write to both. Previous saves remain IndexedDB-only.

**Q: Can I migrate existing saves to SQLite?**
A: Phase 3 will add migration tools. Currently, dual-write starts from next save.

**Q: Is SQLite faster than IndexedDB?**
A: Phase 2 doesn't prioritize performance. Phase 3 will include benchmarks.

**Q: What if SQLite becomes corrupted?**
A: Graceful degradation ensures IndexedDB saves continue working.

**Q: Can I disable SQLite after enabling it?**
A: Yes. Set flag to false. Existing SQLite data remains but won't be updated.

---

**Last Updated**: 2026-02-17
**Phase**: 2 (Dual-Write)
**Status**: Production-ready (disabled by default)
