import { describe, bench, beforeEach } from 'vitest'
import { createTestStore, advanceNTicks, setCompanyPrice } from '../integration/helpers'

/**
 * 성능 벤치마크: AI 경쟁자 거래
 *
 * AI 경쟁자들의 거래 성능과 확장성을 측정합니다.
 * 4가지 전략(Shark/Turtle/Surfer/Bear)별 거래 성능과
 * 경쟁자 수에 따른 성능 변화를 추적합니다.
 *
 * 목표:
 * - 1명 경쟁자: <5ms
 * - 3명 경쟁자: <10ms
 * - 5명 경쟁자: <15ms
 * - 10명 경쟁자: <30ms
 */

describe('성능 벤치마크: AI 경쟁자 거래 (AI Trading)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('전략별 거래 성능', () => {
    bench('Shark (공격적) 거래 100틱', () => {
      store.initializeCompetitors(1, 50_000_000)
      // Shark: 고변동성 주식에 자주 거래
      for (let i = 0; i < 100; i++) {
        // 가격 변동 시뮬레이션
        const company = store.getState().companies[0]
        setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.05))
        store.processCompetitorTick()
      }
    })

    bench('Turtle (보수적) 거래 100틱', () => {
      store.initializeCompetitors(1, 50_000_000)
      // Turtle: 블루칩 주식에 장기 보유
      for (let i = 0; i < 100; i++) {
        const company = store.getState().companies[0]
        setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.02))
        store.processCompetitorTick()
      }
    })

    bench('Surfer (추세추종) 거래 100틱', () => {
      store.initializeCompetitors(1, 50_000_000)
      // Surfer: MA20 기반 추세 추종
      for (let i = 0; i < 100; i++) {
        const company = store.getState().companies[0]
        // 상승 추세 시뮬레이션
        setCompanyPrice(store, company.ticker, company.price * 1.01)
        store.processCompetitorTick()
      }
    })

    bench('Bear (역발상) 거래 100틱', () => {
      store.initializeCompetitors(1, 50_000_000)
      // Bear: RSI 기반 역발상 거래
      for (let i = 0; i < 100; i++) {
        const company = store.getState().companies[0]
        // 과매수/과매도 시뮬레이션
        const volatility = Math.random() > 0.5 ? 1.1 : 0.9
        setCompanyPrice(store, company.ticker, company.price * volatility)
        store.processCompetitorTick()
      }
    })
  })

  describe('경쟁자 수별 거래 성능', () => {
    bench('1명 경쟁자 100틱', () => {
      store.initializeCompetitors(1, 50_000_000)
      advanceNTicks(store, 100)
    })

    bench('3명 경쟁자 100틱', () => {
      store.initializeCompetitors(3, 50_000_000)
      advanceNTicks(store, 100)
    })

    bench('5명 경쟁자 100틱', () => {
      store.initializeCompetitors(5, 50_000_000)
      advanceNTicks(store, 100)
    })

    bench('10명 경쟁자 100틱 (오버로드)', () => {
      store.initializeCompetitors(10, 50_000_000)
      advanceNTicks(store, 100)
    })
  })

  describe('순위 계산 성능', () => {
    bench('1명 경쟁자 순위 계산', () => {
      store.initializeCompetitors(1, 50_000_000)
      store.calculateRankings()
    })

    bench('5명 경쟁자 순위 계산', () => {
      store.initializeCompetitors(5, 50_000_000)
      store.calculateRankings()
    })

    bench('10명 경쟁자 순위 계산', () => {
      store.initializeCompetitors(10, 50_000_000)
      store.calculateRankings()
    })

    bench('20회 순위 재계산 (5명 경쟁자)', () => {
      store.initializeCompetitors(5, 50_000_000)
      for (let i = 0; i < 20; i++) {
        store.calculateRankings()
        // 가격 변동 시뮬레이션
        store.getState().companies.forEach((company: any) => {
          setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.02))
        })
      }
    })
  })

  describe('뇌동매매(패닉 매도) 성능', () => {
    bench('패닉 매도 없음 (안정적 시장)', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 안정적인 가격 변동
      for (let i = 0; i < 100; i++) {
        store.getState().companies.forEach((company: any) => {
          setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.01))
        })
        store.processCompetitorTick()
      }
    })

    bench('패닉 매도 가능 (하락 시장)', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 하락 추세로 패닉 매도 유발
      for (let i = 0; i < 100; i++) {
        store.getState().companies.forEach((company: any) => {
          setCompanyPrice(store, company.ticker, company.price * 0.97)
        })
        store.processCompetitorTick()
      }
    })

    bench('극단적 패닉 (크래시 시뮬레이션)', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 극단적인 시장 크래시
      for (let i = 0; i < 100; i++) {
        if (i === 50) {
          // 중간에 크래시 발생
          store.getState().companies.forEach((company: any) => {
            setCompanyPrice(store, company.ticker, company.price * 0.5)
          })
        } else {
          store.getState().companies.forEach((company: any) => {
            setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.03))
          })
        }
        store.processCompetitorTick()
      }
    })
  })

  describe('포트폴리오 관리 성능', () => {
    bench('3명 경쟁자 포트폴리오 업데이트 10회', () => {
      store.initializeCompetitors(3, 50_000_000)
      for (let i = 0; i < 10; i++) {
        store.getState().competitors.forEach((comp: any) => {
          // 포트폴리오 가치 재계산
          let totalValue = comp.cash
          Object.entries(comp.portfolio).forEach(([ticker, position]: [string, any]) => {
            const company = store.getState().companies.find((c: any) => c.ticker === ticker)
            if (company) {
              totalValue += company.price * position.shares
            }
          })
          // ROI 계산
          const roi = ((totalValue - 50_000_000) / 50_000_000) * 100
        })
      }
    })

    bench('5명 경쟁자 포트폴리오 다각화 계산', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 경쟁자들의 포트폴리오 다각화 지수 계산
      store.getState().competitors.forEach((comp: any) => {
        const positions = Object.keys(comp.portfolio).length
        const totalShares = Object.values(comp.portfolio).reduce((sum: number, pos: any) => sum + pos.shares, 0)
        const concentration = positions > 0 ? Math.max(...Object.values(comp.portfolio).map((p: any) => p.shares)) / totalShares : 0
      })
    })

    bench('10명 경쟁자 손익 추적 100틱', () => {
      store.initializeCompetitors(10, 50_000_000)
      const initialAssets = store.getState().competitors.map((c: any) => c.totalAssets)

      for (let i = 0; i < 100; i++) {
        advanceNTicks(store, 1)
        // 각 경쟁자의 손익률 변화 추적
        store.getState().competitors.forEach((comp: any, idx: number) => {
          const gains = comp.totalAssets - initialAssets[idx]
          const gainPercent = (gains / initialAssets[idx]) * 100
        })
      }
    })
  })

  describe('복합 거래 시나리오', () => {
    bench('5명 경쟁자 다양한 전략 1000틱', () => {
      // 각 전략별 경쟁자 초기화 (라운드 로빈)
      store.initializeCompetitors(5, 50_000_000)
      advanceNTicks(store, 1000)
    })

    bench('10명 경쟁자 시뮬레이션 (1일 = 10시간)', () => {
      store.initializeCompetitors(10, 50_000_000)
      // 1일 시뮬레이션
      advanceNTicks(store, 10)
    })

    bench('5명 경쟁자 1주일 시뮬레이션 (70시간)', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 1주일 (7일 × 10시간)
      advanceNTicks(store, 70)
    })

    bench('3명 경쟁자 1개월 시뮬레이션 (300시간)', () => {
      store.initializeCompetitors(3, 50_000_000)
      // 1개월 (30일 × 10시간)
      advanceNTicks(store, 300)
    })
  })

  describe('경쟁자 간 상호작용 성능', () => {
    bench('다중 경쟁자 타운트 메시지 생성', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 순위 변동으로 타운트 생성
      store.calculateRankings()
      store.getState().competitors.forEach((comp: any, idx: number) => {
        if (idx === 0) {
          store.addTaunt(comp.id, '순위가 올랐군요!')
        } else if (idx === 4) {
          store.addTaunt(comp.id, '저도 힘드네요...')
        }
      })
    })

    bench('경쟁자 순위 변동 추적 20회', () => {
      store.initializeCompetitors(5, 50_000_000)
      const rankings = store.calculateRankings()

      for (let i = 0; i < 20; i++) {
        // 가격 변동으로 순위 변화 유발
        store.getState().companies.forEach((company: any) => {
          const change = 1 + (Math.random() - 0.5) * 0.1
          setCompanyPrice(store, company.ticker, company.price * change)
        })

        const newRankings = store.calculateRankings()
        // 순위 변동 감지
        newRankings.forEach((rank: any, idx: number) => {
          if (rankings[idx]?.id !== rank.id) {
            // 순위 변동 발생
          }
        })
      }
    })

    bench('경쟁자 간 자산 격차 계산 10회', () => {
      store.initializeCompetitors(5, 50_000_000)
      for (let i = 0; i < 10; i++) {
        const competitors = store.getState().competitors
        const maxAsset = Math.max(...competitors.map((c: any) => c.totalAssets))
        const minAsset = Math.min(...competitors.map((c: any) => c.totalAssets))
        const gap = maxAsset - minAsset
        const gapPercent = (gap / maxAsset) * 100

        // 가격 변동
        advanceNTicks(store, 100)
      }
    })
  })

  describe('장기 경쟁 시뮬레이션', () => {
    bench('5명 경쟁자 1년 시뮬레이션 (메모리 효율)', () => {
      store.initializeCompetitors(5, 50_000_000)
      // 1년 = 360일 × 10시간 = 3,600시간
      // 일부 시간만 처리 (성능 벤치마크용)
      for (let day = 0; day < 360; day++) {
        advanceNTicks(store, 10)
        // 매일 순위 계산
        if (day % 30 === 0) {
          store.calculateRankings()
        }
      }
    })

    bench('3명 경쟁자 5년 시뮬레이션 (확장성)', () => {
      store.initializeCompetitors(3, 50_000_000)
      // 5년 (단계적 처리)
      for (let year = 0; year < 5; year++) {
        for (let day = 0; day < 360; day++) {
          advanceNTicks(store, 10)
          // 월간 순위 계산
          if (day % 30 === 0) {
            store.calculateRankings()
          }
        }
      }
    })

    bench('10명 경쟁자 경쟁 시뮬레이션 (스케일)', () => {
      store.initializeCompetitors(10, 50_000_000)
      // 3개월 시뮬레이션
      for (let day = 0; day < 90; day++) {
        advanceNTicks(store, 10)
        // 주간 순위 계산
        if (day % 7 === 0) {
          store.calculateRankings()
        }
      }
    })
  })

  describe('시장 이벤트 영향 성능', () => {
    bench('경쟁자 거래 + 시장 이벤트 충돌 해결', () => {
      store.initializeCompetitors(5, 50_000_000)

      for (let i = 0; i < 100; i++) {
        // 시장 이벤트 시뮬레이션 (모든 주식에 영향)
        if (i === 50) {
          const volatilityModifier = 1.5
          store.getState().companies.forEach((company: any) => {
            const newPrice = company.price * (1 + (Math.random() - 0.5) * 0.2 * volatilityModifier)
            setCompanyPrice(store, company.ticker, newPrice)
          })
        } else {
          store.getState().companies.forEach((company: any) => {
            setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.02))
          })
        }
        store.processCompetitorTick()
      }
    })

    bench('섹터별 사건 처리 (부분 경쟁자 영향)', () => {
      store.initializeCompetitors(5, 50_000_000)

      for (let i = 0; i < 100; i++) {
        // 특정 섹터에만 영향을 주는 이벤트
        const affectedSector = 'Tech'
        store.getState().companies
          .filter((c: any) => c.sector === affectedSector)
          .forEach((company: any) => {
            const newPrice = company.price * (1 + (Math.random() - 0.5) * 0.1)
            setCompanyPrice(store, company.ticker, newPrice)
          })

        store.processCompetitorTick()
      }
    })
  })
})
