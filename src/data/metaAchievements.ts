/**
 * Meta Achievement & New Game+ Bonus Definitions
 */

export interface MetaAchievementDef {
  id: string
  title: string
  description: string
  icon: string
}

export interface NewGamePlusBonusDef {
  id: string
  title: string
  description: string
  requiredAchievement: string
  effect: { type: 'startingCash' | 'startingEmployee'; value: number }
}

export const META_ACHIEVEMENTS: MetaAchievementDef[] = [
  {
    id: 'billionaire_club',
    title: '억만장자 클럽',
    description: '최종 자산 100억원 이상 달성',
    icon: '💰',
  },
  {
    id: 'crisis_survivor',
    title: '위기 생존자',
    description: '경제 위기를 겪고도 양수 ROI 달성',
    icon: '🛡️',
  },
  {
    id: 'best_employer',
    title: '최고의 고용주',
    description: '직원 6명 이상 보유한 채로 게임 종료',
    icon: '👥',
  },
  {
    id: 'sector_king',
    title: '섹터의 왕',
    description: '단일 섹터 거래 비중 60% 이상',
    icon: '👑',
  },
  {
    id: 'diverse_portfolio',
    title: '분산 투자의 달인',
    description: '5개 이상 섹터에서 거래',
    icon: '🌐',
  },
  {
    id: 'speed_runner',
    title: '스피드 러너',
    description: '5년 내 10억원 달성',
    icon: '⚡',
  },
]

export const NEW_GAME_PLUS_BONUSES: NewGamePlusBonusDef[] = [
  {
    id: 'extra_cash',
    title: '초기자금 +10%',
    description: '시작 자금이 10% 증가합니다',
    requiredAchievement: 'billionaire_club',
    effect: { type: 'startingCash', value: 0.1 },
  },
  {
    id: 'free_analyst',
    title: '무료 애널리스트',
    description: '시작 시 애널리스트 1명이 고용됩니다',
    requiredAchievement: 'crisis_survivor',
    effect: { type: 'startingEmployee', value: 1 },
  },
  {
    id: 'sector_intel',
    title: '섹터 인텔',
    description: '시작 자금이 5% 증가합니다',
    requiredAchievement: 'sector_king',
    effect: { type: 'startingCash', value: 0.05 },
  },
]
