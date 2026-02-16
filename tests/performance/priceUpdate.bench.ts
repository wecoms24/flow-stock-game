import { describe, it, bench, beforeEach } from 'vitest'
import { createTestStore, setCompanyPrice } from '../integration/helpers'

/**
 * 성능 벤치마크: 가격 업데이트
 *
 * 주식 가격 변동이 시스템 성능에 미치는 영향을 측정합니다.
 * 모든 회사의 가격이 매 시간마다 업데이트되므로
 * 이 작업의 성능이 게임 전체 성능에 미치는 영향을 파악합니다.
 *
 * 목표:
 * - 전체 회사 가격 업데이트: <5ms
 * - 개별 회사 가격 변경: <1ms
 */

describe('성능 벤치마크: 가격 업데이트 (Price Update)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('개별 회사 가격 업데이트', () => {
    bench('단일 회사 가격 변경', () => {
      setCompanyPrice(store, 'NXT', 100_000)
    })

    bench('5개 회사 순차 가격 변경', () => {
      const companies = store.getState().companies.slice(0, 5)
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * 1.01)
      })
    })

    bench('10개 회사 순차 가격 변경', () => {
      const companies = store.getState().companies.slice(0, 10)
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * 1.01)
      })
    })
  })

  describe('배치 가격 업데이트', () => {
    bench('전체 20개 회사 배치 업데이트', () => {
      const companies = store.getState().companies
      const updates: Record<string, number> = {}
      companies.forEach((company: any) => {
        updates[company.id] = company.price * (1 + (Math.random() - 0.5) * 0.02)
      })
      store.updatePrices(updates)
    })
  })

  describe('가격 변동 복잡도', () => {
    bench('소폭 변동 (+/-1%)', () => {
      const companies = store.getState().companies
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.02))
      })
    })

    bench('중간 변동 (+/-5%)', () => {
      const companies = store.getState().companies
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.1))
      })
    })

    bench('급격한 변동 (+/-20%)', () => {
      const companies = store.getState().companies
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * (1 + (Math.random() - 0.5) * 0.4))
      })
    })

    bench('폭락 시뮬레이션 (-50%)', () => {
      const companies = store.getState().companies
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * 0.5)
      })
    })
  })

  describe('포트폴리오 가치 계산', () => {
    bench('빈 포트폴리오 가치 계산', () => {
      const player = store.getState().player
      let value = 0
      Object.entries(player.portfolio).forEach(([ticker, position]: [string, any]) => {
        const company = store.getState().companies.find((c: any) => c.ticker === ticker)
        if (company) {
          value += company.price * position.shares
        }
      })
    })

    bench('3개 주식 보유 포트폴리오 가치 계산', () => {
      // 3개 주식 먼저 매수
      const companies = store.getState().companies.slice(0, 3)
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      // 포트폴리오 가치 계산
      const player = store.getState().player
      let value = 0
      Object.entries(player.portfolio).forEach(([ticker, position]: [string, any]) => {
        const company = store.getState().companies.find((c: any) => c.ticker === ticker)
        if (company) {
          value += company.price * position.shares
        }
      })
    })

    bench('10개 주식 보유 포트폴리오 가치 계산', () => {
      // 10개 주식 먼저 매수
      const companies = store.getState().companies.slice(0, 10)
      companies.forEach((company: any) => {
        store.buyStock(company.ticker, 10)
      })

      // 포트폴리오 가치 계산
      const player = store.getState().player
      let value = 0
      Object.entries(player.portfolio).forEach(([ticker, position]: [string, any]) => {
        const company = store.getState().companies.find((c: any) => c.ticker === ticker)
        if (company) {
          value += company.price * position.shares
        }
      })
    })
  })

  describe('시장 이벤트 영향', () => {
    bench('모든 회사 +10% 상승', () => {
      const companies = store.getState().companies
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * 1.1)
      })
    })

    bench('특정 섹터만 +20% 상승', () => {
      const companies = store.getState().companies.filter((c: any) => c.sector === 'Tech')
      companies.forEach((company: any) => {
        setCompanyPrice(store, company.ticker, company.price * 1.2)
      })
    })

    bench('높은 변동성 시장 시뮬레이션', () => {
      const companies = store.getState().companies
      companies.forEach((company: any, index: number) => {
        const volatility = 0.1 + (index % 3) * 0.05 // 10%-20% 변동성
        const change = (Math.random() - 0.5) * 2 * volatility
        setCompanyPrice(store, company.ticker, company.price * (1 + change))
      })
    })
  })
})
