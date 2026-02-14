import type { FurnitureType, FurnitureCatalogItem } from '../types/office'

/* ── Furniture Catalog ── */
/*
  10가지 가구 정의
  - 비용 범위: 10,000원 ~ 200,000원
  - 버프 효과: 배율 기반 (1.0 = 100%)
  - 범위: 0 (해당 칸만) ~ 999 (전체)
*/

export const FURNITURE_CATALOG: Record<FurnitureType, FurnitureCatalogItem> = {
  desk: {
    type: 'desk',
    name: '기본 책상',
    description: '직원이 앉을 수 있는 기본 책상',
    cost: 10000,
    size: { width: 1, height: 1 },
    buffs: [],
    sprite: '🪑',
  },

  premium_chair: {
    type: 'premium_chair',
    name: '고급 의자',
    description: '인체공학 의자로 스태미너 회복 속도 50% 증가',
    cost: 50000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'stamina_recovery', value: 1.5, range: 0 }],
    sprite: '💺',
  },

  plant: {
    type: 'plant',
    name: '대형 화분',
    description: '주변 3칸 범위 직원 스트레스 20% 감소',
    cost: 10000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'stress_reduction', value: 0.8, range: 3 }],
    sprite: '🪴',
  },

  server_rack: {
    type: 'server_rack',
    name: '고성능 서버',
    description: '주변 2칸 거래 속도 20% 증가 (소음으로 스트레스 30% 증가)',
    cost: 200000,
    size: { width: 2, height: 1 },
    buffs: [
      { type: 'trading_speed', value: 1.2, range: 2 },
      { type: 'stress_reduction', value: 1.3, range: 2 }, // 소음 = 스트레스 증가
    ],
    sprite: '🖥️',
    unlockLevel: 2, // 사무실 레벨 2부터 구매 가능
  },

  coffee_machine: {
    type: 'coffee_machine',
    name: '에스프레소 머신',
    description: '주변 2칸 스태미너 회복 30% 증가',
    cost: 80000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'stamina_recovery', value: 1.3, range: 2 }],
    sprite: '☕',
  },

  trophy: {
    type: 'trophy',
    name: 'CEO 트로피',
    description: '전 직원 사기 10% 증진',
    cost: 150000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'morale', value: 1.1, range: 999 }], // 전체 범위
    sprite: '🏆',
    unlockLevel: 3, // 사무실 레벨 3부터 구매 가능
  },

  air_purifier: {
    type: 'air_purifier',
    name: '공기청정기',
    description: '주변 3칸 스트레스 15% 감소',
    cost: 120000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'stress_reduction', value: 0.85, range: 3 }],
    sprite: '💨',
  },

  whiteboard: {
    type: 'whiteboard',
    name: '화이트보드',
    description: '주변 2칸 스킬 성장 속도 15% 증가',
    cost: 30000,
    size: { width: 2, height: 1 },
    buffs: [{ type: 'skill_growth', value: 1.15, range: 2 }],
    sprite: '📋',
  },

  bookshelf: {
    type: 'bookshelf',
    name: '서가',
    description: '주변 2칸 스킬 성장 속도 10% 증가',
    cost: 40000,
    size: { width: 1, height: 1 },
    buffs: [{ type: 'skill_growth', value: 1.1, range: 2 }],
    sprite: '📚',
  },

  lounge_chair: {
    type: 'lounge_chair',
    name: '휴게 소파',
    description: '주변 1칸 스트레스 30% 감소 및 스태미너 회복 20% 증가',
    cost: 60000,
    size: { width: 2, height: 1 },
    buffs: [
      { type: 'stress_reduction', value: 0.7, range: 1 },
      { type: 'stamina_recovery', value: 1.2, range: 1 },
    ],
    sprite: '🛋️',
  },
}

/* ── Helper Functions ── */

/**
 * 가구 구매 가능 여부 체크
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
