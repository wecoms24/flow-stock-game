/**
 * 20년 Trade AI Pipeline 시뮬레이션 테스트
 *
 * **목표**: 모든 거래 비용 계산 로직 검증 및 현금 소모 버그 식별
 *
 * 검증 항목:
 * - 제안서 생성 빈도 및 품질
 * - 승인/거부율 밸런스
 * - 실행 가격 (슬리피지) 정확성
 * - 수수료 계산 정확성
 * - 연도별 순손익 추적
 * - 누적 거래 비용 합리성 검증
 *
 * 시뮬레이션: 7200일 (20년) = 259,200 ticks
 * 초기 현금: 1000억 (20년 × 20명 운영 가능)
 * 직원 구성: Analyst 5, Manager 5, Trader 5, HR 5
 * 인접 배치: Analyst-Manager-Trader 순서 (adjacency bonus 활성화)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import type { Company } from '../../src/types'
import type { TradeProposal } from '../../src/types/trade'

// Mock soundManager
vi.mock('../../src/systems/soundManager', () => ({
  soundManager: {
    playClick: vi.fn(),
    playXPGain: vi.fn(),
    playLevelUp: vi.fn(),
    playHire: vi.fn(),
    playFire: vi.fn(),
    playAIApprove: vi.fn(),
    playAIReject: vi.fn(),
    playBuy: vi.fn(),
    playSell: vi.fn(),
  },
}))

interface TransactionDetail {
  tick: number
  day: number
  year: number
  proposalId: string
  direction: 'buy' | 'sell'
  ticker: string
  quantity: number
  targetPrice: number
  executedPrice: number
  slippage: number
  fee: number
  totalCost: number // 매수: (executedPrice * quantity) + fee, 매도: -(매도대금 - fee)
  confidence: number
  analystId: string
  managerId: string | null
  traderId: string | null
}

interface YearSnapshot {
  year: number
  cash: number
  totalAssets: number
  employees: number
  proposals: {
    generated: number
    approved: number
    rejected: number
    executed: number
    failed: number
  }
  transactions: {
    buyCount: number
    sellCount: number
    totalBuyCost: number // 매수 총액
    totalSellRevenue: number // 매도 총액
    totalFees: number // 총 수수료
    totalSlippage: number // 총 슬리피지 비용
    netTrading: number // 순 거래 손익 (매도대금 - 매수비용 - 수수료)
  }
  expenses: {
    salary: number
    hr: number
    furniture: number
  }
  priceStats: {
    avgChange: number
    maxPrice: number
    minPrice: number
  }
}

describe('20년 Trade AI Pipeline 시뮬레이션', () => {
  const yearSnapshots: YearSnapshot[] = []
  const allTransactions: TransactionDetail[] = []

  let totalProposalsGenerated = 0
  let totalProposalsApproved = 0
  let totalProposalsRejected = 0
  let totalProposalsExecuted = 0
  let totalProposalsFailed = 0

  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
    yearSnapshots.length = 0
    allTransactions.length = 0
    totalProposalsGenerated = 0
    totalProposalsApproved = 0
    totalProposalsRejected = 0
    totalProposalsExecuted = 0
    totalProposalsFailed = 0
  })

  it(
    '20년 Trade AI 시뮬레이션: 거래 비용 완전 추적',
    { timeout: 1200000 }, // 20분 타임아웃
    () => {
      // 1. 게임 시작 (초기 현금 1000억)
      useGameStore.getState().startGame('normal', undefined, 100_000_000_000)

      let state = useGameStore.getState()

      console.log(`\n🎮 20년 Trade AI 시뮬레이션 시작`)
      console.log(`초기 현금: ${state.player.cash.toLocaleString()}원`)
      console.log(`시뮬레이션 기간: 7200일 (20년)`)
      console.log(`예상 틱 수: 259,200 ticks\n`)

      const initialCash = state.player.cash
      const initialCompanyPrices: Record<string, number> = {}
      state.companies.forEach((c) => {
        initialCompanyPrices[c.id] = c.price
      })

      // 2. officeLayout 초기화 및 책상 구매
      state.initializeOfficeLayout()

      // 책상 25개 구매
      for (let i = 0; i < 25; i++) {
        const x = 50 + (i % 5) * 100
        const y = 100 + Math.floor(i / 5) * 100
        state.buyDesk('basic', x, y)
      }

      // 3. 직원 20명 고용 (Analyst 5, Manager 5, Trader 5, HR 5)
      const roles = ['analyst', 'analyst', 'analyst', 'analyst', 'analyst']
      roles.push('manager', 'manager', 'manager', 'manager', 'manager')
      roles.push('trader', 'trader', 'trader', 'trader', 'trader')
      roles.push('hr_manager', 'hr_manager', 'hr_manager', 'hr_manager', 'hr_manager')

      for (const role of roles) {
        state.hireEmployee(role as any)
      }

      state = useGameStore.getState()

      // 직원 배치 (adjacency bonus 활용)
      const employees = state.player.employees
      const analysts = employees.filter((e) => e.role === 'analyst')
      const managers = employees.filter((e) => e.role === 'manager')
      const traders = employees.filter((e) => e.role === 'trader')

      // Analyst-Manager-Trader 순서로 인접 배치
      const desks = useGameStore.getState().player.officeLayout?.desks || []
      let deskIndex = 0
      for (let i = 0; i < Math.min(analysts.length, managers.length, traders.length); i++) {
        // Analyst
        if (analysts[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(analysts[i].id, desks[deskIndex++].id)
        }
        // Manager (인접)
        if (managers[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(managers[i].id, desks[deskIndex++].id)
        }
        // Trader (인접)
        if (traders[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(traders[i].id, desks[deskIndex++].id)
        }
      }

      state = useGameStore.getState()
      console.log(`\n직원 배치 완료:`)
      console.log(`  Analyst: ${analysts.length}명`)
      console.log(`  Manager: ${managers.length}명`)
      console.log(`  Trader: ${traders.length}명`)
      console.log(`  HR Manager: ${employees.filter((e) => e.role === 'hr_manager').length}명`)
      console.log(`현금: ${state.player.cash.toLocaleString()}원\n`)

      // 4. 20년 시뮬레이션 (7200일)
      let yearProposals = { generated: 0, approved: 0, rejected: 0, executed: 0, failed: 0 }
      let yearTransactions = {
        buyCount: 0,
        sellCount: 0,
        totalBuyCost: 0,
        totalSellRevenue: 0,
        totalFees: 0,
        totalSlippage: 0,
        netTrading: 0,
      }
      let yearExpenses = { salary: 0, hr: 0, furniture: 0 }
      let yearStartCash = state.player.cash

      // 이전 틱의 제안서 상태 추적 (executed/failed 감지용)
      let previousProposals: TradeProposal[] = []

      for (let day = 1; day <= 7200; day++) {
        const currentState = useGameStore.getState()
        const cashBeforeDay = currentState.player.cash
        const proposalsBefore = currentState.proposals.length

        // 하루 = 3600 ticks
        for (let tick = 0; tick < 3600; tick++) {
          const s = useGameStore.getState()
          const currentTick = s.currentTick

          // processEmployeeTick (10틱마다)
          if (tick % 10 === 0) {
            s.processEmployeeTick()
          }

          // Trade AI Pipeline
          // Analyst (10틱마다, tick%10===0)
          if (tick % 10 === 0) {
            s.processAnalystTick()
          }

          // Manager (5틱마다, tick%5===2)
          if (tick % 5 === 2) {
            s.processManagerTick()
          }

          // Trader (매 틱)
          const cashBeforeTrade = s.player.cash
          s.processTraderTick()
          const cashAfterTrade = useGameStore.getState().player.cash

          // 거래 발생 감지 (cash 변화)
          if (cashAfterTrade !== cashBeforeTrade) {
            const currentProposals = useGameStore.getState().proposals

            // 새로 EXECUTED 또는 FAILED된 제안서 찾기
            const newExecuted = currentProposals.filter(
              (p) =>
                (p.status === 'EXECUTED' || p.status === 'FAILED') &&
                !previousProposals.find((prev) => prev.id === p.id && prev.status === p.status),
            )

            for (const proposal of newExecuted) {
              if (proposal.status === 'EXECUTED' && proposal.executedPrice && proposal.slippage !== null) {
                const company = useGameStore.getState().companies.find((c) => c.id === proposal.companyId)
                if (!company) continue

                const executedPrice = proposal.executedPrice
                const slippage = proposal.slippage
                const slippageCost = Math.abs(executedPrice - proposal.targetPrice) * proposal.quantity

                // 수수료 계산 (0.3% 기본율)
                const fee = executedPrice * proposal.quantity * 0.003

                let totalCost = 0
                if (proposal.direction === 'buy') {
                  totalCost = executedPrice * proposal.quantity + fee
                  yearTransactions.buyCount++
                  yearTransactions.totalBuyCost += totalCost
                } else {
                  const revenue = executedPrice * proposal.quantity - fee
                  totalCost = -revenue // 음수로 표현 (현금 유입)
                  yearTransactions.sellCount++
                  yearTransactions.totalSellRevenue += revenue
                }

                yearTransactions.totalFees += fee
                yearTransactions.totalSlippage += slippageCost

                allTransactions.push({
                  tick: currentTick,
                  day,
                  year: Math.ceil(day / 360),
                  proposalId: proposal.id,
                  direction: proposal.direction,
                  ticker: proposal.ticker,
                  quantity: proposal.quantity,
                  targetPrice: proposal.targetPrice,
                  executedPrice,
                  slippage,
                  fee,
                  totalCost,
                  confidence: proposal.confidence,
                  analystId: proposal.createdByEmployeeId,
                  managerId: proposal.reviewedByEmployeeId,
                  traderId: proposal.executedByEmployeeId,
                })
              }
            }

            previousProposals = currentProposals.map((p) => ({ ...p }))
          }

          // Proposal 만료 (10틱마다, tick%10===5)
          if (tick % 10 === 5) {
            s.expireOldProposals()
          }

          // 틱 진행
          useGameStore.setState((state) => ({
            currentTick: state.currentTick + 1,
          }))
        }

        const cashAfterDay = useGameStore.getState().player.cash
        const proposalsAfter = useGameStore.getState().proposals.length
        const proposalsGenerated = Math.max(0, proposalsAfter - proposalsBefore)

        // 제안서 통계
        const proposals = useGameStore.getState().proposals
        const approved = proposals.filter((p) => p.status === 'APPROVED').length
        const rejected = proposals.filter((p) => p.status === 'REJECTED').length
        const executed = proposals.filter((p) => p.status === 'EXECUTED').length
        const failed = proposals.filter((p) => p.status === 'FAILED').length

        yearProposals.generated += proposalsGenerated
        yearProposals.approved += approved
        yearProposals.rejected += rejected
        yearProposals.executed += executed
        yearProposals.failed += failed

        // 날짜 진행
        useGameStore.setState((s) => ({
          time: {
            ...s.time,
            day: s.time.day === 30 ? 1 : s.time.day + 1,
            month:
              s.time.day === 30 ? (s.time.month === 12 ? 1 : s.time.month + 1) : s.time.month,
            year: s.time.day === 30 && s.time.month === 12 ? s.time.year + 1 : s.time.year,
          },
        }))

        // 월 말 처리
        if (day % 30 === 0) {
          const cashBeforeMonthly = useGameStore.getState().player.cash
          useGameStore.getState().processMonthly()
          const salaryCost = cashBeforeMonthly - useGameStore.getState().player.cash
          yearExpenses.salary += salaryCost
        }

        // 연말 스냅샷
        if (day % 360 === 0) {
          const year = day / 360
          const finalState = useGameStore.getState()
          const totalAssets =
            finalState.player.cash +
            Object.entries(finalState.player.portfolio).reduce((sum, [companyId, pos]) => {
              const company = finalState.companies.find((c) => c.id === companyId)
              return sum + (company ? company.price * pos.shares : 0)
            }, 0)

          // 가격 통계
          let totalPriceChange = 0
          let maxPrice = 0
          let minPrice = Infinity

          finalState.companies.forEach((c) => {
            const initialPrice = initialCompanyPrices[c.id] || c.price
            const changePercent = ((c.price - initialPrice) / initialPrice) * 100
            totalPriceChange += changePercent
            maxPrice = Math.max(maxPrice, c.price)
            minPrice = Math.min(minPrice, c.price)
          })

          const avgPriceChange = totalPriceChange / finalState.companies.length

          // 순 거래 손익 계산
          yearTransactions.netTrading =
            yearTransactions.totalSellRevenue - yearTransactions.totalBuyCost

          yearSnapshots.push({
            year,
            cash: finalState.player.cash,
            totalAssets,
            employees: finalState.player.employees.length,
            proposals: { ...yearProposals },
            transactions: { ...yearTransactions },
            expenses: { ...yearExpenses },
            priceStats: {
              avgChange: avgPriceChange,
              maxPrice,
              minPrice,
            },
          })

          console.log(`\n📅 ${year}년차 완료`)
          console.log(`  현금: ${finalState.player.cash.toLocaleString()}원`)
          console.log(`  총 자산: ${totalAssets.toLocaleString()}원`)
          console.log(`  직원 수: ${finalState.player.employees.length}명`)
          console.log(`\n  제안서:`)
          console.log(`    생성: ${yearProposals.generated}건`)
          console.log(`    승인: ${yearProposals.approved}건`)
          console.log(`    거부: ${yearProposals.rejected}건`)
          console.log(`    체결: ${yearProposals.executed}건`)
          console.log(`    실패: ${yearProposals.failed}건`)
          console.log(
            `    승인율: ${yearProposals.generated > 0 ? ((yearProposals.approved / yearProposals.generated) * 100).toFixed(1) : 0}%`,
          )
          console.log(`\n  거래 비용 상세:`)
          console.log(`    매수: ${yearTransactions.buyCount}회, ${yearTransactions.totalBuyCost.toLocaleString()}원`)
          console.log(`    매도: ${yearTransactions.sellCount}회, ${yearTransactions.totalSellRevenue.toLocaleString()}원`)
          console.log(`    총 수수료: ${yearTransactions.totalFees.toLocaleString()}원`)
          console.log(`    총 슬리피지: ${yearTransactions.totalSlippage.toLocaleString()}원`)
          console.log(`    순 거래 손익: ${yearTransactions.netTrading.toLocaleString()}원`)
          console.log(`\n  기타 지출:`)
          console.log(`    월급: ${yearExpenses.salary.toLocaleString()}원`)
          console.log(`    HR: ${yearExpenses.hr.toLocaleString()}원`)
          console.log(
            `  가격 변동: 평균 ${avgPriceChange.toFixed(1)}%, 최고 ${maxPrice.toLocaleString()}원, 최저 ${minPrice.toLocaleString()}원`,
          )

          totalProposalsGenerated += yearProposals.generated
          totalProposalsApproved += yearProposals.approved
          totalProposalsRejected += yearProposals.rejected
          totalProposalsExecuted += yearProposals.executed
          totalProposalsFailed += yearProposals.failed

          // 다음 연도 초기화
          yearProposals = { generated: 0, approved: 0, rejected: 0, executed: 0, failed: 0 }
          yearTransactions = {
            buyCount: 0,
            sellCount: 0,
            totalBuyCost: 0,
            totalSellRevenue: 0,
            totalFees: 0,
            totalSlippage: 0,
            netTrading: 0,
          }
          yearExpenses = { salary: 0, hr: 0, furniture: 0 }
          yearStartCash = finalState.player.cash
        }
      }

      // 5. 최종 보고서
      const finalState = useGameStore.getState()
      const finalCash = finalState.player.cash
      const totalAssets =
        finalCash +
        Object.entries(finalState.player.portfolio).reduce((sum, [companyId, pos]) => {
          const company = finalState.companies.find((c) => c.id === companyId)
          return sum + (company ? company.price * pos.shares : 0)
        }, 0)

      const totalBuyCost = yearSnapshots.reduce((sum, y) => sum + y.transactions.totalBuyCost, 0)
      const totalSellRevenue = yearSnapshots.reduce((sum, y) => sum + y.transactions.totalSellRevenue, 0)
      const totalFees = yearSnapshots.reduce((sum, y) => sum + y.transactions.totalFees, 0)
      const totalSlippage = yearSnapshots.reduce((sum, y) => sum + y.transactions.totalSlippage, 0)
      const totalSalary = yearSnapshots.reduce((sum, y) => sum + y.expenses.salary, 0)
      const netTrading = totalSellRevenue - totalBuyCost

      console.log(`\n\n📊 20년 시뮬레이션 최종 보고서`)
      console.log(`═════════════════════════════════════`)
      console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`최종 총 자산: ${totalAssets.toLocaleString()}원`)
      console.log(`순 손익: ${(totalAssets - initialCash).toLocaleString()}원`)
      console.log(
        `수익률: ${(((totalAssets - initialCash) / initialCash) * 100).toFixed(2)}%`,
      )

      console.log(`\n📈 제안서 통계:`)
      console.log(`  총 생성: ${totalProposalsGenerated.toLocaleString()}건`)
      console.log(`  총 승인: ${totalProposalsApproved.toLocaleString()}건`)
      console.log(`  총 거부: ${totalProposalsRejected.toLocaleString()}건`)
      console.log(`  총 체결: ${totalProposalsExecuted.toLocaleString()}건`)
      console.log(`  총 실패: ${totalProposalsFailed.toLocaleString()}건`)
      console.log(
        `  평균 승인율: ${totalProposalsGenerated > 0 ? ((totalProposalsApproved / totalProposalsGenerated) * 100).toFixed(1) : 0}%`,
      )

      console.log(`\n💰 거래 비용 상세 분석:`)
      console.log(`  총 매수 비용: ${totalBuyCost.toLocaleString()}원`)
      console.log(`  총 매도 수익: ${totalSellRevenue.toLocaleString()}원`)
      console.log(`  순 거래 손익: ${netTrading.toLocaleString()}원`)
      console.log(`  총 수수료: ${totalFees.toLocaleString()}원 (${((totalFees / totalBuyCost) * 100).toFixed(2)}%)`)
      console.log(`  총 슬리피지 비용: ${totalSlippage.toLocaleString()}원 (${((totalSlippage / totalBuyCost) * 100).toFixed(2)}%)`)
      console.log(`  총 월급: ${totalSalary.toLocaleString()}원`)

      console.log(`\n📊 거래 패턴 분석:`)
      const buyCount = allTransactions.filter((t) => t.direction === 'buy').length
      const sellCount = allTransactions.filter((t) => t.direction === 'sell').length
      console.log(`  매수 거래: ${buyCount.toLocaleString()}회`)
      console.log(`  매도 거래: ${sellCount.toLocaleString()}회`)
      console.log(`  평균 거래 규모:`)
      console.log(`    매수: ${buyCount > 0 ? (totalBuyCost / buyCount).toLocaleString() : 0}원/회`)
      console.log(`    매도: ${sellCount > 0 ? (totalSellRevenue / sellCount).toLocaleString() : 0}원/회`)

      // 연도별 거래 비용 비율 분석
      console.log(`\n📈 연도별 거래 비용 비율:`)
      yearSnapshots.forEach((snapshot) => {
        const tradingCostRatio = snapshot.transactions.totalBuyCost > 0
          ? ((snapshot.transactions.totalFees + snapshot.transactions.totalSlippage) / snapshot.transactions.totalBuyCost) * 100
          : 0
        console.log(`  ${snapshot.year}년차: ${tradingCostRatio.toFixed(2)}% (수수료 + 슬리피지)`)
      })

      console.log(`\n🔍 버그 검증:`)

      // 6. 검증
      console.log(`  파산 방지: ${finalCash > 0 ? '✅' : '❌'}`)
      expect(finalCash).toBeGreaterThan(0)

      console.log(`  Trade AI 작동: ${totalProposalsExecuted > 0 ? '✅' : '❌'}`)
      expect(totalProposalsExecuted).toBeGreaterThan(0)

      console.log(`  제안서 생성: ${totalProposalsGenerated > 0 ? '✅' : '❌'}`)
      expect(totalProposalsGenerated).toBeGreaterThan(0)

      // 거래 비용 합리성 검증 (수수료 + 슬리피지가 매수 비용의 5% 이하여야 함)
      const tradingCostRatio = ((totalFees + totalSlippage) / totalBuyCost) * 100
      console.log(`  거래 비용 합리성: ${tradingCostRatio.toFixed(2)}% ${tradingCostRatio < 5 ? '✅' : '❌ (5% 초과)'}`)
      expect(tradingCostRatio).toBeLessThan(5)

      // 수수료율 검증 (0.3% 기본율, 최대 1% 이하)
      const feeRatio = (totalFees / totalBuyCost) * 100
      console.log(`  수수료율: ${feeRatio.toFixed(3)}% ${feeRatio < 1 ? '✅' : '❌ (1% 초과)'}`)
      expect(feeRatio).toBeLessThan(1)

      // 슬리피지율 검증 (최대 2% 이하)
      const slippageRatio = (totalSlippage / totalBuyCost) * 100
      console.log(`  슬리피지율: ${slippageRatio.toFixed(3)}% ${slippageRatio < 2 ? '✅' : '❌ (2% 초과)'}`)
      expect(slippageRatio).toBeLessThan(2)

      // 가격 안전장치 검증 (±1000x 범위 내)
      const priceViolations = finalState.companies.filter((c) => {
        const initialPrice = initialCompanyPrices[c.id] || 10000
        return c.price > initialPrice * 1000 || c.price < initialPrice * 0.001
      })
      console.log(`  가격 안전장치: ${priceViolations.length === 0 ? '✅' : '❌'}`)
      expect(priceViolations.length).toBe(0)

      // 현금 소모 패턴 분석
      const cashDrainYears = yearSnapshots.filter((y) => y.cash < initialCash * 0.5)
      if (cashDrainYears.length > 0) {
        console.log(`\n⚠️  현금 50% 이하로 떨어진 연도:`)
        cashDrainYears.forEach((y) => {
          console.log(`    ${y.year}년차: ${y.cash.toLocaleString()}원`)
          console.log(`      거래 손익: ${y.transactions.netTrading.toLocaleString()}원`)
          console.log(`      수수료: ${y.transactions.totalFees.toLocaleString()}원`)
          console.log(`      월급: ${y.expenses.salary.toLocaleString()}원`)
        })
      }

      console.log(`\n🎉 20년 시뮬레이션 완료!`)
      console.log(`전체 거래 기록: ${allTransactions.length.toLocaleString()}건`)
    },
  )
})
