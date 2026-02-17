import type { PlayerEvent, PlayerProfile } from '../../types/personalization'

/**
 * 플레이어 이벤트 로그로부터 프로필을 계산하는 순수 함수
 *
 * @param events - 플레이어 행동 이벤트 로그
 * @param currentDay - 현재 게임 내 일 수
 * @returns 계산된 PlayerProfile
 */
export function computeProfileFromEvents(
  events: PlayerEvent[],
  currentDay: number,
): PlayerProfile {
  // 최근 이벤트만 필터링 (성능 최적화)
  const recent14Days = events.filter((e) => currentDay - e.day <= 14)
  const recent7Days = events.filter((e) => currentDay - e.day <= 7)
  const recent30Days = events.filter((e) => currentDay - e.day <= 30)

  // 1. riskTolerance 계산 (최근 14일 TRADE 이벤트 기반)
  const riskTolerance = calculateRiskTolerance(recent14Days)

  // 2. playPace 계산 (최근 7일 SETTINGS 변경 빈도)
  const playPace = calculatePlayPace(recent7Days)

  // 3. attention 계산 (최근 30일 WINDOW_FOCUS 다양성)
  const attention = calculateAttention(recent30Days)

  // 4. learningStage 계산 (플레이 일 수 기준)
  const learningStage = calculateLearningStage(currentDay)

  return {
    version: 1,
    riskTolerance,
    playPace,
    attention,
    learningStage,
    lastUpdatedDay: currentDay,
  }
}

/**
 * 위험 선호도 계산
 * - 높은 volatility 종목 거래 비율
 * - 큰 포지션 사이즈 비율
 */
function calculateRiskTolerance(recentTrades: PlayerEvent[]): number {
  const trades = recentTrades.filter((e) => e.kind === 'TRADE')

  if (trades.length === 0) return 0.5 // 중립 (데이터 부족)

  // 거래량 기반 위험도 계산 (간단한 휴리스틱)
  let riskScore = 0
  let totalTrades = 0

  for (const trade of trades) {
    const meta = trade.metadata as { qty?: number; price?: number; action?: string }
    const qty = meta.qty || 0
    const price = meta.price || 0
    const notional = qty * price

    // 큰 거래 (1억 이상)는 위험도 증가
    if (notional > 100_000_000) {
      riskScore += 1
    }
    // 매수는 위험 증가, 매도는 위험 감소
    if (meta.action === 'buy') {
      riskScore += 0.3
    } else if (meta.action === 'sell') {
      riskScore -= 0.1
    }

    totalTrades++
  }

  // 0.0-1.0 범위로 정규화
  const normalized = totalTrades > 0 ? riskScore / (totalTrades * 1.5) : 0.5
  return Math.max(0.0, Math.min(1.0, normalized + 0.3)) // 약간 공격적 바이어스
}

/**
 * 플레이 속도 계산
 * - SETTINGS 변경 빈도 (speed, pause)
 */
function calculatePlayPace(recentSettings: PlayerEvent[]): number {
  const settings = recentSettings.filter((e) => e.kind === 'SETTINGS')

  if (settings.length === 0) return 0.5 // 중립

  // 7일간 설정 변경 횟수
  const changeFrequency = settings.length

  // 속도 변경 비율 계산
  const speedChanges = settings.filter((e) => {
    const meta = e.metadata as { speed?: number }
    return meta.speed !== undefined && meta.speed > 1
  }).length

  // 빠른 플레이 선호도
  const paceScore = speedChanges / Math.max(changeFrequency, 1)

  // 변경 빈도가 높으면 빠른 플레이어
  const frequencyBonus = Math.min(changeFrequency / 20, 0.3) // 최대 +0.3

  return Math.max(0.0, Math.min(1.0, paceScore + frequencyBonus))
}

/**
 * 집중도 계산
 * - WINDOW_FOCUS 다양성 (여러 탭을 보는지)
 */
function calculateAttention(recentFocus: PlayerEvent[]): number {
  const focuses = recentFocus.filter((e) => e.kind === 'WINDOW_FOCUS')

  if (focuses.length === 0) return 0.5 // 중립

  // 방문한 고유 탭 수
  const uniqueTabs = new Set(focuses.map((e) => e.metadata.tabId)).size

  // 총 방문 횟수
  const totalVisits = focuses.length

  // 다양성: 고유 탭 수 / 총 방문 횟수
  const diversity = uniqueTabs / Math.max(totalVisits, 1)

  // 방문 빈도가 높으면 집중도 높음
  const frequencyBonus = Math.min(totalVisits / 50, 0.3) // 최대 +0.3

  // 다양성이 낮고 빈도가 높으면 → 집중도 높음
  const attentionScore = (1 - diversity) + frequencyBonus

  return Math.max(0.0, Math.min(1.0, attentionScore))
}

/**
 * 학습 단계 계산
 * - 플레이 일 수 기준
 */
function calculateLearningStage(currentDay: number): 'beginner' | 'intermediate' | 'advanced' {
  if (currentDay <= 30) return 'beginner' // 0-30일
  if (currentDay <= 180) return 'intermediate' // 31-180일 (6개월)
  return 'advanced' // 181일 이상
}
