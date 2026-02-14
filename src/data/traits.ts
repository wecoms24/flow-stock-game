import type { EmployeeTrait, TraitConfig } from '../types'

/* ── Employee Trait System ── */
/*
  10가지 성격 태그 정의
  - common: 흔한 성격 (70% 가중치)
  - uncommon: 보통 성격 (20% 가중치)
  - rare: 희귀 성격 (10% 가중치)
*/

export const TRAIT_DEFINITIONS: Record<EmployeeTrait, TraitConfig> = {
  nocturnal: {
    name: '야행성',
    description: '밤에 더 집중하는 올빼미형 인간',
    icon: '🦉',
    rarity: 'common',
    effects: {
      nightShiftBonus: 0.2, // 야간 (18:00-06:00) 거래 효율 +20%
      morningPenalty: 0.15, // 오전 (06:00-12:00) 실수 확률 +15%
      stressGeneration: 0.9, // 야간 근무 시 스트레스 10% 감소
    },
  },

  caffeine_addict: {
    name: '카페인 중독',
    description: '커피 없이는 못 사는 직장인',
    icon: '☕',
    rarity: 'common',
    effects: {
      requiresCoffee: true,
      staminaRecovery: 1.5, // 커피머신 근처 시 회복 속도 1.5배
      stressGeneration: 1.3, // 커피 없으면 스트레스 1.3배
    },
  },

  sensitive: {
    name: '예민함',
    description: '환경에 민감한 섬세한 영혼',
    icon: '😰',
    rarity: 'uncommon',
    effects: {
      noiseIntolerance: 2.0, // 소음 디버프 2배
      requiresQuiet: true,
      stressGeneration: 1.2, // 기본 스트레스 증가 속도 1.2배
      skillGrowth: 1.1, // 조용한 환경에서 스킬 성장 1.1배
    },
  },

  workaholic: {
    name: '워커홀릭',
    description: '일 중독자, 잔업도 기꺼이',
    icon: '💼',
    rarity: 'rare',
    effects: {
      staminaRecovery: 0.8, // 회복 속도 느림
      stressGeneration: 0.7, // 야근해도 스트레스 적음
      salaryMultiplier: 1.3, // 월급 30% 더 요구
      skillGrowth: 1.2, // 스킬 성장 빠름
    },
  },

  perfectionist: {
    name: '완벽주의자',
    description: '디테일에 집착하는 장인 정신',
    icon: '✨',
    rarity: 'uncommon',
    effects: {
      skillGrowth: 1.15, // 스킬 성장 15% 빠름
      stressGeneration: 1.1, // 완벽 추구로 스트레스 증가
      staminaRecovery: 0.9, // 회복 속도 약간 느림
    },
  },

  social: {
    name: '사교적',
    description: '동료와 함께 일할 때 빛나는 사람',
    icon: '🎉',
    rarity: 'common',
    effects: {
      stressGeneration: 0.85, // 동료 근처 시 스트레스 15% 감소
      skillGrowth: 1.05, // 협업 시 스킬 성장 약간 증가
    },
  },

  introvert: {
    name: '내향적',
    description: '혼자 집중할 때 최고의 효율',
    icon: '🤫',
    rarity: 'common',
    effects: {
      requiresQuiet: true,
      stressGeneration: 1.2, // 시끄러운 환경에서 스트레스 증가
      skillGrowth: 1.1, // 조용한 환경에서 스킬 성장 증가
    },
  },

  tech_savvy: {
    name: '기술 능숙',
    description: 'IT 기기를 다루는 데 능숙함',
    icon: '💻',
    rarity: 'uncommon',
    effects: {
      skillGrowth: 1.1, // 기술 관련 스킬 성장 빠름
      staminaRecovery: 1.05, // 최신 장비 사용 시 회복 증가
    },
  },

  risk_averse: {
    name: '위험 회피',
    description: '안정을 추구하는 신중한 성격',
    icon: '🛡️',
    rarity: 'common',
    effects: {
      stressGeneration: 0.9, // 스트레스 10% 감소
      skillGrowth: 0.95, // 스킬 성장 약간 느림 (도전 회피)
    },
  },

  ambitious: {
    name: '야심가',
    description: '성공에 대한 강한 열망',
    icon: '⭐',
    rarity: 'rare',
    effects: {
      skillGrowth: 1.25, // 스킬 성장 25% 빠름
      stressGeneration: 1.15, // 야망으로 인한 스트레스 증가
      salaryMultiplier: 1.2, // 월급 20% 더 요구
    },
  },
}

/* ── Trait Generation Helpers ── */

/**
 * 가중치 기반 랜덤 성격 태그 생성 (1-2개)
 * - 70% 확률로 1개, 30% 확률로 2개
 * - rarity에 따른 가중치 적용
 */
export function generateRandomTraits(): EmployeeTrait[] {
  const traitCount = Math.random() > 0.7 ? 2 : 1
  const allTraits = Object.keys(TRAIT_DEFINITIONS) as EmployeeTrait[]

  // rarity에 따른 가중치 배열 생성
  const weightedTraits = allTraits.flatMap((trait) => {
    const { rarity } = TRAIT_DEFINITIONS[trait]
    const weight = rarity === 'common' ? 7 : rarity === 'uncommon' ? 2 : 1
    return Array(weight).fill(trait)
  })

  // 중복 없이 선택
  const selected: EmployeeTrait[] = []
  while (selected.length < traitCount) {
    const randomTrait = weightedTraits[Math.floor(Math.random() * weightedTraits.length)]
    if (!selected.includes(randomTrait)) {
      selected.push(randomTrait)
    }
  }

  return selected
}

/**
 * 성격 태그 툴팁 텍스트 생성
 */
export function getTraitTooltip(trait: EmployeeTrait): string {
  const config = TRAIT_DEFINITIONS[trait]
  const effects = Object.entries(config.effects)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}: 필요`
      }
      const percent = ((value - 1) * 100).toFixed(0)
      const sign = value > 1 ? '+' : ''
      return `${key}: ${sign}${percent}%`
    })
    .join('\n')

  return `${config.name}\n${config.description}\n\n효과:\n${effects}`
}
