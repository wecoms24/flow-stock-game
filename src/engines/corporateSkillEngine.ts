/**
 * Corporate Skill Engine
 *
 * 회사 지식자산 관리 순수 함수 모듈
 * - 스킬 해금 검증 및 실행
 * - 전사 효과 집계 (글로벌 + 조건부)
 * - 매매 파이프라인 파라미터에 적용
 */

import type { CorporateSkill } from '../types/corporateSkill'
import { arePrerequisitesMet } from '../data/corporateSkills'

/** 해금된 모든 Corporate Skill의 global 효과를 합산 */
export interface AggregatedCorporateEffects {
  signalAccuracyBonus: number
  slippageReduction: number
  commissionDiscount: number
  maxPendingProposals: number
  riskReductionBonus: number
  // conditional
  stopLossThreshold: number | null
  takeProfitThreshold: number | null
  trailingStopPercent: number | null
  maxSinglePositionPercent: number | null
}

const EMPTY_EFFECTS: AggregatedCorporateEffects = {
  signalAccuracyBonus: 0,
  slippageReduction: 0,
  commissionDiscount: 0,
  maxPendingProposals: 0,
  riskReductionBonus: 0,
  stopLossThreshold: null,
  takeProfitThreshold: null,
  trailingStopPercent: null,
  maxSinglePositionPercent: null,
}

/**
 * 스킬 해금 가능 여부 검증
 *
 * @returns 성공 시 { canUnlock: true }, 실패 시 { canUnlock: false, reason }
 */
export function validateUnlock(
  skillId: string,
  skills: Record<string, CorporateSkill>,
  availableCash: number,
): { canUnlock: boolean; reason?: string } {
  const skill = skills[skillId]
  if (!skill) return { canUnlock: false, reason: '존재하지 않는 스킬입니다.' }
  if (skill.unlocked) return { canUnlock: false, reason: '이미 해금된 스킬입니다.' }
  if (availableCash < skill.cost) {
    return { canUnlock: false, reason: `자금 부족 (필요: ${skill.cost.toLocaleString()}원)` }
  }
  if (!arePrerequisitesMet(skillId, skills)) {
    return { canUnlock: false, reason: '선행 스킬이 아직 해금되지 않았습니다.' }
  }
  return { canUnlock: true }
}

/**
 * 스킬 해금 실행 (immutable - 새 skills 맵 반환)
 */
export function unlockCorporateSkill(
  skillId: string,
  skills: Record<string, CorporateSkill>,
  currentTick: number,
): Record<string, CorporateSkill> {
  const skill = skills[skillId]
  if (!skill) return skills

  return {
    ...skills,
    [skillId]: {
      ...skill,
      unlocked: true,
      unlockedAt: currentTick,
    },
  }
}

/**
 * 해금된 모든 Corporate Skill 효과를 집계
 *
 * global 효과: 단순 합산 (signalAccuracy, slippage, commission 등)
 * conditional 효과: 가장 강한 값 적용 (stopLoss는 가장 큰 음수 = 좁은 범위)
 */
export function aggregateCorporateEffects(
  skills: Record<string, CorporateSkill>,
): AggregatedCorporateEffects {
  const result = { ...EMPTY_EFFECTS }

  for (const skill of Object.values(skills)) {
    if (!skill.unlocked) continue

    const { global, conditional } = skill.effects

    // Global 효과: 합산
    if (global) {
      result.signalAccuracyBonus += global.signalAccuracyBonus ?? 0
      result.slippageReduction += global.slippageReduction ?? 0
      result.commissionDiscount += global.commissionDiscount ?? 0
      result.maxPendingProposals += global.maxPendingProposals ?? 0
      result.riskReductionBonus += global.riskReductionBonus ?? 0
    }

    // Conditional 효과: 가장 강한 값 적용
    if (conditional) {
      if (conditional.stopLossThreshold != null) {
        // 더 좁은(공격적) 손절: -0.03(-3%)이 -0.05(-5%)보다 빨리 트리거됨 (덜 부정적 = 더 강함)
        if (result.stopLossThreshold == null || conditional.stopLossThreshold > result.stopLossThreshold) {
          result.stopLossThreshold = conditional.stopLossThreshold
        }
      }
      if (conditional.takeProfitThreshold != null) {
        // 더 높은 익절 목표가 "강한 값" (예: +15%가 +10%보다 강함)
        if (result.takeProfitThreshold == null || conditional.takeProfitThreshold > result.takeProfitThreshold) {
          result.takeProfitThreshold = conditional.takeProfitThreshold
        }
      }
      if (conditional.trailingStopPercent != null) {
        // 더 좁은 트레일링 스톱
        if (result.trailingStopPercent == null || conditional.trailingStopPercent < result.trailingStopPercent) {
          result.trailingStopPercent = conditional.trailingStopPercent
        }
      }
      if (conditional.maxSinglePositionPercent != null) {
        // 더 엄격한 비중 제한
        if (result.maxSinglePositionPercent == null || conditional.maxSinglePositionPercent < result.maxSinglePositionPercent) {
          result.maxSinglePositionPercent = conditional.maxSinglePositionPercent
        }
      }
    }
  }

  // 상한선 적용
  result.slippageReduction = Math.min(result.slippageReduction, 0.8) // 최대 80% 감소
  result.commissionDiscount = Math.min(result.commissionDiscount, 0.5) // 최대 50% 감소
  result.signalAccuracyBonus = Math.min(result.signalAccuracyBonus, 0.5) // 최대 50% 보너스

  return result
}

/**
 * 해금된 Corporate Skill에서 teachable passive ID 목록 추출
 * (교육 프로그램에서 직원에게 전파 가능한 패시브)
 */
export function getTeachablePassiveIds(skills: Record<string, CorporateSkill>): string[] {
  const ids: string[] = []
  for (const skill of Object.values(skills)) {
    if (skill.unlocked && skill.effects.teachablePassiveId) {
      ids.push(skill.effects.teachablePassiveId)
    }
  }
  return ids
}

/**
 * 해금 통계 계산
 */
export function calculateUnlockStats(skills: Record<string, CorporateSkill>): {
  totalUnlocked: number
  totalSpent: number
  tierCounts: Record<number, number>
} {
  let totalUnlocked = 0
  let totalSpent = 0
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }

  for (const skill of Object.values(skills)) {
    if (skill.unlocked) {
      totalUnlocked++
      totalSpent += skill.cost
      tierCounts[skill.tier] = (tierCounts[skill.tier] ?? 0) + 1
    }
  }

  return { totalUnlocked, totalSpent, tierCounts }
}
