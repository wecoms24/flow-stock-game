import type { Employee, EmployeeTrait, EmployeeSkills } from '../types'
import type { GridCell, BuffEffect, OfficeGrid } from '../types/office'
import { TRAIT_DEFINITIONS } from '../data/traits'

/* ── Employee Buff Result ── */

export interface EmployeeBuffs {
  staminaRecovery: number
  stressGeneration: number
  skillGrowth: number
  tradingSpeed: number
  morale: number
}

/* ── Buff Calculation ── */

/**
 * 직원별 종합 버프 계산
 * - 가구 버프 + 성격 태그 효과 + 인접 직원 상호작용
 */
export function calculateEmployeeBuffs(
  employee: Employee,
  seatCell: GridCell,
  adjacentEmployees: Employee[],
): EmployeeBuffs {
  const buffs: EmployeeBuffs = {
    staminaRecovery: 1.0,
    stressGeneration: 1.0,
    skillGrowth: 1.0,
    tradingSpeed: 1.0,
    morale: 1.0,
  }

  // 1. 가구 버프 적용
  seatCell.buffs.forEach((buff) => {
    applyBuff(buffs, buff)
  })

  // 2. 성격 태그 효과 적용
  employee.traits?.forEach((trait) => {
    applyTraitEffects(buffs, trait, seatCell, adjacentEmployees)
  })

  // 3. 인접 직원 상호작용
  adjacentEmployees.forEach((adj) => {
    applyEmployeeInteraction(buffs, employee, adj)
  })

  return buffs
}

function applyBuff(buffs: EmployeeBuffs, buff: BuffEffect): void {
  switch (buff.type) {
    case 'stamina_recovery':
      buffs.staminaRecovery *= buff.value
      break
    case 'stress_reduction':
      buffs.stressGeneration *= buff.value
      break
    case 'skill_growth':
      buffs.skillGrowth *= buff.value
      break
    case 'trading_speed':
      buffs.tradingSpeed *= buff.value
      break
    case 'morale':
      buffs.morale *= buff.value
      break
  }
}

function applyTraitEffects(
  buffs: EmployeeBuffs,
  trait: EmployeeTrait,
  seatCell: GridCell,
  adjacentEmployees: Employee[],
): void {
  const config = TRAIT_DEFINITIONS[trait]
  const effects = config.effects

  // 기본 효과
  if (effects.staminaRecovery) {
    buffs.staminaRecovery *= effects.staminaRecovery
  }
  if (effects.stressGeneration) {
    buffs.stressGeneration *= effects.stressGeneration
  }
  if (effects.skillGrowth) {
    buffs.skillGrowth *= effects.skillGrowth
  }

  // 조건부 효과: 카페인 중독자에게 커피 없으면 스트레스 증가
  if (effects.requiresCoffee) {
    const hasCoffee = seatCell.buffs.some(
      (b) => b.type === 'stamina_recovery' && b.value > 1.0,
    )
    if (!hasCoffee) {
      buffs.stressGeneration *= 1.3
    }
  }

  // 조건부 효과: 소음 민감도 (서버 랙 근처)
  if (effects.noiseIntolerance) {
    const hasNoise = seatCell.buffs.some(
      (b) => b.type === 'trading_speed' && b.value > 1.0,
    )
    if (hasNoise) {
      buffs.stressGeneration *= effects.noiseIntolerance
    }
  }

  // 조건부 효과: 조용한 환경 필요 (시끄러운 이웃)
  if (effects.requiresQuiet) {
    const noisyNeighbors = adjacentEmployees.filter((e) => e.role === 'trader')
    if (noisyNeighbors.length > 0) {
      buffs.stressGeneration *= 1.5
    }
  }
}

function applyEmployeeInteraction(
  buffs: EmployeeBuffs,
  employee: Employee,
  adjacent: Employee,
): void {
  // sensitive + 트레이더(시끄러운)
  if (employee.traits?.includes('sensitive') && adjacent.role === 'trader') {
    buffs.stressGeneration *= 1.5
  }

  // social → 인접 직원당 사기 증가
  if (employee.traits?.includes('social')) {
    buffs.morale *= 1.05
  }

  // introvert → 주변에 사람 많으면 스트레스
  if (employee.traits?.includes('introvert')) {
    buffs.stressGeneration *= 1.1
  }
}

/* ── Adjacent Employee Finder ── */

function getAdjacentEmployees(
  seatIndex: number,
  allEmployees: Employee[],
  grid: OfficeGrid,
): Employee[] {
  const x = seatIndex % grid.size.width
  const y = Math.floor(seatIndex / grid.size.width)

  const adjacent: Employee[] = []
  const directions = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ]

  directions.forEach(({ dx, dy }) => {
    const nx = x + dx
    const ny = y + dy

    if (nx >= 0 && nx < grid.size.width && ny >= 0 && ny < grid.size.height) {
      const cell = grid.cells[ny][nx]
      if (cell.occupiedBy) {
        const emp = allEmployees.find((e) => e.id === cell.occupiedBy)
        if (emp) adjacent.push(emp)
      }
    }
  })

  return adjacent
}

/* ── Office System Tick Update ── */

/** 매 10틱마다 호출 - 직원 스트레스/만족도/스킬 업데이트 */
export function updateOfficeSystem(
  employees: Employee[],
  officeGrid: OfficeGrid | undefined,
): {
  updatedEmployees: Employee[]
  resignedIds: string[]
  warnings: Array<{ employeeId: string; name: string; type: 'resign_warning' }>
} {
  const resignedIds: string[] = []
  const warnings: Array<{ employeeId: string; name: string; type: 'resign_warning' }> = []

  const updatedEmployees = employees.map((employee) => {
    const emp = { ...employee }

    // 스킬 초기화 (없으면)
    if (!emp.skills) {
      emp.skills = { analysis: 30, trading: 30, research: 30 }
    }
    if (emp.stress === undefined) emp.stress = 0
    if (emp.satisfaction === undefined) emp.satisfaction = 80

    // 좌석 배치된 직원만 그리드 버프 적용
    if (emp.seatIndex != null && officeGrid) {
      const seatY = Math.floor(emp.seatIndex / officeGrid.size.width)
      const seatX = emp.seatIndex % officeGrid.size.width
      const seatCell = officeGrid.cells[seatY]?.[seatX]

      if (seatCell) {
        const adjacentEmployees = getAdjacentEmployees(
          emp.seatIndex,
          employees,
          officeGrid,
        )
        const buffs = calculateEmployeeBuffs(emp, seatCell, adjacentEmployees)

        // 스태미너 회복 (버프 적용)
        emp.stamina = Math.min(emp.maxStamina, emp.stamina + 0.1 * buffs.staminaRecovery)

        // 스트레스 증가 (버프 적용)
        emp.stress = Math.min(100, emp.stress + 0.03 * buffs.stressGeneration)

        // 스킬 성장 (버프 적용, 느린 속도)
        const growthRate = 0.005 * buffs.skillGrowth
        const skills = emp.skills as EmployeeSkills
        const roleGrowthFocus: Record<string, keyof EmployeeSkills> = {
          analyst: 'analysis',
          trader: 'trading',
          manager: 'research',
          intern: 'analysis',
          ceo: 'analysis',
          hr_manager: 'research',
        }
        const focusSkill = roleGrowthFocus[emp.role] || 'analysis'
        skills[focusSkill] = Math.min(100, skills[focusSkill] + growthRate)

        // 부수 스킬도 아주 조금 성장
        Object.keys(skills).forEach((key) => {
          const k = key as keyof EmployeeSkills
          if (k !== focusSkill) {
            skills[k] = Math.min(100, skills[k] + growthRate * 0.3)
          }
        })
      }
    } else {
      // 미배치 직원: 기본 스트레스 감소, 스태미너 천천히 회복
      emp.stamina = Math.min(emp.maxStamina, emp.stamina + 0.05)
      emp.stress = Math.max(0, emp.stress - 0.02)
    }

    // 만족도 계산 (스트레스 기반)
    const targetStress = 30
    const stressDiff = emp.stress - targetStress
    emp.satisfaction = Math.max(
      0,
      Math.min(100, emp.satisfaction - stressDiff * 0.005),
    )

    // 퇴사 경고
    if (emp.satisfaction < 20 && emp.satisfaction >= 10) {
      warnings.push({
        employeeId: emp.id,
        name: emp.name,
        type: 'resign_warning',
      })
    }

    // 자동 퇴사 (만족도 10 미만)
    if (emp.satisfaction < 10) {
      resignedIds.push(emp.id)
    }

    return emp
  })

  return {
    updatedEmployees: updatedEmployees.filter((e) => !resignedIds.includes(e.id)),
    resignedIds,
    warnings,
  }
}
