/**
 * 현금 흐름 1년 시뮬레이션 테스트
 *
 * HR 자동화 중복 실행 버그 검증 및 현금 소모 패턴 분석
 *
 * 검증 항목:
 * - 분기별 훈련 비용 (90일, 180일, 270일, 360일)
 * - 스트레스 관리 비용
 * - 월급 지출
 * - 비정상적인 현금 감소 패턴 감지
 * - HR 자동화 1일 1회 실행 보장
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import type { Employee } from '../../src/types'

// 현금 흐름 통계
interface CashFlowStats {
  day: number
  cashBefore: number
  cashAfter: number
  hrCost: number
  salaryCost: number
  totalExpense: number
  employeeCount: number
  highStressCount: number
}

// 이상 패턴 탐지 결과
interface AnomalyReport {
  day: number
  type: 'EXCESSIVE_HR_COST' | 'MULTIPLE_TRAINING' | 'ABNORMAL_STRESS_COST'
  expected: number
  actual: number
  severity: 'CRITICAL' | 'WARNING'
}

describe('현금 흐름 1년 시뮬레이션', () => {
  let store: ReturnType<typeof useGameStore.getState>
  const dailyStats: CashFlowStats[] = []
  const anomalies: AnomalyReport[] = []

  beforeEach(() => {
    // 완전 초기화
    useGameStore.setState(useGameStore.getState())
    store = useGameStore.getState()

    // 게임 시작
    store.startGame('easy', undefined, 500_000_000) // 초기 현금 5억 (직원 고용 및 1년 운영 가능)

    dailyStats.length = 0
    anomalies.length = 0
  })

  it('1년치 시뮬레이션 실행 및 이상 패턴 검출', { timeout: 60000 }, () => {
    const state = useGameStore.getState()

    // 1. 직원 10명 고용 (다양한 역할)
    for (let i = 0; i < 10; i++) {
      const role = i < 3 ? 'analyst' : i < 6 ? 'trader' : i < 9 ? 'manager' : 'hr_manager'
      state.hireEmployee(role as any)
    }

    // 스트레스 높은 직원 몇 명 설정
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        employees: s.player.employees.map((emp, idx) => ({
          ...emp,
          stress: idx % 3 === 0 ? 70 : 30, // 3명마다 스트레스 높음
        })),
      },
    }))

    const initialCash = useGameStore.getState().player.cash
    const employeeCount = useGameStore.getState().player.employees.length

    console.log(`\n🎮 시뮬레이션 시작`)
    console.log(`초기 현금: ${initialCash.toLocaleString()}원`)
    console.log(`직원 수: ${employeeCount}명`)
    console.log(`시뮬레이션 기간: 360일 (1년)\n`)

    // 2. 360일 시뮬레이션 (1일 = 3600틱, 10틱마다 processEmployeeTick)
    for (let day = 1; day <= 360; day++) {
      const cashBefore = useGameStore.getState().player.cash
      const hrCostBefore = 0 // HR 비용 추적용

      // 하루 = 3600틱, processEmployeeTick은 10틱마다 실행
      for (let tick = 0; tick < 3600; tick++) {
        const currentState = useGameStore.getState()

        // 10틱마다 processEmployeeTick 실행
        if (tick % 10 === 0) {
          currentState.processEmployeeTick()
        }

        // 틱 진행
        useGameStore.setState((s) => ({
          currentTick: s.currentTick + 1,
        }))
      }

      const cashAfter = useGameStore.getState().player.cash
      const totalExpense = cashBefore - cashAfter

      // 스트레스 높은 직원 수 계산
      const highStressCount = useGameStore
        .getState()
        .player.employees.filter((e) => (e.stress ?? 0) > 60).length

      const stats: CashFlowStats = {
        day,
        cashBefore,
        cashAfter,
        hrCost: 0, // 실제 HR 비용은 추정값
        salaryCost: 0, // 월급은 월 말에만
        totalExpense,
        employeeCount: useGameStore.getState().player.employees.length,
        highStressCount,
      }

      dailyStats.push(stats)

      // 3. 이상 패턴 감지
      detectAnomalies(day, stats, employeeCount, highStressCount)

      // 날짜 진행
      useGameStore.setState((s) => ({
        time: {
          ...s.time,
          day: s.time.day + 1,
        },
      }))

      // 월 말 처리
      if (day % 30 === 0) {
        useGameStore.getState().processMonthly()
      }

      // 분기별 훈련일 로그
      if (day % 90 === 0) {
        console.log(
          `\n📊 ${day}일차 (분기 말) - 현금: ${cashAfter.toLocaleString()}원, 지출: ${totalExpense.toLocaleString()}원`,
        )
      }
    }

    // 4. 최종 보고서
    const finalCash = useGameStore.getState().player.cash
    const totalSpent = initialCash - finalCash

    console.log(`\n\n📈 시뮬레이션 완료`)
    console.log(`최종 현금: ${finalCash.toLocaleString()}원`)
    console.log(`총 지출: ${totalSpent.toLocaleString()}원`)
    console.log(`평균 일 지출: ${Math.round(totalSpent / 360).toLocaleString()}원\n`)

    // 5. 이상 패턴 리포트
    if (anomalies.length > 0) {
      console.log(`\n⚠️  이상 패턴 감지: ${anomalies.length}건\n`)
      anomalies.forEach((anomaly) => {
        console.log(
          `[${anomaly.severity}] ${anomaly.day}일차 - ${anomaly.type}: 예상 ${anomaly.expected.toLocaleString()}원, 실제 ${anomaly.actual.toLocaleString()}원`,
        )
      })
    } else {
      console.log(`\n✅ 이상 패턴 없음 - HR 자동화 정상 작동\n`)
    }

    // 6. 분기별 훈련 비용 검증
    const quarterlyDays = [90, 180, 270, 360]
    console.log(`\n📅 분기별 지출 검증:\n`)
    quarterlyDays.forEach((day) => {
      const stat = dailyStats[day - 1]
      if (stat) {
        const expectedTrainingCost = employeeCount * 100_000 // 직원당 10만원
        const expectedStressCost = stat.highStressCount * 50_000 // 스트레스 높은 직원당 5만원
        const expectedTotalHR = expectedTrainingCost + expectedStressCost

        console.log(
          `${day}일차: 지출 ${stat.totalExpense.toLocaleString()}원 (예상 HR 비용: ${expectedTotalHR.toLocaleString()}원)`,
        )

        // 과도한 HR 비용 검증 (10배 이상이면 버그)
        if (stat.totalExpense > expectedTotalHR * 10) {
          anomalies.push({
            day,
            type: 'EXCESSIVE_HR_COST',
            expected: expectedTotalHR,
            actual: stat.totalExpense,
            severity: 'CRITICAL',
          })
        }
      }
    })

    // 7. 검증
    expect(finalCash).toBeGreaterThan(0) // 파산하지 않아야 함
    expect(anomalies.filter((a) => a.severity === 'CRITICAL').length).toBe(0) // 치명적 이상 없어야 함
    expect(totalSpent).toBeLessThan(initialCash) // 총 지출이 초기 현금보다 적어야 함
  })

  /**
   * 이상 패턴 감지 함수
   */
  function detectAnomalies(
    day: number,
    stats: CashFlowStats,
    employeeCount: number,
    highStressCount: number,
  ) {
    // 분기별 훈련일 (90, 180, 270, 360일)
    if (day % 90 === 0) {
      const expectedTrainingCost = employeeCount * 100_000
      const expectedStressCost = highStressCount * 50_000
      const expectedTotal = expectedTrainingCost + expectedStressCost

      // 버그가 있으면 72배 청구됨 (하루 72번 실행)
      const buggyTotal = expectedTotal * 72

      // 실제 지출이 예상의 10배 이상이면 이상
      if (stats.totalExpense > expectedTotal * 10) {
        anomalies.push({
          day,
          type: 'EXCESSIVE_HR_COST',
          expected: expectedTotal,
          actual: stats.totalExpense,
          severity: 'CRITICAL',
        })
      }

      // 72배에 가까우면 중복 실행 버그
      if (stats.totalExpense > expectedTotal * 50) {
        anomalies.push({
          day,
          type: 'MULTIPLE_TRAINING',
          expected: expectedTotal,
          actual: stats.totalExpense,
          severity: 'CRITICAL',
        })
      }
    }

    // 일반 날짜에도 비정상적인 HR 비용 체크
    const dailyExpectedHR = highStressCount * 50_000 // 스트레스 관리만
    if (stats.totalExpense > dailyExpectedHR * 10 && day % 90 !== 0) {
      anomalies.push({
        day,
        type: 'ABNORMAL_STRESS_COST',
        expected: dailyExpectedHR,
        actual: stats.totalExpense,
        severity: 'WARNING',
      })
    }
  }
})
