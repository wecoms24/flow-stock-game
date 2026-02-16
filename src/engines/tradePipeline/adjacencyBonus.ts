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
 * Algorithm:
 * 1. Convert seatIndex to 2D grid coordinates (x, y)
 * 2. Check 4 adjacent cells (Manhattan distance = 1): up, down, left, right
 *    - Diagonal cells are NOT considered adjacent
 * 3. If any adjacent cell contains an employee with targetRole, return full bonus (30%)
 * 4. Otherwise, return 0 (no bonus)
 *
 * Binary bonus system:
 * - Direct adjacency (Manhattan distance = 1): 100% of ADJACENCY_SPEED_BONUS (0.30)
 * - No adjacency: 0% (0.0)
 * - No gradual bonus for distance 2, 3, etc.
 *
 * Examples:
 * - Analyst at (2,3) next to Manager at (2,4) → bonus = 0.30
 * - Analyst at (2,3) next to Manager at (3,4) (diagonal) → bonus = 0.0
 * - Analyst at (2,3) with no Manager nearby → bonus = 0.0
 *
 * Effects of bonus:
 * - Analyst: Confidence threshold lowered → more proposals generated
 * - Manager: Processes 2 proposals per tick instead of 1
 * - Trader: Reduced slippage on execution
 *
 * Returns 0.0 (no bonus) ~ ADJACENCY_SPEED_BONUS (0.30, max bonus).
 */
export function calculateAdjacencyBonus(
  sourceEmployee: Employee,
  targetRole: EmployeeRole,
  allEmployees: Employee[],
  officeGrid: OfficeGrid,
): number {
  // Early return if employee has no seat assignment
  if (sourceEmployee.seatIndex == null) return 0

  // getAdjacentEmployees checks 4 directions (up, down, left, right) at Manhattan distance = 1
  const adjacents = getAdjacentEmployees(sourceEmployee.seatIndex, allEmployees, officeGrid)
  const hasTargetRole = adjacents.some((e) => e.role === targetRole)

  return hasTargetRole ? TRADE_AI_CONFIG.ADJACENCY_SPEED_BONUS : 0
}

/**
 * Calculate full pipeline adjacency bonus by averaging all role-pair bonuses.
 *
 * The Trade AI Pipeline consists of 3 roles: Analyst → Manager → Trader
 * This function checks 2 adjacency pairs and returns their average bonus:
 * 1. Analyst → Manager: Does Analyst sit next to Manager?
 * 2. Manager → Trader: Does Manager sit next to Trader?
 *
 * Average calculation rationale:
 * - If only 1 pair exists (e.g., no Analyst), use that pair's bonus (pairCount = 1)
 * - If both pairs exist, average the two bonuses (pairCount = 2)
 * - If no employees exist, return 0
 *
 * Examples:
 * - Analyst next to Manager (0.30), Manager NOT next to Trader (0.0)
 *   → totalBonus = 0.30 + 0.0 = 0.30, pairCount = 2
 *   → average = 0.30 / 2 = 0.15 (15% pipeline bonus)
 *
 * - Analyst next to Manager (0.30), no Manager exists
 *   → totalBonus = 0.30, pairCount = 1
 *   → average = 0.30 / 1 = 0.30 (30% pipeline bonus from single pair)
 *
 * - Both pairs adjacent (0.30 + 0.30)
 *   → totalBonus = 0.60, pairCount = 2
 *   → average = 0.60 / 2 = 0.30 (30% max pipeline bonus)
 *
 * Note: _trader parameter is unused because we check Manager→Trader adjacency
 * from Manager's perspective, not Trader's.
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

  // Analyst → Manager adjacency check
  // If Analyst sits next to a Manager, add 0.30 (or 0 if not adjacent)
  if (analyst) {
    totalBonus += calculateAdjacencyBonus(analyst, 'manager', allEmployees, officeGrid)
    pairCount++
  }

  // Manager → Trader adjacency check
  // If Manager sits next to a Trader, add 0.30 (or 0 if not adjacent)
  if (manager) {
    totalBonus += calculateAdjacencyBonus(manager, 'trader', allEmployees, officeGrid)
    pairCount++
  }

  // Return average bonus across all valid pairs
  // pairCount prevents division by zero when no employees exist
  return pairCount > 0 ? totalBonus / pairCount : 0
}
