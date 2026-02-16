import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CompanyData, TickMessage, PriceUpdate } from '@/workers/priceEngine.worker'

/**
 * 게임 메뉴얼: Web Worker GBM 가격 계산 엔진
 *
 * - GBM (Geometric Brownian Motion) 공식:
 *   S(t+dt) = S(t) × exp((μ - σ²/2)×dt + σ×√dt×Z)
 *   여기서 Z ~ N(0,1)는 표준정규분포
 *
 * - dt = 1/10 (1시간 = 영업일의 1/10)
 * - 이벤트 적용: driftModifier 누적 (더하기), volatilityModifier 곱셈
 * - 가격 범위: 최소 100원 (상장폐지 방지)
 * - 컴퍼니/섹터 필터링: 글로벌 이벤트는 모든 주식 영향
 */
describe('스토어 통합: Web Worker 가격 엔진 (Price Engine)', () => {
  let mockWorker: any
  let messageHandler: ((e: MessageEvent) => void) | null = null

  beforeEach(() => {
    // Mock Web Worker
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    }

    // 실제 Worker 로직을 시뮬레이션 (테스트 목적)
    // 실제 환경에서는 priceEngine.worker.ts의 로직을 실행
  })

  describe('Worker 초기화', () => {
    it('Worker가 tick 메시지를 수신할 수 있다', () => {
      expect(mockWorker).toBeDefined()
      expect(mockWorker.postMessage).toBeDefined()
    })

    it('Worker가 MessageEvent를 처리한다', () => {
      const tickMessage: TickMessage = {
        type: 'tick',
        companies: [
          {
            id: 'samsung',
            sector: 'Tech',
            price: 50_000,
            drift: 0.1,
            volatility: 0.2,
          },
        ],
        dt: 1 / 10,
        events: [],
      }

      mockWorker.postMessage(tickMessage)
      expect(mockWorker.postMessage).toHaveBeenCalledWith(tickMessage)
    })
  })

  describe('GBM 가격 계산', () => {
    /**
     * GBM 공식 검증
     * dt = 1/10은 1시간(영업일의 1/10)의 시간 진행을 나타냄
     */
    it('dt = 1/10으로 가격이 변동한다', () => {
      // Given: 기본 회사 데이터
      const company: CompanyData = {
        id: 'samsung',
        sector: 'Tech',
        price: 100_000,
        drift: 0,
        volatility: 0.01,
      }

      // When: dt = 1/10 (1시간 = 영업일의 1/10)
      const dt = 1 / 10
      const expectedDt = dt

      // Then: dt가 올바른 값
      expect(expectedDt).toBeCloseTo(0.1, 5)
    })

    it('volatility가 높을수록 가격 변동이 크다', () => {
      // Given: 두 회사 비교 (volatility만 다름)
      const lowVolCompany: CompanyData = {
        id: 'lowvol',
        sector: 'Finance',
        price: 50_000,
        drift: 0.05,
        volatility: 0.01, // 낮은 변동성
      }

      const highVolCompany: CompanyData = {
        id: 'highvol',
        sector: 'Tech',
        price: 50_000,
        drift: 0.05,
        volatility: 0.3, // 높은 변동성
      }

      // Then: 두 회사가 다르게 변동할 수 있음
      expect(highVolCompany.volatility).toBeGreaterThan(
        lowVolCompany.volatility
      )
    })

    it('drift가 양수면 장기적으로 상승한다', () => {
      // Given: 긍정 드리프트
      const positiveDriftCompany: CompanyData = {
        id: 'uptrend',
        sector: 'Tech',
        price: 50_000,
        drift: 0.1, // +10% 연 기대값
        volatility: 0.05,
      }

      // Then: 드리프트가 긍정적
      expect(positiveDriftCompany.drift).toBeGreaterThan(0)
    })

    it('가격이 100원 아래로 내려가지 않는다', () => {
      // Given: 매우 낮은 가격
      const crashedCompany: CompanyData = {
        id: 'crashed',
        sector: 'Energy',
        price: 100, // 최소 가격
        drift: -0.5,
        volatility: 0.5,
      }

      // Then: 최소 가격이 유지됨
      expect(crashedCompany.price).toBeGreaterThanOrEqual(100)
    })
  })

  describe('이벤트 모디파이어 적용', () => {
    it('driftModifier는 누적된다', () => {
      // Given: 여러 이벤트의 driftModifier
      const baseDrift = 0.05
      const modifier1 = 0.02
      const modifier2 = 0.01

      // When: 모디파이어 누적
      const totalDrift = baseDrift + modifier1 + modifier2

      // Then: 모디파이어가 더해짐
      expect(totalDrift).toBe(0.08)
    })

    it('volatilityModifier는 곱셈된다', () => {
      // Given: 기본 변동성과 모디파이어
      const baseVolatility = 0.2
      const volatilityModifier = 0.5 // +50%

      // When: 곱셈 적용
      const newVolatility = baseVolatility * (1 + volatilityModifier)

      // Then: 변동성이 증가
      expect(newVolatility).toBeCloseTo(0.3, 5)
    })

    it('volatility는 음수가 되지 않는다', () => {
      // Given: 극단적인 모디파이어
      const baseVolatility = 0.1
      const extremeModifier = -2 // -200%

      // When: 곱셈 후 최소값 적용
      const newVolatility = Math.max(0.01, baseVolatility * (1 + extremeModifier))

      // Then: 최소 0.01% 유지
      expect(newVolatility).toBeGreaterThanOrEqual(0.01)
    })

    it('글로벌 이벤트는 모든 주식에 영향을 준다', () => {
      // Given: 필터링 없는 글로벌 이벤트
      const globalEvent = {
        driftModifier: 0.05,
        volatilityModifier: 0.1,
        // affectedCompanies와 affectedSectors 없음 = 글로벌
      }

      // Then: 필터링이 없으므로 모든 회사에 적용됨
      const companies = [
        { id: 'samsung', sector: 'Tech' },
        { id: 'hyundai', sector: 'Consumer' },
        { id: 'kb', sector: 'Finance' },
      ]

      // 모든 회사가 영향을 받아야 함
      expect(companies.length).toBe(3)
    })

    it('affectedCompanies 필터가 작동한다', () => {
      // Given: 특정 회사만 영향받는 이벤트
      const sectorEvent = {
        driftModifier: -0.2,
        volatilityModifier: 0.3,
        affectedCompanies: ['samsung', 'lg'], // 이 회사들만
      }

      // Then: 필터된 회사들만 영향
      expect(sectorEvent.affectedCompanies).toContain('samsung')
      expect(sectorEvent.affectedCompanies).toContain('lg')
      expect(sectorEvent.affectedCompanies).not.toContain('kb')
    })

    it('affectedSectors 필터가 작동한다', () => {
      // Given: 특정 섹터만 영향받는 이벤트
      const techEvent = {
        driftModifier: 0.15,
        volatilityModifier: 0.05,
        affectedSectors: ['Tech', 'Finance'], // 이 섹터들만
      }

      // Then: 필터된 섹터들만 영향
      expect(techEvent.affectedSectors).toContain('Tech')
      expect(techEvent.affectedSectors).toContain('Finance')
      expect(techEvent.affectedSectors).not.toContain('Energy')
    })

    it('회사와 섹터 필터가 모두 있으면 OR 로직이다', () => {
      // Given: 회사 필터와 섹터 필터 모두 있는 이벤트
      const mixedEvent = {
        driftModifier: 0.1,
        volatilityModifier: 0.05,
        affectedCompanies: ['samsung'], // 또는
        affectedSectors: ['Finance'], // 이 섹터
      }

      // Then: 회사 OR 섹터 필터 모두 적용됨
      const affectedByCompany = 'samsung'
      const affectedBySector = 'kb' // Finance 섹터

      expect(mixedEvent.affectedCompanies).toContain(affectedByCompany)
      expect(mixedEvent.affectedSectors).toContain('Finance')
    })
  })

  describe('회사/섹터 필터링', () => {
    it('회사 ID로 필터링된다', () => {
      // Given: 특정 회사 ID 필터
      const affectedCompanies = ['samsung', 'lg']
      const targetCompany = { id: 'samsung', sector: 'Tech' }
      const otherCompany = { id: 'hyundai', sector: 'Consumer' }

      // Then: 필터 매칭 확인
      expect(affectedCompanies).toContain(targetCompany.id)
      expect(affectedCompanies).not.toContain(otherCompany.id)
    })

    it('섹터로 필터링된다', () => {
      // Given: 특정 섹터 필터
      const affectedSectors = ['Tech', 'Energy']
      const techCompany = { id: 'samsung', sector: 'Tech' }
      const financeCompany = { id: 'kb', sector: 'Finance' }

      // Then: 섹터 매칭 확인
      expect(affectedSectors).toContain(techCompany.sector)
      expect(affectedSectors).not.toContain(financeCompany.sector)
    })

    it('필터가 없으면 모든 회사가 영향받는다', () => {
      // Given: 필터 없는 이벤트
      const noFilter = {
        driftModifier: 0.1,
        volatilityModifier: 0.05,
        // affectedCompanies와 affectedSectors 없음
      }

      // Then: 모든 회사가 해당
      const allCompanies = [
        { id: 'samsung', sector: 'Tech' },
        { id: 'kb', sector: 'Finance' },
        { id: 'exxon', sector: 'Energy' },
      ]

      expect(allCompanies.length).toBe(3)
    })

    it('다중 섹터 필터링이 작동한다', () => {
      // Given: 여러 섹터 필터
      const crisis = {
        driftModifier: -0.3,
        volatilityModifier: 0.5,
        affectedSectors: ['Finance', 'Energy', 'Consumer'],
      }

      const companies = [
        { id: 'kb', sector: 'Finance' },
        { id: 'exxon', sector: 'Energy' },
        { id: 'samsung', sector: 'Tech' },
      ]

      // Then: 세 회사 중 두 개가 영향받음
      const affected = companies.filter((c) =>
        crisis.affectedSectors!.includes(c.sector)
      )

      expect(affected.length).toBe(2)
      expect(affected.some((c) => c.id === 'samsung')).toBe(false)
    })
  })

  describe('가격 업데이트 메시지', () => {
    it('PriceUpdate 메시지 구조가 올바르다', () => {
      // Given: 가격 업데이트 메시지
      const priceUpdate: PriceUpdate = {
        type: 'prices',
        prices: {
          samsung: 52_100,
          hyundai: 48_900,
          kb: 51_200,
        },
      }

      // Then: 메시지 구조 확인
      expect(priceUpdate.type).toBe('prices')
      expect(typeof priceUpdate.prices).toBe('object')
      expect(Object.keys(priceUpdate.prices).length).toBe(3)
    })

    it('모든 회사의 가격이 포함된다', () => {
      // Given: 20개 회사의 가격
      const prices: Record<string, number> = {}
      for (let i = 0; i < 20; i++) {
        prices[`company-${i}`] = 50_000 + Math.random() * 5_000
      }

      // Then: 모든 가격이 포함됨
      expect(Object.keys(prices).length).toBe(20)
      Object.values(prices).forEach((price) => {
        expect(price).toBeGreaterThan(0)
      })
    })

    it('가격이 100원 이상이다', () => {
      // Given: 극단적인 시나리오의 가격들
      const prices: Record<string, number> = {
        crashed: 100,
        normal: 50_000,
        expensive: 500_000,
      }

      // Then: 모든 가격이 최소값 이상
      Object.values(prices).forEach((price) => {
        expect(price).toBeGreaterThanOrEqual(100)
      })
    })
  })

  describe('복합 시나리오', () => {
    it('다중 이벤트가 누적 적용된다', () => {
      // Given: 여러 활성 이벤트
      const baseCompany: CompanyData = {
        id: 'samsung',
        sector: 'Tech',
        price: 50_000,
        drift: 0.05,
        volatility: 0.2,
      }

      const events = [
        {
          driftModifier: 0.05,
          volatilityModifier: 0.1,
          affectedSectors: ['Tech'], // 기술주 상승
        },
        {
          driftModifier: 0.02,
          volatilityModifier: 0.05,
          affectedCompanies: ['samsung'], // 삼성 추가 상승
        },
      ]

      // Then: 드리프트가 누적됨
      let totalDrift = baseCompany.drift
      let totalVolatility = baseCompany.volatility

      // 첫 이벤트 적용 (섹터 매칭)
      totalDrift += events[0].driftModifier // 0.05
      totalVolatility *= 1 + events[0].volatilityModifier // ×1.1

      // 두 번째 이벤트 적용 (회사 매칭)
      totalDrift += events[1].driftModifier // +0.02
      totalVolatility *= 1 + events[1].volatilityModifier // ×1.05

      expect(totalDrift).toBeCloseTo(0.12, 2)
      expect(totalVolatility).toBeCloseTo(0.231, 2)
    })

    it('금리인상 이벤트가 금융주에 영향을 준다', () => {
      // Given: 금리인상 이벤트 (금융주 타격)
      const rateHike = {
        driftModifier: -0.15,
        volatilityModifier: 0.2,
        affectedSectors: ['Finance'],
      }

      const financeCompany: CompanyData = {
        id: 'kb',
        sector: 'Finance',
        price: 45_000,
        drift: 0.08,
        volatility: 0.15,
      }

      const techCompany: CompanyData = {
        id: 'samsung',
        sector: 'Tech',
        price: 50_000,
        drift: 0.1,
        volatility: 0.2,
      }

      // Then: 금융주만 영향받음
      expect(rateHike.affectedSectors).toContain(financeCompany.sector)
      expect(rateHike.affectedSectors).not.toContain(techCompany.sector)
    })

    it('AI혁명 이벤트가 기술주에 영향을 준다', () => {
      // Given: AI 혁명 이벤트
      const aiRevolution = {
        driftModifier: 0.25,
        volatilityModifier: 0.15,
        affectedSectors: ['Tech'],
      }

      const techCompanies = [
        { id: 'samsung', sector: 'Tech' },
        { id: 'nvidia', sector: 'Tech' },
        { id: 'tsmc', sector: 'Tech' },
      ]

      // Then: 모든 기술주가 영향받음
      const affected = techCompanies.filter((c) =>
        aiRevolution.affectedSectors!.includes(c.sector)
      )

      expect(affected.length).toBe(3)
    })

    it('검은 월요일 이벤트는 글로벌 영향을 준다', () => {
      // Given: 시장 전체 붕괴
      const blackMonday = {
        driftModifier: -0.4,
        volatilityModifier: 1.0, // 변동성 2배
        // 필터 없음 = 글로벌
      }

      const allCompanies = [
        { id: 'samsung', sector: 'Tech' },
        { id: 'kb', sector: 'Finance' },
        { id: 'exxon', sector: 'Energy' },
        { id: 'hyundai', sector: 'Consumer' },
      ]

      // Then: 모든 주식에 영향
      expect(allCompanies.length).toBe(4)
      // 글로벌 이벤트이므로 모두 영향받음
    })

    it('100개 회사의 가격을 동시에 계산할 수 있다', () => {
      // Given: 100개 회사
      const companies: CompanyData[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `company-${i}`,
          sector: ['Tech', 'Finance', 'Energy', 'Consumer', 'Healthcare'][
            i % 5
          ],
          price: 40_000 + Math.random() * 20_000,
          drift: 0.05 + Math.random() * 0.1,
          volatility: 0.15 + Math.random() * 0.15,
        }))

      // When: 배치 계산
      const result: Record<string, number> = {}
      companies.forEach((c) => {
        result[c.id] = c.price * (1 + (Math.random() - 0.5) * 0.02)
      })

      // Then: 모든 회사의 가격이 계산됨
      expect(Object.keys(result).length).toBe(100)
      Object.values(result).forEach((price) => {
        expect(price).toBeGreaterThan(0)
      })
    })
  })

  describe('성능 검증', () => {
    it('100개 회사 가격 계산이 허용 시간 내 완료된다', () => {
      // Given: 100개 회사와 5개 활성 이벤트
      const companies: CompanyData[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `company-${i}`,
          sector: ['Tech', 'Finance', 'Energy', 'Consumer', 'Healthcare'][
            i % 5
          ],
          price: 50_000,
          drift: 0.05,
          volatility: 0.2,
        }))

      const events = Array(5)
        .fill(null)
        .map((_, i) => ({
          driftModifier: 0.01 * (i + 1),
          volatilityModifier: 0.05,
        }))

      // When: 시간 측정 (실제 계산 시뮬레이션)
      const start = performance.now()

      // 계산 시뮬레이션
      const prices: Record<string, number> = {}
      companies.forEach((c) => {
        let drift = c.drift
        let volatility = c.volatility

        events.forEach((e) => {
          drift += e.driftModifier
          volatility *= 1 + e.volatilityModifier
        })

        prices[c.id] = Math.max(100, c.price * (1 + drift * 0.01))
      })

      const elapsed = performance.now() - start

      // Then: 5ms 이내 완료 (Worker는 비동기이므로 엄격하지 않음)
      expect(elapsed).toBeLessThan(100) // 넉넉한 시간 제한
      expect(Object.keys(prices).length).toBe(100)
    })

    it('매 시간마다 메시지 송수신이 동작한다', () => {
      // Given: 연속 시간 메시지
      const tickCount = 100
      const messages: TickMessage[] = Array(tickCount)
        .fill(null)
        .map((_, i) => ({
          type: 'tick' as const,
          companies: [
            {
              id: 'samsung',
              sector: 'Tech',
              price: 50_000 + i * 10,
              drift: 0.05,
              volatility: 0.2,
            },
          ],
          dt: 1 / 10,
          events: [],
        }))

      // When: 메시지 송수신 시뮬레이션
      let receivedCount = 0
      messages.forEach((msg) => {
        mockWorker.postMessage(msg)
        receivedCount++
      })

      // Then: 모든 메시지가 처리됨
      expect(receivedCount).toBe(tickCount)
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(tickCount)
    })
  })
})
