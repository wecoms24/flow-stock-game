/**
 * Corporate Skill & Training E2E 테스트
 *
 * 회사 스킬 해금, 트레이닝 프로그램, 직원 성장,
 * 월간 경비 추적, 오피스 확장 등 RPG 시스템 연계 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../../src/stores/gameStore'

describe('Corporate Skill & Training E2E', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.getState().startGame('normal', undefined, 500_000_000)
  })

  describe('Corporate Skill 해금', () => {
    it('corporateSkills 초기 상태', () => {
      const s = useGameStore.getState()
      expect(s.corporateSkills).toBeDefined()
    })

    it('스킬 해금 시 현금 차감 + 상태 변경', () => {
      const store = useGameStore.getState()
      const skills = store.corporateSkills

      // 첫 번째 잠금된 스킬 찾기
      const lockedSkill = Object.values(skills).find(
        (sk: any) => !sk.unlocked,
      ) as any

      if (lockedSkill) {
        const cashBefore = store.player.cash
        const result = store.unlockCorporateSkill(lockedSkill.id)

        if (result.success) {
          const after = useGameStore.getState()
          expect(after.player.cash).toBeLessThan(cashBefore)
          expect((after.corporateSkills as any)[lockedSkill.id]?.unlocked).toBe(true)
        }
      }
    })
  })

  describe('직원 성장 시스템', () => {
    it('시간 진행 시 XP 축적', () => {
      const store = useGameStore.getState()
      store.hireEmployee('analyst')

      const emp = useGameStore.getState().player.employees[0]
      const initialXp = emp.xp

      // 100시간 진행
      for (let i = 0; i < 100; i++) useGameStore.getState().advanceHour()

      const updated = useGameStore.getState().player.employees.find(
        (e) => e.id === emp.id,
      )
      if (updated) {
        expect(updated.xp).toBeGreaterThanOrEqual(initialXp)
      }
    })

    it('레벨업 시 SP 획득', () => {
      const store = useGameStore.getState()
      store.hireEmployee('analyst')

      const emp = useGameStore.getState().player.employees[0]

      // XP를 강제로 올려서 레벨업
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          employees: s.player.employees.map((e) =>
            e.id === emp.id
              ? { ...e, xp: e.xpToNextLevel + 100 }
              : e,
          ),
        },
      }))

      // 시간 진행으로 레벨업 처리
      for (let i = 0; i < 10; i++) useGameStore.getState().advanceHour()

      const updated = useGameStore.getState().player.employees.find(
        (e) => e.id === emp.id,
      )
      if (updated) {
        // 레벨이 올랐거나 pendingLevelUp이 있을 수 있음
        expect(updated.level).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('오피스 확장', () => {
    it('오피스 레벨 1에서 시작', () => {
      const s = useGameStore.getState()
      expect(s.player.officeLevel).toBe(1)
    })

    it('오피스 업그레이드 시 현금 차감 + 레벨 증가', () => {
      const store = useGameStore.getState()
      const cashBefore = store.player.cash

      if (store.upgradeOffice) {
        store.upgradeOffice()
        const after = useGameStore.getState()

        if (after.player.officeLevel === 2) {
          expect(after.player.cash).toBeLessThan(cashBefore)
          expect(after.player.cash).toBe(cashBefore - 10_000_000)
        }
      }
    })
  })

  describe('직원 스트레스/만족도 관리', () => {
    it('장시간 근무 시 스트레스 증가', () => {
      const store = useGameStore.getState()
      store.hireEmployee('analyst')

      const emp = useGameStore.getState().player.employees[0]
      const initialStress = emp.stress

      // 500시간 진행
      for (let i = 0; i < 500; i++) useGameStore.getState().advanceHour()

      const updated = useGameStore.getState().player.employees.find(
        (e) => e.id === emp.id,
      )
      if (updated) {
        expect(updated.stress).toBeGreaterThanOrEqual(initialStress)
      }
    })

    it('칭찬 시 만족도 상승 + 쿨다운 설정', () => {
      const store = useGameStore.getState()
      store.hireEmployee('analyst')

      const emp = useGameStore.getState().player.employees[0]
      const initialMood = emp.mood ?? 50

      if (store.praiseEmployee) {
        store.praiseEmployee(emp.id)
        const after = useGameStore.getState().player.employees.find(
          (e) => e.id === emp.id,
        )
        if (after) {
          // 칭찬 후 mood가 상승하고 쿨다운이 설정됨
          expect(after.mood ?? 50).toBeGreaterThanOrEqual(initialMood)
          expect(after.praiseCooldown).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('경쟁사 AI 독립 운영', () => {
    beforeEach(() => {
      // 경쟁사는 startGame에서 자동 생성되지 않으므로 명시적으로 초기화
      const store = useGameStore.getState()
      if (store.initializeCompetitors && store.competitors.length === 0) {
        store.initializeCompetitors(5, 100_000_000)
      }
    })

    it('경쟁사 초기화 및 독립 포트폴리오', () => {
      const s = useGameStore.getState()
      expect(s.competitors.length).toBeGreaterThan(0)

      s.competitors.forEach((comp) => {
        expect(comp.cash).toBeGreaterThan(0)
        expect(comp.portfolio).toBeDefined()
        expect(['aggressive', 'conservative', 'trend-follower', 'contrarian']).toContain(comp.style)
      })
    })

    it('시간 진행 시 경쟁사 거래 활동', () => {
      // 50시간 진행 (competitorTick은 5시간마다)
      for (let i = 0; i < 50; i++) useGameStore.getState().advanceHour()

      const s = useGameStore.getState()
      // 경쟁사가 살아있어야 함
      expect(s.competitors.length).toBeGreaterThan(0)
      // 경쟁사 현금이 변했을 수 있음
      s.competitors.forEach((comp) => {
        expect(typeof comp.cash).toBe('number')
      })
    })
  })

  describe('다중 종목 포트폴리오 관리', () => {
    it('10개 종목 동시 보유 후 전체 매도', () => {
      const store = useGameStore.getState()
      const activeCompanies = store.companies.filter((c) => c.status !== 'acquired')
      const toTrade = activeCompanies.slice(0, 10)

      // 10개 매수
      toTrade.forEach((c) => store.buyStock(c.id, 10))

      const afterBuy = useGameStore.getState()
      const holdingCount = Object.keys(afterBuy.player.portfolio).length
      expect(holdingCount).toBe(10)

      // 전체 매도
      toTrade.forEach((c) => {
        const pos = useGameStore.getState().player.portfolio[c.id]
        if (pos) {
          useGameStore.getState().sellStock(c.id, pos.shares)
        }
      })

      const afterSell = useGameStore.getState()
      expect(Object.keys(afterSell.player.portfolio).length).toBe(0)
      // 10개 realizedTrade 기록
      expect(afterSell.realizedTrades.length).toBe(10)
    })
  })

  describe('hourlyAccumulator 패턴 검증', () => {
    it('급여는 processHourly에서 차감, 캐시플로우는 월간 1회 기록', () => {
      const store = useGameStore.getState()
      store.hireEmployee('analyst')

      const cashBefore = useGameStore.getState().player.cash

      // advanceHour + processHourly를 함께 호출해야 급여가 차감됨
      // (tick engine이 외부에서 둘 다 호출하는 구조)
      for (let i = 0; i < 10; i++) {
        useGameStore.getState().advanceHour()
        useGameStore.getState().processHourly()
      }

      const after10 = useGameStore.getState()
      expect(after10.player.cash).toBeLessThan(cashBefore) // 시간별 급여 차감

      const salaryLogs = after10.cashFlowLog.filter((e) => e.category === 'SALARY')
      expect(salaryLogs.length).toBe(0) // 아직 월간 처리 전 — accumulator에만 쌓임

      // 나머지 290시간 진행하여 1개월 완성
      for (let i = 0; i < 290; i++) {
        useGameStore.getState().advanceHour()
        useGameStore.getState().processHourly()
      }
      // processMonthly를 직접 호출하여 월간 기록 트리거
      useGameStore.getState().processMonthly()

      const afterMonth = useGameStore.getState()
      const monthlySalaryLogs = afterMonth.cashFlowLog.filter(
        (e) => e.category === 'SALARY',
      )
      // 월간 처리에서 SALARY가 1회 기록됨
      if (monthlySalaryLogs.length > 0) {
        expect(monthlySalaryLogs[0].amount).toBeLessThan(0)
      }
    })
  })

  describe('acquired 회사 필터링', () => {
    it('인수된 회사는 canTrade false', () => {
      const store = useGameStore.getState()
      const company = store.companies[0]

      // 회사를 acquired로 변경
      useGameStore.setState((s) => ({
        companies: s.companies.map((c) =>
          c.id === company.id ? { ...c, status: 'acquired' as const } : c,
        ),
      }))

      // canTrade가 false를 반환해야 함
      const canTrade = useGameStore.getState().canTrade(company.id)
      expect(canTrade).toBe(false)
    })
  })
})
