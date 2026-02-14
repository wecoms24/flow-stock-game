import { describe, it, expect } from 'vitest'
import {
  processAITrading,
  generateCompetitors,
  getPriceHistory,
} from '@/engines/competitorEngine'
import { COMPANIES } from '@/data/companies'
import type { Company } from '@/types'

/**
 * AI 경쟁자 실제 거래 검증 테스트
 *
 * 목적: 경쟁자를 활성화했을 때 AI가 실제로 거래 액션을 생성하는지 확인
 */

// 충분한 priceHistory를 가진 회사 데이터 생성
function makeCompaniesWithHistory(ticks: number): Company[] {
  return COMPANIES.map((c) => {
    const history: number[] = [c.price]
    for (let i = 1; i < ticks; i++) {
      const prev = history[i - 1]
      // 랜덤 가격 변동 (±2%)
      history.push(prev * (1 + (Math.random() - 0.5) * 0.04))
    }
    return {
      ...c,
      priceHistory: history,
      price: history[history.length - 1],
    }
  })
}

// 상승 추세 히스토리
function makeUptrend(ticks: number): Company[] {
  return COMPANIES.map((c) => {
    const history: number[] = [c.price * 0.8]
    for (let i = 1; i < ticks; i++) {
      history.push(history[i - 1] * 1.005) // 매틱 +0.5%
    }
    return {
      ...c,
      priceHistory: history,
      price: history[history.length - 1],
    }
  })
}

// 하락 추세 히스토리
function makeDowntrend(ticks: number): Company[] {
  return COMPANIES.map((c) => {
    const history: number[] = [c.price * 1.3]
    for (let i = 1; i < ticks; i++) {
      history.push(history[i - 1] * 0.993) // 매틱 -0.7%
    }
    return {
      ...c,
      priceHistory: history,
      price: history[history.length - 1],
    }
  })
}

describe('AI 거래 실제 동작 검증', () => {
  it('Shark(aggressive)가 200틱 내에 거래를 생성한다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const shark = competitors.find((c) => c.style === 'aggressive')!
    const companies = makeCompaniesWithHistory(50)

    let actions: ReturnType<typeof processAITrading> = []
    for (let tick = 0; tick < 200; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([shark], companies, tick, ph)
      actions.push(...result)
    }

    console.log(`[Shark] 200틱 → ${actions.length}건 (buy: ${actions.filter((a) => a.action === 'buy').length}, sell: ${actions.filter((a) => a.action === 'sell').length})`)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('Turtle(conservative)이 500틱 내에 거래를 생성한다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const turtle = competitors.find((c) => c.style === 'conservative')!
    const companies = makeCompaniesWithHistory(50)

    let actions: ReturnType<typeof processAITrading> = []
    for (let tick = 0; tick < 500; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([turtle], companies, tick, ph)
      actions.push(...result)
    }

    console.log(`[Turtle] 500틱 → ${actions.length}건 (buy: ${actions.filter((a) => a.action === 'buy').length}, sell: ${actions.filter((a) => a.action === 'sell').length})`)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('Surfer(trend-follower)가 상승추세에서 300틱 내에 거래를 생성한다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const surfer = competitors.find((c) => c.style === 'trend-follower')!
    const companies = makeUptrend(50)

    let actions: ReturnType<typeof processAITrading> = []
    for (let tick = 0; tick < 300; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([surfer], companies, tick, ph)
      actions.push(...result)
    }

    console.log(`[Surfer] 300틱(상승추세) → ${actions.length}건 (buy: ${actions.filter((a) => a.action === 'buy').length}, sell: ${actions.filter((a) => a.action === 'sell').length})`)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('Bear(contrarian)가 하락추세에서 300틱 내에 거래를 생성한다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const bear = competitors.find((c) => c.style === 'contrarian')!
    const companies = makeDowntrend(50)

    let actions: ReturnType<typeof processAITrading> = []
    for (let tick = 0; tick < 300; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([bear], companies, tick, ph)
      actions.push(...result)
    }

    console.log(`[Bear] 300틱(하락추세) → ${actions.length}건 (buy: ${actions.filter((a) => a.action === 'buy').length}, sell: ${actions.filter((a) => a.action === 'sell').length})`)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('4명 동시 500틱 시뮬레이션에서 모든 전략이 거래한다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const companies = makeCompaniesWithHistory(50)

    const actionsByStyle: Record<string, number> = {}
    competitors.forEach((c) => (actionsByStyle[c.style] = 0))

    for (let tick = 0; tick < 500; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading(competitors, companies, tick, ph)
      result.forEach((a) => {
        const comp = competitors.find((c) => c.id === a.competitorId)
        if (comp) actionsByStyle[comp.style]++
      })
    }

    console.log('[전체 500틱 시뮬레이션]', actionsByStyle)

    // Shark와 Turtle은 히스토리 불필요하므로 반드시 거래해야 함
    expect(actionsByStyle['aggressive']).toBeGreaterThan(0)
    expect(actionsByStyle['conservative']).toBeGreaterThan(0)
  })

  it('buy 액션의 quantity와 price가 유효하다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const shark = competitors.find((c) => c.style === 'aggressive')!
    const companies = makeCompaniesWithHistory(50)

    for (let tick = 0; tick < 500; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([shark], companies, tick, ph)
      const buy = result.find((a) => a.action === 'buy')
      if (buy) {
        expect(buy.quantity).toBeGreaterThan(0)
        expect(buy.price).toBeGreaterThan(0)
        expect(buy.symbol).toBeTruthy()
        expect(buy.competitorId).toBe(shark.id)

        // 매수 비용이 현금 이내여야 한다
        const cost = buy.quantity * buy.price
        expect(cost).toBeLessThanOrEqual(shark.cash)
        console.log(`[Buy 검증] ${buy.symbol} x${buy.quantity} @ ₩${buy.price.toLocaleString()} = ₩${cost.toLocaleString()}`)
        return // 하나 찾으면 충분
      }
    }

    // 500틱 안에 buy 액션이 하나는 있어야 함
    expect.fail('500틱 내 buy 액션이 생성되지 않음')
  })

  it('초기 상태(priceHistory 1개)에서 Surfer/Bear는 거래하지 않는다', () => {
    const competitors = generateCompetitors(4, 50_000_000)
    const surfer = competitors.find((c) => c.style === 'trend-follower')!
    const bear = competitors.find((c) => c.style === 'contrarian')!

    // COMPANIES는 초기 priceHistory: [price] (1개)
    let surferCount = 0
    let bearCount = 0

    for (let tick = 0; tick < 100; tick++) {
      const ph = getPriceHistory(COMPANIES)
      surferCount += processAITrading([surfer], COMPANIES, tick, ph).length
      bearCount += processAITrading([bear], COMPANIES, tick, ph).length
    }

    console.log(`[초기 상태] Surfer: ${surferCount}건, Bear: ${bearCount}건 (둘 다 0이어야 정상)`)
    expect(surferCount).toBe(0)
    expect(bearCount).toBe(0)
  })

  it('현금 0인 경쟁자는 매수하지 않는다', () => {
    const competitors = generateCompetitors(1, 0) // 현금 0
    const companies = makeCompaniesWithHistory(50)

    let buyCount = 0
    for (let tick = 0; tick < 200; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading(competitors, companies, tick, ph)
      buyCount += result.filter((a) => a.action === 'buy').length
    }

    expect(buyCount).toBe(0)
  })

  it('Panic Sell: 큰 손실 포지션에서 panic_sell이 발생한다', () => {
    const competitors = generateCompetitors(1, 50_000_000)
    const comp = competitors[0]
    const companies = makeCompaniesWithHistory(50)
    const target = companies[0]

    // -15% 손실 포지션 설정
    comp.portfolio[target.ticker] = {
      companyId: target.id,
      shares: 100,
      avgBuyPrice: target.price * 1.18, // 현재가 대비 18% 비싸게 매수 → -15% 손실
    }

    let panicSold = false
    for (let tick = 0; tick < 3000; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([comp], companies, tick, ph)
      if (result.some((a) => a.action === 'panic_sell')) {
        panicSold = true
        console.log(`[Panic Sell] tick ${tick}에서 발생`)
        break
      }
    }

    expect(panicSold).toBe(true)
  })

  it('Panic Sell 쿨다운 중에는 발생하지 않는다', () => {
    const competitors = generateCompetitors(1, 50_000_000)
    const comp = competitors[0]
    comp.panicSellCooldown = 999 // 쿨다운 활성화
    const companies = makeCompaniesWithHistory(50)
    const target = companies[0]

    comp.portfolio[target.ticker] = {
      companyId: target.id,
      shares: 100,
      avgBuyPrice: target.price * 1.18,
    }

    let panicSold = false
    for (let tick = 0; tick < 100; tick++) {
      const ph = getPriceHistory(companies)
      const result = processAITrading([comp], companies, tick, ph)
      if (result.some((a) => a.action === 'panic_sell')) {
        panicSold = true
        break
      }
    }

    expect(panicSold).toBe(false)
  })
})
