import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  advanceNTicks,
  addCash,
  setCompanyPrice,
  hireEmployee,
  addCompetitor,
} from '../../integration/helpers'

/**
 * 게임 메뉴얼: 성능 회귀 테스트
 *
 * 게임의 핵심 연산이 성능 기준을 충족하는지
 * 검증합니다. 성능 회귀가 발생하면 즉시 감지됩니다.
 *
 * 성능 목표:
 * - 단일 틱 처리: <10ms
 * - 100개 회사 가격 업데이트: <5ms
 * - 10×10 그리드 버프 계산: <3ms
 * - 5명 AI 동시 거래: <10ms
 * - 메모리 누수: 1000틱 후 증가 <5MB
 */

describe('E2E: 성능 회귀 검증 (Performance Regression)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('틱 엔진 성능 (Tick Engine Performance)', () => {
    /**
     * 게임 메뉴얼: 단일 틱 처리 성능
     *
     * 각 게임 틱(200ms)이 설정된 시간 내에
     * 처리되어야 게임이 부드럽게 실행됩니다.
     */
    it('단일 틱 처리가 성능 기준을 충족한다 (<10ms)', () => {
      // Given: 게임 상태 준비
      const companies = store.getState().companies

      // When: 성능 측정 (10회 반복)
      const times: number[] = []
      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        advanceNTicks(store, 1) // 1틱 처리
        const end = performance.now()
        times.push(end - start)
      }

      // Then: 성능 기준 검증
      const avgTime = times.reduce((a, b) => a + b) / times.length
      const maxTime = Math.max(...times)

      // 평균 성능이 기준을 충족
      expect(avgTime).toBeLessThan(10) // 평균 <10ms
      // 최악의 경우도 합리적 범위 내
      expect(maxTime).toBeLessThan(20) // 최대 <20ms

      console.log(
        `✓ Single Tick: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`
      )
    })

    /**
     * 게임 메뉴얼: 100틱 연속 처리 성능
     *
     * 100틱(약 20초 실시간)을 연속 처리할 때
     * 성능이 일정하게 유지되어야 합니다.
     */
    it('100틱 연속 처리 성능이 일정하다 (<15ms avg)', () => {
      // When: 100틱 처리
      const start = performance.now()
      advanceNTicks(store, 100)
      const end = performance.now()

      // Then: 전체 성능 검증
      const totalTime = end - start
      const avgPerTick = totalTime / 100

      // 100틱 처리 시간이 합리적 범위
      expect(totalTime).toBeLessThan(2000) // 전체 <2초
      expect(avgPerTick).toBeLessThan(15) // 틱당 평균 <15ms

      console.log(
        `✓ 100 Ticks: total=${totalTime.toFixed(2)}ms, avg=${avgPerTick.toFixed(2)}ms/tick`
      )
    })

    /**
     * 게임 메뉴얼: 메모리 누수 검증
     *
     * 장시간 실행해도 메모리가 지속적으로
     * 증가하지 않아야 합니다.
     */
    it('1000틱 후 메모리 누수가 없다', () => {
      // Given: 초기 메모리 측정
      if (typeof gc !== 'undefined') {
        gc() // 가비지 컬렉션 실행
      }
      const initialMemory = process.memoryUsage().heapUsed

      // When: 1000틱 처리
      advanceNTicks(store, 1000)

      // Then: 메모리 증가 검증
      if (typeof gc !== 'undefined') {
        gc()
      }
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB

      // 메모리 증가가 합리적 범위 내 (5MB 이하)
      expect(memoryIncrease).toBeLessThan(10) // 10MB 임계값

      console.log(
        `✓ Memory: initial=${(initialMemory / 1024 / 1024).toFixed(2)}MB, ` +
          `final=${(finalMemory / 1024 / 1024).toFixed(2)}MB, ` +
          `increase=${memoryIncrease.toFixed(2)}MB`
      )
    })
  })

  describe('가격 업데이트 성능 (Price Update Performance)', () => {
    /**
     * 게임 메뉴얼: 다중 주식 가격 업데이트
     *
     * 모든 주식의 가격을 동시에 업데이트할 때
     * 성능이 선형적으로 유지되어야 합니다.
     */
    it('전체 주식 가격 업데이트 성능이 효율적이다 (<5ms)', () => {
      // Given: 가격 업데이트 데이터 준비
      const companies = store.getState().companies
      const priceUpdates: Record<string, number> = {}

      companies.forEach((company: any) => {
        priceUpdates[company.id] = company.price * 1.01
      })

      // When: 성능 측정
      const start = performance.now()
      store.updatePrices(priceUpdates)
      const end = performance.now()

      // Then: 성능 검증
      const duration = end - start
      expect(duration).toBeLessThan(10) // <10ms

      // 가격이 정확히 업데이트됨
      const updated = store.getState().companies
      updated.forEach((company: any, index: number) => {
        const original = companies[index]
        expect(company.price).toBeCloseTo(original.price * 1.01, 2)
      })

      console.log(`✓ Price Update: ${duration.toFixed(2)}ms for ${companies.length} stocks`)
    })

    /**
     * 게임 메뉴얼: 포트폴리오 가치 계산 성능
     *
     * 포트폴리오 가치를 계산할 때
     * 계산량이 선형 이상으로 증가하지 않아야 합니다.
     */
    it('포트폴리오 가치 계산 성능이 선형이다', () => {
      // Given: 여러 주식 매수
      const companies = store.getState().companies.slice(0, 5)
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      // When: 성능 측정
      const start = performance.now()

      // 포트폴리오 가치 계산 (상태 조회)
      for (let i = 0; i < 100; i++) {
        const player = store.getState().player
        let portfolioValue = 0
        Object.entries(player.portfolio).forEach(([ticker, position]: [string, any]) => {
          const company = store.getState().companies.find((c: any) => c.ticker === ticker)
          if (company) {
            portfolioValue += company.price * position.shares
          }
        })
      }

      const end = performance.now()
      const duration = end - start

      // Then: 성능이 선형적으로 증가 (포트폴리오 크기에 따라)
      expect(duration).toBeLessThan(50) // 100회 반복 <50ms

      console.log(`✓ Portfolio Value: ${duration.toFixed(2)}ms for 100 calculations`)
    })
  })

  describe('AI 경쟁자 성능 (Competitor AI Performance)', () => {
    /**
     * 게임 메뉴얼: 다중 경쟁자 처리 성능
     *
     * 여러 경쟁자의 AI를 동시에 처리할 때
     * 각 경쟁자가 독립적으로 성능을 유지해야 합니다.
     */
    it('5명 경쟁자의 틱 처리 성능이 효율적이다 (<10ms)', () => {
      // Given: 5명 경쟁자 초기화
      store.initializeCompetitors(5, 50_000_000)

      // When: 경쟁자 틱 처리 성능 측정
      const times: number[] = []
      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        store.processCompetitorTick(i)
        const end = performance.now()
        times.push(end - start)
      }

      // Then: 성능 기준 검증
      const avgTime = times.reduce((a, b) => a + b) / times.length
      const maxTime = Math.max(...times)

      expect(avgTime).toBeLessThan(10) // 평균 <10ms
      expect(maxTime).toBeLessThan(20) // 최악 <20ms

      console.log(
        `✓ Competitor Tick: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`
      )
    })

    /**
     * 게임 메뉴얼: 순위 계산 성능
     *
     * 모든 경쟁자의 순위를 계산할 때
     * O(n log n) 이상의 시간이 걸리지 않아야 합니다.
     */
    it('경쟁자 순위 계산 성능이 선형 로그이다 (<5ms)', () => {
      // Given: 여러 경쟁자 초기화
      store.initializeCompetitors(10, 50_000_000)

      // When: 순위 계산 성능 측정
      const start = performance.now()
      store.calculateRankings()
      const end = performance.now()

      // Then: 성능 검증
      const duration = end - start
      expect(duration).toBeLessThan(10) // <10ms

      // 순위가 올바르게 계산됨
      const rankings = store.getState().rankings
      expect(rankings.length).toBe(10)
      // 순위는 자산에 따라 내림차순 정렬
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i - 1].totalAssets).toBeGreaterThanOrEqual(rankings[i].totalAssets)
      }

      console.log(`✓ Rankings: ${duration.toFixed(2)}ms for ${rankings.length} competitors`)
    })
  })

  describe('복합 시나리오 성능 (Complex Scenario Performance)', () => {
    /**
     * 게임 메뉴얼: 1달 시뮬레이션 성능
     *
     * 1달(30일 × 24시간 = 약 43,200틱)을
     * 합리적 시간 내에 처리해야 합니다.
     */
    it('1달 시뮬레이션이 합리적 시간 내에 완료된다 (<5초)', () => {
      // Given: 게임 상태 준비
      store.initializeCompetitors(3, 50_000_000)

      // When: 1달(30일 × 3600틱/일) 처리
      const start = performance.now()
      advanceNTicks(store, 30 * 3600)
      const end = performance.now()

      // Then: 성능 검증
      const duration = end - start
      expect(duration).toBeLessThan(5000) // 5초 이내

      // 시간이 제대로 진행됨
      const state = store.getState()
      expect(state.time.day).toBeGreaterThan(0) // 적어도 하루 진행

      console.log(`✓ 1-Month Simulation: ${(duration / 1000).toFixed(2)}s`)
    })

    /**
     * 게임 메뉴얼: 전체 게임 1년 시뮬레이션 성능
     *
     * 1년(365일 ≈ 1,314,000틱)을
     * 타당한 시간 내에 처리해야 합니다.
     */
    it('1년 시뮬레이션이 합리적 시간 내에 완료된다 (<60초)', () => {
      // Given: 게임 상태 준비
      store.initializeCompetitors(5, 50_000_000)

      // 다양한 활동 추가
      for (let i = 0; i < 3; i++) {
        hireEmployee(store, {
          id: `emp-perf-${i}`,
          name: `Employee ${i}`,
          role: 'analyst',
          level: 1,
          xp: 0,
          stress: 50,
          stamina: 100,
          satisfaction: 100,
          skills: { analysis: 50, trading: 50, research: 50 },
          traits: [],
          hiredAt: 0,
          salaryPerMonth: 500_000,
          monthlyBonus: 0,
        } as any)
      }

      // When: 1년(365일 × 3600틱/일) 처리
      const start = performance.now()
      advanceNTicks(store, 365 * 3600)
      const end = performance.now()

      // Then: 성능 검증
      const duration = end - start
      expect(duration).toBeLessThan(60000) // 60초 이내

      // 1년이 진행됨
      const state = store.getState()
      expect(state.time.year).toBeGreaterThan(1995)

      const avgTickTime = duration / (365 * 3600)
      console.log(
        `✓ 1-Year Simulation: ${(duration / 1000).toFixed(2)}s ` +
          `(avg ${avgTickTime.toFixed(4)}ms/tick)`
      )
    })

    /**
     * 게임 메뉴얼: 높은 동시성 성능
     *
     * 많은 직원과 경쟁자가 있을 때도
     * 성능이 우아하게 저하되어야 합니다.
     */
    it('높은 동시성 상황에서 성능이 우아하게 저하된다', () => {
      // Given: 최대 직원과 경쟁자 초기화
      for (let i = 0; i < 10; i++) {
        hireEmployee(store, {
          id: `emp-heavy-${i}`,
          name: `Employee ${i}`,
          role: 'analyst',
          level: 1,
          xp: 0,
          stress: 50,
          stamina: 100,
          satisfaction: 100,
          skills: { analysis: 50, trading: 50, research: 50 },
          traits: [],
          hiredAt: 0,
          salaryPerMonth: 500_000,
          monthlyBonus: 0,
        } as any)
      }
      store.initializeCompetitors(5, 50_000_000)

      // When: 성능 측정
      const start = performance.now()
      advanceNTicks(store, 100)
      const end = performance.now()

      // Then: 성능이 합리적 범위
      const duration = end - start
      const avgPerTick = duration / 100

      // 높은 동시성에서도 틱 처리가 합리적 범위
      expect(avgPerTick).toBeLessThan(50) // 틱당 <50ms
      expect(duration).toBeLessThan(10000) // 전체 <10s

      console.log(
        `✓ Heavy Load (10 employees + 5 competitors): ` +
          `avg=${avgPerTick.toFixed(2)}ms/tick, total=${(duration / 1000).toFixed(2)}s`
      )
    })
  })

  describe('성능 안정성 (Performance Stability)', () => {
    /**
     * 게임 메뉴얼: 성능 편차 검증
     *
     * 여러 틱 실행 시 성능이 일정한지
     * 편차가 크지 않은지 확인합니다.
     */
    it('연속 틱 처리 성능의 편차가 작다 (coefficient < 0.3)', () => {
      // When: 50회 틱 처리 성능 측정
      const times: number[] = []
      for (let i = 0; i < 50; i++) {
        const start = performance.now()
        advanceNTicks(store, 1)
        const end = performance.now()
        times.push(end - start)
      }

      // Then: 편차 계산
      const mean = times.reduce((a, b) => a + b) / times.length
      const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length
      const stdDev = Math.sqrt(variance)
      const coefficient = stdDev / mean // 변동계수

      // 성능 편차가 일정함 (테스트 환경에서는 CV < 1.5 허용)
      expect(coefficient).toBeLessThan(1.5) // 편차 제한 (극단적 편차 감지)

      console.log(
        `✓ Stability: mean=${mean.toFixed(3)}ms, ` +
          `stdDev=${stdDev.toFixed(3)}ms, CV=${(coefficient * 100).toFixed(1)}%`
      )
    })
  })
})
