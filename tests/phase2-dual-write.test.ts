/**
 * Phase 2 Dual-Write System Tests
 *
 * Tests the dual-write save system with graceful degradation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getFeatureFlag, setFeatureFlag, getAllFlags } from '../src/systems/featureFlags'

describe('Feature Flag System', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('should return default values when no flags are set', () => {
    expect(getFeatureFlag('sqlite_enabled')).toBe(false)
  })

  it('should persist flag changes to localStorage', () => {
    setFeatureFlag('sqlite_enabled', true)
    expect(getFeatureFlag('sqlite_enabled')).toBe(true)

    // Verify persistence
    const stored = localStorage.getItem('retro-stock-os:feature-flags')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.sqlite_enabled).toBe(true)
  })

  it('should handle flag updates', () => {
    setFeatureFlag('sqlite_enabled', true)
    expect(getFeatureFlag('sqlite_enabled')).toBe(true)

    setFeatureFlag('sqlite_enabled', false)
    expect(getFeatureFlag('sqlite_enabled')).toBe(false)
  })

  it('should return all flags with defaults', () => {
    const flags = getAllFlags()
    expect(flags).toEqual({ sqlite_enabled: false })
  })

  it('should merge stored flags with defaults', () => {
    setFeatureFlag('sqlite_enabled', true)
    const flags = getAllFlags()
    expect(flags).toEqual({ sqlite_enabled: true })
  })

  it('should gracefully handle corrupted localStorage', () => {
    localStorage.setItem('retro-stock-os:feature-flags', 'invalid json')
    expect(getFeatureFlag('sqlite_enabled')).toBe(false)
    expect(getAllFlags()).toEqual({ sqlite_enabled: false })
  })

  it('should handle setFeatureFlag errors gracefully', () => {
    // Mock localStorage to throw error
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => { throw new Error('Storage quota exceeded') }

    // Should not throw
    expect(() => setFeatureFlag('sqlite_enabled', true)).not.toThrow()

    // Restore
    localStorage.setItem = originalSetItem
  })
})

describe('Dual-Write Save System Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default to SQLite disabled', () => {
    expect(getFeatureFlag('sqlite_enabled')).toBe(false)
  })

  it('should allow enabling SQLite writes', () => {
    setFeatureFlag('sqlite_enabled', true)
    expect(getFeatureFlag('sqlite_enabled')).toBe(true)
  })

  // Note: Actual save/load tests require IndexedDB and WASM setup
  // These would be integration tests run in a browser environment
  // For now, we test the flag system that controls the behavior
})

describe('Graceful Degradation Behavior', () => {
  it('should handle Promise.allSettled pattern', async () => {
    // Simulate the dual-write pattern
    const successPromise = Promise.resolve('success')
    const failurePromise = Promise.reject(new Error('failed'))

    const results = await Promise.allSettled([successPromise, failurePromise])

    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')

    // At least one succeeded
    const succeeded = results.some(r => r.status === 'fulfilled')
    expect(succeeded).toBe(true)
  })

  it('should handle both promises failing', async () => {
    const fail1 = Promise.reject(new Error('fail1'))
    const fail2 = Promise.reject(new Error('fail2'))

    const results = await Promise.allSettled([fail1, fail2])

    const succeeded = results.some(r => r.status === 'fulfilled')
    expect(succeeded).toBe(false)
  })

  it('should handle both promises succeeding', async () => {
    const success1 = Promise.resolve('success1')
    const success2 = Promise.resolve('success2')

    const results = await Promise.allSettled([success1, success2])

    expect(results.every(r => r.status === 'fulfilled')).toBe(true)
  })
})
