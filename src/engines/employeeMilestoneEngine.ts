/**
 * Employee Milestone Engine
 *
 * 직원 개인 성장 마일스톤 체크 — processMonthly()에서 호출
 * 순수 함수: 상태를 직접 변경하지 않고 결과만 반환
 */

import type { Employee } from '../types'
import type { EmployeeBio, LifeEvent } from '../types/employeeBio'
import { EMPLOYEE_MILESTONES, type EmployeeMilestoneDefinition } from '../data/employeeMilestones'

export interface MilestoneCheckResult {
  employeeId: string
  employeeName: string
  newMilestones: EmployeeMilestoneDefinition[]
  lifeEvents: LifeEvent[]
  totalSatisfactionBonus: number
  totalStressReduction: number
  totalXpBonus: number
}

/**
 * 직원의 마일스톤을 체크하고 새로 달성한 마일스톤을 반환
 */
export function checkEmployeeMilestones(
  employee: Employee,
  bio: EmployeeBio,
  currentTick: number,
): MilestoneCheckResult {
  const unlocked = bio.unlockedMilestones ?? []
  const newMilestones: EmployeeMilestoneDefinition[] = []
  const lifeEvents: LifeEvent[] = []
  let totalSatisfactionBonus = 0
  let totalStressReduction = 0
  let totalXpBonus = 0

  for (const milestone of EMPLOYEE_MILESTONES) {
    if (unlocked.includes(milestone.id)) continue
    if (!milestone.condition(employee, bio)) continue

    newMilestones.push(milestone)

    lifeEvents.push({
      id: `evt_milestone_${milestone.id}_${employee.id}`,
      type: milestone.category === 'tenure' ? 'anniversary' : 'trade_milestone',
      title: `${milestone.icon} ${milestone.title}`,
      description: milestone.description,
      occurredAtTick: currentTick,
      emotionalImpact: 'proud',
    })

    if (milestone.reward) {
      totalSatisfactionBonus += milestone.reward.satisfactionBonus ?? 0
      totalStressReduction += milestone.reward.stressReduction ?? 0
      totalXpBonus += milestone.reward.xpBonus ?? 0
    }
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    newMilestones,
    lifeEvents,
    totalSatisfactionBonus,
    totalStressReduction,
    totalXpBonus,
  }
}

/**
 * PnL 기여도 업데이트용 순수 함수
 * 거래 실행 후 관련 직원들의 bio를 업데이트할 데이터 계산
 */
export function calculatePnlAttribution(
  pnl: number,
  ticker: string,
  involvedEmployeeIds: string[],
): Array<{
  employeeId: string
  pnlShare: number
  ticker: string
}> {
  if (involvedEmployeeIds.length === 0) return []

  const share = pnl / involvedEmployeeIds.length
  return involvedEmployeeIds.map((id) => ({
    employeeId: id,
    pnlShare: share,
    ticker,
  }))
}
