/**
 * 거래 빈도와 현금 흐름 추적 테스트
 *
 * Trade AI Pipeline이 활성화된 상태에서
 * 빈번한 거래가 현금을 비정상적으로 소진시키는지 검증
 *
 * 추적 항목:
 * - 일별 거래 횟수
 * - 거래당 수수료
 * - 슬리피지 손실
 * - 순 현금 흐름
 * - 거래 실패율
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'

// Mock soundManager
vi.mock('../../src/systems/soundManager', () => ({
  soundManager: {
    playClick: vi.fn(),
    playXPGain: vi.fn(),
    playLevelUp: vi.fn(),
    playHire: vi.fn(),
    playFire: vi.fn(),
    playAIApprove: vi.fn(),
  },
}))

interface TradeStats {
  day: number
  cash: number
  trades: number
  buyTrades: number
  sellTrades: number
  totalFees: number
  totalSlippage: number
  portfolioValue: number
  failedTrades: number
  proposals: {
    pending: number
    approved: number
    executed: number
    failed: number
  }
}

describe('거래 빈도와 현금 흐름 추적', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
  })

  it(
    '100일간 Trade AI Pipeline 거래 추적',
    { timeout: 120000 },
    () => {
      // 게임 시작
      useGameStore.getState().startGame('normal', undefined, 500_000_000)

      console.log('\n💼 거래 빈도 분석 시작')
      console.log('초기 현금: 500,000,000원\n')

      // ✨ officeLayout 초기화 (Trade AI 필수)
      useGameStore.getState().initializeOfficeLayout()

      // ✨ 책상 8개 구매 (직원 8명 배치용)
      for (let i = 0; i < 8; i++) {
        useGameStore.getState().buyDesk('basic', 50 + i * 60, 100)
      }
      console.log('책상 8개 구매 완료\n')

      // 직원 고용 (Analyst 3명, Manager 2명, Trader 2명, HR 1명)
      for (let i = 0; i < 3; i++) {
        useGameStore.getState().hireEmployee('analyst')
      }
      for (let i = 0; i < 2; i++) {
        useGameStore.getState().hireEmployee('manager')
      }
      for (let i = 0; i < 2; i++) {
        useGameStore.getState().hireEmployee('trader')
      }
      useGameStore.getState().hireEmployee('hr_manager')

      // ✨ 직원들을 책상에 배치 (자동 배치 확인)
      const employees = useGameStore.getState().player.employees
      const assignedCount = employees.filter((e) => e.deskId !== null).length
      console.log(`직원 책상 배치: ${assignedCount}/${employees.length}명`)

      // Role별 배치 상태 확인
      const analysts = employees.filter((e) => e.role === 'analyst')
      const managers = employees.filter((e) => e.role === 'manager')
      const traders = employees.filter((e) => e.role === 'trader')
      const hrManagers = employees.filter((e) => e.role === 'hr_manager')

      console.log(`  - Analyst: ${analysts.filter(e => e.deskId !== null).length}/${analysts.length}명 배치`)
      console.log(`  - Manager: ${managers.filter(e => e.deskId !== null).length}/${managers.length}명 배치`)
      console.log(`  - Trader: ${traders.filter(e => e.deskId !== null).length}/${traders.length}명 배치`)
      console.log(`  - HR Manager: ${hrManagers.filter(e => e.deskId !== null).length}/${hrManagers.length}명 배치`)

      // 배치되지 않은 직원 확인
      const unassigned = employees.filter((e) => e.deskId === null)
      if (unassigned.length > 0) {
        console.log(`  ⚠️  배치 안 된 직원: ${unassigned.map(e => `${e.name}(${e.role})`).join(', ')}\n`)
      }

      console.log(`직원 ${useGameStore.getState().player.employees.length}명 고용 완료`)
      console.log(`고용 후 현금: ${useGameStore.getState().player.cash.toLocaleString()}원\n`)

      // ✨ 가격 히스토리 수동 채우기 (Worker 없이 직접 업데이트)
      console.log('가격 히스토리 채우는 중...')
      useGameStore.setState((s) => ({
        companies: s.companies.map((c) => {
          // 초기 가격 기준으로 ±2% 랜덤 변동 30개 생성
          const history = [c.price]
          let currentPrice = c.price
          for (let i = 0; i < 29; i++) {
            const change = (Math.random() - 0.5) * 0.04 // ±2%
            currentPrice = currentPrice * (1 + change)
            history.push(currentPrice)
          }
          return { ...c, priceHistory: history }
        }),
      }))
      const sampleCompany = useGameStore.getState().companies[0]
      console.log(`가격 히스토리 채움 완료: ${sampleCompany.priceHistory.length}개 데이터\n`)

      const initialCash = useGameStore.getState().player.cash
      const dailyStats: TradeStats[] = []
      let totalTrades = 0
      let totalFees = 0

      // ✨ 거래 추적 (매수/매도 매칭 및 손익 계산)
      const tradeLog: Array<{
        day: number
        tick: number
        direction: 'buy' | 'sell'
        ticker: string
        quantity: number
        price: number
        fee: number
        slippage: number
      }> = []

      // 100일 시뮬레이션
      for (let day = 1; day <= 100; day++) {
        const state = useGameStore.getState()
        const cashBefore = state.player.cash
        const proposalsBefore = state.proposals.length

        let dayTrades = 0
        let dayBuys = 0
        let daySells = 0
        let dayFees = 0

        // 하루 시뮬레이션 (간소화: 360틱)
        for (let tick = 0; tick < 360; tick++) {
          const currentState = useGameStore.getState()

          // Trade AI Pipeline 실행
          // Analyst: 10틱마다
          if (tick % 10 === 0) {
            const proposalsBefore = currentState.proposals.length
            currentState.processAnalystTick()
            const proposalsAfter = useGameStore.getState().proposals.length

            if (day === 1 && tick < 30 && proposalsAfter > proposalsBefore) {
              console.log(`  [${day}일 ${tick}틱] Analyst가 제안 생성: ${proposalsAfter - proposalsBefore}개`)
            }
          }

          // Manager: 5틱마다
          if (tick % 5 === 2) {
            const approvedBefore = currentState.proposals.filter(p => p.status === 'APPROVED').length
            currentState.processManagerTick()
            const approvedAfter = useGameStore.getState().proposals.filter(p => p.status === 'APPROVED').length

            if (day === 1 && tick < 30 && approvedAfter > approvedBefore) {
              console.log(`  [${day}일 ${tick}틱] Manager가 승인: ${approvedAfter - approvedBefore}개`)
            }
          }

          // Trader: 매 틱
          const executedBefore = currentState.proposals.filter(p => p.status === 'EXECUTED').length
          currentState.processTraderTick()
          const executedAfter = useGameStore.getState().proposals.filter(p => p.status === 'EXECUTED').length

          if (day === 1 && tick < 30 && executedAfter > executedBefore) {
            console.log(`  [${day}일 ${tick}틱] Trader가 실행: ${executedAfter - executedBefore}개`)
          }

          // 10틱마다 processEmployeeTick
          if (tick % 10 === 0) {
            currentState.processEmployeeTick()
          }

          // 틱 진행
          useGameStore.setState((s) => ({
            currentTick: s.currentTick + 1,
          }))
        }

        const cashAfter = useGameStore.getState().player.cash
        const proposals = useGameStore.getState().proposals

        // 실행된 거래 집계
        const executedProposals = proposals.filter((p) => p.status === 'EXECUTED')
        dayTrades = executedProposals.length - (day > 1 ? dailyStats[day - 2]?.proposals.executed || 0 : 0)

        // 제안 상태 집계
        const proposalStats = {
          pending: proposals.filter((p) => p.status === 'PENDING').length,
          approved: proposals.filter((p) => p.status === 'APPROVED').length,
          executed: proposals.filter((p) => p.status === 'EXECUTED').length,
          failed: proposals.filter((p) => p.status === 'FAILED' || p.status === 'REJECTED').length,
        }

        const portfolioValue = Object.values(useGameStore.getState().player.portfolio).reduce(
          (sum, pos) => {
            const company = useGameStore.getState().companies.find((c) => c.id === pos.companyId)
            return sum + (company ? company.price * pos.shares : 0)
          },
          0,
        )

        const stats: TradeStats = {
          day,
          cash: cashAfter,
          trades: dayTrades,
          buyTrades: dayBuys,
          sellTrades: daySells,
          totalFees: dayFees,
          totalSlippage: 0,
          portfolioValue,
          failedTrades: 0,
          proposals: proposalStats,
        }

        dailyStats.push(stats)
        totalTrades += dayTrades

        // 월말 처리
        if (day % 30 === 0) {
          useGameStore.getState().processMonthly()
        }

        // 날짜 진행
        useGameStore.setState((s) => ({
          time: {
            ...s.time,
            day: s.time.day === 30 ? 1 : s.time.day + 1,
            month: s.time.day === 30 ? (s.time.month === 12 ? 1 : s.time.month + 1) : s.time.month,
          },
        }))

        // 10일마다 로그
        if (day % 10 === 0) {
          const recentStats = dailyStats.slice(-10)
          const avgDailyTrades = recentStats.reduce((sum, s) => sum + s.trades, 0) / 10
          const cashChange = cashAfter - cashBefore

          // 제안 상태 분포 분석 (첫 10일만)
          let extraInfo = ''
          if (day === 10) {
            const buyProposals = proposals.filter(p => p.direction === 'buy')
            const sellProposals = proposals.filter(p => p.direction === 'sell')
            const rejectedReasons: Record<string, number> = {}
            proposals.filter(p => p.status === 'REJECTED' || p.status === 'FAILED').forEach(p => {
              const reason = p.rejectReason || 'unknown'
              rejectedReasons[reason] = (rejectedReasons[reason] || 0) + 1
            })
            extraInfo = `\n    BUY: ${buyProposals.length}, SELL: ${sellProposals.length}, 거부 이유: ${JSON.stringify(rejectedReasons)}`
          }

          console.log(
            `${day}일차: 현금 ${cashAfter.toLocaleString()}원, 일평균 거래 ${avgDailyTrades.toFixed(1)}회, ` +
              `PENDING ${proposalStats.pending}, EXECUTED ${proposalStats.executed}${extraInfo}`,
          )
        }
      }

      // 최종 분석
      const finalCash = useGameStore.getState().player.cash
      const finalPortfolio = useGameStore.getState().player.portfolio

      // ✨ 포트폴리오 상세 분석
      const portfolioAnalysis: Array<{
        ticker: string
        shares: number
        avgBuyPrice: number
        currentPrice: number
        totalCost: number
        currentValue: number
        unrealizedPnL: number
      }> = []

      let finalPortfolioValue = 0
      Object.values(finalPortfolio).forEach((pos) => {
        const company = useGameStore.getState().companies.find((c) => c.id === pos.companyId)
        if (company) {
          const totalCost = pos.avgBuyPrice * pos.shares
          const currentValue = company.price * pos.shares
          const unrealizedPnL = currentValue - totalCost

          portfolioAnalysis.push({
            ticker: company.ticker,
            shares: pos.shares,
            avgBuyPrice: pos.avgBuyPrice,
            currentPrice: company.price,
            totalCost,
            currentValue,
            unrealizedPnL,
          })

          finalPortfolioValue += currentValue
        }
      })

      const totalAssets = finalCash + finalPortfolioValue
      const totalCashLoss = initialCash - finalCash

      console.log('\n📊 100일 거래 분석 결과')
      console.log('─────────────────────────────────')
      console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`현금 감소: ${totalCashLoss.toLocaleString()}원`)
      console.log(`포트폴리오 가치: ${finalPortfolioValue.toLocaleString()}원`)
      console.log(`총 자산: ${totalAssets.toLocaleString()}원`)
      console.log(`자산 변화: ${(totalAssets - initialCash).toLocaleString()}원`)

      // ✨ 포트폴리오 상세 분석
      if (portfolioAnalysis.length > 0) {
        console.log('\n💼 포트폴리오 상세 분석:')
        portfolioAnalysis.forEach((item) => {
          const pnlSign = item.unrealizedPnL >= 0 ? '+' : ''
          const pnlPercent = ((item.unrealizedPnL / item.totalCost) * 100).toFixed(2)
          console.log(
            `  ${item.ticker}: ${item.shares}주 @ ${item.avgBuyPrice.toLocaleString()}원 ` +
              `→ 현재 ${item.currentPrice.toLocaleString()}원 ` +
              `(${pnlSign}${item.unrealizedPnL.toLocaleString()}원, ${pnlSign}${pnlPercent}%)`,
          )
        })

        const totalUnrealizedPnL = portfolioAnalysis.reduce((sum, item) => sum + item.unrealizedPnL, 0)
        const totalInvested = portfolioAnalysis.reduce((sum, item) => sum + item.totalCost, 0)
        console.log(`\n  총 투자금: ${totalInvested.toLocaleString()}원`)
        console.log(`  총 평가손익: ${totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString()}원`)
      } else {
        console.log('\n💼 포트폴리오: 보유 종목 없음')
      }

      console.log('\n💹 거래 통계:')
      console.log(`총 실행된 거래: ${dailyStats[dailyStats.length - 1].proposals.executed}회`)
      console.log(`평균 일 거래: ${(dailyStats[dailyStats.length - 1].proposals.executed / 100).toFixed(1)}회`)
      console.log(`실패한 거래: ${dailyStats[dailyStats.length - 1].proposals.failed}회`)

      // 거래 빈도 분석
      const tradeCounts = dailyStats.map((s) => s.trades)
      const maxDailyTrades = Math.max(...tradeCounts)
      const avgDailyTrades = tradeCounts.reduce((sum, c) => sum + c, 0) / tradeCounts.length
      const daysWithTrades = tradeCounts.filter((c) => c > 0).length

      console.log('\n📈 거래 빈도 분석:')
      console.log(`거래 발생일: ${daysWithTrades}일 / 100일`)
      console.log(`최대 일 거래: ${maxDailyTrades}회`)
      console.log(`평균 일 거래: ${avgDailyTrades.toFixed(2)}회`)

      // 현금 감소 패턴 분석
      const cashChanges = dailyStats.map((s, i) => (i > 0 ? s.cash - dailyStats[i - 1].cash : 0))
      const negativeDays = cashChanges.filter((c) => c < 0).length
      const avgDailyCashChange = cashChanges.reduce((sum, c) => sum + c, 0) / cashChanges.length

      console.log('\n💰 현금 흐름 분석:')
      console.log(`현금 감소일: ${negativeDays}일 / 100일`)
      console.log(`평균 일 현금 변화: ${avgDailyCashChange.toLocaleString()}원`)

      // 비정상 패턴 감지
      const anomalies: string[] = []

      // 1. 과도한 현금 감소 (일 1000만원 이상)
      const excessiveDays = dailyStats.filter(
        (s, i) => i > 0 && dailyStats[i - 1].cash - s.cash > 10_000_000,
      )
      if (excessiveDays.length > 0) {
        anomalies.push(
          `⚠️  일 1000만원 이상 현금 감소: ${excessiveDays.length}일 (${excessiveDays.map((s) => s.day).join(', ')}일차)`,
        )
      }

      // 2. 과도한 거래 빈도 (일 10회 이상)
      const excessiveTradingDays = dailyStats.filter((s) => s.trades > 10)
      if (excessiveTradingDays.length > 0) {
        anomalies.push(
          `⚠️  일 10회 이상 거래: ${excessiveTradingDays.length}일 (최대 ${maxDailyTrades}회)`,
        )
      }

      // 3. 자산 감소 (거래로 인한 순손실)
      const netLoss = initialCash - totalAssets
      if (netLoss > initialCash * 0.1) {
        anomalies.push(`⚠️  총 자산 10% 이상 감소: ${netLoss.toLocaleString()}원`)
      }

      // 4. 급여 대비 과도한 현금 감소
      const employeeSalaries = useGameStore.getState().player.employees.reduce(
        (sum, emp) => sum + emp.salary,
        0,
      )
      const expectedMonthlyCost = employeeSalaries * 3 + 1_000_000 // 3개월 급여 + HR 비용
      const unexplainedLoss = totalCashLoss - expectedMonthlyCost
      if (unexplainedLoss > 50_000_000) {
        anomalies.push(
          `⚠️  급여 외 과도한 현금 감소: ${unexplainedLoss.toLocaleString()}원 (예상 ${expectedMonthlyCost.toLocaleString()}원, 실제 ${totalCashLoss.toLocaleString()}원)`,
        )
      }

      console.log('\n🔍 이상 패턴:')
      if (anomalies.length > 0) {
        anomalies.forEach((a) => console.log(`  ${a}`))
      } else {
        console.log('  ✅ 이상 패턴 없음 - 정상 범위')
      }

      // 검증
      console.log('\n✅ 테스트 결과:')
      expect(finalCash).toBeGreaterThan(0) // 파산하지 않음
      expect(totalAssets).toBeGreaterThan(0) // 총 자산 양수
      expect(maxDailyTrades).toBeLessThan(50) // 일 거래 50회 미만 (정상 범위)

      if (anomalies.length > 0) {
        console.log(`  ⚠️  ${anomalies.length}개 이상 패턴 감지됨`)
      } else {
        console.log('  ✅ 모든 검증 통과')
      }

      console.log('\n')
    },
  )
})
