import type { EmployeeSkills } from '../types'
import type { SkillBadge } from '../types/skills'
import { SKILL_BADGES_CATALOG, SKILL_CATEGORY_BADGES, skillToBadgeLevel } from '../data/skillBadges'

/**
 * 직원의 스킬 수치(0-100)를 기반으로 뱃지 목록 생성
 *
 * 로직:
 * 1. 각 스킬 카테고리(trading, analysis, research)별로
 * 2. 스킬 수치가 threshold 이상인 뱃지 선택
 * 3. 가장 높은 뱃지만 부여 (중복 방지)
 *
 * @example
 * skills = { analysis: 85, trading: 70, research: 55 }
 * → badges = [fibonacci_wizard, smart_router, risk_manager]
 */
export function generateBadgesFromSkills(skills: EmployeeSkills): SkillBadge[] {
  const badges: SkillBadge[] = []

  // Trading 스킬 기반 뱃지
  const tradingCandidates = SKILL_CATEGORY_BADGES.trading.filter(
    (entry) => skills.trading >= entry.threshold
  )
  if (tradingCandidates.length > 0) {
    const bestTradingBadgeId = tradingCandidates[0].badgeId // 가장 높은 threshold
    const badgeTemplate = SKILL_BADGES_CATALOG[bestTradingBadgeId]
    if (badgeTemplate) {
      badges.push({
        ...badgeTemplate,
        level: skillToBadgeLevel(skills.trading),
      })
    }
  }

  // Analysis 스킬 기반 뱃지
  const analysisCandidates = SKILL_CATEGORY_BADGES.analysis.filter(
    (entry) => skills.analysis >= entry.threshold
  )
  if (analysisCandidates.length > 0) {
    const bestAnalysisBadgeId = analysisCandidates[0].badgeId
    const badgeTemplate = SKILL_BADGES_CATALOG[bestAnalysisBadgeId]
    if (badgeTemplate) {
      badges.push({
        ...badgeTemplate,
        level: skillToBadgeLevel(skills.analysis),
      })
    }
  }

  // Research 스킬 기반 뱃지
  const researchCandidates = SKILL_CATEGORY_BADGES.research.filter(
    (entry) => skills.research >= entry.threshold
  )
  if (researchCandidates.length > 0) {
    const bestResearchBadgeId = researchCandidates[0].badgeId
    const badgeTemplate = SKILL_BADGES_CATALOG[bestResearchBadgeId]
    if (badgeTemplate) {
      badges.push({
        ...badgeTemplate,
        level: skillToBadgeLevel(skills.research),
      })
    }
  }

  return badges
}

/**
 * 직원이 특정 뱃지를 보유하고 있는지 확인
 */
export function hasBadge(
  badges: SkillBadge[] | undefined,
  badgeId: string
): boolean {
  if (!badges) return false
  return badges.some((badge) => badge.id === badgeId)
}

/**
 * 뱃지의 기술 효과 집계
 * (여러 뱃지의 효과를 합산)
 */
export function aggregateBadgeEffects(badges: SkillBadge[] | undefined): {
  signalAccuracy: number
  executionSpeedBonus: number
  slippageReduction: number
  riskReduction: number
  positionSizeMultiplier: number
} {
  if (!badges || badges.length === 0) {
    return {
      signalAccuracy: 0,
      executionSpeedBonus: 0,
      slippageReduction: 0,
      riskReduction: 0,
      positionSizeMultiplier: 1.0,
    }
  }

  let signalAccuracy = 0
  let executionSpeedBonus = 0
  let slippageReduction = 0
  let riskReduction = 0
  let positionSizeMultiplier = 1.0

  for (const badge of badges) {
    if (badge._technical) {
      signalAccuracy += badge._technical.signalAccuracy ?? 0
      executionSpeedBonus += badge._technical.executionSpeedBonus ?? 0
      slippageReduction += badge._technical.slippageReduction ?? 0
      riskReduction += badge._technical.riskReduction ?? 0
      if (badge._technical.positionSizeMultiplier) {
        positionSizeMultiplier *= badge._technical.positionSizeMultiplier
      }
    }
  }

  // 최대 상한 적용 (밸런스)
  signalAccuracy = Math.min(signalAccuracy, 1.0) // 최대 100% 향상
  executionSpeedBonus = Math.min(executionSpeedBonus, 1.0)
  slippageReduction = Math.min(slippageReduction, 1.0)
  riskReduction = Math.min(riskReduction, 0.8) // 최대 80% 리스크 감소
  positionSizeMultiplier = Math.min(positionSizeMultiplier, 3.0) // 최대 3배

  return {
    signalAccuracy,
    executionSpeedBonus,
    slippageReduction,
    riskReduction,
    positionSizeMultiplier,
  }
}
