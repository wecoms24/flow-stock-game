/**
 * Skill Path Engine
 *
 * 경로 선택, 보너스 계산, 스킬 해제 검증
 */

import type { EmployeeSkillPathState, SkillBonusEffect } from '../types/skillPath'
import { SKILL_PATHS, RESPEC_CONFIG } from '../data/skillPaths'

/** 직원 레벨 기반으로 해금된 보너스 효과 목록 반환 */
export function calculateBonuses(
  state: EmployeeSkillPathState,
  employeeLevel: number,
): SkillBonusEffect[] {
  if (!state.selectedPath) return []

  const path = SKILL_PATHS[state.selectedPath]
  if (!path) return []

  return path.bonuses
    .filter((b) => employeeLevel >= b.level)
    .map((b) => b.effect)
}

/** 스킬 경로 선택 가능 여부 (레벨 5 이상, 아직 미선택) */
export function canSelectPath(
  state: EmployeeSkillPathState | undefined,
  employeeLevel: number,
): boolean {
  if (employeeLevel < 5) return false
  if (state?.selectedPath) return false // 이미 선택함
  return true
}

/** 현재 경로의 해금 가능한 다음 보너스 정보 */
export function getNextBonus(
  state: EmployeeSkillPathState,
  employeeLevel: number,
): { level: number; name: string; description: string } | null {
  if (!state.selectedPath) return null

  const path = SKILL_PATHS[state.selectedPath]
  if (!path) return null

  const nextBonus = path.bonuses.find((b) => employeeLevel < b.level)
  return nextBonus
    ? { level: nextBonus.level, name: nextBonus.name, description: nextBonus.description }
    : null
}

/** 레벨업 시 보너스 해금 체크 및 state 업데이트 */
export function checkBonusUnlocks(
  state: EmployeeSkillPathState,
  employeeLevel: number,
): EmployeeSkillPathState {
  if (!state.selectedPath) return state

  const path = SKILL_PATHS[state.selectedPath]
  if (!path) return state

  const newUnlocked = path.bonuses
    .filter((b) => employeeLevel >= b.level)
    .map((b) => b.level)

  if (newUnlocked.length === state.unlockedBonuses.length) return state

  return {
    ...state,
    pathLevel: newUnlocked.length,
    unlockedBonuses: newUnlocked,
  }
}

/** ✨ Phase 10: 리스펙 비용 계산 */
export function calculateRespecCost(employeeLevel: number): number {
  return RESPEC_CONFIG.BASE_COST + employeeLevel * RESPEC_CONFIG.PER_LEVEL_COST
}

/** ✨ Phase 10: 리스펙 가능 여부 체크 */
export function canRespec(
  state: EmployeeSkillPathState | undefined,
  employeeLevel: number,
  cash: number,
  lastRespecMonth?: number,
  currentMonth?: number,
): { allowed: boolean; reason?: string; cost: number } {
  const cost = calculateRespecCost(employeeLevel)

  if (!state?.selectedPath) {
    return { allowed: false, reason: 'no_path_selected', cost }
  }
  if (cash < cost) {
    return { allowed: false, reason: 'insufficient_funds', cost }
  }
  if (lastRespecMonth != null && currentMonth != null) {
    if (currentMonth - lastRespecMonth < RESPEC_CONFIG.COOLDOWN_MONTHS) {
      return { allowed: false, reason: 'cooldown_active', cost }
    }
  }
  return { allowed: true, cost }
}

/** ✨ Phase 10: 리스펙 실행 — 경로 초기화 */
export function executeRespec(): EmployeeSkillPathState {
  return {
    selectedPath: null,
    pathLevel: 0,
    unlockedBonuses: [],
  }
}
