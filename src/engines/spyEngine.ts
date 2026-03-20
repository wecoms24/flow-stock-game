/**
 * Spy Engine
 *
 * 경쟁사 스파이 정탐 시스템 — 순수 함수 엔진
 * 미션 생성, 진행 처리, 정보 추출, 만료 정리
 */

import { SPY_CONFIG } from '../config/spyConfig'
import type { SpyMission, SpyMissionTier, SpyIntel } from '../types/spy'
import type { Competitor } from '../types'

const STYLE_STRATEGY_MAP: Record<string, string> = {
  aggressive: '고변동 종목 위주 대량 매매, 단기 수익 추구. 패닉 상황에서 과감한 매도 가능성 높음.',
  conservative: '우량주 장기 보유 전략. 안정적 배당 추구, 변동성 큰 종목 회피.',
  'trend-follower': '모멘텀 기반 추세 추종. 20일 이동평균 돌파 시 매수, 이탈 시 매도.',
  contrarian: 'RSI 기반 역발상 투자. 과매도 구간 매수, 과매수 구간 매도.',
}

/** 미션 시작 가능 여부 체크 */
export function canStartMission(
  missions: SpyMission[],
  targetId: string,
  currentTick: number,
): { canStart: boolean; reason?: string } {
  // 동시 진행 미션 수 체크
  const activeMissions = missions.filter((m) => m.status === 'in_progress')
  if (activeMissions.length >= SPY_CONFIG.MAX_CONCURRENT_MISSIONS) {
    return { canStart: false, reason: `동시 진행 가능 미션 수 초과 (최대 ${SPY_CONFIG.MAX_CONCURRENT_MISSIONS}개)` }
  }

  // 같은 대상 쿨다운 체크
  const lastMissionForTarget = missions
    .filter((m) => m.targetCompetitorId === targetId && m.status !== 'in_progress')
    .sort((a, b) => b.startTick - a.startTick)[0]

  if (lastMissionForTarget) {
    const elapsed = currentTick - lastMissionForTarget.startTick
    if (elapsed < SPY_CONFIG.COOLDOWN_PER_TARGET) {
      const remaining = SPY_CONFIG.COOLDOWN_PER_TARGET - elapsed
      return { canStart: false, reason: `재정탐 쿨다운 중 (${remaining}시간 남음)` }
    }
  }

  // 같은 대상에 이미 진행 중인 미션이 있는지 체크
  const inProgressForTarget = activeMissions.find((m) => m.targetCompetitorId === targetId)
  if (inProgressForTarget) {
    return { canStart: false, reason: '해당 대상에 이미 진행 중인 미션이 있습니다' }
  }

  return { canStart: true }
}

/** 미션 비용 계산 */
export function getMissionCost(tier: SpyMissionTier): number {
  return SPY_CONFIG.TIERS[tier].cost
}

/** 미션 생성 */
export function createMission(
  targetId: string,
  tier: SpyMissionTier,
  currentTick: number,
): SpyMission {
  const tierConfig = SPY_CONFIG.TIERS[tier]
  return {
    id: `spy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    targetCompetitorId: targetId,
    tier,
    startTick: currentTick,
    duration: tierConfig.duration,
    cost: tierConfig.cost,
    status: 'in_progress',
    progress: 0,
  }
}

/** 미션 진행 처리 (매 PROCESS_INTERVAL시간) */
export function processSpyMissions(
  missions: SpyMission[],
  competitors: Competitor[],
  currentTick: number,
): { updatedMissions: SpyMission[]; newIntel: SpyIntel[]; lawsuitPenalty: number } {
  const newIntel: SpyIntel[] = []
  let lawsuitPenalty = 0

  const updatedMissions = missions.map((mission) => {
    if (mission.status !== 'in_progress') return mission

    const elapsed = currentTick - mission.startTick
    const progress = Math.min(100, (elapsed / mission.duration) * 100)

    // 아직 완료되지 않음
    if (elapsed < mission.duration) {
      return { ...mission, progress }
    }

    // 미션 완료 판정
    const tierConfig = SPY_CONFIG.TIERS[mission.tier]
    const roll = Math.random()

    if (roll < tierConfig.failRate) {
      // 실패
      const lawsuitRoll = Math.random()
      if (lawsuitRoll < tierConfig.lawsuitRate) {
        // 소송 발생
        lawsuitPenalty += tierConfig.lawsuitPenaltyRate
        return { ...mission, progress: 100, status: 'lawsuit' as const }
      }
      return { ...mission, progress: 100, status: 'failed' as const }
    }

    // 성공
    const competitor = competitors.find((c) => c.id === mission.targetCompetitorId)
    if (competitor) {
      const intel = generateIntel(mission, competitor, currentTick)
      newIntel.push(intel)
      return { ...mission, progress: 100, status: 'success' as const, result: intel }
    }

    // 경쟁사를 찾을 수 없으면 실패 처리
    return { ...mission, progress: 100, status: 'failed' as const }
  })

  return { updatedMissions, newIntel, lawsuitPenalty }
}

/** 정보 생성 (경쟁사 현재 상태에서 추출) */
export function generateIntel(
  mission: SpyMission,
  competitor: Competitor,
  currentTick: number,
): SpyIntel {
  const tierConfig = SPY_CONFIG.TIERS[mission.tier]

  const intel: SpyIntel = {
    id: `intel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    missionId: mission.id,
    targetCompetitorId: mission.targetCompetitorId,
    tier: mission.tier,
    obtainedAt: currentTick,
    expiresAt: currentTick + tierConfig.intelDuration,
  }

  // 포트폴리오 공개
  if (tierConfig.revealPortfolio) {
    intel.portfolio = Object.entries(competitor.portfolio).map(([companyId, pos]) => ({
      companyId,
      shares: pos.shares,
      avgPrice: pos.avgBuyPrice,
    }))
  }

  // 최근 거래 공개 (포트폴리오 기반 추정)
  if (tierConfig.revealTrades) {
    intel.recentTrades = Object.entries(competitor.portfolio)
      .slice(0, 5)
      .map(([companyId, pos]) => ({
        companyId,
        action: pos.shares > 0 ? 'buy' as const : 'sell' as const,
        amount: Math.abs(pos.shares),
      }))
  }

  // 총 자산 공개
  if (tierConfig.revealAssets) {
    intel.totalAssets = competitor.totalAssetValue
    intel.tradingStyle = competitor.style
  }

  // 전략 설명 공개
  if (tierConfig.revealStrategy) {
    intel.strategy = STYLE_STRATEGY_MAP[competitor.style] ?? '알 수 없는 전략'
  }

  return intel
}

/** 만료된 정보 정리 */
export function cleanExpiredIntel(
  intel: SpyIntel[],
  currentTick: number,
): SpyIntel[] {
  return intel.filter((i) => i.expiresAt > currentTick)
}
