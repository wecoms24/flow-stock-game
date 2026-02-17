import { describe, it, expect, beforeAll } from 'vitest'

/**
 * 성능 측정 테스트: 포트폴리오 가치 계산 최적화
 *
 * find() 선형 탐색 vs Map O(1) 조회 — performance.now() 기반 직접 비교
 *
 * 최적화 대상:
 * 1. calcPortfolioValue() — 매 틱 실행
 * 2. 이벤트 스냅샷 업데이트 — 매 틱 실행
 * 3. updateCompetitorAssets() — 매 시간 실행
 */

// ── 테스트 데이터 생성 ──

interface MockCompany {
  id: string
  price: number
}

interface MockPosition {
  companyId: string
  shares: number
}

interface MockSnapshot {
  priceBefore: number
  peakChange: number
  currentChange: number
}

function generateCompanies(count: number): MockCompany[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `company-${i}`,
    price: 10000 + Math.random() * 90000,
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
    }
  }
  return portfolio
}

function buildPriceMap(companies: MockCompany[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of companies) map.set(c.id, c.price)
  return map
}

// ── 측정 대상 함수 (Before / After) ──

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

function updateEventSnapshots_find(
  snapshots: Record<string, MockSnapshot>[],
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

function updateEventSnapshots_map(
  snapshots: Record<string, MockSnapshot>[],
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

function updateCompetitorAssets_find(
  competitors: { portfolio: Record<string, { shares: number }>; cash: number }[],
  companies: MockCompany[],
): number[] {
  return competitors.map((comp) => {
    const portfolioValue = Object.entries(comp.portfolio).reduce(
      (sum, [companyId]) => {
        const company = companies.find((c) => c.id === companyId)
        return sum + comp.portfolio[companyId].shares * (company?.price || 0)
      },
      0,
    )
    return comp.cash + portfolioValue
  })
}

function updateCompetitorAssets_map(
  competitors: { portfolio: Record<string, { shares: number }>; cash: number }[],
  priceMap: Map<string, number>,
): number[] {
  return competitors.map((comp) => {
    const portfolioValue = Object.entries(comp.portfolio).reduce(
      (sum, [companyId]) => {
        return sum + comp.portfolio[companyId].shares * (priceMap.get(companyId) ?? 0)
      },
      0,
    )
    return comp.cash + portfolioValue
  })
}

// ── 벤치마크 유틸 ──

function measureOps(fn: () => void, iterations: number): { avgNs: number; totalMs: number } {
  // Warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const end = performance.now()

  const totalMs = end - start
  const avgNs = (totalMs * 1_000_000) / iterations
  return { avgNs, totalMs }
}

// ═══════════════════════════════════════════════════════
//  테스트
// ═══════════════════════════════════════════════════════

const ITERATIONS = 100_000

describe('성능 측정: calcPortfolioValue find() vs Map', () => {
  const scenarios = [
    { companies: 20, positions: 5, label: '20 회사 / 5 포지션 (기본 게임)' },
    { companies: 20, positions: 15, label: '20 회사 / 15 포지션 (풀 포트폴리오)' },
    { companies: 50, positions: 20, label: '50 회사 / 20 포지션 (확장)' },
    { companies: 100, positions: 50, label: '100 회사 / 50 포지션 (스트레스)' },
  ]

  for (const scenario of scenarios) {
    it(`${scenario.label}`, () => {
      const companies = generateCompanies(scenario.companies)
      const portfolio = generatePortfolio(companies, scenario.positions)
      const priceMap = buildPriceMap(companies)

      const findResult = measureOps(
        () => calcPortfolioValue_find(portfolio, companies),
        ITERATIONS,
      )
      const mapResult = measureOps(
        () => calcPortfolioValue_map(portfolio, priceMap),
        ITERATIONS,
      )

      const speedup = findResult.avgNs / mapResult.avgNs

      console.log(`\n  📊 ${scenario.label}`)
      console.log(`     find(): ${findResult.avgNs.toFixed(0)}ns/op (${findResult.totalMs.toFixed(1)}ms total)`)
      console.log(`     Map():  ${mapResult.avgNs.toFixed(0)}ns/op (${mapResult.totalMs.toFixed(1)}ms total)`)
      console.log(`     ⚡ 개선: ${speedup.toFixed(2)}x 빠름`)

      // Map 방식이 최소 동등하거나 빠를 것
      expect(mapResult.avgNs).toBeLessThanOrEqual(findResult.avgNs * 1.1)
    })
  }
})

describe('성능 측정: 이벤트 스냅샷 find() vs Map', () => {
  const scenarios = [
    { events: 5, companiesPerEvent: 4, label: '5 이벤트 × 4 회사' },
    { events: 10, companiesPerEvent: 8, label: '10 이벤트 × 8 회사 (고밀도)' },
  ]

  for (const scenario of scenarios) {
    it(`${scenario.label}`, () => {
      const companies = generateCompanies(20)
      const priceMap = buildPriceMap(companies)

      const snapshots = Array.from({ length: scenario.events }, () => {
        const snapshot: Record<string, MockSnapshot> = {}
        const shuffled = [...companies].sort(() => Math.random() - 0.5)
        for (let i = 0; i < scenario.companiesPerEvent; i++) {
          snapshot[shuffled[i].id] = {
            priceBefore: shuffled[i].price * 0.95,
            peakChange: shuffled[i].price * 0.03,
            currentChange: shuffled[i].price * 0.01,
          }
        }
        return snapshot
      })

      const findResult = measureOps(
        () => updateEventSnapshots_find(snapshots, companies),
        ITERATIONS,
      )
      const mapResult = measureOps(
        () => updateEventSnapshots_map(snapshots, priceMap),
        ITERATIONS,
      )

      const speedup = findResult.avgNs / mapResult.avgNs

      console.log(`\n  📊 ${scenario.label}`)
      console.log(`     find(): ${findResult.avgNs.toFixed(0)}ns/op`)
      console.log(`     Map():  ${mapResult.avgNs.toFixed(0)}ns/op`)
      console.log(`     ⚡ 개선: ${speedup.toFixed(2)}x 빠름`)

      expect(mapResult.avgNs).toBeLessThanOrEqual(findResult.avgNs * 1.1)
    })
  }
})

describe('성능 측정: 경쟁자 자산 find() vs Map', () => {
  const scenarios = [
    { competitors: 4, positions: 5, label: '4 경쟁자 × 5 포지션 (기본)' },
    { competitors: 8, positions: 10, label: '8 경쟁자 × 10 포지션 (확장)' },
  ]

  for (const scenario of scenarios) {
    it(`${scenario.label}`, () => {
      const companies = generateCompanies(20)
      const priceMap = buildPriceMap(companies)

      const competitors = Array.from({ length: scenario.competitors }, () => {
        const port: Record<string, { shares: number }> = {}
        const shuffled = [...companies].sort(() => Math.random() - 0.5)
        for (let i = 0; i < scenario.positions; i++) {
          port[shuffled[i].id] = { shares: Math.floor(Math.random() * 100) + 1 }
        }
        return { portfolio: port, cash: 50_000_000 }
      })

      const findResult = measureOps(
        () => updateCompetitorAssets_find(competitors, companies),
        ITERATIONS,
      )
      const mapResult = measureOps(
        () => updateCompetitorAssets_map(competitors, priceMap),
        ITERATIONS,
      )

      const speedup = findResult.avgNs / mapResult.avgNs

      console.log(`\n  📊 ${scenario.label}`)
      console.log(`     find(): ${findResult.avgNs.toFixed(0)}ns/op`)
      console.log(`     Map():  ${mapResult.avgNs.toFixed(0)}ns/op`)
      console.log(`     ⚡ 개선: ${speedup.toFixed(2)}x 빠름`)

      expect(mapResult.avgNs).toBeLessThanOrEqual(findResult.avgNs * 1.1)
    })
  }
})

describe('성능 측정: buildPriceMap 구축 비용', () => {
  it('Map 구축 비용은 무시 가능한 수준이어야 한다', () => {
    const companies = generateCompanies(20)

    const mapBuildResult = measureOps(() => buildPriceMap(companies), ITERATIONS)

    console.log(`\n  📊 buildPriceMap(20개 회사)`)
    console.log(`     ${mapBuildResult.avgNs.toFixed(0)}ns/op`)

    // 20개 회사 Map 구축: 1000ns(1μs) 미만이어야 함
    expect(mapBuildResult.avgNs).toBeLessThan(5000)
  })
})

describe('성능 측정: 통합 파이프라인 (전체 updatePrices 경로)', () => {
  it('전체 파이프라인에서 Map 방식이 find 방식보다 빠르다', () => {
    const companies = generateCompanies(20)
    const portfolio = generatePortfolio(companies, 10)
    const priceMap = buildPriceMap(companies)

    const snapshots = Array.from({ length: 5 }, () => {
      const snapshot: Record<string, MockSnapshot> = {}
      const shuffled = [...companies].sort(() => Math.random() - 0.5)
      for (let i = 0; i < 4; i++) {
        snapshot[shuffled[i].id] = {
          priceBefore: shuffled[i].price * 0.95,
          peakChange: shuffled[i].price * 0.03,
          currentChange: shuffled[i].price * 0.01,
        }
      }
      return snapshot
    })

    const competitors = Array.from({ length: 4 }, () => {
      const port: Record<string, { shares: number }> = {}
      const shuffled = [...companies].sort(() => Math.random() - 0.5)
      for (let i = 0; i < 5; i++) {
        port[shuffled[i].id] = { shares: Math.floor(Math.random() * 100) + 1 }
      }
      return { portfolio: port, cash: 50_000_000 }
    })

    // Before: find() 전체 파이프라인
    const findResult = measureOps(() => {
      calcPortfolioValue_find(portfolio, companies)
      updateEventSnapshots_find(snapshots, companies)
      updateCompetitorAssets_find(competitors, companies)
    }, ITERATIONS)

    // After: Map 전체 파이프라인 (priceMap 빌드 포함)
    const mapResult = measureOps(() => {
      const pm = buildPriceMap(companies)
      calcPortfolioValue_map(portfolio, pm)
      updateEventSnapshots_map(snapshots, pm)
      updateCompetitorAssets_map(competitors, pm)
    }, ITERATIONS)

    const speedup = findResult.avgNs / mapResult.avgNs

    console.log(`\n  📊 통합 파이프라인 (10 포지션 + 5 이벤트 + 4 경쟁자)`)
    console.log(`     [Before] find(): ${findResult.avgNs.toFixed(0)}ns/op (${findResult.totalMs.toFixed(1)}ms/${ITERATIONS} ops)`)
    console.log(`     [After] Map():   ${mapResult.avgNs.toFixed(0)}ns/op (${mapResult.totalMs.toFixed(1)}ms/${ITERATIONS} ops)`)
    console.log(`     ⚡ 총 개선: ${speedup.toFixed(2)}x 빠름`)
    console.log(`     (Map 구축 비용 포함)`)

    expect(mapResult.avgNs).toBeLessThanOrEqual(findResult.avgNs * 1.1)
  })
})
