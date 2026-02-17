import type { Employee } from '../types'
import type { SkillEffect, SkillPrerequisites, PassiveModifier } from '../types/skills'
import { SKILL_TREE } from '../data/skillTree'
import { calculateEmployeeStats, getPassiveModifiers } from '../systems/skillSystem'

/**
 * 패시브 효과 target 한글 레이블
 */
const TARGET_LABELS: Record<PassiveModifier['target'], string> = {
  signalAccuracy: '신호 정확도',
  executionDelay: '실행 지연',
  slippage: '슬리피지',
  commission: '수수료',
  riskReduction: '리스크 감소',
  positionSize: '포지션 크기',
}

/**
 * 스탯 한글 레이블
 */
const STAT_LABELS: Record<'analysis' | 'trading' | 'research', string> = {
  analysis: '분석력',
  trading: '거래 능력',
  research: '리서치 능력',
}

/**
 * 선행 조건 체크 항목
 */
export interface PrerequisiteCheckItem {
  label: string
  satisfied: boolean
  type: 'level' | 'skill' | 'stat'
  currentValue?: string // 현재값 표시용 (미충족 시)
}

/**
 * 선행 조건 체크 결과
 */
export interface PrerequisiteCheckResult {
  items: PrerequisiteCheckItem[]
  allSatisfied: boolean
}

/**
 * 스킬 효과를 읽기 쉬운 텍스트 배열로 변환
 */
export function formatSkillEffect(effect: SkillEffect): string[] {
  if (effect.type === 'statBonus') {
    // 스탯 보너스
    const statLabel = STAT_LABELS[effect.stat]
    return [`${statLabel} +${effect.value}`]
  }

  if (effect.type === 'passive') {
    // 패시브 효과
    return effect.effects.map((modifier) => formatPassiveModifier(modifier))
  }

  if (effect.type === 'specialization') {
    // 특화 효과
    const baseEffects = effect.effects.map((modifier) => formatPassiveModifier(modifier))
    return [`특화: ${effect.specializationId}`, ...baseEffects]
  }

  return []
}

/**
 * PassiveModifier를 읽기 쉬운 텍스트로 변환
 */
function formatPassiveModifier(modifier: PassiveModifier): string {
  const label = TARGET_LABELS[modifier.target]

  if (modifier.operation === 'add') {
    // 절대값 추가 (퍼센트로 표시)
    const percent = (modifier.modifier * 100).toFixed(0)
    return `${label} ${modifier.modifier >= 0 ? '+' : ''}${percent}%`
  }

  if (modifier.operation === 'multiply') {
    // 배율 적용
    const percent = (modifier.modifier * 100).toFixed(0)
    const change = modifier.modifier < 1 ? '감소' : '증가'
    return `${label} ×${modifier.modifier} (${percent}% ${change})`
  }

  return `${label} ${modifier.modifier}`
}

/**
 * 선행 조건을 체크리스트로 변환
 */
export function formatPrerequisites(
  prerequisites: SkillPrerequisites,
  employee: Employee,
): PrerequisiteCheckResult {
  const items: PrerequisiteCheckItem[] = []

  // 레벨 조건
  if (prerequisites.level) {
    const currentLevel = employee.level ?? 1
    const satisfied = currentLevel >= prerequisites.level
    items.push({
      label: `레벨 ${prerequisites.level} 이상`,
      satisfied,
      type: 'level',
      currentValue: satisfied ? undefined : `현재: ${currentLevel}`,
    })
  }

  // 선행 스킬 조건
  if (prerequisites.skills && prerequisites.skills.length > 0) {
    const unlockedSkills = employee.unlockedSkills ?? []
    for (const skillId of prerequisites.skills) {
      const skill = SKILL_TREE[skillId]
      const satisfied = unlockedSkills.includes(skillId)
      items.push({
        label: skill ? skill.name : skillId,
        satisfied,
        type: 'skill',
      })
    }
  }

  // 스탯 조건
  if (prerequisites.stats) {
    const currentStats = calculateEmployeeStats(employee)
    const statKeys = ['analysis', 'trading', 'research'] as const

    for (const statKey of statKeys) {
      const requiredValue = prerequisites.stats[statKey]
      if (requiredValue !== undefined) {
        const currentValue = currentStats[statKey]
        const satisfied = currentValue >= requiredValue
        items.push({
          label: `${STAT_LABELS[statKey]} ${requiredValue} 이상`,
          satisfied,
          type: 'stat',
          currentValue: satisfied ? undefined : `현재: ${Math.round(currentValue)}`,
        })
      }
    }
  }

  return {
    items,
    allSatisfied: items.every((item) => item.satisfied),
  }
}

/**
 * 직원의 활성 패시브 효과를 포맷팅
 */
export function formatActiveEffects(employee: Employee): Array<{ label: string; effects: string[] }> {
  const targets: PassiveModifier['target'][] = [
    'signalAccuracy',
    'executionDelay',
    'slippage',
    'commission',
    'riskReduction',
    'positionSize',
  ]

  const activeEffects: Array<{ label: string; effects: string[] }> = []

  for (const target of targets) {
    const modifiers = getPassiveModifiers(employee, target)
    if (modifiers.length === 0) continue

    const effectTexts: string[] = []
    for (const modifier of modifiers) {
      const effectText = formatPassiveModifier(modifier)
      effectTexts.push(effectText)
    }

    activeEffects.push({
      label: TARGET_LABELS[target],
      effects: effectTexts,
    })
  }

  return activeEffects
}
