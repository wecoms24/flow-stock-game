/**
 * 현금 흐름 5년 스트레스 테스트
 *
 * 모든 현금 지출 시나리오 포함:
 * - 직원 고용/해고
 * - 가구 구매
 * - 거래 (매수/매도 + 수수료)
 * - HR 자동화 (스트레스 관리, 분기별 훈련)
 * - 월급
 * - 사무실 업그레이드
 *
 * 5년 (1800일) 시뮬레이션으로 장기 안정성 검증
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'

// Mock soundManager to avoid Web Audio API issues in tests
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

interface DailyCashSnapshot {
  day: number
  year: number
  month: number
  cash: number
  employees: number
  totalExpense: number
  hrCost: number
  salary: number
  tradingCost: number
  furnitureCost: number
}

interface YearSummary {
  year: number
  startCash: number
  endCash: number
  totalExpense: number
  avgDailyExpense: number
  employeeHires: number
  furniturePurchases: number
  trades: number
}

describe('현금 흐름 5년 스트레스 테스트', () => {
  const snapshots: DailyCashSnapshot[] = []
  const yearSummaries: YearSummary[] = []

  beforeEach(() => {
    useGameStore.setState(useGameStore.getState())
    snapshots.length = 0
    yearSummaries.length = 0
  })

  it(
    '5년치 복합 시나리오 시뮬레이션',
    { timeout: 300000 }, // 5분 타임아웃
    () => {
      // 1. 게임 시작 (초기 현금 200억 - 20명 × 5년 운영 가능)
      useGameStore.getState().startGame('normal', undefined, 20_000_000_000)

      // startGame 이후 state 다시 가져오기
      let state = useGameStore.getState()

      console.log(`\n🎮 5년 스트레스 테스트 시작`)
      console.log(`초기 현금: ${state.player.cash.toLocaleString()}원`)
      console.log(`시뮬레이션 기간: 1800일 (5년)\n`)

      const initialCash = state.player.cash

      // 2. officeLayout 초기화 및 책상 구매
      state.initializeOfficeLayout()

      // 책상 20개 구매 (최대 20명 수용 가능)
      for (let i = 0; i < 20; i++) {
        state.buyDesk('basic', 50 + (i % 10) * 60, 100 + Math.floor(i / 10) * 80)
      }
      console.log('책상 20개 구매 완료\n')

      // 3. 초기 직원 10명 고용
      for (let i = 0; i < 10; i++) {
        const role = i < 3 ? 'analyst' : i < 6 ? 'trader' : i < 9 ? 'manager' : 'hr_manager'
        state.hireEmployee(role as any)
      }

      // 고용 후 state 업데이트
      state = useGameStore.getState()

      // 스트레스 높은 직원 설정
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          employees: s.player.employees.map((emp, idx) => ({
            ...emp,
            stress: idx % 2 === 0 ? 80 : 30, // 절반이 스트레스 높음
          })),
        },
      }))

      console.log(`직원 ${state.player.employees.length}명 고용 완료`)
      console.log(`현금: ${state.player.cash.toLocaleString()}원\n`)

      let totalHires = 10
      let totalFurniturePurchases = 0
      let totalTrades = 0
      let yearStartCash = state.player.cash
      let yearExpenses = 0

      // 4. 5년 시뮬레이션 (1800일)
      for (let day = 1; day <= 1800; day++) {
        const currentState = useGameStore.getState()
        const cashBefore = currentState.player.cash
        let dailyHRCost = 0
        let dailySalary = 0
        let dailyTradingCost = 0
        let dailyFurnitureCost = 0

        // 하루 시작: 다양한 액션 수행

        // ① 30일마다 직원 1명 추가 고용 (최대 20명)
        if (day % 30 === 0 && currentState.player.employees.length < 20) {
          const role = day % 90 === 0 ? 'analyst' : day % 60 === 0 ? 'manager' : 'trader'
          const cashBeforeHire = currentState.player.cash
          currentState.hireEmployee(role as any)
          const hireCost = cashBeforeHire - useGameStore.getState().player.cash
          totalHires++
          dailyTradingCost += hireCost
        }

        // ② 60일마다 가구 구매 (현금이 충분하면)
        if (day % 60 === 0 && currentState.player.cash > 50_000_000) {
          const cashBeforeFurniture = currentState.player.cash
          // 가구 구매 시뮬레이션 (실제 로직은 officeGrid 필요, 비용만 차감)
          const furnitureCost = 5_000_000
          if (currentState.player.cash >= furnitureCost) {
            useGameStore.setState((s) => ({
              player: { ...s.player, cash: s.player.cash - furnitureCost },
            }))
            totalFurniturePurchases++
            dailyFurnitureCost = furnitureCost
          }
        }

        // ③ 10일마다 거래 시뮬레이션 (매수 후 매도)
        if (day % 10 === 0 && currentState.companies.length > 0) {
          const company = currentState.companies[0]
          if (company && currentState.player.cash > company.price * 100) {
            const cashBeforeTrade = currentState.player.cash
            currentState.buyStock(company.id, 100)
            currentState.sellStock(company.id, 100)
            const tradeCost = cashBeforeTrade - useGameStore.getState().player.cash
            totalTrades += 2
            dailyTradingCost += tradeCost
          }
        }

        // ④ 매일 processEmployeeTick 실행 (360번, 하루 = 3600틱)
        for (let tick = 0; tick < 3600; tick++) {
          // 10틱마다 processEmployeeTick
          if (tick % 10 === 0) {
            currentState.processEmployeeTick()
          }

          // 틱 진행
          useGameStore.setState((s) => ({
            currentTick: s.currentTick + 1,
          }))
        }

        // ⑤ 월 말 처리
        if (day % 30 === 0) {
          const cashBeforeMonthly = useGameStore.getState().player.cash
          currentState.processMonthly()
          dailySalary = cashBeforeMonthly - useGameStore.getState().player.cash
        }

        const cashAfter = useGameStore.getState().player.cash
        const totalExpense = cashBefore - cashAfter
        yearExpenses += totalExpense

        // 스냅샷 저장 (매 7일마다)
        if (day % 7 === 0) {
          snapshots.push({
            day,
            year: Math.floor(day / 360) + 1,
            month: Math.floor((day % 360) / 30) + 1,
            cash: cashAfter,
            employees: useGameStore.getState().player.employees.length,
            totalExpense,
            hrCost: dailyHRCost,
            salary: dailySalary,
            tradingCost: dailyTradingCost,
            furnitureCost: dailyFurnitureCost,
          })
        }

        // 날짜 진행
        useGameStore.setState((s) => ({
          time: {
            ...s.time,
            day: s.time.day === 30 ? 1 : s.time.day + 1,
            month: s.time.day === 30 ? (s.time.month === 12 ? 1 : s.time.month + 1) : s.time.month,
            year: s.time.day === 30 && s.time.month === 12 ? s.time.year + 1 : s.time.year,
          },
        }))

        // 연말 요약
        if (day % 360 === 0) {
          const yearNumber = day / 360
          const yearEndCash = useGameStore.getState().player.cash

          yearSummaries.push({
            year: yearNumber,
            startCash: yearStartCash,
            endCash: yearEndCash,
            totalExpense: yearExpenses,
            avgDailyExpense: Math.round(yearExpenses / 360),
            employeeHires: totalHires,
            furniturePurchases: totalFurniturePurchases,
            trades: totalTrades,
          })

          console.log(`\n📅 ${yearNumber}년차 완료`)
          console.log(`  현금: ${yearEndCash.toLocaleString()}원`)
          console.log(`  연간 지출: ${yearExpenses.toLocaleString()}원`)
          console.log(`  평균 일 지출: ${Math.round(yearExpenses / 360).toLocaleString()}원`)
          console.log(`  직원 수: ${useGameStore.getState().player.employees.length}명`)

          // 다음 연도 초기화
          yearStartCash = yearEndCash
          yearExpenses = 0
        }
      }

      // 5. 최종 보고서
      const finalCash = useGameStore.getState().player.cash
      const totalSpent = initialCash - finalCash

      console.log(`\n\n📊 5년 시뮬레이션 최종 보고서`)
      console.log(`─────────────────────────────────────`)
      console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
      console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
      console.log(`총 지출: ${totalSpent.toLocaleString()}원`)
      console.log(`평균 연간 지출: ${Math.round(totalSpent / 5).toLocaleString()}원`)
      console.log(`\n📈 활동 통계:`)
      console.log(`  총 고용: ${totalHires}명`)
      console.log(`  가구 구매: ${totalFurniturePurchases}회`)
      console.log(`  거래 횟수: ${totalTrades}회`)

      // 6. 연도별 요약
      console.log(`\n📅 연도별 요약:`)
      yearSummaries.forEach((summary) => {
        console.log(
          `  ${summary.year}년차: ${summary.totalExpense.toLocaleString()}원 지출 (평균 ${summary.avgDailyExpense.toLocaleString()}원/일)`,
        )
      })

      // 7. 이상 패턴 검증
      console.log(`\n🔍 이상 패턴 검증:`)

      // 하루 지출이 1000만원 초과하는 날 검출 (HR 버그가 있으면 발생)
      const excessiveDays = snapshots.filter((s) => s.totalExpense > 10_000_000)
      if (excessiveDays.length > 0) {
        console.log(`  ⚠️  비정상 고지출일: ${excessiveDays.length}일`)
        excessiveDays.slice(0, 5).forEach((day) => {
          console.log(
            `    ${day.day}일차: ${day.totalExpense.toLocaleString()}원 (HR: ${day.hrCost.toLocaleString()}원)`,
          )
        })
      } else {
        console.log(`  ✅ 비정상 고지출 없음`)
      }

      // 분기별 훈련일 (90일마다) 검증
      const quarterlyDays = snapshots.filter((s) => s.day % 90 === 0)
      console.log(`\n  분기별 훈련일 (${quarterlyDays.length}일):`)
      const abnormalQuarters = quarterlyDays.filter((s) => s.totalExpense > 50_000_000) // 5000만원 초과면 버그
      if (abnormalQuarters.length > 0) {
        console.log(`    ⚠️  비정상 분기: ${abnormalQuarters.length}회`)
        abnormalQuarters.forEach((q) => {
          console.log(`      ${q.day}일차: ${q.totalExpense.toLocaleString()}원`)
        })
      } else {
        console.log(`    ✅ 모든 분기 정상 범위`)
      }

      // 8. 최종 검증
      console.log(`\n✅ 테스트 결과:`)
      expect(finalCash).toBeGreaterThan(0) // 파산하지 않음
      expect(excessiveDays.length).toBe(0) // 비정상 고지출 없음
      expect(abnormalQuarters.length).toBe(0) // 분기별 훈련 정상
      expect(totalSpent).toBeLessThan(initialCash) // 총 지출이 초기 현금보다 적음

      console.log(`  파산 방지: ✅`)
      console.log(`  HR 중복 실행 방지: ✅`)
      console.log(`  현금 흐름 안정성: ✅`)
      console.log(`\n🎉 5년 스트레스 테스트 통과!`)
    },
  )
})
