/**
 * Celebration System - Pure Functions
 *
 * Creates and manages celebration events for the unified queue.
 */

import type { CelebrationEvent, CelebrationLevel } from '../types/celebration'

let celebrationIdCounter = 0

export function createCelebration(
  level: CelebrationLevel,
  title: string,
  description: string,
  icon: string,
  options?: Partial<Pick<CelebrationEvent, 'color' | 'duration' | 'confetti' | 'sound'>>,
): CelebrationEvent {
  return {
    id: `celebration-${Date.now()}-${celebrationIdCounter++}`,
    level,
    title,
    description,
    icon,
    color: options?.color ?? 'default',
    duration: options?.duration ?? getDefaultDuration(level),
    confetti: options?.confetti ?? level === 3,
    sound: options?.sound,
    timestamp: Date.now(),
  }
}

function getDefaultDuration(level: CelebrationLevel): number {
  switch (level) {
    case 1:
      return 4000
    case 2:
      return 6000
    case 3:
      return 0 // Manual dismiss
  }
}

/**
 * Sort celebrations by priority (higher level first, then by timestamp)
 */
export function sortCelebrations(queue: CelebrationEvent[]): CelebrationEvent[] {
  return [...queue].sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level
    return a.timestamp - b.timestamp
  })
}

// ── Convenience factories ──

export function celebrateRankOvertake(overtakenName: string, newRank: number): CelebrationEvent {
  const isFirst = newRank === 1
  return createCelebration(
    isFirst ? 3 : 2,
    isFirst ? '🏆 1위 등극!' : `순위 상승!`,
    isFirst
      ? `${overtakenName}을(를) 제치고 1위에 올랐습니다!`
      : `${overtakenName}을(를) 추월! 현재 ${newRank}위`,
    isFirst ? '👑' : '📈',
    {
      color: isFirst ? 'gold' : 'green',
      confetti: isFirst,
      sound: isFirst ? 'achievement' : 'levelup',
    },
  )
}

export function celebrateStreak(streak: number): CelebrationEvent {
  return createCelebration(
    streak >= 10 ? 2 : 1,
    `🔥 ${streak}연승!`,
    `연속 ${streak}회 수익 거래 달성!`,
    '🔥',
    { color: streak >= 10 ? 'gold' : 'green' },
  )
}

export function celebrateBestDay(change: number): CelebrationEvent {
  return createCelebration(
    2,
    '최고의 날!',
    `일일 수익률 +${change.toFixed(1)}% — 역대 최고 기록!`,
    '🎯',
    { color: 'green', sound: 'achievement' },
  )
}

export function celebrateWorstDay(change: number): CelebrationEvent {
  return createCelebration(
    2,
    '최악의 날...',
    `일일 수익률 ${change.toFixed(1)}% — 역대 최저 기록`,
    '💀',
    { color: 'red' },
  )
}

export function celebrateOfficeUpgrade(fromLevel: number, toLevel: number): CelebrationEvent {
  const levelNames = ['', '차고', '스타트업', '코퍼레이트', '타워', '펜트하우스']
  return createCelebration(
    3,
    '사무실 업그레이드!',
    `${levelNames[fromLevel] || `Lv${fromLevel}`} → ${levelNames[toLevel] || `Lv${toLevel}`}`,
    '🏗️',
    { color: 'gold', confetti: true, sound: 'achievement' },
  )
}

export function celebrateMilestone(title: string, description: string, icon: string): CelebrationEvent {
  return createCelebration(
    2,
    title,
    description,
    icon,
    { color: 'blue', sound: 'levelup' },
  )
}

export function celebrateRivalDefeated(rivalName: string, wins: number): CelebrationEvent {
  return createCelebration(
    2,
    `라이벌 격파!`,
    `${rivalName}에게 ${wins}승 달성!`,
    '⚔️',
    { color: 'gold', sound: 'achievement' },
  )
}

export function celebrateCrisisSurvival(
  durationHours: number,
  assetChangePercent: number,
): CelebrationEvent {
  const days = Math.round(durationHours / 10)
  if (assetChangePercent >= 0) {
    return createCelebration(
      3,
      '폭풍의 승자!',
      `${days}일간의 위기를 +${assetChangePercent.toFixed(1)}% 수익으로 돌파!`,
      '🛡️',
      { color: 'gold', confetti: true, sound: 'achievement' },
    )
  }
  if (assetChangePercent > -10) {
    return createCelebration(
      2,
      '폭풍을 견뎌냈습니다',
      `${days}일간의 위기 생존 (${assetChangePercent.toFixed(1)}%)`,
      '⛈️',
      { color: 'blue', sound: 'levelup' },
    )
  }
  return createCelebration(
    2,
    '상처투성이지만 살아남았습니다',
    `${days}일간의 위기 생존 (${assetChangePercent.toFixed(1)}%)`,
    '🩹',
    { color: 'red' },
  )
}
