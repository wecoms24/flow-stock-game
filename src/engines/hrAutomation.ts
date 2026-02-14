import type { Employee, EmployeeSkills, HRReport } from '../types'

/* ── HR Manager Automation Engine ── */

export interface HRAutomationResult {
  updatedEmployees: Employee[]
  cashSpent: number
  reports: HRReport[]
  alerts: HRAlert[]
}

export interface HRAlert {
  title: string
  content: string
  criticalCount: number
  timestamp: number
}

/**
 * HR 매니저 자동화 - 매 50틱마다 호출
 * 1. 스트레스 높은 직원 자동 케어
 * 2. 분기별 스킬 훈련 (매 90일)
 * 3. 주간 보고서 생성 (매 7일)
 */
export function processHRAutomation(
  employees: Employee[],
  cash: number,
  gameDays: number,
): HRAutomationResult {
  const hrManager = employees.find((e) => e.role === 'hr_manager')
  if (!hrManager) {
    return { updatedEmployees: employees, cashSpent: 0, reports: [], alerts: [] }
  }

  let totalSpent = 0
  let remainingCash = cash
  const reports: HRReport[] = []
  const alerts: HRAlert[] = []
  const updated = employees.map((e) => ({ ...e }))

  // 1. 스트레스 관리 (스트레스 > 60인 직원 케어)
  const highStressEmployees = updated.filter(
    (e) => e.role !== 'hr_manager' && (e.stress ?? 0) > 60,
  )

  highStressEmployees.forEach((emp) => {
    const careCost = 50_000
    if (remainingCash >= careCost) {
      emp.stress = Math.max(0, (emp.stress ?? 0) - 15)
      emp.satisfaction = Math.min(100, (emp.satisfaction ?? 80) + 5)
      remainingCash -= careCost
      totalSpent += careCost

      reports.push({
        id: `hr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employeeId: emp.id,
        issue: 'high_stress',
        severity: (emp.stress ?? 0) > 80 ? 'high' : 'medium',
        recommendation: `${emp.name} 상담 제공 (-${careCost.toLocaleString()}원)`,
        timestamp: gameDays,
      })
    }
  })

  // 2. 분기별 스킬 훈련 (90일마다)
  if (gameDays > 0 && gameDays % 90 === 0) {
    updated
      .filter((e) => e.role !== 'hr_manager' && e.skills)
      .forEach((emp) => {
        const trainingCost = 100_000
        if (remainingCash >= trainingCost) {
          const skills = emp.skills as EmployeeSkills
          const skillKeys: (keyof EmployeeSkills)[] = ['analysis', 'trading', 'research']
          const targetSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)]
          const gain = Math.floor(Math.random() * 4) + 2

          skills[targetSkill] = Math.min(100, skills[targetSkill] + gain)
          remainingCash -= trainingCost
          totalSpent += trainingCost

          reports.push({
            id: `hr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            employeeId: emp.id,
            issue: 'skill_gap',
            severity: 'low',
            recommendation: `${emp.name} ${targetSkill} +${gain} 훈련`,
            timestamp: gameDays,
          })
        }
      })
  }

  // 3. 주간 보고서 (7일마다)
  if (gameDays > 0 && gameDays % 7 === 0) {
    const criticalEmployees = updated.filter(
      (e) =>
        e.role !== 'hr_manager' &&
        ((e.stress ?? 0) > 80 || (e.satisfaction ?? 80) < 30),
    )

    if (criticalEmployees.length > 0) {
      alerts.push({
        title: 'HR 주간 보고서',
        content: `${criticalEmployees.length}명의 직원이 긴급 관리가 필요합니다.`,
        criticalCount: criticalEmployees.length,
        timestamp: gameDays,
      })
    }
  }

  return {
    updatedEmployees: updated,
    cashSpent: totalSpent,
    reports,
    alerts,
  }
}
