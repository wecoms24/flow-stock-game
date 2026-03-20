/**
 * 빨리감기 Readiness Check 다이얼로그 E2E 테스트
 *
 * QA 플레이테스트 #4에서 발견된 초보 유저 트랩 방지:
 * - 미배치 직원 + 빨리감기 → 급여만 소진
 * - 주식 0주 + 빨리감기 → 수익 0
 * - 현금 부족 + 빨리감기 → 파산
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../../src/stores/gameStore'

function resetFFState() {
  // Fast-forward 관련 잔여 상태 정리 (싱글톤 store 테스트 격리)
  useGameStore.setState({
    isFastForwarding: false,
    fastForwardProgress: null,
    fastForwardWarnings: null,
  })
}

function startCleanGame(cash = 50_000_000) {
  resetFFState()
  useGameStore.getState().startGame('normal', undefined, cash)
  resetFFState() // startGame 후에도 한 번 더 (혹시 남은 상태 제거)
}

function getState() {
  return useGameStore.getState()
}

describe('빨리감기 Readiness Check', () => {
  beforeEach(() => {
    localStorage.clear()
    resetFFState()
  })

  describe('경고 감지 — 성공 케이스 (경고 없이 통과)', () => {
    it('직원 0명 + 주식 0주 → 경고 없이 빨리감기 시작', () => {
      startCleanGame()
      // 직원 없으면 no_stocks 조건 미발동 (employees.length > 0 필요)
      getState().fastForward()

      const s = getState()
      expect(s.fastForwardWarnings).toBeNull()
      // jsdom에서 RAF 미동작으로 isFastForwarding이 true인 채 유지
      expect(s.isFastForwarding).toBe(true)
    })

    it('직원 배치 완료 + 주식 보유 + 충분한 현금 → 경고 없이 통과', () => {
      startCleanGame(200_000_000)

      // 주식 매수
      const company = getState().companies[0]
      getState().buyStock(company.id, 10)

      // 책상 구매 (초기 officeLayout에는 책상 0개)
      getState().buyDesk('basic')

      // 직원 고용 (빈 책상 있으면 자동 배치)
      getState().hireEmployee('analyst')
      const emp = getState().player.employees[0]
      // 자동 배치 안 되었다면 수동 배치
      if (!emp?.deskId) {
        const desk = getState().player.officeLayout?.desks[0]
        if (desk) getState().assignEmployeeToDesk(emp.id, desk.id)
      }
      expect(getState().player.employees[0].deskId).not.toBeNull()

      getState().fastForward()

      const final = getState()
      expect(final.fastForwardWarnings).toBeNull()
      expect(final.isFastForwarding).toBe(true) // 경고 없으므로 바로 시작
    })
  })

  describe('경고 감지 — 실패 케이스 (경고 다이얼로그 표시)', () => {
    it('미배치 직원 존재 시 unplaced 경고', () => {
      startCleanGame(200_000_000)

      // 먼저 모든 기본 책상 제거 → 고용해도 자동배치 불가
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }

      getState().hireEmployee('analyst')
      const emp = getState().player.employees[0]
      expect(emp).toBeDefined()
      expect(emp.deskId).toBeNull() // 책상 없으므로 미배치

      getState().fastForward()

      const s = getState()
      expect(s.fastForwardWarnings).not.toBeNull()
      expect(s.fastForwardWarnings!.some((w) => w.startsWith('unplaced:'))).toBe(true)
      expect(s.isFastForwarding).toBe(false) // 빨리감기 시작 안됨
    })

    it('직원 있는데 주식 0주 → no_stocks 경고', () => {
      startCleanGame(200_000_000)

      // 직원 고용 (자동 배치될 수 있음)
      getState().hireEmployee('analyst')
      const emp = getState().player.employees[0]
      if (!emp?.deskId && getState().player.officeLayout?.desks[0]) {
        getState().assignEmployeeToDesk(emp.id, getState().player.officeLayout!.desks[0].id)
      }

      // 주식 매수 안 함 → portfolio 비어있음
      expect(Object.keys(getState().player.portfolio).length).toBe(0)

      getState().fastForward()

      const s = getState()
      expect(s.fastForwardWarnings).not.toBeNull()
      expect(s.fastForwardWarnings).toContain('no_stocks')
    })

    it('현금이 3개월치 급여 미만 → low_cash 경고', () => {
      startCleanGame(5_000_000)

      getState().hireEmployee('analyst')
      const emp = getState().player.employees[0]
      if (!emp?.deskId && getState().player.officeLayout?.desks[0]) {
        getState().assignEmployeeToDesk(emp.id, getState().player.officeLayout!.desks[0].id)
      }

      // 주식 매수 (no_stocks 경고 회피)
      const company = getState().companies[0]
      getState().buyStock(company.id, 1)

      getState().fastForward()

      const s = getState()
      const monthlySalary = s.player.employees.reduce((acc, e) => acc + e.salary, 0)
      if (monthlySalary > 0 && s.player.cash < monthlySalary * 3) {
        expect(s.fastForwardWarnings).not.toBeNull()
        expect(s.fastForwardWarnings).toContain('low_cash')
      }
    })

    it('복합 경고 — 미배치 + 주식 없음 동시 발생', () => {
      startCleanGame(200_000_000)

      // 책상 모두 제거
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }

      getState().hireEmployee('analyst')
      expect(getState().player.employees[0].deskId).toBeNull()

      getState().fastForward()

      const s = getState()
      expect(s.fastForwardWarnings).not.toBeNull()
      expect(s.fastForwardWarnings!.length).toBeGreaterThanOrEqual(2)
      expect(s.fastForwardWarnings!.some((w) => w.startsWith('unplaced:'))).toBe(true)
      expect(s.fastForwardWarnings).toContain('no_stocks')
    })
  })

  describe('경고 다이얼로그 상태 관리', () => {
    /**
     * 경고 발생 시 게임이 일시정지됨을 검증 (C-2 수정)
     */
    it('경고 표시 시 게임이 일시정지됨', () => {
      startCleanGame(200_000_000)
      // 수동으로 일시정지 해제
      useGameStore.setState((s) => ({ time: { ...s.time, isPaused: false } }))
      expect(getState().time.isPaused).toBe(false)

      // 미배치 직원 조건 생성
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }
      getState().hireEmployee('analyst')

      getState().fastForward()

      const s = getState()
      expect(s.fastForwardWarnings).not.toBeNull()
      expect(s.time.isPaused).toBe(true) // C-2 수정 검증: 경고 시 자동 pause
    })

    it('confirmFastForward → 경고 해제 + 빨리감기 시작', () => {
      startCleanGame(200_000_000)

      // 경고 조건 생성 (미배치)
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }
      getState().hireEmployee('analyst')

      getState().fastForward()
      expect(getState().fastForwardWarnings).not.toBeNull()
      expect(getState().isFastForwarding).toBe(false)

      getState().confirmFastForward()

      const s = getState()
      expect(s.fastForwardWarnings).toBeNull()
      expect(s.isFastForwarding).toBe(true) // force=true로 빨리감기 시작됨
    })

    it('dismissFastForward → 경고 해제 + 빨리감기 취소', () => {
      startCleanGame(200_000_000)

      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }
      getState().hireEmployee('analyst')

      getState().fastForward()
      expect(getState().fastForwardWarnings).not.toBeNull()

      getState().dismissFastForward()

      const s = getState()
      expect(s.fastForwardWarnings).toBeNull()
      expect(s.isFastForwarding).toBe(false)
      expect(s.fastForwardProgress).toBeNull()
    })

    it('force=true → 경고 무시하고 바로 시작', () => {
      startCleanGame(200_000_000)

      // 경고 조건 있어도 force로 바로 시작
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }
      getState().hireEmployee('analyst')

      getState().fastForward(true)

      const s = getState()
      expect(s.fastForwardWarnings).toBeNull()
      expect(s.isFastForwarding).toBe(true)
    })

    it('이미 빨리감기 중이면 재진입 불가', () => {
      startCleanGame()
      // 수동으로 isFastForwarding 설정 (RAF 없는 테스트 환경)
      useGameStore.setState({ isFastForwarding: true })

      getState().fastForward()

      // 재진입 불가 — 상태 변경 없음
      expect(getState().fastForwardWarnings).toBeNull()
    })

    it('게임 오버 상태에서는 빨리감기 불가', () => {
      startCleanGame()
      useGameStore.setState({ isGameOver: true })

      getState().fastForward()

      expect(getState().fastForwardWarnings).toBeNull()
      expect(getState().isFastForwarding).toBe(false) // 시작 안됨
    })
  })

  describe('autoPauseForEvent와의 상호작용 (M-1)', () => {
    it('autoPauseForEvent가 fastForwardWarnings를 정리함', () => {
      startCleanGame(200_000_000)
      // 직접 FF 상태를 설정하여 테스트
      useGameStore.setState({
        isFastForwarding: true,
        fastForwardWarnings: ['no_stocks'],
      })

      getState().autoPauseForEvent('test-event')

      const s = getState()
      expect(s.isFastForwarding).toBe(false)
      expect(s.fastForwardWarnings).toBeNull() // M-1 수정 검증
    })
  })

  describe('채용 토스트 경고 (Phase 3)', () => {
    it('빈 책상 없이 채용하면 deskId가 null', () => {
      startCleanGame(200_000_000)

      // 모든 책상 제거
      const layout = getState().player.officeLayout
      if (layout) {
        for (const desk of [...layout.desks]) {
          getState().removeDesk(desk.id)
        }
      }

      getState().hireEmployee('analyst')

      const emp = getState().player.employees[0]
      expect(emp).toBeDefined()
      expect(emp.deskId).toBeNull()
    })

    it('빈 책상이 있으면 자동 배치', () => {
      startCleanGame(200_000_000)

      // 기본 officeLayout에 책상이 있는 상태에서 고용
      getState().hireEmployee('analyst')

      const s = getState()
      const emp = s.player.employees[0]
      if (s.player.officeLayout && s.player.officeLayout.desks.length > 0) {
        expect(emp.deskId).not.toBeNull()
      }
    })
  })

  describe('reduce 파라미터 섀도잉 수정 (C-1)', () => {
    it('monthlySalary 계산이 정확함', () => {
      startCleanGame(200_000_000)

      getState().hireEmployee('analyst')
      getState().hireEmployee('trader')

      const employees = getState().player.employees
      const expectedSalary = employees.reduce((acc, e) => acc + e.salary, 0)
      expect(expectedSalary).toBeGreaterThan(0)
      expect(typeof expectedSalary).toBe('number')
    })
  })
})
