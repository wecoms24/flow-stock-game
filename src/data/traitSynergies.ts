import type { EmployeeTrait } from '../types'

/**
 * Trait 시너지/갈등 시스템
 *
 * 두 trait 조합이 특별한 효과를 발생시킨다.
 * 최대 C(3,2) = 3쌍 체크, 규칙 15개 → 최대 45비교/직원 (~0.02ms)
 */

export interface TraitSynergyEffect {
  name: string
  icon: string
  description: string
  effects: {
    signalAccuracy?: number // 시그널 정확도 배율 (1.1 = +10%)
    skillGrowth?: number // 스킬 성장 배율
    stressMultiplier?: number // 스트레스 배율
    slippageReduction?: number // 슬리피지 감소 (0.2 = -20%)
    riskReduction?: number // 리스크 감소 (0.15 = -15%)
    positionSizeMultiplier?: number // 포지션 배율
    satisfactionBonus?: number // 만족도 보너스 (절대값)
    moralSpread?: number // 팀 사기 전파 배율
  }
}

export interface TraitSynergyRule {
  traits: [EmployeeTrait, EmployeeTrait]
  type: 'synergy' | 'conflict'
  effect: TraitSynergyEffect
}

export const TRAIT_SYNERGIES: TraitSynergyRule[] = [
  // === 시너지 (긍정적) ===
  {
    traits: ['perfectionist', 'tech_savvy'],
    type: 'synergy',
    effect: {
      name: '정밀 분석가',
      icon: '🔬',
      description: '기술력과 완벽주의가 만나 시그널 정확도 향상',
      effects: { signalAccuracy: 1.10, skillGrowth: 1.05 },
    },
  },
  {
    traits: ['ambitious', 'workaholic'],
    type: 'synergy',
    effect: {
      name: '불타는 성장욕',
      icon: '🔥',
      description: '야망과 노력의 시너지, 그러나 스트레스도 증가',
      effects: { skillGrowth: 1.3, stressMultiplier: 1.4 },
    },
  },
  {
    traits: ['contrarian_mind', 'risk_averse'],
    type: 'synergy',
    effect: {
      name: '위기 속 기회',
      icon: '🎯',
      description: 'CRISIS 시 역발상 분석이 빛나는 조합',
      effects: { signalAccuracy: 1.25, riskReduction: 0.15 },
    },
  },
  {
    traits: ['lucky', 'gambler'],
    type: 'synergy',
    effect: {
      name: '하이롤러',
      icon: '🎲',
      description: '15% 확률로 슬리피지 0 — 대담한 행운',
      effects: { slippageReduction: 0.15, positionSizeMultiplier: 1.2 },
    },
  },
  {
    traits: ['mentor', 'social'],
    type: 'synergy',
    effect: {
      name: '팀 빌더',
      icon: '🤝',
      description: '멘토링과 사교성의 시너지, 팀 전체 성장 촉진',
      effects: { skillGrowth: 1.15, satisfactionBonus: 5, moralSpread: 1.3 },
    },
  },
  {
    traits: ['empathetic', 'social'],
    type: 'synergy',
    effect: {
      name: '분위기 메이커',
      icon: '🎭',
      description: '공감과 사교성으로 팀 사기를 크게 높인다',
      effects: { stressMultiplier: 0.8, satisfactionBonus: 8, moralSpread: 1.5 },
    },
  },
  {
    traits: ['early_bird', 'caffeine_addict'],
    type: 'synergy',
    effect: {
      name: '모닝 커피 루틴',
      icon: '☀️',
      description: '아침형 인간이 커피까지 더하면 오전 생산성 극대화',
      effects: { skillGrowth: 1.1, stressMultiplier: 0.9 },
    },
  },
  {
    traits: ['frugal', 'risk_averse'],
    type: 'synergy',
    effect: {
      name: '안전 투자 달인',
      icon: '🏦',
      description: '절약과 안정 추구의 조합 — 리스크 최소화',
      effects: { riskReduction: 0.2, stressMultiplier: 0.85 },
    },
  },

  // === 갈등 (부정적) ===
  {
    traits: ['social', 'introvert'],
    type: 'conflict',
    effect: {
      name: '성격 충돌',
      icon: '⚡',
      description: '사교적 성향과 내향적 성향이 내면에서 갈등',
      effects: { stressMultiplier: 1.3, skillGrowth: 0.9 },
    },
  },
  {
    traits: ['gambler', 'risk_averse'],
    type: 'conflict',
    effect: {
      name: '우유부단',
      icon: '😵',
      description: '도박 본능과 안전 추구가 충돌하여 결정 장애',
      effects: { signalAccuracy: 0.9, stressMultiplier: 1.2 },
    },
  },
  {
    traits: ['early_bird', 'nocturnal'],
    type: 'conflict',
    effect: {
      name: '생체 리듬 혼란',
      icon: '😴',
      description: '아침형과 야행성이 공존할 수 없다',
      effects: { stressMultiplier: 1.3, skillGrowth: 0.85 },
    },
  },
  {
    traits: ['perfectionist', 'gambler'],
    type: 'conflict',
    effect: {
      name: '완벽 vs 즉흥',
      icon: '💥',
      description: '완벽주의와 도박 본능이 매매 타이밍을 놓치게 한다',
      effects: { signalAccuracy: 0.85, stressMultiplier: 1.25 },
    },
  },
]

/**
 * 직원의 trait 조합에서 활성 시너지/갈등 찾기
 */
export function findActiveSynergies(traits: EmployeeTrait[]): TraitSynergyRule[] {
  if (!traits || traits.length < 2) return []

  const active: TraitSynergyRule[] = []

  for (const rule of TRAIT_SYNERGIES) {
    const [t1, t2] = rule.traits
    if (traits.includes(t1) && traits.includes(t2)) {
      active.push(rule)
    }
  }

  return active
}

/**
 * 시너지 효과 집계
 */
export function aggregateSynergyEffects(synergies: TraitSynergyRule[]): TraitSynergyEffect['effects'] {
  const result: TraitSynergyEffect['effects'] = {}

  for (const rule of synergies) {
    const e = rule.effect.effects
    if (e.signalAccuracy) result.signalAccuracy = (result.signalAccuracy ?? 1) * e.signalAccuracy
    if (e.skillGrowth) result.skillGrowth = (result.skillGrowth ?? 1) * e.skillGrowth
    if (e.stressMultiplier) result.stressMultiplier = (result.stressMultiplier ?? 1) * e.stressMultiplier
    if (e.slippageReduction) result.slippageReduction = (result.slippageReduction ?? 0) + e.slippageReduction
    if (e.riskReduction) result.riskReduction = (result.riskReduction ?? 0) + e.riskReduction
    if (e.positionSizeMultiplier) result.positionSizeMultiplier = (result.positionSizeMultiplier ?? 1) * e.positionSizeMultiplier
    if (e.satisfactionBonus) result.satisfactionBonus = (result.satisfactionBonus ?? 0) + e.satisfactionBonus
    if (e.moralSpread) result.moralSpread = (result.moralSpread ?? 1) * e.moralSpread
  }

  return result
}
