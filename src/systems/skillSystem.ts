import type { Employee, EmployeeSkills } from '../types/index'
import type { SkillNodeState, PassiveModifier } from '../types/skills'
import { SKILL_TREE } from '../data/skillTree'
import { SKILL_BALANCE, calculateSPForLevel } from '../config/skillBalance'

/**
 * 스킬 해금 조건 검증
 */
export function checkSkillRequirements(employee: Employee, skillId: string): boolean {
  const skill = SKILL_TREE[skillId]
  if (!skill) return false

  const prereqs = skill.prerequisites
  const progression = employee.progression

  // 레벨 조건
  if (prereqs.level && (progression?.level ?? 1) < prereqs.level) {
    return false
  }

  // 선행 스킬 조건
  if (prereqs.skills && prereqs.skills.length > 0) {
    const unlockedSkills = employee.unlockedSkills ?? []
    const hasAllPrereqs = prereqs.skills.every((reqSkillId) => unlockedSkills.includes(reqSkillId))
    if (!hasAllPrereqs) return false
  }

  // 스탯 조건
  if (prereqs.stats) {
    const currentStats = calculateEmployeeStats(employee)
    if (prereqs.stats.analysis && currentStats.analysis < prereqs.stats.analysis) return false
    if (prereqs.stats.trading && currentStats.trading < prereqs.stats.trading) return false
    if (prereqs.stats.research && currentStats.research < prereqs.stats.research) return false
  }

  return true
}

/**
 * 스킬 노드 상태 계산
 */
export function getSkillNodeState(employee: Employee, skillId: string): SkillNodeState {
  const skill = SKILL_TREE[skillId]
  if (!skill) return 'locked'

  const unlockedSkills = employee.unlockedSkills ?? []
  const progression = employee.progression

  // 이미 해금됨
  if (unlockedSkills.includes(skillId)) {
    return 'unlocked'
  }

  // 조건 미충족
  if (!checkSkillRequirements(employee, skillId)) {
    return 'locked'
  }

  // SP 부족
  if (!progression || progression.skillPoints < skill.cost) {
    return 'insufficient'
  }

  // 구매 가능
  return 'available'
}

/**
 * 스킬 해금 (SP 차감 + 상태 업데이트)
 */
export function unlockSkill(
  employee: Employee,
  skillId: string,
): { success: boolean; reason?: string } {
  // 1. 스킬 존재 여부 검증
  const skill = SKILL_TREE[skillId]
  if (!skill) {
    return { success: false, reason: `존재하지 않는 스킬입니다 (ID: ${skillId})` }
  }

  // 2. Progression 초기화 검증 (필수)
  if (!employee.progression) {
    return {
      success: false,
      reason: '직원의 progression 데이터가 초기화되지 않았습니다',
    }
  }

  // 3. 스킬 상태 검증
  const state = getSkillNodeState(employee, skillId)

  if (state === 'unlocked') {
    return { success: false, reason: '이미 해금된 스킬입니다' }
  }

  if (state === 'locked') {
    return {
      success: false,
      reason: '선행 조건을 충족하지 않았습니다 (레벨/스탯/선행 스킬 확인)',
    }
  }

  if (state === 'insufficient') {
    const needed = skill.cost
    const current = employee.progression.skillPoints
    return {
      success: false,
      reason: `SP가 부족합니다 (필요: ${needed} SP, 현재: ${current} SP)`,
    }
  }

  if (state !== 'available') {
    return { success: false, reason: '해금할 수 없는 상태입니다' }
  }

  // 4. SP 차감 (state === 'available' 확정)
  employee.progression.skillPoints -= skill.cost
  employee.progression.spentSkillPoints += skill.cost

  // 5. 스킬 해금
  if (!employee.unlockedSkills) {
    employee.unlockedSkills = []
  }
  employee.unlockedSkills.push(skillId)

  return { success: true }
}

/**
 * 직원의 최종 스탯 계산 (기본 + 해금된 스킬 효과)
 */
export function calculateEmployeeStats(employee: Employee): EmployeeSkills {
  // 기본 스탯
  const baseStats: EmployeeSkills = employee.skills ?? {
    analysis: 50,
    trading: 50,
    research: 50,
  }

  const finalStats = { ...baseStats }

  // 해금된 스킬 효과 적용
  const unlockedSkills = employee.unlockedSkills ?? []
  for (const skillId of unlockedSkills) {
    const skill = SKILL_TREE[skillId]
    if (!skill) continue

    // statBonus 효과
    if (skill.effect.type === 'statBonus') {
      const stat = skill.effect.stat
      finalStats[stat] += skill.effect.value
    }
  }

  // 최대값 제한 (0-100)
  finalStats.analysis = Math.max(0, Math.min(100, finalStats.analysis))
  finalStats.trading = Math.max(0, Math.min(100, finalStats.trading))
  finalStats.research = Math.max(0, Math.min(100, finalStats.research))

  return finalStats
}

/**
 * 패시브 효과 집계 (특정 target에 대한 modifier 합계)
 */
export function getPassiveModifiers(
  employee: Employee,
  target: PassiveModifier['target'],
): PassiveModifier[] {
  const modifiers: PassiveModifier[] = []
  const unlockedSkills = employee.unlockedSkills ?? []

  for (const skillId of unlockedSkills) {
    const skill = SKILL_TREE[skillId]
    if (!skill) continue

    if (skill.effect.type === 'passive') {
      const matchingEffects = skill.effect.effects.filter((effect) => effect.target === target)
      modifiers.push(...matchingEffects)
    } else if (skill.effect.type === 'specialization') {
      const matchingEffects = skill.effect.effects.filter((effect) => effect.target === target)
      modifiers.push(...matchingEffects)
    }
  }

  return modifiers
}

/**
 * 패시브 효과를 기본값에 적용
 */
export function applyPassiveModifiers(
  baseValue: number,
  modifiers: PassiveModifier[],
): number {
  let result = baseValue

  for (const modifier of modifiers) {
    if (!Number.isFinite(modifier.modifier)) continue
    if (modifier.operation === 'add') {
      result += modifier.modifier
    } else if (modifier.operation === 'multiply') {
      result *= modifier.modifier
    }
  }

  return Number.isFinite(result) ? result : baseValue
}

/**
 * 레벨업 시 SP 부여
 */
export function grantSkillPointsOnLevelUp(employee: Employee): void {
  if (!employee.progression) {
    // 최초 progression 생성
    employee.progression = {
      level: employee.level ?? 1,
      xp: employee.xp ?? 0,
      xpForNextLevel: employee.xpToNextLevel ?? 1000,
      skillPoints: 0,
      spentSkillPoints: 0,
    }
  }

  // 레벨당 SP 부여 (설정 파일에서 가져옴)
  const spGain = calculateSPForLevel(employee.level ?? 1)
  employee.progression.skillPoints += spGain
}

/**
 * 기존 직원 데이터 마이그레이션
 */
export function migrateEmployeeToSkillTree(employee: Employee): void {
  if (employee.progression) return // 이미 마이그레이션됨

  const level = employee.level ?? 1

  employee.progression = {
    level,
    xp: employee.xp ?? 0,
    xpForNextLevel: employee.xpToNextLevel ?? 1000,
    skillPoints: level * SKILL_BALANCE.SP_PER_LEVEL, // 기존 레벨에 비례한 SP 부여
    spentSkillPoints: 0,
  }

  employee.unlockedSkills = []
}

/**
 * 스킬 트리 초기화 (리셋 기능, 추후 구현 시 활용)
 */
export function resetSkillTree(employee: Employee): void {
  const spentPoints = employee.progression?.spentSkillPoints ?? 0

  if (employee.progression) {
    employee.progression.skillPoints += spentPoints
    employee.progression.spentSkillPoints = 0
  }

  employee.unlockedSkills = []
}

/**
 * 스킬 트리 검증 (순환 참조 체크)
 */
export function validateSkillTree(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [skillId, skill] of Object.entries(SKILL_TREE)) {
    // 선행 스킬 존재 확인
    if (skill.prerequisites.skills) {
      for (const prereqId of skill.prerequisites.skills) {
        if (!SKILL_TREE[prereqId]) {
          errors.push(`${skillId}: 존재하지 않는 선행 스킬 ${prereqId}`)
        }
      }
    }

    // 자식 스킬 존재 확인
    for (const childId of skill.children) {
      if (!SKILL_TREE[childId]) {
        errors.push(`${skillId}: 존재하지 않는 자식 스킬 ${childId}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
