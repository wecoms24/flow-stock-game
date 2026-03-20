export type SpyMissionTier = 'basic' | 'advanced' | 'deep'

export interface SpyMission {
  id: string
  targetCompetitorId: string
  tier: SpyMissionTier
  startTick: number
  duration: number         // 시간 단위
  cost: number
  status: 'in_progress' | 'success' | 'failed' | 'lawsuit'
  progress: number         // 0~100
  result?: SpyIntel
}

export interface SpyIntel {
  id: string
  missionId: string
  targetCompetitorId: string
  tier: SpyMissionTier
  obtainedAt: number       // tick
  expiresAt: number        // tick (정보 만료)
  portfolio?: { companyId: string; shares: number; avgPrice: number }[]
  tradingStyle?: string
  recentTrades?: { companyId: string; action: 'buy' | 'sell'; amount: number }[]
  totalAssets?: number
  strategy?: string        // 전략 설명 텍스트
}
