/* ── VI (Volatility Interruption) Engine ── */

import type { Company } from '../types'
import { VI_CONFIG } from '../config/priceLimit'

/**
 * Check if VI should trigger for a company
 * VI triggers when price changes ±3% within 3 ticks (1 minute)
 */
export function checkVITrigger(company: Company): boolean {
  // Skip if already in VI or cooldown
  if (company.viTriggered || (company.viCooldown ?? 0) > 0) {
    return false
  }

  // Need at least 3 price points for detection
  const recentPrices = company.viRecentPrices ?? []
  if (recentPrices.length < VI_CONFIG.DETECTION_WINDOW) {
    return false
  }

  // Check price change from oldest to newest in window
  const oldestPrice = recentPrices[0]
  const currentPrice = company.price

  const priceChange = Math.abs((currentPrice - oldestPrice) / oldestPrice)

  return priceChange >= VI_CONFIG.THRESHOLD
}

/**
 * Update VI state for a company
 * - Track recent prices for VI detection
 * - Manage VI halt and cooldown
 */
export function updateVIState(company: Company, newPrice: number): Company {
  // Update recent prices (sliding window of 3)
  const recentPrices = company.viRecentPrices ?? []
  const updatedPrices = [...recentPrices, newPrice].slice(-VI_CONFIG.DETECTION_WINDOW)

  let viTriggered = company.viTriggered ?? false
  let viCooldown = company.viCooldown ?? 0

  // VI halt active → decrement halt timer, then transition to cooldown
  if (viTriggered) {
    viCooldown -= 1
    if (viCooldown <= 0) {
      viTriggered = false
      viCooldown = VI_CONFIG.COOLDOWN_AFTER_HALT
    }
  } else if (viCooldown > 0) {
    // Post-halt cooldown → decrement until next VI can trigger
    viCooldown -= 1
  }

  return {
    ...company,
    viRecentPrices: updatedPrices,
    viTriggered,
    viCooldown,
  }
}

/**
 * Trigger VI halt for a company
 */
export function triggerVI(company: Company): Company {
  return {
    ...company,
    viTriggered: true,
    viCooldown: VI_CONFIG.HALT_DURATION,
  }
}

/**
 * Check if trading is halted due to VI
 */
export function isVIHalted(company: Company): boolean {
  return company.viTriggered === true && (company.viCooldown ?? 0) > 0
}

/**
 * Get remaining VI halt time in ticks
 */
export function getVIRemainingTicks(company: Company): number {
  if (!company.viTriggered) return 0
  return Math.max(0, company.viCooldown ?? 0)
}

/**
 * Reset VI state at session open
 */
export function resetVIForNewDay(company: Company): Company {
  return {
    ...company,
    viTriggered: false,
    viCooldown: 0,
    viRecentPrices: [],
  }
}
