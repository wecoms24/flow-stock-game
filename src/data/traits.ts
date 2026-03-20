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
    growthModifier: {
      allSkills: 1.05, // 야행성 특유의 집중력으로 약간의 성장 보너스
    },
  },

  caffeine_addict: {
    name: '카페인 중독',
    description: '커피 없이는 못 사는 직장인',
    icon: '☕',
    rarity: 'common',
    effects: {
      requiresCoffee: true,
      stressGeneration: 1.3, // 커피 없으면 스트레스 1.3배
    },
    growthModifier: {
      allSkills: 1.1, // 카페인 부스트로 집중력 향상, 성장 +10%
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
    growthModifier: {
      analysis: 1.15, // 섬세함이 분석 능력에 도움
      research: 1.1, // 디테일에 강해 리서치에도 유리
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
    growthModifier: {
      allSkills: 1.2, // 전체 스킬 성장 +20% — 끊임없는 노력
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
    growthModifier: {
      analysis: 1.3, // 분석 스킬 성장 +30% — 완벽을 추구하는 분석력
      stressBonus: 0.1, // 완벽 추구에 따른 추가 스트레스 +10%
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
    growthModifier: {
      satisfactionDecay: 0.5, // 만족도 감소 속도 -50% — 사교성이 직장 만족도 유지
      trading: 0.9, // 트레이딩 스킬 성장 -10% — 집중력 분산
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
    growthModifier: {
      research: 1.2, // 혼자 깊이 파고드는 리서치에 강함
      analysis: 1.1, // 집중력이 분석에도 도움
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
    growthModifier: {
      trading: 1.25, // 트레이딩 스킬 성장 +25% — 알고리즘/시스템 매매에 강점
      analysis: 1.1, // 데이터 분석 도구 활용에도 유리
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
    growthModifier: {
      research: 1.15, // 꼼꼼한 리서치에 유리
      trading: 0.85, // 과감한 매매에 약해 트레이딩 성장 느림
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
    growthModifier: {
      allSkills: 1.15, // 전체 스킬 성장 +15% — 끝없는 성장욕
      stressBonus: 0.15, // 야망에 의한 추가 스트레스 +15%
    },
  },
}

