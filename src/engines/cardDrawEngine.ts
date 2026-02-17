/**
 * Card Draw Engine
 *
 * 가중 랜덤 선택, 배타성 검증, 10% 강제 이벤트 로직
 */

import type { NewsCard, NewsCardTemplate } from '../types/newsCard'
import { NEWS_CARD_TEMPLATES } from '../data/newsCards'

/** 카드 3장 뽑기 (가중 랜덤) */
export function drawCards(currentYear: number): NewsCard[] {
  // 현재 연도에 유효한 템플릿 필터링
  const eligible = NEWS_CARD_TEMPLATES.filter((t) => {
    if (t.minYear && currentYear < t.minYear) return false
    if (t.maxYear && currentYear > t.maxYear) return false
    return true
  })

  const result: NewsCard[] = []
  const usedIds = new Set<string>()

  // 10% 확률로 강제 이벤트 카드 1장 포함
  if (Math.random() < 0.1) {
    const forcedTemplates = eligible.filter((t) => t.isForced)
    if (forcedTemplates.length > 0) {
      const forced = weightedPick(forcedTemplates)
      if (forced) {
        result.push(templateToCard(forced))
        usedIds.add(forced.id)
      }
    }
  }

  // 나머지 카드 채우기 (총 3장)
  const remaining = eligible.filter((t) => !usedIds.has(t.id))
  while (result.length < 3 && remaining.length > 0) {
    const pick = weightedPick(remaining)
    if (!pick) break

    // 배타성 검증
    const isExclusive = result.some(
      (r) => r.templateId === pick.id || pick.exclusiveWith?.includes(r.templateId),
    )
    if (isExclusive) {
      // 배타 카드는 후보에서 제거하고 다시 시도
      const idx = remaining.findIndex((t) => t.id === pick.id)
      if (idx >= 0) remaining.splice(idx, 1)
      continue
    }

    result.push(templateToCard(pick))
    usedIds.add(pick.id)
    const idx = remaining.findIndex((t) => t.id === pick.id)
    if (idx >= 0) remaining.splice(idx, 1)
  }

  return result
}

/** 가중 랜덤 선택 */
function weightedPick(templates: NewsCardTemplate[]): NewsCardTemplate | null {
  if (templates.length === 0) return null
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0)
  let roll = Math.random() * totalWeight

  for (const t of templates) {
    roll -= t.weight
    if (roll <= 0) return t
  }

  return templates[templates.length - 1]
}

/** 템플릿 → 카드 인스턴스 변환 */
function templateToCard(template: NewsCardTemplate): NewsCard {
  return {
    id: `card_${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    templateId: template.id,
    title: template.title,
    description: template.description,
    rarity: template.rarity,
    icon: template.icon,
    sector: template.sector,
    effects: template.effects,
    isForced: template.isForced,
    exclusiveWith: template.exclusiveWith,
  }
}

/** 자동 선택: 타임아웃 시 상위 2장 자동 선택 */
export function autoSelectCards(cards: NewsCard[]): string[] {
  // 강제 카드 우선, 그 다음 희귀도 순
  const rarityOrder: Record<string, number> = {
    legendary: 4,
    rare: 3,
    uncommon: 2,
    common: 1,
  }

  const sorted = [...cards].sort(
    (a, b) => {
      // 강제 카드 우선
      if (a.isForced && !b.isForced) return -1
      if (!a.isForced && b.isForced) return 1
      return (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0)
    },
  )

  return sorted.slice(0, 2).map((c) => c.id)
}

/** 카드 효과를 이벤트 수정자로 변환 */
export function cardEffectsToEventModifiers(card: NewsCard) {
  return card.effects.map((eff) => ({
    driftModifier: eff.driftModifier,
    volatilityModifier: eff.volatilityModifier,
    duration: eff.duration,
    targetSector: eff.targetSector,
    targetCompanyId: eff.targetCompanyId,
  }))
}
