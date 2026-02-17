import { describe, bench, beforeAll } from 'vitest'

/**
 * 성능 벤치마크: 포트폴리오 가치 계산 최적화
 *
 * find() 선형 탐색 vs Map O(1) 조회 비교
 *
 * 최적화 대상:
 * 1. calcPortfolioValue() — 매 틱 실행
 * 2. 이벤트 스냅샷 업데이트 — 매 틱 실행
 * 3. updateCompetitorAssets() — 매 시간 실행
 *
 * 목표:
 * - Map 방식이 find() 대비 일관되게 빠를 것
 * - 포지션/이벤트/경쟁자가 많을수록 차이 확대
 */

// ── 테스트 데이터 생성 ──

interface MockCompany {
  id: string
  price: number
  ticker: string
  sector: string
}

interface MockPosition {
  companyId: string
  shares: number
  avgBuyPrice: number
}

interface MockEventSnapshot {
  [companyId: string]: {
    priceBefore: number
    peakChange: number
    currentChange: number
  }
}

function generateCompanies(count: number): MockCompany[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `company-${i}`,
    price: 10000 + Math.random() * 90000,
    ticker: `T${i.toString().padStart(3, '0')}`,
    sector: ['tech', 'finance', 'energy', 'consumer', 'healthcare'][i % 5],
  }))
}

function generatePortfolio(
  companies: MockCompany[],
  positionCount: number,
): Record<string, MockPosition> {
  const portfolio: Record<string, MockPosition> = {}
  const shuffled = [...companies].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(positionCount, shuffled.length); i++) {
    portfolio[shuffled[i].id] = {
      companyId: shuffled[i].id,
      shares: Math.floor(Math.random() * 100) + 1,
      avgBuyPrice: shuffled[i].price * 0.9,
    }
  }
  return portfolio
}

function generateEventSnapshots(
  companies: MockCompany[],
  eventCount: number,
  companiesPerEvent: number,
): MockEventSnapshot[] {
  return Array.from({ length: eventCount }, () => {
    const snapshot: MockEventSnapshot = {}
    const shuffled = [...companies].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(companiesPerEvent, shuffled.length); i++) {
      snapshot[shuffled[i].id] = {
        priceBefore: shuffled[i].price * 0.95,
        peakChange: shuffled[i].price * 0.03,
        currentChange: shuffled[i].price * 0.01,
      }
    }
    return snapshot
  })
}

function buildPriceMap(companies: MockCompany[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of companies) map.set(c.id, c.price)
  return map
}

// ── 측정 대상 함수 (Before / After) ──

// Before: find() 선형 탐색
function calcPortfolioValue_find(
  portfolio: Record<string, MockPosition>,
  companies: MockCompany[],
): number {
  let total = 0
  for (const pos of Object.values(portfolio)) {
    const company = companies.find((c) => c.id === pos.companyId)
    if (company) total += company.price * pos.shares
  }
  return total
}

// After: Map O(1) 조회
function calcPortfolioValue_map(
  portfolio: Record<string, MockPosition>,
  priceMap: Map<string, number>,
): number {
  let total = 0
  for (const pos of Object.values(portfolio)) {
    const price = priceMap.get(pos.companyId)
    if (price !== undefined) total += price * pos.shares
  }
  return total
}

// Before: 이벤트 스냅샷 find()
function updateEventSnapshots_find(
  snapshots: MockEventSnapshot[],
  companies: MockCompany[],
): void {
  for (const snapshot of snapshots) {
    for (const companyId of Object.keys(snapshot)) {
      const company = companies.find((c) => c.id === companyId)
      if (company && snapshot[companyId]) {
        const s = snapshot[companyId]
        const currentChange = company.price - s.priceBefore
        if (Math.abs(currentChange) > Math.abs(s.peakChange)) {
          s.peakChange = currentChange
        }
        s.currentChange = currentChange
      }
    }
  }
}

// After: 이벤트 스냅샷 Map
function updateEventSnapshots_map(
  snapshots: MockEventSnapshot[],
  priceMap: Map<string, number>,
): void {
  for (const snapshot of snapshots) {
    for (const companyId of Object.keys(snapshot)) {
      const price = priceMap.get(companyId)
      if (price !== undefined && snapshot[companyId]) {
        const s = snapshot[companyId]
        const currentChange = price - s.priceBefore
        if (Math.abs(currentChange) > Math.abs(s.peakChange)) {
          s.peakChange = currentChange
        }
        s.currentChange = currentChange
      }
    }
  }
}

// Before: 경쟁자 자산 find()
function updateCompetitorAssets_find(
  competitors: { portfolio: Record<string, { shares: number }>; cash: number }[],
  companies: MockCompany[],
): number[] {
  return competitors.map((comp) => {
    const portfolioValue = Object.entries(comp.portfolio).reduce(
      (sum, [companyId]) => {
        const company = companies.find((c) => c.id === companyId)
        const currentPrice = company?.price || 0
        return sum + comp.portfolio[companyId].shares * currentPrice
      },
      0,
    )
    return comp.cash + portfolioValue
  })
}

// After: 경쟁자 자산 Map
function updateCompetitorAssets_map(
  competitors: { portfolio: Record<string, { shares: number }>; cash: number }[],
  priceMap: Map<string, number>,
): number[] {
  return competitors.map((comp) => {
    const portfolioValue = Object.entries(comp.portfolio).reduce(
      (sum, [companyId]) => {
        const currentPrice = priceMap.get(companyId) ?? 0
        return sum + comp.portfolio[companyId].shares * currentPrice
      },
      0,
    )
    return comp.cash + portfolioValue
  })
}

// ═══════════════════════════════════════════════════════
//  벤치마크
// ═══════════════════════════════════════════════════════

describe('포트폴리오 가치 계산 최적화: find() vs Map', () => {
  let companies20: MockCompany[]
  let companies50: MockCompany[]
  let companies100: MockCompany[]
  let priceMap20: Map<string, number>
  let priceMap50: Map<string, number>
  let priceMap100: Map<string, number>

  beforeAll(() => {
    companies20 = generateCompanies(20)
    companies50 = generateCompanies(50)
    companies100 = generateCompanies(100)
    priceMap20 = buildPriceMap(companies20)
    priceMap50 = buildPriceMap(companies50)
    priceMap100 = buildPriceMap(companies100)
  })

  describe('calcPortfolioValue — 20개 회사 (실제 게임)', () => {
    const portfolioSizes = [5, 10, 15]

    for (const size of portfolioSizes) {
      let portfolio: Record<string, MockPosition>

      bench(`[Before] find() — ${size} 포지션`, () => {
        portfolio = portfolio || generatePortfolio(companies20, size)
        calcPortfolioValue_find(portfolio, companies20)
      })

      bench(`[After] Map — ${size} 포지션`, () => {
        portfolio = portfolio || generatePortfolio(companies20, size)
        calcPortfolioValue_map(portfolio, priceMap20)
      })
    }
  })

  describe('calcPortfolioValue — 50개 회사 (확장 시나리오)', () => {
    let portfolio: Record<string, MockPosition>

    beforeAll(() => {
      portfolio = generatePortfolio(companies50, 20)
    })

    bench('[Before] find() — 20 포지션 / 50 회사', () => {
      calcPortfolioValue_find(portfolio, companies50)
    })

    bench('[After] Map — 20 포지션 / 50 회사', () => {
      calcPortfolioValue_map(portfolio, priceMap50)
    })
  })

  describe('calcPortfolioValue — 100개 회사 (스트레스)', () => {
    let portfolio: Record<string, MockPosition>

    beforeAll(() => {
      portfolio = generatePortfolio(companies100, 50)
    })

    bench('[Before] find() — 50 포지션 / 100 회사', () => {
      calcPortfolioValue_find(portfolio, companies100)
    })

    bench('[After] Map — 50 포지션 / 100 회사', () => {
      calcPortfolioValue_map(portfolio, priceMap100)
    })
  })
})

describe('이벤트 스냅샷 업데이트 최적화: find() vs Map', () => {
  let companies: MockCompany[]
  let priceMap: Map<string, number>

  beforeAll(() => {
    companies = generateCompanies(20)
    priceMap = buildPriceMap(companies)
  })

  describe('5개 이벤트, 각 4개 회사 영향', () => {
    let snapshots: MockEventSnapshot[]

    beforeAll(() => {
      snapshots = generateEventSnapshots(companies, 5, 4)
    })

    bench('[Before] find() — 5 이벤트 × 4 회사', () => {
      updateEventSnapshots_find(snapshots, companies)
    })

    bench('[After] Map — 5 이벤트 × 4 회사', () => {
      updateEventSnapshots_map(snapshots, priceMap)
    })
  })

  describe('10개 이벤트, 각 8개 회사 영향 (고밀도)', () => {
    let snapshots: MockEventSnapshot[]

    beforeAll(() => {
      snapshots = generateEventSnapshots(companies, 10, 8)
    })

    bench('[Before] find() — 10 이벤트 × 8 회사', () => {
      updateEventSnapshots_find(snapshots, companies)
    })

    bench('[After] Map — 10 이벤트 × 8 회사', () => {
      updateEventSnapshots_map(snapshots, priceMap)
    })
  })
})

describe('경쟁자 자산 업데이트 최적화: find() vs Map', () => {
  let companies: MockCompany[]
  let priceMap: Map<string, number>

  beforeAll(() => {
    companies = generateCompanies(20)
    priceMap = buildPriceMap(companies)
  })

  describe('4명 경쟁자, 각 5 포지션 (기본)', () => {
    let competitors: { portfolio: Record<string, { shares: number }>; cash: number }[]

    beforeAll(() => {
      competitors = Array.from({ length: 4 }, () => {
        const port: Record<string, { shares: number }> = {}
        const shuffled = [...companies].sort(() => Math.random() - 0.5)
        for (let i = 0; i < 5; i++) {
          port[shuffled[i].id] = { shares: Math.floor(Math.random() * 100) + 1 }
        }
        return { portfolio: port, cash: 50_000_000 }
      })
    })

    bench('[Before] find() — 4 경쟁자 × 5 포지션', () => {
      updateCompetitorAssets_find(competitors, companies)
    })

    bench('[After] Map — 4 경쟁자 × 5 포지션', () => {
      updateCompetitorAssets_map(competitors, priceMap)
    })
  })

  describe('8명 경쟁자, 각 10 포지션 (확장)', () => {
    let competitors: { portfolio: Record<string, { shares: number }>; cash: number }[]

    beforeAll(() => {
      competitors = Array.from({ length: 8 }, () => {
        const port: Record<string, { shares: number }> = {}
        const shuffled = [...companies].sort(() => Math.random() - 0.5)
        for (let i = 0; i < 10; i++) {
          port[shuffled[i].id] = { shares: Math.floor(Math.random() * 100) + 1 }
        }
        return { portfolio: port, cash: 50_000_000 }
      })
    })

    bench('[Before] find() — 8 경쟁자 × 10 포지션', () => {
      updateCompetitorAssets_find(competitors, companies)
    })

    bench('[After] Map — 8 경쟁자 × 10 포지션', () => {
      updateCompetitorAssets_map(competitors, priceMap)
    })
  })
})

describe('buildPriceMap 구축 비용', () => {
  let companies20: MockCompany[]
  let companies50: MockCompany[]
  let companies100: MockCompany[]

  beforeAll(() => {
    companies20 = generateCompanies(20)
    companies50 = generateCompanies(50)
    companies100 = generateCompanies(100)
  })

  bench('Map 구축 — 20개 회사', () => {
    buildPriceMap(companies20)
  })

  bench('Map 구축 — 50개 회사', () => {
    buildPriceMap(companies50)
  })

  bench('Map 구축 — 100개 회사', () => {
    buildPriceMap(companies100)
  })
})

describe('통합 시나리오: updatePrices 전체 파이프라인', () => {
  let companies: MockCompany[]
  let portfolio: Record<string, MockPosition>
  let snapshots: MockEventSnapshot[]
  let competitors: { portfolio: Record<string, { shares: number }>; cash: number }[]

  beforeAll(() => {
    companies = generateCompanies(20)
    portfolio = generatePortfolio(companies, 10)
    snapshots = generateEventSnapshots(companies, 5, 4)
    competitors = Array.from({ length: 4 }, () => {
      const port: Record<string, { shares: number }> = {}
      const shuffled = [...companies].sort(() => Math.random() - 0.5)
      for (let i = 0; i < 5; i++) {
        port[shuffled[i].id] = { shares: Math.floor(Math.random() * 100) + 1 }
      }
      return { portfolio: port, cash: 50_000_000 }
    })
  })

  bench('[Before] 전체 파이프라인 — find() 사용', () => {
    // 1. 포트폴리오 가치
    calcPortfolioValue_find(portfolio, companies)
    // 2. 이벤트 스냅샷
    updateEventSnapshots_find(snapshots, companies)
    // 3. 경쟁자 자산
    updateCompetitorAssets_find(competitors, companies)
  })

  bench('[After] 전체 파이프라인 — Map 사용 (priceMap 1회 빌드)', () => {
    // Map 한 번 빌드
    const priceMap = buildPriceMap(companies)
    // 1. 포트폴리오 가치
    calcPortfolioValue_map(portfolio, priceMap)
    // 2. 이벤트 스냅샷
    updateEventSnapshots_map(snapshots, priceMap)
    // 3. 경쟁자 자산
    updateCompetitorAssets_map(competitors, priceMap)
  })
})
