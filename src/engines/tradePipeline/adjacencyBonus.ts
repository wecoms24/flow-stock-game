/* ── Adjacency Bonus: Pipeline Speed Bonus for Adjacent Placement ── */

import type { Employee, EmployeeRole } from '../../types'
import type { OfficeGrid } from '../../types/office'
import { getAdjacentEmployees } from '../officeSystem'
import { TRADE_AI_CONFIG } from '../../config/tradeAIConfig'

/**
 * Calculate adjacency bonus for a pipeline employee toward a target role.
 *
 * When an Analyst sits next to a Manager (or Manager next to a Trader),
 * the pipeline processing speed gets a bonus up to ADJACENCY_SPEED_BONUS (30%).
 *
 * Returns 0.0 (no bonus) ~ ADJACENCY_SPEED_BONUS (max bonus).
 * Direct adjacency = full bonus, no adjacency = 0.
 */
export function calculateAdjacencyBonus(
  sourceEmployee: Employee,
  targetRole: EmployeeRole,
  allEmployees: Employee[],
  officeGrid: OfficeGrid,
): number {
  if (sourceEmployee.seatIndex == null) return 0

  const adjacents = getAdjacentEmployees(sourceEmployee.seatIndex, allEmployees, officeGrid)
  const hasTargetRole = adjacents.some((e) => e.role === targetRole)

  return hasTargetRole ? TRADE_AI_CONFIG.ADJACENCY_SPEED_BONUS : 0
}

/**
 * Calculate full pipeline adjacency bonus.
 *
 * Checks Analyst→Manager and Manager→Trader adjacency, then averages
 * to produce an overall speed bonus for the pipeline team.
 */
export function calculatePipelineAdjacencyBonus(
  analyst: Employee | null,
  manager: Employee | null,
  _trader: Employee | null,
  allEmployees: Employee[],
  officeGrid: OfficeGrid,
): number {
  let totalBonus = 0
  let pairCount = 0

  // Analyst → Manager adjacency
  if (analyst) {
    totalBonus += calculateAdjacencyBonus(analyst, 'manager', allEmployees, officeGrid)
    pairCount++
  }

  // Manager → Trader adjacency
  if (manager) {
    totalBonus += calculateAdjacencyBonus(manager, 'trader', allEmployees, officeGrid)
    pairCount++
  }

  return pairCount > 0 ? totalBonus / pairCount : 0
}
