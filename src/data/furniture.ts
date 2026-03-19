import type { DeskType, DecorationType, DeskCatalogItem, DecorationCatalogItem, FurnitureType, FurnitureCatalogItem } from '../types/office'

/* ── 책상 카탈로그 ── */
export const DESK_CATALOG: Record<DeskType, DeskCatalogItem> = {
  basic: {
    type: 'basic',
    name: '기본 책상',
    description: '직원이 앉을 수 있는 기본 책상',
    cost: 10000,
    buffs: [],
    sprite: '🪑',
  },

  premium: {
    type: 'premium',
    name: '프리미엄 책상',
    description: '인체공학 의자로 스태미너 회복 속도 50% 증가',
    cost: 50000,
    buffs: [{ type: 'stamina_recovery', value: 1.5, range: 0 }],
    sprite: '💺',
  },
}

/* ── 장식 가구 카탈로그 ── */
export const DECORATION_CATALOG: Record<DecorationType, DecorationCatalogItem> = {

  plant: {
    type: 'plant',
    name: '대형 화분',
    description: '주변 120px 범위 직원 스트레스 20% 감소',
    cost: 10000,
    buffs: [{ type: 'stress_reduction', value: 0.8, range: 120 }],
    sprite: '🪴',
  },

  server_rack: {
    type: 'server_rack',
    name: '고성능 서버',
    description: '주변 80px 거래 속도 20% 증가 (소음으로 스트레스 30% 증가)',
    cost: 200000,
    buffs: [
      { type: 'trading_speed', value: 1.2, range: 80 },
      { type: 'stress_reduction', value: 1.3, range: 80 }, // 소음 = 스트레스 증가
    ],
    sprite: '🖥️',
    unlockLevel: 2,
  },

  coffee_machine: {
    type: 'coffee_machine',
    name: '에스프레소 머신',
    description: '주변 80px 스태미너 회복 30% 증가',
    cost: 80000,
    buffs: [{ type: 'stamina_recovery', value: 1.3, range: 80 }],
    sprite: '☕',
  },

  trophy: {
    type: 'trophy',
    name: 'CEO 트로피',
    description: '전 직원 사기 10% 증진',
    cost: 150000,
    buffs: [{ type: 'morale', value: 1.1, range: 999 }], // 전체 범위 (테스트 호환)
    sprite: '🏆',
    unlockLevel: 3,
  },

  air_purifier: {
    type: 'air_purifier',
    name: '공기청정기',
    description: '주변 120px 스트레스 15% 감소',
    cost: 120000,
    buffs: [{ type: 'stress_reduction', value: 0.85, range: 120 }],
    sprite: '💨',
  },

  whiteboard: {
    type: 'whiteboard',
    name: '화이트보드',
    description: '주변 80px 스킬 성장 속도 15% 증가',
    cost: 30000,
    buffs: [{ type: 'skill_growth', value: 1.15, range: 80 }],
    sprite: '📋',
  },

  bookshelf: {
    type: 'bookshelf',
    name: '서가',
    description: '주변 80px 스킬 성장 속도 10% 증가',
    cost: 40000,
    buffs: [{ type: 'skill_growth', value: 1.1, range: 80 }],
    sprite: '📚',
  },

  lounge_chair: {
    type: 'lounge_chair',
    name: '휴게 소파',
    description: '주변 60px 스트레스 30% 감소 및 스태미너 회복 20% 증가',
    cost: 60000,
    buffs: [
      { type: 'stress_reduction', value: 0.7, range: 60 },
      { type: 'stamina_recovery', value: 1.2, range: 60 },
    ],
    sprite: '🛋️',
  },

  aquarium: {
    type: 'aquarium',
    name: '대형 수족관',
    description: '전 직원 스트레스 25% 감소 + 만족도 증가',
    cost: 500000,
    buffs: [
      { type: 'stress_reduction', value: 0.75, range: 200 },
      { type: 'morale', value: 1.15, range: 200 },
    ],
    sprite: '🐠',
    unlockLevel: 4,
  },

  neon_sign: {
    type: 'neon_sign',
    name: '네온 사인',
    description: '회사 브랜드! 전 직원 사기 20% 증진',
    cost: 300000,
    buffs: [{ type: 'morale', value: 1.2, range: 999 }],
    sprite: '💡',
    unlockLevel: 5,
  },

  mini_bar: {
    type: 'mini_bar',
    name: '임원 미니바',
    description: '주변 100px 스태미너 회복 40% + 스트레스 20% 감소',
    cost: 800000,
    buffs: [
      { type: 'stamina_recovery', value: 1.4, range: 100 },
      { type: 'stress_reduction', value: 0.8, range: 100 },
    ],
    sprite: '🍸',
    unlockLevel: 6,
  },

  massage_chair: {
    type: 'massage_chair',
    name: '안마의자',
    description: '주변 80px 스트레스 40% 감소 + 스태미너 30% 증가',
    cost: 600000,
    buffs: [
      { type: 'stress_reduction', value: 0.6, range: 80 },
      { type: 'stamina_recovery', value: 1.3, range: 80 },
    ],
    sprite: '💆',
    unlockLevel: 5,
  },

  golf_set: {
    type: 'golf_set',
    name: '실내 골프 연습기',
    description: 'CEO 전용. 전 직원 스킬 성장 20% + 사기 15%',
    cost: 1000000,
    buffs: [
      { type: 'skill_growth', value: 1.2, range: 999 },
      { type: 'morale', value: 1.15, range: 999 },
    ],
    sprite: '⛳',
    unlockLevel: 7,
  },

  art_painting: {
    type: 'art_painting',
    name: '명화 컬렉션',
    description: '격조 있는 사무실. 전 직원 만족도 + 거래 속도 증가',
    cost: 2000000,
    buffs: [
      { type: 'morale', value: 1.25, range: 999 },
      { type: 'trading_speed', value: 1.15, range: 999 },
    ],
    sprite: '🖼️',
    unlockLevel: 8,
  },
}

/* ── 통합 카탈로그 (하위 호환성) ── */
export const FURNITURE_CATALOG: Record<FurnitureType, FurnitureCatalogItem> = {
  // 책상
  basic: {
    ...DESK_CATALOG.basic,
    size: { width: 1, height: 1 },
  },
  premium: {
    ...DESK_CATALOG.premium,
    size: { width: 1, height: 1 },
  },
  // 장식
  plant: {
    ...DECORATION_CATALOG.plant,
    size: { width: 1, height: 1 },
  },
  server_rack: {
    ...DECORATION_CATALOG.server_rack,
    size: { width: 2, height: 1 },
  },
  coffee_machine: {
    ...DECORATION_CATALOG.coffee_machine,
    size: { width: 1, height: 1 },
  },
  trophy: {
    ...DECORATION_CATALOG.trophy,
    size: { width: 1, height: 1 },
  },
  air_purifier: {
    ...DECORATION_CATALOG.air_purifier,
    size: { width: 1, height: 1 },
  },
  whiteboard: {
    ...DECORATION_CATALOG.whiteboard,
    size: { width: 2, height: 1 },
  },
  bookshelf: {
    ...DECORATION_CATALOG.bookshelf,
    size: { width: 1, height: 1 },
  },
  lounge_chair: {
    ...DECORATION_CATALOG.lounge_chair,
    size: { width: 2, height: 1 },
  },
  aquarium: {
    ...DECORATION_CATALOG.aquarium,
    size: { width: 2, height: 1 },
  },
  neon_sign: {
    ...DECORATION_CATALOG.neon_sign,
    size: { width: 2, height: 1 },
  },
  mini_bar: {
    ...DECORATION_CATALOG.mini_bar,
    size: { width: 2, height: 1 },
  },
  massage_chair: {
    ...DECORATION_CATALOG.massage_chair,
    size: { width: 1, height: 1 },
  },
  golf_set: {
    ...DECORATION_CATALOG.golf_set,
    size: { width: 2, height: 2 },
  },
  art_painting: {
    ...DECORATION_CATALOG.art_painting,
    size: { width: 1, height: 1 },
  },
}

/* ── Helper Functions ── */

/**
 * 책상 구매 가능 여부 체크
 */
export function canBuyDesk(
  type: DeskType,
  officeLevel: number,
  playerCash: number,
  currentDeskCount: number,
  maxDesks: number = 7,
): { canBuy: boolean; reason?: string } {
  const item = DESK_CATALOG[type]

  if (currentDeskCount >= maxDesks) {
    return {
      canBuy: false,
      reason: `최대 책상 개수 (${maxDesks}개) 도달`,
    }
  }

  if (item.unlockLevel && officeLevel < item.unlockLevel) {
    return {
      canBuy: false,
      reason: `사무실 레벨 ${item.unlockLevel} 이상 필요`,
    }
  }

  if (playerCash < item.cost) {
    return {
      canBuy: false,
      reason: `자금 부족 (${item.cost.toLocaleString()}원 필요)`,
    }
  }

  return { canBuy: true }
}

/**
 * 장식 가구 구매 가능 여부 체크
 */
export function canBuyDecoration(
  type: DecorationType,
  officeLevel: number,
  playerCash: number,
): { canBuy: boolean; reason?: string } {
  const item = DECORATION_CATALOG[type]

  if (item.unlockLevel && officeLevel < item.unlockLevel) {
    return {
      canBuy: false,
      reason: `사무실 레벨 ${item.unlockLevel} 이상 필요`,
    }
  }

  if (playerCash < item.cost) {
    return {
      canBuy: false,
      reason: `자금 부족 (${item.cost.toLocaleString()}원 필요)`,
    }
  }

  return { canBuy: true }
}

/**
 * 가구 구매 가능 여부 체크 (레거시 하위 호환)
 */
export function canBuyFurniture(
  type: FurnitureType,
  officeLevel: number,
  playerCash: number,
): { canBuy: boolean; reason?: string } {
  const item = FURNITURE_CATALOG[type]

  if (item.unlockLevel && officeLevel < item.unlockLevel) {
    return {
      canBuy: false,
      reason: `사무실 레벨 ${item.unlockLevel} 이상 필요`,
    }
  }

  if (playerCash < item.cost) {
    return {
      canBuy: false,
      reason: `자금 부족 (${item.cost.toLocaleString()}원 필요)`,
    }
  }

  return { canBuy: true }
}

/**
 * 가구 목록 (구매 가능한 것만)
 */
export function getAvailableFurniture(
  officeLevel: number,
  playerCash: number,
): FurnitureCatalogItem[] {
  return Object.values(FURNITURE_CATALOG).filter((item) => {
    const { canBuy } = canBuyFurniture(item.type, officeLevel, playerCash)
    return canBuy
  })
}

/**
 * 책상인지 확인
 */
export function isDesk(type: FurnitureType): type is DeskType {
  return type === 'basic' || type === 'premium'
}

/**
 * 장식 가구인지 확인
 */
export function isDecoration(type: FurnitureType): type is DecorationType {
  return !isDesk(type)
}
