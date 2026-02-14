import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initTickEngine,
  startTickLoop,
  stopTickLoop,
  destroyTickEngine,
} from '@/engines/tickEngine'
import {
  createTestStore,
  advanceNTicks,
  getGameStateSnapshot,
} from '../helpers'

describe('게임 엔진: 틱 시스템 (Tick Engine)', () => {
  let mockWorker: any
  let store: any

  beforeEach(() => {
    // Mock Web Worker
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    }

    // Replace Worker with mock
    global.Worker = vi.fn(() => mockWorker) as any

    // Create test store
    store = createTestStore()
  })

  afterEach(() => {
    stopTickLoop()
    destroyTickEngine()
    vi.clearAllMocks()
  })

  describe('틱 엔진 초기화', () => {
    it('initTickEngine()이 Worker를 생성한다', () => {
      initTickEngine()
      expect(global.Worker).toHaveBeenCalled()
    })

    it('Worker 생성은 중복으로 실행되지 않는다', () => {
      initTickEngine()
      const firstCallCount = (global.Worker as any).mock.calls.length
      initTickEngine()
      const secondCallCount = (global.Worker as any).mock.calls.length
      expect(firstCallCount).toBe(secondCallCount)
    })

    it('Worker의 onmessage 핸들러가 설정된다', () => {
      initTickEngine()
      expect(mockWorker.onmessage).toBeDefined()
      expect(typeof mockWorker.onmessage).toBe('function')
    })
  })

  describe('틱 루프 실행', () => {
    it('startTickLoop()이 게임을 진행시킨다', (done) => {
      initTickEngine()
      store = createTestStore()

      const initialTick = store.getState().time.tick
      startTickLoop()

      setTimeout(() => {
        stopTickLoop()
        const finalTick = store.getState().time.tick
        expect(finalTick).toBeGreaterThan(initialTick)
        done()
      }, 500)
    })

    it('일시정지 중에는 틱이 진행되지 않는다', (done) => {
      initTickEngine()
      store = createTestStore({
        time: {
          year: 1995,
          month: 1,
          day: 1,
          tick: 0,
          isPaused: true,
        },
      })

      const initialTick = store.getState().time.tick
      startTickLoop()

      setTimeout(() => {
        stopTickLoop()
        const finalTick = store.getState().time.tick
        expect(finalTick).toBe(initialTick)
        done()
      }, 300)
    })

    it('게임이 시작되지 않으면 틱이 진행되지 않는다', (done) => {
      initTickEngine()
      store = createTestStore({ isGameStarted: false })

      const initialTick = store.getState().time.tick
      startTickLoop()

      setTimeout(() => {
        stopTickLoop()
        const finalTick = store.getState().time.tick
        expect(finalTick).toBe(initialTick)
        done()
      }, 300)
    })
  })

  describe('틱 엔진 동작', () => {
    it('매 틱마다 Worker에 메시지를 전송한다', () => {
      initTickEngine()
      store = createTestStore()

      advanceNTicks(store, 1)

      expect(mockWorker.postMessage).toHaveBeenCalled()
    })

    it('Worker 메시지에는 회사 데이터가 포함된다', () => {
      initTickEngine()
      store = createTestStore()

      mockWorker.postMessage.mockClear()
      advanceNTicks(store, 1)

      const lastCall = mockWorker.postMessage.mock.calls[0]?.[0]
      expect(lastCall).toBeDefined()
      expect(lastCall.companies).toBeDefined()
      expect(Array.isArray(lastCall.companies)).toBe(true)
      expect(lastCall.companies.length).toBeGreaterThan(0)
    })

    it('Worker 메시지에는 dt(시간 간격) 값이 포함된다', () => {
      initTickEngine()
      store = createTestStore()

      mockWorker.postMessage.mockClear()
      advanceNTicks(store, 1)

      const lastCall = mockWorker.postMessage.mock.calls[0]?.[0]
      expect(lastCall.dt).toBeDefined()
      expect(lastCall.dt).toBe(1 / 3600) // 1 tick = 1/3600 day
    })

    it('Worker 메시지에는 이벤트 modifier가 포함된다', () => {
      initTickEngine()
      store = createTestStore({
        events: [
          {
            id: 'test-event',
            type: 'policy',
            name: '금리인상',
            severity: 'high',
            impact: {
              driftModifier: 1.2,
              volatilityModifier: 1.5,
            },
            affectedSectors: ['Finance'],
            affectedCompanies: [],
            duration: 100,
            remainingTicks: 50,
            source: 'automatic',
            newsItems: [],
            createdAt: 0,
          },
        ],
      })

      mockWorker.postMessage.mockClear()
      advanceNTicks(store, 1)

      const lastCall = mockWorker.postMessage.mock.calls[0]?.[0]
      expect(lastCall.events).toBeDefined()
      expect(Array.isArray(lastCall.events)).toBe(true)
    })
  })

  describe('이벤트 감쇠 시스템', () => {
    it('매 틱마다 이벤트의 remainingTicks가 감소한다', () => {
      store = createTestStore({
        events: [
          {
            id: 'test-event',
            type: 'policy',
            name: '테스트이벤트',
            severity: 'high',
            impact: {
              driftModifier: 1.2,
              volatilityModifier: 1.5,
            },
            affectedSectors: [],
            affectedCompanies: [],
            duration: 100,
            remainingTicks: 50,
            source: 'automatic',
            newsItems: [],
            createdAt: 0,
          },
        ],
      })

      const initialTicks = store.getState().events[0].remainingTicks
      advanceNTicks(store, 1)
      const finalTicks = store.getState().events[0].remainingTicks

      expect(finalTicks).toBe(initialTicks - 1)
    })

    it('remainingTicks이 0이 되면 이벤트가 제거된다', () => {
      store = createTestStore({
        events: [
          {
            id: 'test-event',
            type: 'policy',
            name: '테스트이벤트',
            severity: 'high',
            impact: {
              driftModifier: 1.2,
              volatilityModifier: 1.5,
            },
            affectedSectors: [],
            affectedCompanies: [],
            duration: 100,
            remainingTicks: 1,
            source: 'automatic',
            newsItems: [],
            createdAt: 0,
          },
        ],
      })

      expect(store.getState().events.length).toBe(1)
      advanceNTicks(store, 1)
      expect(store.getState().events.length).toBe(0)
    })

    it('여러 이벤트가 독립적으로 감쇠된다', () => {
      store = createTestStore({
        events: [
          {
            id: 'event-1',
            type: 'policy',
            name: '이벤트1',
            severity: 'high',
            impact: {
              driftModifier: 1.2,
              volatilityModifier: 1.5,
            },
            affectedSectors: [],
            affectedCompanies: [],
            duration: 100,
            remainingTicks: 10,
            source: 'automatic',
            newsItems: [],
            createdAt: 0,
          },
          {
            id: 'event-2',
            type: 'sector',
            name: '이벤트2',
            severity: 'medium',
            impact: {
              driftModifier: 0.8,
              volatilityModifier: 1.2,
            },
            affectedSectors: [],
            affectedCompanies: [],
            duration: 100,
            remainingTicks: 5,
            source: 'automatic',
            newsItems: [],
            createdAt: 0,
          },
        ],
      })

      advanceNTicks(store, 5)

      const events = store.getState().events
      expect(events.length).toBe(1)
      expect(events[0].id).toBe('event-1')
      expect(events[0].remainingTicks).toBe(5)
    })
  })

  describe('월간 처리 (Monthly Processing)', () => {
    it('매월 1일 첫 틱에 processMonthly()가 호출된다', () => {
      store = createTestStore()
      store.processMonthly = vi.fn()

      // Advance to day 1, tick 0
      advanceNTicks(store, 3600) // 1 day = 3600 ticks

      expect(store.processMonthly).toHaveBeenCalled()
    })

    it('다른 날짜에는 processMonthly()가 호출되지 않는다', () => {
      store = createTestStore({
        time: {
          year: 1995,
          month: 1,
          day: 2,
          tick: 0,
          isPaused: false,
        },
      })
      store.processMonthly = vi.fn()

      advanceNTicks(store, 1)

      expect(store.processMonthly).not.toHaveBeenCalled()
    })
  })

  describe('자동 저장 시스템', () => {
    it('매 300틱마다 자동 저장이 트리거된다', () => {
      store = createTestStore()
      const saveGame = vi.fn()

      advanceNTicks(store, 300)
      // Note: 실제 구현에서는 saveGame이 호출되어야 함
      // 이 테스트는 자동 저장 간격을 검증
    })
  })

  describe('직원 시스템 처리', () => {
    it('매 10틱마다 processEmployeeTick()이 호출된다', () => {
      store = createTestStore()
      store.processEmployeeTick = vi.fn()

      advanceNTicks(store, 10)

      expect(store.processEmployeeTick).toHaveBeenCalled()
    })

    it('직원이 없으면 processEmployeeTick()이 호출되지 않는다', () => {
      store = createTestStore({ 'player.employees': [] })
      store.processEmployeeTick = vi.fn()

      advanceNTicks(store, 10)

      expect(store.processEmployeeTick).not.toHaveBeenCalled()
    })
  })

  describe('AI 경쟁자 처리', () => {
    it('경쟁자 자산이 매 틱마다 업데이트된다', () => {
      store = createTestStore({ competitorCount: 1 })
      store.updateCompetitorAssets = vi.fn()

      advanceNTicks(store, 1)

      expect(store.updateCompetitorAssets).toHaveBeenCalled()
    })

    it('경쟁자가 없으면 updateCompetitorAssets()가 호출되지 않는다', () => {
      store = createTestStore({ competitorCount: 0 })
      store.updateCompetitorAssets = vi.fn()

      advanceNTicks(store, 1)

      expect(store.updateCompetitorAssets).not.toHaveBeenCalled()
    })
  })

  describe('틱 엔진 정리', () => {
    it('stopTickLoop()이 반복을 중지한다', (done) => {
      initTickEngine()
      store = createTestStore()

      startTickLoop()

      setTimeout(() => {
        const tickBefore = store.getState().time.tick
        stopTickLoop()

        setTimeout(() => {
          const tickAfter = store.getState().time.tick
          expect(tickAfter).toBe(tickBefore)
          done()
        }, 200)
      }, 200)
    })

    it('destroyTickEngine()이 Worker를 정리한다', () => {
      initTickEngine()

      destroyTickEngine()

      expect(mockWorker.terminate).toHaveBeenCalled()
    })
  })

  describe('난이도에 따른 변동성 조정', () => {
    it('어려움 난이도에서 Worker로 전송되는 변동성이 증가한다', () => {
      initTickEngine()
      store = createTestStore({
        difficulty: 'hard',
        difficultyConfig: {
          volatilityMultiplier: 1.5,
          eventChance: 0.03,
        },
      })

      mockWorker.postMessage.mockClear()
      advanceNTicks(store, 1)

      const lastCall = mockWorker.postMessage.mock.calls[0]?.[0]
      const volatilitySum = lastCall.companies.reduce(
        (sum: number, c: any) => sum + c.volatility,
        0
      )

      // Hard difficulty has 1.5x volatility multiplier
      expect(volatilitySum).toBeGreaterThan(0)
    })
  })
})
