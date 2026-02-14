import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Web Audio API
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 0 },
  type: 'sine',
}

const mockGain = {
  connect: vi.fn(),
  gain: { value: 1 },
}

global.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
})) as any

global.OfflineAudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
  startRendering: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100 })),
})) as any

// Mock Web Worker
class MockWorker {
  url: string
  onmessage: ((e: MessageEvent) => void) | null = null

  constructor(stringUrl: string) {
    this.url = stringUrl
  }

  postMessage = vi.fn((data) => {
    // Simulate immediate response for testing
    if (this.onmessage && data.type === 'tick') {
      const mockPrices: Record<string, number> = {}
      if (data.companies) {
        data.companies.forEach((c: any) => {
          mockPrices[c.id] = c.price * (1 + Math.random() * 0.02 - 0.01)
        })
      }
      this.onmessage({ 
        data: { type: 'prices', prices: mockPrices } 
      } as MessageEvent)
    }
  })

  terminate = vi.fn()
}

vi.stubGlobal('Worker', MockWorker as any)

// Mock IndexedDB (fake-indexeddb is auto-configured, but ensure cleanup)
afterEach(async () => {
  try {
    const dbs = await indexedDB.databases()
    dbs.forEach(db => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name)
      }
    })
  } catch (e) {
    // Silently ignore cleanup errors
  }
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

vi.stubGlobal('localStorage', localStorageMock as any)
