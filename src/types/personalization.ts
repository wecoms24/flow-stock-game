/* ── Personalization System Types ── */

/**
 * 플레이어 행동 이벤트
 */
export interface PlayerEvent {
  kind: 'TRADE' | 'SETTINGS' | 'WINDOW_FOCUS'
  timestamp: number
  day: number // 게임 내 일 수 (time.day)
  metadata: Record<string, any>
}

/**
 * 플레이어 프로필 (행동 패턴 분석 결과)
 */
export interface PlayerProfile {
  version: number // 마이그레이션 대비
  riskTolerance: number // 0.0-1.0 (위험 선호도: 높을수록 공격적)
  playPace: number // 0.0-1.0 (플레이 속도: 높을수록 빠름)
  attention: number // 0.0-1.0 (집중도: 높을수록 디테일 선호)
  learningStage: 'beginner' | 'intermediate' | 'advanced'
  lastUpdatedDay: number // 마지막 업데이트된 게임 내 일 수
}

/**
 * 개인화 정책 (프로필 기반 행동 조정)
 */
export interface PersonalizationPolicy {
  approvalBias: number // evaluateRisk 임계치 조정 (-10 ~ +10)
  defaultTab: string // RankingWindow 기본 탭
  tauntFilter: 'show' | 'collapse' | 'hide' // Taunt 표시 방식
}

/**
 * 이벤트 로그 최대 크기 (FIFO)
 */
export const MAX_EVENT_LOG_SIZE = 1000

/**
 * 기본 프로필 (초기 상태)
 */
export function defaultProfile(): PlayerProfile {
  return {
    version: 1,
    riskTolerance: 0.5, // 중립
    playPace: 0.5, // 중립
    attention: 0.5, // 중립
    learningStage: 'beginner',
    lastUpdatedDay: 0,
  }
}

/**
 * 기본 정책 (개인화 OFF 또는 중립 상태)
 */
export function defaultPolicy(): PersonalizationPolicy {
  return {
    approvalBias: 0,
    defaultTab: '거래',
    tauntFilter: 'show',
  }
}
