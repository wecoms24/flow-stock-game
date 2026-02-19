/**
 * Hybrid Mode Configuration
 * ==========================
 * KOSPI 실제 데이터 하이브리드 모드의 보정 강도 설정.
 *
 * correctionDrift = ln(targetClose / currentPrice) * correctionStrength
 * - 위기 시 (IMF, 리먼, 코로나): 강한 보정으로 실제 하락폭 근처로 수렴
 * - 평시: 느슨한 보정으로 GBM 변동성 유지하면서 방향만 유도
 */

export const HYBRID_MODE_CONFIG = {
  /** 위기 시 보정 강도 (IMF, 리먼, 코로나 등 대형 이벤트) */
  CRISIS_CORRECTION_STRENGTH: 0.8,

  /** 평시 보정 강도 */
  NORMAL_CORRECTION_STRENGTH: 0.15,

  /** 위기 판정 기준: 활성 이벤트의 drift 절대값 합이 이 값 이상이면 위기 */
  MAJOR_EVENT_DRIFT_THRESHOLD: 0.10,

  /** correctionDrift 상한 (Worker의 MAX_DRIFT=0.1에 추가되므로) */
  MAX_CORRECTION_DRIFT: 0.15,
} as const
