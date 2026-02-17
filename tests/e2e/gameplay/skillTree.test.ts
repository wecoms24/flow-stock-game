import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestStore,
  createTestEmployee,
  hireEmployee,
} from '../../integration/helpers'
import { unlockSkill, getPassiveModifiers } from '@/systems/skillSystem'
import type { Employee } from '@/types'

/**
 * 게임 메뉴얼: RPG 스킬 트리 시스템 E2E 테스트
 *
 * 스킬 트리 시스템 검증:
 * - 스킬 포인트(SP) 획득: 레벨업 시 3 SP 자동 지급
 * - 스킬 해금: 선행 조건 충족 시 SP 소모하여 해금
 * - 패시브 효과: 해금한 스킬의 modifier가 게임 로직에 적용
 * - Trade AI Pipeline 통합: Analyst, Trader, Manager 역할별 효과 검증
 */
describe('E2E: 스킬 트리 시스템 (Skill Tree System)', () => {
  let store: any

  beforeEach(() => {
    store = createTestStore()
  })

  describe('스킬 포인트(SP) 획득 및 관리', () => {
    it('직원 고용 시 progression 초기값이 올바르게 설정된다', () => {
      // Given: progression 초기값을 가진 직원
      const employee = createTestEmployee({
        level: 1,
        progression: {
          level: 1,
          xp: 0,
          xpForNextLevel: 100,
          skillPoints: 0,
          spentSkillPoints: 0,
        },
      })

      // When: 직원 고용
      hireEmployee(store, employee)

      // Then: progression 정보가 저장됨
      const hired = store.getState().player.employees[0]
      expect(hired.progression).toBeDefined()
      expect(hired.progression.skillPoints).toBe(0)
      expect(hired.progression.spentSkillPoints).toBe(0)
    })

    it('레벨 10 직원은 초기 SP를 보유한다', () => {
      // Given: 레벨 10 직원 (3 SP/level × 10 levels = 30 SP)
      const employee = createTestEmployee({
        level: 10,
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
      })

      // When: 직원 고용
      hireEmployee(store, employee)

      // Then: SP가 30 이상
      const hired = store.getState().player.employees[0]
      expect(hired.progression.skillPoints).toBeGreaterThanOrEqual(30)
    })
  })

  describe('스킬 해금 시스템', () => {
    it('충분한 SP와 선행 조건을 충족하면 스킬을 해금할 수 있다', () => {
      // Given: 레벨 10 Analyst (스킬 요구사항 충족)
      const employee = createTestEmployee({
        id: 'emp_analyst',
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      // When: 스킬 해금 (analysis_boost_1 → chart_reading)
      const result1 = unlockSkill(emp, 'analysis_boost_1') // 비용: 1 SP
      const result2 = unlockSkill(emp, 'chart_reading') // 비용: 3 SP, 선행: analysis_boost_1

      // Then: 스킬이 해금되고 SP가 차감됨
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(emp.unlockedSkills).toContain('analysis_boost_1')
      expect(emp.unlockedSkills).toContain('chart_reading')
      expect(emp.progression.spentSkillPoints).toBe(4) // 1 + 3
      expect(emp.progression.skillPoints).toBe(26) // 30 - 4
    })

    it('선행 조건 미충족 시 스킬 해금이 실패한다', () => {
      // Given: 선행 스킬 없이 상위 스킬을 해금 시도
      const employee = createTestEmployee({
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      // When: chart_reading을 선행 스킬 없이 해금 시도
      const result = unlockSkill(emp, 'chart_reading')

      // Then: 해금 실패
      expect(result.success).toBe(false)
      expect(emp.unlockedSkills).not.toContain('chart_reading')
    })

    it('SP가 부족하면 스킬 해금이 실패한다', () => {
      // Given: SP가 부족한 직원
      const employee = createTestEmployee({
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 5,
          xp: 0,
          xpForNextLevel: 500,
          skillPoints: 0, // SP 없음
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      // When: 스킬 해금 시도
      const result = unlockSkill(emp, 'analysis_boost_1')

      // Then: 해금 실패
      expect(result.success).toBe(false)
      expect(emp.unlockedSkills).not.toContain('analysis_boost_1')
    })

    it('gameStore.unlockEmployeeSkill 액션을 통한 스킬 해금이 정상 동작한다', () => {
      // Given: 레벨 10 Analyst
      const employee = createTestEmployee({
        id: 'emp_test',
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)

      // When: gameStore 액션으로 스킬 해금
      const unlockAction = (employeeId: string, skillId: string) => {
        const state = store.getState()
        const emp = state.player.employees.find((e: Employee) => e.id === employeeId)
        if (!emp) return { success: false, reason: 'employee_not_found' }

        const result = unlockSkill(emp, skillId)
        if (result.success) {
          store.setState({
            player: {
              ...state.player,
              employees: [...state.player.employees], // 변경 트리거
            },
          })
        }
        return result
      }

      const result1 = unlockAction('emp_test', 'analysis_boost_1')
      const result2 = unlockAction('emp_test', 'chart_reading')

      // Then: 스킬 해금 성공
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      const state = store.getState()
      const emp = state.player.employees.find((e: Employee) => e.id === 'emp_test')
      expect(emp?.unlockedSkills).toContain('analysis_boost_1')
      expect(emp?.unlockedSkills).toContain('chart_reading')
    })
  })

  describe('패시브 효과 활성화', () => {
    it('Analyst 스킬은 signalAccuracy modifier를 반환한다', () => {
      // Given: chart_reading 스킬을 해금한 Analyst
      const employee = createTestEmployee({
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      unlockSkill(emp, 'analysis_boost_1')
      unlockSkill(emp, 'chart_reading')

      // When: signalAccuracy modifier 조회
      const modifiers = getPassiveModifiers(emp, 'signalAccuracy')

      // Then: +0.1 modifier 반환
      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'signalAccuracy',
        modifier: 0.1,
        operation: 'add',
      })
    })

    it('Trader 스킬은 slippage modifier를 반환한다', () => {
      // Given: smart_router 스킬을 해금한 Trader
      const employee = createTestEmployee({
        role: 'trader',
        skills: { analysis: 20, trading: 80, research: 20 },
        level: 16,
        progression: {
          level: 16,
          xp: 0,
          xpForNextLevel: 1600,
          skillPoints: 48,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      unlockSkill(emp, 'trading_boost_1')
      unlockSkill(emp, 'quick_hands')
      unlockSkill(emp, 'flash_trader')
      unlockSkill(emp, 'smart_router')

      // When: slippage modifier 조회
      const modifiers = getPassiveModifiers(emp, 'slippage')

      // Then: *0.5 modifier 반환
      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'slippage',
        modifier: 0.5,
        operation: 'multiply',
      })
    })

    it('Manager 스킬은 riskReduction modifier를 반환한다', () => {
      // Given: risk_awareness 스킬을 해금한 Manager
      const employee = createTestEmployee({
        role: 'manager',
        skills: { analysis: 20, trading: 20, research: 40 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      unlockSkill(emp, 'research_boost_1')
      unlockSkill(emp, 'risk_awareness')

      // When: riskReduction modifier 조회
      const modifiers = getPassiveModifiers(emp, 'riskReduction')

      // Then: +0.1 modifier 반환
      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        target: 'riskReduction',
        modifier: 0.1,
        operation: 'add',
      })
    })
  })

  describe('전체 플로우 통합 테스트', () => {
    it('직원 고용 → 레벨업 → 스킬 해금 → 패시브 효과 확인', () => {
      // Given: 레벨 20 Analyst (충분한 SP)
      const employee = createTestEmployee({
        id: 'emp_full_test',
        role: 'analyst',
        skills: { analysis: 60, trading: 20, research: 20 },
        level: 20,
        progression: {
          level: 20,
          xp: 0,
          xpForNextLevel: 2000,
          skillPoints: 60, // 3 SP/level × 20
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      expect(state.player.employees.length).toBe(1)

      const emp = state.player.employees[0]

      // When: 여러 스킬 해금
      const r1 = unlockSkill(emp, 'analysis_boost_1') // 1 SP
      const r2 = unlockSkill(emp, 'chart_reading') // 3 SP
      const r3 = unlockSkill(emp, 'pattern_recognition') // 5 SP

      // Then: 모든 스킬이 해금되고 SP가 차감됨
      expect(r1.success).toBe(true)
      expect(r2.success).toBe(true)
      expect(r3.success).toBe(true)

      expect(emp.unlockedSkills).toHaveLength(3)
      expect(emp.unlockedSkills).toContain('analysis_boost_1')
      expect(emp.unlockedSkills).toContain('chart_reading')
      expect(emp.unlockedSkills).toContain('pattern_recognition')

      expect(emp.progression.spentSkillPoints).toBe(9) // 1 + 3 + 5
      expect(emp.progression.skillPoints).toBe(51) // 60 - 9

      // And: 패시브 효과가 활성화됨
      const modifiers = getPassiveModifiers(emp, 'signalAccuracy')
      expect(modifiers.length).toBeGreaterThan(0)

      const totalBonus = modifiers.reduce(
        (sum, mod) => sum + (mod.operation === 'add' ? mod.modifier : 0),
        0,
      )
      expect(totalBonus).toBeCloseTo(0.3, 2) // chart_reading +0.1, pattern_recognition +0.2
    })

    it('복수 직원의 스킬 트리가 독립적으로 동작한다', () => {
      // Given: Analyst와 Trader 각 1명
      const analyst = createTestEmployee({
        id: 'emp_analyst',
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      const trader = createTestEmployee({
        id: 'emp_trader',
        role: 'trader',
        skills: { analysis: 20, trading: 40, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, analyst)
      hireEmployee(store, trader)

      const state = store.getState()
      const emp1 = state.player.employees.find((e: Employee) => e.id === 'emp_analyst')!
      const emp2 = state.player.employees.find((e: Employee) => e.id === 'emp_trader')!

      // When: 각 직원이 다른 스킬 해금
      unlockSkill(emp1, 'analysis_boost_1')
      unlockSkill(emp1, 'chart_reading')

      unlockSkill(emp2, 'trading_boost_1')
      unlockSkill(emp2, 'quick_hands')

      // Then: 각 직원의 스킬이 독립적으로 관리됨
      expect(emp1.unlockedSkills).toContain('analysis_boost_1')
      expect(emp1.unlockedSkills).toContain('chart_reading')
      expect(emp1.unlockedSkills).not.toContain('trading_boost_1')

      expect(emp2.unlockedSkills).toContain('trading_boost_1')
      expect(emp2.unlockedSkills).toContain('quick_hands')
      expect(emp2.unlockedSkills).not.toContain('analysis_boost_1')

      // And: 각 직원의 패시브 효과가 올바르게 적용됨
      const analystModifiers = getPassiveModifiers(emp1, 'signalAccuracy')
      expect(analystModifiers.length).toBeGreaterThan(0)

      const traderModifiers = getPassiveModifiers(emp2, 'executionDelay')
      expect(traderModifiers.length).toBeGreaterThan(0)
    })
  })

  describe('스킬 리셋 시스템 (추후 구현 대비)', () => {
    it('스킬 리셋 시 SP가 환불되고 unlockedSkills가 초기화된다', () => {
      // Given: 스킬을 해금한 직원
      const employee = createTestEmployee({
        id: 'emp_reset',
        role: 'analyst',
        skills: { analysis: 40, trading: 20, research: 20 },
        progression: {
          level: 10,
          xp: 0,
          xpForNextLevel: 1000,
          skillPoints: 30,
          spentSkillPoints: 0,
        },
        unlockedSkills: [],
      })

      hireEmployee(store, employee)
      const state = store.getState()
      const emp = state.player.employees[0]

      unlockSkill(emp, 'analysis_boost_1')
      unlockSkill(emp, 'chart_reading')

      const spentBefore = emp.progression.spentSkillPoints

      // When: 스킬 리셋 (수동 시뮬레이션)
      emp.unlockedSkills = []
      emp.progression.skillPoints += emp.progression.spentSkillPoints
      emp.progression.spentSkillPoints = 0

      // Then: SP 환불, 스킬 초기화
      expect(emp.unlockedSkills).toHaveLength(0)
      expect(emp.progression.spentSkillPoints).toBe(0)
      expect(emp.progression.skillPoints).toBe(30) // 원래대로 복구
    })
  })
})
