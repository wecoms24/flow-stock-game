/* ── Adjacency Bonus: Pipeline Speed Bonus for Adjacent Placement ── */

import type { Employee, EmployeeRole } from '../../types'
import type { OfficeLayout } from '../../types/office'
import { TRADE_AI_CONFIG } from '../../config/tradeAIConfig'

/** 두 책상 간 인접 판정을 위한 최대 픽셀 거리 */
const ADJACENCY_DISTANCE_PX = 120

/**
 * Calculate adjacency bonus for a pipeline employee toward a target role.
 *
 * Uses the new OfficeLayout (desk-based, pixel position) system.
 * Two employees are "adjacent" when their desks are within ADJACENCY_DISTANCE_PX pixels.
 *
 * Returns 0.0 (no bonus) ~ ADJACENCY_SPEED_BONUS (0.30, max bonus).
 */
export function calculateAdjacencyBonus(
  sourceEmployee: Employee,
  targetRole: EmployeeRole,
  allEmployees: Employee[],
  officeLayout: OfficeLayout | undefined,
): number {
  // Early return if employee has no desk assignment or no layout
  if (!sourceEmployee.deskId || !officeLayout) return 0

  const sourceDesk = officeLayout.desks.find((d) => d.id === sourceEmployee.deskId)
  if (!sourceDesk) return 0

  // Find employees with the target role who are seated at desks
  const targetEmployees = allEmployees.filter(
    (e) => e.role === targetRole && e.deskId != null,
  )

  for (const target of targetEmployees) {
    const targetDesk = officeLayout.desks.find((d) => d.id === target.deskId)
    if (!targetDesk) continue

    // Euclidean distance between desk positions
    const dx = sourceDesk.position.x - targetDesk.position.x
    const dy = sourceDesk.position.y - targetDesk.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= ADJACENCY_DISTANCE_PX) {
      return TRADE_AI_CONFIG.ADJACENCY_SPEED_BONUS
    }
  }

  return 0
}

/**
 * Calculate full pipeline adjacency bonus by averaging all role-pair bonuses.
 *
 * Checks 2 adjacency pairs:
 * 1. Analyst → Manager
 * 2. Manager → Trader
 */
export function calculatePipelineAdjacencyBonus(
  analyst: Employee | null,
  manager: Employee | null,
  _trader: Employee | null,
  allEmployees: Employee[],
  officeLayout: OfficeLayout | undefined,
): number {
  let totalBonus = 0
  let pairCount = 0

  if (analyst) {
    totalBonus += calculateAdjacencyBonus(analyst, 'manager', allEmployees, officeLayout)
    pairCount++
  }

  if (manager) {
    totalBonus += calculateAdjacencyBonus(manager, 'trader', allEmployees, officeLayout)
    pairCount++
  }

  return pairCount > 0 ? totalBonus / pairCount : 0
}
