import type { Employee, EmployeeTrait } from '../types'

/**
 * Phase 8: 동적 trait 해금 조건
 *
 * 고용 후 조건 충족 시 새 trait 획득 가능 (최대 3개 cap)
 */

export interface TraitUnlockCondition {
  trait: EmployeeTrait
  name: string
  description: string
  probability: number // 조건 충족 시 획득 확률
  check: (employee: Employee) => boolean
}

export const TRAIT_UNLOCK_CONDITIONS: TraitUnlockCondition[] = [
  {
    trait: 'workaholic',
    name: '끝없는 노력',
    description: '레벨 20 이상 + 번아웃 0회',
    probability: 0.3,
    check: (e) => (e.level ?? 1) >= 20 && (e.burnoutTicks ?? 0) === 0,
  },
  {
    trait: 'contrarian_mind',
    name: '위기 속 성장',
    description: 'CRISIS 3회 이상 생존',
    probability: 0.25,
    check: (e) => (e.pityCounters?.crisisSurvivals ?? 0) >= 3,
  },
  {
    trait: 'lucky',
    name: '행운의 여신',
    description: '성공 거래 100건 달성',
    probability: 0.2,
    check: (e) => (e.pityCounters?.successfulTrades ?? 0) >= 100,
  },
  {
    trait: 'sensitive',
    name: '과민 반응',
    description: '스트레스 60 이상 6개월 지속',
    probability: 0.3,
    check: (e) => (e.pityCounters?.highStressMonths ?? 0) >= 6,
  },
  {
    trait: 'mentor',
    name: '경험의 결실',
    description: '레벨 25 이상 + 3개 이상 trait 보유',
    probability: 0.25,
    check: (e) => (e.level ?? 1) >= 25 && (e.traits?.length ?? 0) >= 2,
  },
  {
    trait: 'ambitious',
    name: '야망의 각성',
    description: '레벨 15 이상 + 스킬 하나 80 이상',
    probability: 0.2,
    check: (e) => {
      if ((e.level ?? 1) < 15) return false
      const skills = e.skills
      if (!skills) return false
      return skills.analysis >= 80 || skills.trading >= 80 || skills.research >= 80
    },
  },
  {
    trait: 'empathetic',
    name: '공감의 성장',
    description: '만족도 80 이상 유지 6개월 + social trait 보유',
    probability: 0.3,
    check: (e) =>
      (e.satisfaction ?? 50) >= 80 && (e.traits?.includes('social') ?? false),
  },
]

/**
 * 직원의 동적 trait 해금 체크 (월간 처리)
 * @returns 획득한 새 trait, 또는 null
 */
export function checkTraitUnlock(employee: Employee): EmployeeTrait | null {
  const currentTraits = employee.traits ?? []

  // 최대 3개 cap
  if (currentTraits.length >= 3) return null

  for (const condition of TRAIT_UNLOCK_CONDITIONS) {
    // 이미 보유한 trait 스킵
    if (currentTraits.includes(condition.trait)) continue

    // 조건 체크
    if (!condition.check(employee)) continue

    // 확률 체크
    if (Math.random() < condition.probability) {
      return condition.trait
    }
  }

  // 피티 시스템: rareTrait 카운터 10 도달 시 보장
  if (employee.pityCounters && employee.pityCounters.rareTrait >= 10) {
    const rareTraits: EmployeeTrait[] = ['lucky', 'workaholic', 'gambler', 'ambitious']
    const available = rareTraits.filter((t) => !currentTraits.includes(t))
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)]
    }
  }

  return null
}
