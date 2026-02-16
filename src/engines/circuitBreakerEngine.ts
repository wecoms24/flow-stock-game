/* ── Circuit Breaker Engine (KOSPI-based) ── */

import type { GameTime } from '../types'
import { CIRCUIT_BREAKER_CONFIG } from '../config/priceLimit'

/**
 * Circuit Breaker State (시장 전체 거래 정지)
 * Based on KOSPI index movement from session open
 */
export interface CircuitBreakerState {
  level: 0 | 1 | 2 | 3 // 0 = inactive, 1-3 = circuit breaker levels
  isActive: boolean
  remainingTicks: number // Ticks remaining in halt
  triggeredAt: GameTime | null
  kospiSessionOpen: number // KOSPI index at session open
  kospiCurrent: number // Current KOSPI index
}

/**
 * Initialize circuit breaker state
 */
export function initializeCircuitBreakerState(): CircuitBreakerState {
  return {
    level: 0,
    isActive: false,
    remainingTicks: 0,
    triggeredAt: null,
    kospiSessionOpen: 100, // Base index
    kospiCurrent: 100,
  }
}

/**
 * Calculate KOSPI-like market index from all companies
 * Weighted by market cap
 */
export function calculateKOSPIIndex(
  companies: Array<{ price: number; basePrice: number; marketCap: number }>
): number {
  if (companies.length === 0) return 100

  const totalMarketCap = companies.reduce((sum, c) => sum + c.marketCap, 0)

  if (totalMarketCap === 0) return 100

  // Calculate weighted average price change
  const weightedReturn = companies.reduce((sum, c) => {
    const priceChange = (c.price - c.basePrice) / c.basePrice
    const weight = c.marketCap / totalMarketCap
    return sum + priceChange * weight
  }, 0)

  // Return index (base 100)
  return 100 * (1 + weightedReturn)
}

/**
 * Check if circuit breaker should trigger
 * Returns new circuit breaker state
 */
export function checkCircuitBreaker(
  kospiIndex: number,
  kospiSessionOpen: number,
  currentState: CircuitBreakerState,
  currentTime: GameTime
): CircuitBreakerState {
  // If already active, just decrement remaining ticks
  if (currentState.isActive && currentState.remainingTicks > 0) {
    return {
      ...currentState,
      remainingTicks: Math.max(0, currentState.remainingTicks - 1),
      isActive: currentState.remainingTicks > 1,
      kospiCurrent: kospiIndex,
    }
  }

  // Calculate daily return
  const dailyReturn = (kospiIndex - kospiSessionOpen) / kospiSessionOpen

  // Check circuit breaker levels (descending order for correct level detection)
  if (dailyReturn <= CIRCUIT_BREAKER_CONFIG.LEVEL_3.threshold) {
    return {
      level: 3,
      isActive: true,
      remainingTicks: CIRCUIT_BREAKER_CONFIG.LEVEL_3.haltDuration,
      triggeredAt: currentTime,
      kospiSessionOpen,
      kospiCurrent: kospiIndex,
    }
  } else if (dailyReturn <= CIRCUIT_BREAKER_CONFIG.LEVEL_2.threshold) {
    return {
      level: 2,
      isActive: true,
      remainingTicks: CIRCUIT_BREAKER_CONFIG.LEVEL_2.haltDuration,
      triggeredAt: currentTime,
      kospiSessionOpen,
      kospiCurrent: kospiIndex,
    }
  } else if (dailyReturn <= CIRCUIT_BREAKER_CONFIG.LEVEL_1.threshold) {
    return {
      level: 1,
      isActive: true,
      remainingTicks: CIRCUIT_BREAKER_CONFIG.LEVEL_1.haltDuration,
      triggeredAt: currentTime,
      kospiSessionOpen,
      kospiCurrent: kospiIndex,
    }
  }

  // No circuit breaker - update KOSPI tracking
  return {
    level: 0,
    isActive: false,
    remainingTicks: 0,
    triggeredAt: null,
    kospiSessionOpen,
    kospiCurrent: kospiIndex,
  }
}

/**
 * Reset circuit breaker at session open (9:00)
 */
export function resetCircuitBreakerForNewDay(
  kospiIndex: number
): CircuitBreakerState {
  return {
    level: 0,
    isActive: false,
    remainingTicks: 0,
    triggeredAt: null,
    kospiSessionOpen: kospiIndex,
    kospiCurrent: kospiIndex,
  }
}

/**
 * Check if trading is halted due to circuit breaker
 */
export function isTradingHalted(state: CircuitBreakerState): boolean {
  return state.isActive && state.remainingTicks > 0
}

/**
 * Get user-friendly circuit breaker status message
 */
export function getCircuitBreakerMessage(state: CircuitBreakerState): string {
  if (!state.isActive) return ''

  const dailyReturn = ((state.kospiCurrent - state.kospiSessionOpen) / state.kospiSessionOpen) * 100

  if (state.level === 3) {
    return `🚨 서킷브레이커 Level 3 발동 (KOSPI ${dailyReturn.toFixed(1)}%) - 장 마감`
  } else if (state.level === 2) {
    return `🚨 서킷브레이커 Level 2 발동 (KOSPI ${dailyReturn.toFixed(1)}%) - ${state.remainingTicks}분 거래정지`
  } else if (state.level === 1) {
    return `🚨 서킷브레이커 Level 1 발동 (KOSPI ${dailyReturn.toFixed(1)}%) - ${state.remainingTicks}분 거래정지`
  }

  return ''
}
