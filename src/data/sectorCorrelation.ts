import type { Sector } from '../types'

/* ── 섹터 간 상관관계 매트릭스 ── */
/* 범위: 0.0 (무관) ~ 1.0 (완전 상관)
 * 한 섹터에 이벤트 발생 시, 상관 섹터에 감쇠된 영향 전파
 * 적용: driftModifier * correlation * SPILLOVER_FACTOR
 */

export const SPILLOVER_FACTOR = 0.3

export const SECTOR_CORRELATION: Record<Sector, Partial<Record<Sector, number>>> = {
  tech: {
    finance: 0.4,
    energy: 0.1,
    healthcare: 0.3,
    consumer: 0.3,
    industrial: 0.4,
    telecom: 0.6,
    materials: 0.2,
    utilities: 0.0,
    realestate: 0.1,
  },
  finance: {
    tech: 0.4,
    energy: 0.3,
    healthcare: 0.2,
    consumer: 0.4,
    industrial: 0.5,
    telecom: 0.3,
    materials: 0.3,
    utilities: 0.2,
    realestate: 0.7,
  },
  energy: {
    tech: 0.1,
    finance: 0.3,
    healthcare: 0.1,
    consumer: 0.2,
    industrial: 0.6,
    telecom: 0.1,
    materials: 0.5,
    utilities: 0.7,
    realestate: 0.2,
  },
  healthcare: {
    tech: 0.3,
    finance: 0.2,
    energy: 0.1,
    consumer: 0.2,
    industrial: 0.1,
    telecom: 0.2,
    materials: 0.2,
    utilities: 0.1,
    realestate: 0.1,
  },
  consumer: {
    tech: 0.3,
    finance: 0.4,
    energy: 0.2,
    healthcare: 0.2,
    industrial: 0.3,
    telecom: 0.3,
    materials: 0.2,
    utilities: 0.1,
    realestate: 0.3,
  },
  industrial: {
    tech: 0.4,
    finance: 0.5,
    energy: 0.6,
    healthcare: 0.1,
    consumer: 0.3,
    telecom: 0.2,
    materials: 0.7,
    utilities: 0.3,
    realestate: 0.4,
  },
  telecom: {
    tech: 0.6,
    finance: 0.3,
    energy: 0.1,
    healthcare: 0.2,
    consumer: 0.3,
    industrial: 0.2,
    materials: 0.1,
    utilities: 0.2,
    realestate: 0.2,
  },
  materials: {
    tech: 0.2,
    finance: 0.3,
    energy: 0.5,
    healthcare: 0.2,
    consumer: 0.2,
    industrial: 0.7,
    telecom: 0.1,
    utilities: 0.3,
    realestate: 0.4,
  },
  utilities: {
    tech: 0.0,
    finance: 0.2,
    energy: 0.7,
    healthcare: 0.1,
    consumer: 0.1,
    industrial: 0.3,
    telecom: 0.2,
    materials: 0.3,
    realestate: 0.2,
  },
  realestate: {
    tech: 0.1,
    finance: 0.7,
    energy: 0.2,
    healthcare: 0.1,
    consumer: 0.3,
    industrial: 0.4,
    telecom: 0.2,
    materials: 0.4,
    utilities: 0.2,
  },
}

/**
 * 두 섹터 간 상관계수 반환
 * 같은 섹터: 1.0
 * 매트릭스에 없는 쌍: 0.0
 */
export function getCorrelation(sectorA: Sector, sectorB: Sector): number {
  if (sectorA === sectorB) return 1.0
  return SECTOR_CORRELATION[sectorA]?.[sectorB] ?? 0.0
}

/**
 * 주어진 섹터와 상관관계가 threshold 이상인 섹터 목록 반환
 */
export function getCorrelatedSectors(
  sector: Sector,
  threshold = 0.3,
): Array<{ sector: Sector; correlation: number }> {
  const correlations = SECTOR_CORRELATION[sector]
  if (!correlations) return []

  return Object.entries(correlations)
    .filter(([, corr]) => (corr ?? 0) >= threshold)
    .map(([s, corr]) => ({ sector: s as Sector, correlation: corr ?? 0 }))
    .sort((a, b) => b.correlation - a.correlation)
}
