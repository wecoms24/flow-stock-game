import type { EmployeeSkills, EmployeeTrait } from '../types'
import type { SkillBadge } from '../types/skills'
import { SKILL_BADGES_CATALOG, SKILL_CATEGORY_BADGES, skillToBadgeLevel, findBadgeSynergies } from '../data/skillBadges'

/** 카테고리당 최대 부여 뱃지 수 */
const MAX_BADGES_PER_CATEGORY = 3

/**
 * ✨ Phase 7: 시드 기반 해시 (결정론적이지만 직원마다 다름)
 */
function seedHash(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Trait 기반 뱃지 가중치 보정
 */
const TRAIT_BADGE_WEIGHTS: Partial<Record<EmployeeTrait, Record<string, number>>> = {
  sensitive: { sentiment_analyst: 2.0, volatility_researcher: 1.5 },
  tech_savvy: { smart_router: 2.0, flash_trader: 1.5 },
  contrarian_mind: { contrarian: 2.5, risk_manager: 1.5 },
  perfectionist: { chart_master: 1.5, fibonacci_wizard: 1.5 },
  gambler: { kelly_criterion_expert: 2.0, momentum_trader: 1.5 },
  risk_averse: { risk_manager: 2.0, diversification_pro: 1.5 },
  ambitious: { arbitrage_master: 1.5, market_maker: 1.5 },
}

/**
 * 직원의 스킬 수치(0-100)를 기반으로 뱃지 목록 생성
 *
 * ✨ Phase 7: 랜덤화
 * - 1위 뱃지: 항상 최고 threshold (보장)
 * - 2~3위: 자격 뱃지 풀에서 시드 기반 가중치 랜덤 선택
 * - trait가 가중치에 영향
 */
export function generateBadgesFromSkills(
  skills: EmployeeSkills,
  employeeId?: string,
  traits?: EmployeeTrait[],
): SkillBadge[] {
  const badges: SkillBadge[] = []
  const seed = employeeId ?? 'default'

  const categories: Array<{ key: 'trading' | 'analysis' | 'research'; skill: number }> = [
    { key: 'trading', skill: skills.trading },
    { key: 'analysis', skill: skills.analysis },
    { key: 'research', skill: skills.research },
  ]

  for (const { key, skill } of categories) {
    const candidates = SKILL_CATEGORY_BADGES[key].filter(
      (entry) => skill >= entry.threshold,
    )

    if (candidates.length === 0) continue

    // 1위: 항상 최고 threshold (보장)
    const topBadge = SKILL_BADGES_CATALOG[candidates[0].badgeId]
    if (topBadge) {
      badges.push({ ...topBadge, level: skillToBadgeLevel(skill) })
    }

    // 2~3위: 나머지 풀에서 시드 기반 가중치 랜덤 선택
    if (candidates.length > 1) {
      const remaining = candidates.slice(1)
      const weighted = remaining.map((c, idx) => {
        let weight = 1.0

        // trait 기반 가중치 보정
        if (traits) {
          for (const trait of traits) {
            const traitWeights = TRAIT_BADGE_WEIGHTS[trait]
            if (traitWeights?.[c.badgeId]) {
              weight *= traitWeights[c.badgeId]
            }
          }
        }

        return { ...c, weight, idx }
      })

      // 시드 기반 선택 (결정론적이지만 직원마다 다름)
      const picked = new Set<number>()
      for (let pick = 0; pick < Math.min(MAX_BADGES_PER_CATEGORY - 1, weighted.length); pick++) {
        const hash = seedHash(`${seed}-${key}-${pick}`)
        const totalWeight = weighted
          .filter((_, i) => !picked.has(i))
          .reduce((sum, w) => sum + w.weight, 0)

        let roll = (hash % 1000) / 1000 * totalWeight
        for (let i = 0; i < weighted.length; i++) {
          if (picked.has(i)) continue
          roll -= weighted[i].weight
          if (roll <= 0) {
            picked.add(i)
            const badge = SKILL_BADGES_CATALOG[weighted[i].badgeId]
            if (badge) {
              badges.push({ ...badge, level: skillToBadgeLevel(skill) })
            }
            break
          }
        }
      }
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

  // ✨ Phase 7: 뱃지 시너지 보너스 적용
  const synergies = findBadgeSynergies(badges)
  for (const synergy of synergies) {
    const e = synergy.effects
    signalAccuracy += e.signalAccuracy ?? 0
    executionSpeedBonus += e.executionSpeedBonus ?? 0
    slippageReduction += e.slippageReduction ?? 0
    riskReduction += e.riskReduction ?? 0
    if (e.positionSizeMultiplier) positionSizeMultiplier *= e.positionSizeMultiplier
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
