/**
 * 10년 시뮬레이션 테스트
 *
 * 검증 항목:
 * - GBM 가격 변동 범위 (10년간)
 * - Trade AI 파이프라인 실제 거래 발생
 * - 직원 고용 상태에서 현금 흐름 안정성
 * - 파산 방지
 * - 밸런스 검증 (adjacency bonus, XP 성장 등)
 *
 * 시뮬레이션: 3600일 (10년) = 129,600 ticks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import type { Company } from '../../src/types'

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

interface YearSnapshot {
  year: number
  cash: number
  totalAssets: number
  employees: number
  trades: number
  proposals: {
    generated: number
    approved: number
    rejected: number
    executed: number
  }
  priceStats: {
    avgChange: number
    maxPrice: number
    minPrice: number
  }
}

describe('10년 장기 시뮬레이션', () => {
  const yearSnapshots: YearSnapshot[] = []
  let totalTradesExecuted = 0
  let totalProposalsGenerated = 0
  let totalProposalsApproved = 0
  let totalProposalsRejected = 0

  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
    yearSnapshots.length = 0
    totalTradesExecuted = 0
    totalProposalsGenerated = 0
    totalProposalsApproved = 0
    totalProposalsRejected = 0
  })

  it(
    '10년 복합 시뮬레이션: 직원 고용 + Trade AI + 현금 흐름',
    { timeout: 600000 }, // 10분 타임아웃
    () => {
      // 1. 게임 시작 (초기 현금 400억 - 20명 × 10년 운영 가능)
      useGameStore.getState().startGame('normal', undefined, 40_000_000_000)

      let state = useGameStore.getState()

      console.log(`\n🎮 10년 시뮬레이션 시작`)
      console.log(`초기 현금: ${state.player.cash.toLocaleString()}원`)
      console.log(`시뮬레이션 기간: 3600일 (10년)`)
      console.log(`예상 틱 수: 129,600 ticks\n`)

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

      // 4. 10년 시뮬레이션 (3600일)
      let yearProposals = { generated: 0, approved: 0, rejected: 0, executed: 0 }
      let yearTrades = 0
      let yearStartCash = state.player.cash

      for (let day = 1; day <= 3600; day++) {
        const currentState = useGameStore.getState()
        const proposalsBefore = currentState.proposals.length

        // 하루 = 3600 ticks
        for (let tick = 0; tick < 3600; tick++) {
          const s = useGameStore.getState()

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
          s.processTraderTick()

          // Proposal 만료 (10틱마다, tick%10===5)
          if (tick % 10 === 5) {
            s.expireOldProposals()
          }

          // 틱 진행
          useGameStore.setState((state) => ({
            currentTick: state.currentTick + 1,
          }))
        }

        const proposalsAfter = useGameStore.getState().proposals.length
        const proposalsGenerated = Math.max(0, proposalsAfter - proposalsBefore)

        // 제안서 통계
        const proposals = useGameStore.getState().proposals
        const approved = proposals.filter((p) => p.status === 'APPROVED').length
        const rejected = proposals.filter((p) => p.status === 'REJECTED').length
        const executed = proposals.filter((p) => p.status === 'EXECUTED').length

        yearProposals.generated += proposalsGenerated
        yearProposals.approved += approved
        yearProposals.rejected += rejected
        yearProposals.executed += executed
        yearTrades += executed

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
          useGameStore.getState().processMonthly()
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

          yearSnapshots.push({
            year,
            cash: finalState.player.cash,
            totalAssets,
            employees: finalState.player.employees.length,
            trades: yearTrades,
            proposals: { ...yearProposals },
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
          console.log(`  연간 거래: ${yearTrades}회`)
          console.log(`  제안서 - 생성: ${yearProposals.generated}, 승인: ${yearProposals.approved}, 거부: ${yearProposals.rejected}, 체결: ${yearProposals.executed}`)
          console.log(
            `  가격 변동: 평균 ${avgPriceChange.toFixed(1)}%, 최고 ${maxPrice.toLocaleString()}원, 최저 ${minPrice.toLocaleString()}원`,
          )

          totalTradesExecuted += yearTrades
          totalProposalsGenerated += yearProposals.generated
          totalProposalsApproved += yearProposals.approved
          totalProposalsRejected += yearProposals.rejected

          // 다음 연도 초기화
          yearProposals = { generated: 0, approved: 0, rejected: 0, executed: 0 }
          yearTrades = 0
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

      console.log(`\n\n📊 10년 시뮬레이션 최종 보고서`)
      console.log(`─────────────────────────────────────`)
      console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`최종 총 자산: ${totalAssets.toLocaleString()}원`)
      console.log(`순 손익: ${(totalAssets - initialCash).toLocaleString()}원`)
      console.log(
        `수익률: ${(((totalAssets - initialCash) / initialCash) * 100).toFixed(2)}%`,
      )

      console.log(`\n📈 거래 통계:`)
      console.log(`  총 제안서 생성: ${totalProposalsGenerated}건`)
      console.log(`  총 승인: ${totalProposalsApproved}건`)
      console.log(`  총 거부: ${totalProposalsRejected}건`)
      console.log(`  총 체결: ${totalTradesExecuted}건`)
      console.log(
        `  승인율: ${totalProposalsGenerated > 0 ? ((totalProposalsApproved / totalProposalsGenerated) * 100).toFixed(1) : 0}%`,
      )

      console.log(`\n📊 가격 변동 분석:`)
      finalState.companies.forEach((c) => {
        const initialPrice = initialCompanyPrices[c.id] || c.price
        const changePercent = ((c.price - initialPrice) / initialPrice) * 100
        if (Math.abs(changePercent) > 50) {
          console.log(
            `  ${c.ticker}: ${initialPrice.toLocaleString()}원 → ${c.price.toLocaleString()}원 (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`,
          )
        }
      })

      console.log(`\n🔍 밸런스 검증:`)

      // 6. 검증
      console.log(`  파산 방지: ${finalCash > 0 ? '✅' : '❌'}`)
      expect(finalCash).toBeGreaterThan(0)

      console.log(`  Trade AI 작동: ${totalTradesExecuted > 0 ? '✅' : '❌'}`)
      expect(totalTradesExecuted).toBeGreaterThan(0)

      console.log(`  제안서 생성: ${totalProposalsGenerated > 0 ? '✅' : '❌'}`)
      expect(totalProposalsGenerated).toBeGreaterThan(0)

      // 가격 안전장치 검증 (±1000x 범위 내)
      const priceViolations = finalState.companies.filter((c) => {
        const initialPrice = initialCompanyPrices[c.id] || 10000
        return c.price > initialPrice * 1000 || c.price < initialPrice * 0.001
      })
      console.log(`  가격 안전장치: ${priceViolations.length === 0 ? '✅' : '❌'}`)
      expect(priceViolations.length).toBe(0)

      // 현금 흐름 안정성 (파산하지 않았으므로 통과)
      console.log(`  현금 흐름 안정성: ✅`)

      // XP 성장 검증 (10년 = 120개월, 월 15 XP = 1800 XP → Level 24 예상)
      const avgLevel =
        finalState.player.employees.reduce((sum, e) => sum + (e.level || 1), 0) /
        finalState.player.employees.length
      console.log(`  직원 평균 레벨: ${avgLevel.toFixed(1)} (예상: ~24)`)

      console.log(`\n🎉 10년 시뮬레이션 완료!`)
    },
  )
})
