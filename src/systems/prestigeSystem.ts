/**
 * Prestige / New Game+ System
 *
 * 30년 캠페인 완료 후 프레스티지 데이터 관리
 * localStorage에 별도 저장 (게임 세이브와 독립)
 */

import type { PrestigeData, PrestigeBonuses } from '../types/prestige'
import { PRESTIGE_CONSTANTS } from '../types/prestige'

const { STORAGE_KEY, CASH_BONUS_PER_LEVEL, MAX_LEVEL, MAX_CASH_BONUS } = PRESTIGE_CONSTANTS

/** 기본 프레스티지 데이터 */
function defaultPrestigeData(): PrestigeData {
  return {
    level: 0,
    totalCompletions: 0,
    carryOverSkillId: null,
    bestFinalAssets: 0,
    bestROI: 0,
    lastCompletionTimestamp: 0,
  }
}

/** localStorage에서 프레스티지 데이터 로드 */
export function loadPrestige(): PrestigeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrestigeData()
    const parsed = JSON.parse(raw) as Partial<PrestigeData>
    return {
      ...defaultPrestigeData(),
      ...parsed,
    }
  } catch {
    return defaultPrestigeData()
  }
}

/** localStorage에 프레스티지 데이터 저장 */
export function savePrestige(data: PrestigeData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * 캠페인 완료 시 프레스티지 데이터 갱신
 * @param finalAssets 최종 자산
 * @param totalROI 총 수익률 (%)
 * @param carryOverSkillId 이월할 Corporate Skill ID (선택)
 */
export function recordPrestigeCompletion(
  finalAssets: number,
  totalROI: number,
  carryOverSkillId: string | null = null,
): PrestigeData {
  const current = loadPrestige()
  const updated: PrestigeData = {
    level: Math.min(current.level + 1, MAX_LEVEL),
    totalCompletions: current.totalCompletions + 1,
    carryOverSkillId,
    bestFinalAssets: Math.max(current.bestFinalAssets, finalAssets),
    bestROI: Math.max(current.bestROI, totalROI),
    lastCompletionTimestamp: Date.now(),
  }
  savePrestige(updated)
  return updated
}

/** 현재 프레스티지 레벨에 따른 보너스 계산 */
export function getPrestigeBonuses(): PrestigeBonuses {
  const data = loadPrestige()
  const bonus = Math.min(data.level * CASH_BONUS_PER_LEVEL, MAX_CASH_BONUS)
  return {
    cashMultiplier: 1.0 + bonus,
    carryOverSkillId: data.carryOverSkillId,
    level: data.level,
  }
}

/** 프레스티지 레벨 표시용 별 문자열 생성 */
export function getPrestigeStars(level: number): string {
  if (level <= 0) return ''
  return '⭐'.repeat(Math.min(level, MAX_LEVEL))
}
