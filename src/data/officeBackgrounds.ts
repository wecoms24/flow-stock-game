/**
 * Office Background Evolution System
 *
 * 오피스 레벨에 따라 배경이 진화하는 시스템
 * Lv 1-3: 창고 → Lv 4-9: 중소기업 → Lv 10+: 금융 타워
 */

export type OfficeTheme = 'garage' | 'startup' | 'corporate' | 'tower'

export interface AmbientEffect {
  particles?: 'dust' | 'snow' | 'sparks' | 'none'
  lighting?: 'dim' | 'bright' | 'neon'
  animation?: 'flickering' | 'cityscape' | 'none'
}

export interface OfficeBackground {
  level: number
  theme: OfficeTheme
  displayName: string
  description: string
  backgroundImage: string // CSS gradient or image path
  floorColor: string
  wallColor: string
  ambientEffects: AmbientEffect
  unlockRequirement: {
    level: number
    cash?: number
  }
}

/**
 * 레벨별 오피스 배경 정의
 */
export const OFFICE_BACKGROUNDS: Record<number, OfficeBackground> = {
  // Level 1-3: 스타트업 차고 (Garage)
  1: {
    level: 1,
    theme: 'garage',
    displayName: '지하 창고',
    description: '콘크리트 바닥과 형광등이 깜빡이는 초라한 공간',
    backgroundImage: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
    floorColor: '#3a3a3a',
    wallColor: '#2a2a2a',
    ambientEffects: {
      particles: 'dust',
      lighting: 'dim',
      animation: 'flickering',
    },
    unlockRequirement: {
      level: 1,
    },
  },

  2: {
    level: 2,
    theme: 'garage',
    displayName: '작은 사무실',
    description: '여전히 좁지만 벽지를 붙이고 정리한 공간',
    backgroundImage: 'linear-gradient(180deg, #3d3d3d 0%, #2a2a2a 100%)',
    floorColor: '#4a4a4a',
    wallColor: '#3d3d3d',
    ambientEffects: {
      particles: 'dust',
      lighting: 'dim',
      animation: 'none',
    },
    unlockRequirement: {
      level: 2,
    },
  },

  3: {
    level: 3,
    theme: 'garage',
    displayName: '개선된 사무실',
    description: '깔끔한 타일과 밝은 조명이 추가된 공간',
    backgroundImage: 'linear-gradient(180deg, #4a5568 0%, #2d3748 100%)',
    floorColor: '#cbd5e0',
    wallColor: '#4a5568',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'none',
    },
    unlockRequirement: {
      level: 3,
    },
  },

  // Level 4-9: 중소기업 오피스 (Startup)
  4: {
    level: 4,
    theme: 'startup',
    displayName: '스타트업 오피스',
    description: '햇빛이 들어오는 창문과 화분이 있는 쾌적한 공간',
    backgroundImage: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
    floorColor: '#e0e7ff',
    wallColor: '#dbeafe',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'none',
    },
    unlockRequirement: {
      level: 4,
      cash: 100000,
    },
  },

  5: {
    level: 5,
    theme: 'startup',
    displayName: '성장하는 오피스',
    description: '모던한 인테리어와 쾌적한 근무 환경',
    backgroundImage: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)',
    floorColor: '#f0f9ff',
    wallColor: '#e0f2fe',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'none',
    },
    unlockRequirement: {
      level: 5,
      cash: 250000,
    },
  },

  6: {
    level: 6,
    theme: 'startup',
    displayName: '프리미엄 오피스',
    description: '고급 가구와 예술품이 있는 세련된 공간',
    backgroundImage: 'linear-gradient(180deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
    floorColor: '#faf5ff',
    wallColor: '#f3e8ff',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'none',
    },
    unlockRequirement: {
      level: 6,
      cash: 500000,
    },
  },

  7: {
    level: 7,
    theme: 'corporate',
    displayName: '중견기업 본사',
    description: '넓은 공간과 전문적인 분위기의 사무실',
    backgroundImage: 'linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
    floorColor: '#f0fdf4',
    wallColor: '#dcfce7',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'none',
    },
    unlockRequirement: {
      level: 7,
      cash: 1000000,
    },
  },

  8: {
    level: 8,
    theme: 'corporate',
    displayName: '기업 사옥',
    description: '통유리 창문 너머로 도시 전망이 보이는 고층 빌딩',
    backgroundImage: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    floorColor: '#fffbeb',
    wallColor: '#fef3c7',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'cityscape',
    },
    unlockRequirement: {
      level: 8,
      cash: 2500000,
    },
  },

  9: {
    level: 9,
    theme: 'corporate',
    displayName: '럭셔리 오피스',
    description: '대리석 바닥과 샹들리에가 있는 최고급 사무실',
    backgroundImage: 'linear-gradient(180deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
    floorColor: '#fff7ed',
    wallColor: '#ffedd5',
    ambientEffects: {
      particles: 'none',
      lighting: 'bright',
      animation: 'cityscape',
    },
    unlockRequirement: {
      level: 9,
      cash: 5000000,
    },
  },

  // Level 10+: 금융 타워 (Tower)
  10: {
    level: 10,
    theme: 'tower',
    displayName: '금융 타워 펜트하우스',
    description: '네온사인이 빛나는 야경을 바라보는 최상층 오피스',
    backgroundImage: 'linear-gradient(180deg, #818cf8 0%, #6366f1 30%, #4f46e5 70%, #1e1b4b 100%)',
    floorColor: '#eef2ff',
    wallColor: '#e0e7ff',
    ambientEffects: {
      particles: 'sparks',
      lighting: 'neon',
      animation: 'cityscape',
    },
    unlockRequirement: {
      level: 10,
      cash: 10000000,
    },
  },
}

/**
 * 현재 레벨에 해당하는 배경 조회
 * @param level 오피스 레벨
 * @returns OfficeBackground
 */
export function getBackgroundForLevel(level: number): OfficeBackground {
  // 정확한 레벨 매칭 시도
  if (OFFICE_BACKGROUNDS[level]) {
    return OFFICE_BACKGROUNDS[level]
  }

  // 레벨이 10 이상이면 최상위 배경 반환
  if (level >= 10) {
    return OFFICE_BACKGROUNDS[10]
  }

  // 레벨에 가장 가까운 하위 배경 반환
  const availableLevels = Object.keys(OFFICE_BACKGROUNDS)
    .map(Number)
    .sort((a, b) => a - b)

  const closestLevel = availableLevels
    .filter((l) => l <= level)
    .pop() || 1

  return OFFICE_BACKGROUNDS[closestLevel]
}

/**
 * 다음 레벨 배경 조회
 * @param currentLevel 현재 레벨
 * @returns 다음 레벨 배경 또는 null
 */
export function getNextBackground(currentLevel: number): OfficeBackground | null {
  const availableLevels = Object.keys(OFFICE_BACKGROUNDS)
    .map(Number)
    .sort((a, b) => a - b)

  const nextLevel = availableLevels.find((l) => l > currentLevel)

  return nextLevel ? OFFICE_BACKGROUNDS[nextLevel] : null
}

/**
 * 배경 업그레이드 가능 여부 확인
 * @param currentLevel 현재 레벨
 * @param cash 현재 보유 현금
 * @returns 업그레이드 가능 여부
 */
export function canUpgradeBackground(currentLevel: number, cash: number): boolean {
  const nextBg = getNextBackground(currentLevel)

  if (!nextBg) return false

  const { unlockRequirement } = nextBg
  const levelOk = currentLevel >= unlockRequirement.level
  const cashOk = !unlockRequirement.cash || cash >= unlockRequirement.cash

  return levelOk && cashOk
}

/**
 * 배경 업그레이드 비용 조회
 * @param currentLevel 현재 레벨
 * @returns 필요 현금 또는 0
 */
export function getUpgradeCost(currentLevel: number): number {
  const nextBg = getNextBackground(currentLevel)
  return nextBg?.unlockRequirement.cash || 0
}

/**
 * CSS 변수로 배경 스타일 적용
 * @param background OfficeBackground
 * @returns CSS 변수 객체
 */
export function getBackgroundCSSVars(background: OfficeBackground): Record<string, string> {
  return {
    '--office-bg': background.backgroundImage,
    '--office-floor': background.floorColor,
    '--office-wall': background.wallColor,
  }
}

/**
 * 배경 전환 애니메이션 클래스 생성
 * @param from 이전 테마
 * @param to 새로운 테마
 * @returns 애니메이션 클래스명
 */
export function getTransitionAnimation(from: OfficeTheme, to: OfficeTheme): string {
  if (from === to) return 'fade-in'

  // 테마 간 전환
  const transitions: Record<string, string> = {
    'garage-startup': 'zoom-in',
    'startup-corporate': 'slide-up',
    'corporate-tower': 'sparkle-transition',
  }

  const key = `${from}-${to}`
  return transitions[key] || 'fade-in'
}
