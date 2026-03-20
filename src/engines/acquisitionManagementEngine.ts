import { ACQUISITION_MGMT_CONFIG } from '../config/acquisitionConfig'
import type { AcquiredCompanyState, AcquisitionEvent, IntegrationPhase } from '../types/acquisition'

/**
 * 현재 단계 계산
 */
export function getPhase(progress: number): IntegrationPhase {
  const thresholds = ACQUISITION_MGMT_CONFIG.PHASE_THRESHOLDS
  if (progress >= thresholds.complete) return 'complete'
  if (progress >= thresholds.synergy) return 'synergy'
  if (progress >= thresholds.integration) return 'integration'
  return 'restructuring'
}

/**
 * 통합 진행 처리 (월간)
 * progress += MONTHLY_INTEGRATION_PROGRESS, phase 업데이트, 100 캡
 */
export function advanceIntegration(
  state: AcquiredCompanyState,
): AcquiredCompanyState {
  const newProgress = Math.min(100, state.integrationProgress + ACQUISITION_MGMT_CONFIG.MONTHLY_INTEGRATION_PROGRESS)
  const newPhase = getPhase(newProgress)

  return {
    ...state,
    integrationProgress: newProgress,
    phase: newPhase,
  }
}

/**
 * 배당 계산 (분기별)
 * dealPrice * playerShares * (yield + phase bonuses) / 4
 */
export function calculateDividend(
  state: AcquiredCompanyState,
): number {
  let effectiveYield = state.monthlyDividendYield

  if (state.phase === 'synergy') {
    effectiveYield += ACQUISITION_MGMT_CONFIG.SYNERGY_DIVIDEND_BONUS
  } else if (state.phase === 'complete') {
    effectiveYield += ACQUISITION_MGMT_CONFIG.COMPLETE_DIVIDEND_BONUS
  }

  // 분기 배당 = 연간 수익률 / 4
  return state.dealPrice * state.playerShares * effectiveYield / 4
}

/**
 * 랜덤 이벤트 생성 (분기별, 40% 확률)
 * weighted random selection from EVENTS
 */
export function generateAcquisitionEvent(
  state: AcquiredCompanyState,
  currentTick: number,
): AcquisitionEvent | null {
  // 확률 체크
  if (Math.random() > ACQUISITION_MGMT_CONFIG.EVENT_PROBABILITY) {
    return null
  }

  // Weighted random selection
  const events = ACQUISITION_MGMT_CONFIG.EVENTS
  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0)
  let roll = Math.random() * totalWeight

  for (const eventTemplate of events) {
    roll -= eventTemplate.weight
    if (roll <= 0) {
      return {
        id: `acq-evt-${state.companyId}-${currentTick}-${Math.random().toString(36).slice(2, 6)}`,
        type: eventTemplate.type,
        title: eventTemplate.title,
        description: eventTemplate.description,
        effect: { ...eventTemplate.effect },
        occurredAt: currentTick,
      }
    }
  }

  return null
}

/**
 * 이벤트 효과 적용
 */
export function applyEventEffect(
  state: AcquiredCompanyState,
  event: AcquisitionEvent,
): AcquiredCompanyState {
  const newProgress = Math.max(0, Math.min(100,
    state.integrationProgress + (event.effect.integrationDelta ?? 0),
  ))
  const newYield = Math.max(0,
    state.monthlyDividendYield + (event.effect.dividendYieldDelta ?? 0),
  )

  return {
    ...state,
    integrationProgress: newProgress,
    phase: getPhase(newProgress),
    monthlyDividendYield: newYield,
    events: [...state.events, event],
  }
}

/**
 * 인수 상태 초기화 (인수 실행 시)
 */
export function createAcquiredCompanyState(
  companyId: string,
  acquirerId: string,
  dealPrice: number,
  playerShares: number,
  currentTick: number,
): AcquiredCompanyState {
  return {
    companyId,
    acquirerId,
    dealPrice,
    playerShares,
    integrationProgress: 0,
    phase: 'restructuring',
    monthlyDividendYield: ACQUISITION_MGMT_CONFIG.BASE_DIVIDEND_YIELD,
    totalDividendsReceived: 0,
    events: [],
    startTick: currentTick,
  }
}
