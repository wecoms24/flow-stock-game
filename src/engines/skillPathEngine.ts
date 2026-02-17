/**
 * Skill Path Engine
 *
 * 경로 선택, 보너스 계산, 스킬 해제 검증
 */

import type { EmployeeSkillPathState, SkillBonusEffect } from '../types/skillPath'
import { SKILL_PATHS } from '../data/skillPaths'

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
