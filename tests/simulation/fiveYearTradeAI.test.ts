/**
 * 5년 Trade AI Pipeline 거래 비용 분석 테스트
 *
 * **목표**: 빠른 검증을 위한 5년 시뮬레이션
 *
 * 시뮬레이션: 1800일 (5년) = 64,800 ticks
 * 초기 현금: 250억 (5년 × 20명 운영 가능)
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
    playAIReject: vi.fn(),
    playBuy: vi.fn(),
    playSell: vi.fn(),
  },
}))

interface YearSnapshot {
  year: number
  cash: number
  totalAssets: number
  trades: {
    buy: number
    sell: number
    totalBuyCost: number
    totalSellRevenue: number
    totalFees: number
  }
}

describe('5년 Trade AI 거래 비용 분석', () => {
  const yearSnapshots: YearSnapshot[] = []

  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
    yearSnapshots.length = 0
  })

  it(
    '5년 Trade AI 시뮬레이션',
    { timeout: 300000 }, // 5분 타임아웃
    () => {
      // 1. 게임 시작 (초기 현금 250억)
      useGameStore.getState().startGame('normal', undefined, 25_000_000_000)

      let state = useGameStore.getState()

      console.log(`\n🎮 5년 Trade AI 시뮬레이션 시작`)
      console.log(`초기 현금: ${state.player.cash.toLocaleString()}원`)
      console.log(`시뮬레이션 기간: 1800일 (5년)\n`)

      const initialCash = state.player.cash

      // 2. officeLayout 초기화 및 책상 구매
      state.initializeOfficeLayout()

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

      const desks = useGameStore.getState().player.officeLayout?.desks || []
      let deskIndex = 0
      for (let i = 0; i < Math.min(analysts.length, managers.length, traders.length); i++) {
        if (analysts[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(analysts[i].id, desks[deskIndex++].id)
        }
        if (managers[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(managers[i].id, desks[deskIndex++].id)
        }
        if (traders[i] && desks[deskIndex]) {
          state.assignEmployeeToDesk(traders[i].id, desks[deskIndex++].id)
        }
      }

      state = useGameStore.getState()
      console.log(`직원 배치 완료: Analyst ${analysts.length}, Manager ${managers.length}, Trader ${traders.length}`)
      console.log(`현금: ${state.player.cash.toLocaleString()}원\n`)

      // 4. 5년 시뮬레이션 (1800일)
      let yearTrades = { buy: 0, sell: 0, totalBuyCost: 0, totalSellRevenue: 0, totalFees: 0 }
      let yearStartCash = state.player.cash

      for (let day = 1; day <= 1800; day++) {
        const cashBefore = useGameStore.getState().player.cash

        // 하루 = 3600 ticks (간소화: 360틱만 실행)
        for (let tick = 0; tick < 360; tick++) {
          const s = useGameStore.getState()

          if (tick % 10 === 0) {
            s.processEmployeeTick()
            s.processAnalystTick()
          }

          if (tick % 5 === 2) {
            s.processManagerTick()
          }

          s.processTraderTick()

          if (tick % 10 === 5) {
            s.expireOldProposals()
          }

          useGameStore.setState((state) => ({
            currentTick: state.currentTick + 1,
          }))
        }

        const cashAfter = useGameStore.getState().player.cash
        const cashDelta = cashAfter - cashBefore

        // 매수/매도 감지 (간단하게 현금 변화로 추정)
        if (cashDelta < 0) {
          yearTrades.totalBuyCost += Math.abs(cashDelta)
          yearTrades.buy++
        } else if (cashDelta > 0) {
          yearTrades.totalSellRevenue += cashDelta
          yearTrades.sell++
        }

        // 수수료 추정 (0.3% 기준)
        const tradeVolume = Math.abs(cashDelta)
        yearTrades.totalFees += tradeVolume * 0.003

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

          yearSnapshots.push({
            year,
            cash: finalState.player.cash,
            totalAssets,
            trades: { ...yearTrades },
          })

          console.log(`\n📅 ${year}년차 완료`)
          console.log(`  현금: ${finalState.player.cash.toLocaleString()}원`)
          console.log(`  총 자산: ${totalAssets.toLocaleString()}원`)
          console.log(`  거래: 매수 ${yearTrades.buy}회, 매도 ${yearTrades.sell}회`)
          console.log(`  매수 비용: ${yearTrades.totalBuyCost.toLocaleString()}원`)
          console.log(`  매도 수익: ${yearTrades.totalSellRevenue.toLocaleString()}원`)
          console.log(`  수수료 (추정): ${yearTrades.totalFees.toLocaleString()}원`)

          yearTrades = { buy: 0, sell: 0, totalBuyCost: 0, totalSellRevenue: 0, totalFees: 0 }
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

      const totalBuyCost = yearSnapshots.reduce((sum, y) => sum + y.trades.totalBuyCost, 0)
      const totalSellRevenue = yearSnapshots.reduce((sum, y) => sum + y.trades.totalSellRevenue, 0)
      const totalFees = yearSnapshots.reduce((sum, y) => sum + y.trades.totalFees, 0)

      console.log(`\n\n📊 5년 시뮬레이션 최종 보고서`)
      console.log(`═════════════════════════════════════`)
      console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`최종 총 자산: ${totalAssets.toLocaleString()}원`)
      console.log(`순 손익: ${(totalAssets - initialCash).toLocaleString()}원`)

      console.log(`\n💰 거래 비용 분석:`)
      console.log(`  총 매수 비용: ${totalBuyCost.toLocaleString()}원`)
      console.log(`  총 매도 수익: ${totalSellRevenue.toLocaleString()}원`)
      console.log(`  순 거래 손익: ${(totalSellRevenue - totalBuyCost).toLocaleString()}원`)
      console.log(`  총 수수료 (추정): ${totalFees.toLocaleString()}원`)

      console.log(`\n🔍 검증:`)
      expect(finalCash).toBeGreaterThan(0)

      console.log(`\n🎉 5년 시뮬레이션 완료!`)
    },
  )
})
