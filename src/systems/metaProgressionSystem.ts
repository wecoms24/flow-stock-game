/**
 * Meta Progression System
 *
 * localStorage 기반 메타 진행 (게임 세이브와 분리)
 */

import type { EndgameRecap, DecisionAnalysis } from '../types/endgame'
import { META_ACHIEVEMENTS, NEW_GAME_PLUS_BONUSES } from '../data/metaAchievements'
import type { NewGamePlusBonusDef } from '../data/metaAchievements'

const META_KEY = 'retro_stock_meta_progression'
const META_VERSION = 1

export interface MetaAchievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: number
}

export interface MetaProgression {
  version: number
  totalGamesPlayed: number
  achievements: Record<string, MetaAchievement>
  bestROI: number
  newGamePlusBonuses: string[]
}

function createDefaultMeta(): MetaProgression {
  const achievements: Record<string, MetaAchievement> = {}
  for (const def of META_ACHIEVEMENTS) {
    achievements[def.id] = {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlocked: false,
    }
  }
  return {
    version: META_VERSION,
    totalGamesPlayed: 0,
    achievements,
    bestROI: 0,
    newGamePlusBonuses: [],
  }
}

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return createDefaultMeta()
    const parsed = JSON.parse(raw) as MetaProgression
    // Ensure all achievements exist (for forward compat)
    const meta = { ...createDefaultMeta(), ...parsed }
    for (const def of META_ACHIEVEMENTS) {
      const existing = meta.achievements[def.id]
      meta.achievements[def.id] = {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked: existing?.unlocked ?? false,
        unlockedAt: existing?.unlockedAt,
      }
    }
    return meta
  } catch {
    return createDefaultMeta()
  }
}

export function saveMetaProgression(meta: MetaProgression): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    // localStorage full or unavailable
  }
}

export function checkMetaAchievements(
  recap: EndgameRecap,
  analysis: DecisionAnalysis,
): string[] {
  const meta = loadMetaProgression()
  const newlyUnlocked: string[] = []
  const now = Date.now()

  // billionaire_club: 100억+
  if (recap.finalAssets >= 10_000_000_000 && !meta.achievements.billionaire_club?.unlocked) {
    meta.achievements.billionaire_club.unlocked = true
    meta.achievements.billionaire_club.unlockedAt = now
    newlyUnlocked.push('billionaire_club')
  }

  // crisis_survivor: 위기 중 실제 거래 + 양수 ROI
  const hadCrisisActivity = analysis.timing.panicSellCount > 0
    || analysis.timing.panicHoldCount > 0
    || analysis.timing.crisisROI !== 0
  if (hadCrisisActivity && recap.totalROI > 0 && !meta.achievements.crisis_survivor?.unlocked) {
    meta.achievements.crisis_survivor.unlocked = true
    meta.achievements.crisis_survivor.unlockedAt = now
    newlyUnlocked.push('crisis_survivor')
  }

  // best_employer: 직원 6명+
  if (recap.currentEmployeeCount >= 6 && !meta.achievements.best_employer?.unlocked) {
    meta.achievements.best_employer.unlocked = true
    meta.achievements.best_employer.unlockedAt = now
    newlyUnlocked.push('best_employer')
  }

  // sector_king: 단일 섹터 60%+
  const topSector = analysis.sectorBreakdown[0]
  if (topSector && topSector.concentration >= 0.6 && !meta.achievements.sector_king?.unlocked) {
    meta.achievements.sector_king.unlocked = true
    meta.achievements.sector_king.unlockedAt = now
    newlyUnlocked.push('sector_king')
  }

  // diverse_portfolio: 5+ 섹터
  const activeSectors = analysis.sectorBreakdown.filter((s) => s.tradeCount > 0).length
  if (activeSectors >= 5 && !meta.achievements.diverse_portfolio?.unlocked) {
    meta.achievements.diverse_portfolio.unlocked = true
    meta.achievements.diverse_portfolio.unlockedAt = now
    newlyUnlocked.push('diverse_portfolio')
  }

  // speed_runner: 5년 내 현금 10억
  const earlyBillion = recap.assetCurve.find(
    (p) => p.cash >= 1_000_000_000 && p.year - recap.startYear <= 5,
  )
  if (earlyBillion && !meta.achievements.speed_runner?.unlocked) {
    meta.achievements.speed_runner.unlocked = true
    meta.achievements.speed_runner.unlockedAt = now
    newlyUnlocked.push('speed_runner')
  }

  // Update meta stats
  meta.totalGamesPlayed++
  meta.bestROI = Math.max(meta.bestROI, recap.totalROI)

  // Unlock bonuses for newly achieved
  for (const bonus of NEW_GAME_PLUS_BONUSES) {
    if (
      newlyUnlocked.includes(bonus.requiredAchievement) &&
      !meta.newGamePlusBonuses.includes(bonus.id)
    ) {
      meta.newGamePlusBonuses.push(bonus.id)
    }
  }

  saveMetaProgression(meta)
  return newlyUnlocked
}

export function getAvailableBonuses(meta: MetaProgression): NewGamePlusBonusDef[] {
  return NEW_GAME_PLUS_BONUSES.filter((b) => meta.newGamePlusBonuses.includes(b.id))
}
