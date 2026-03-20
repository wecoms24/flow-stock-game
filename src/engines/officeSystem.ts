import type { Employee, EmployeeTrait, EmployeeSkills, GameTime, MarketRegime, Company } from '../types'
import type { GridCell, BuffEffect, OfficeGrid } from '../types/office'
import { TRAIT_DEFINITIONS } from '../data/traits'
import { findActiveSynergies, aggregateSynergyEffects } from '../data/traitSynergies'
import { EMPLOYEE_BALANCE, STRESS_AI } from '../config/balanceConfig'
import { decideAction, getActionEffects, type EmployeeBehavior } from './employeeBehavior'
import { checkInteractions, type Interaction } from './employeeInteraction'

/* ── Employee Buff Result ── */

export interface EmployeeBuffs {
  staminaRecovery: number
  stressGeneration: number
  skillGrowth: number
  tradingSpeed: number
  morale: number
}

/* ── Office Event (히스토리 로그용) ── */

export interface OfficeEvent {
  timestamp: number // 절대 틱
  type: 'behavior' | 'interaction' | 'warning' | 'resign'
  emoji: string
  message: string
  employeeIds: string[]
  hour?: number
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

  // 4. ✨ Phase 6: Trait 시너지/갈등 효과 적용
  applySynergyEffects(buffs, employee)

  return buffs
}

/**
 * ✨ Phase 6: Trait 시너지/갈등 효과를 버프에 적용
 */
function applySynergyEffects(buffs: EmployeeBuffs, employee: Employee): void {
  const traits = employee.traits
  if (!traits || traits.length < 2) return

  const synergies = findActiveSynergies(traits)
  if (synergies.length === 0) return

  const effects = aggregateSynergyEffects(synergies)

  if (effects.skillGrowth) buffs.skillGrowth *= effects.skillGrowth
  if (effects.stressMultiplier) buffs.stressGeneration *= effects.stressMultiplier
  if (effects.moralSpread) buffs.morale *= effects.moralSpread
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

  // 조건부 효과: 카페인 중독자 — 커피 있으면 회복 1.5배, 없으면 스트레스 증가
  if (effects.requiresCoffee) {
    const hasCoffee = seatCell.buffs.some(
      (b) => b.type === 'stamina_recovery' && b.value > 1.0,
    )
    if (hasCoffee) {
      buffs.staminaRecovery *= 1.5
    } else {
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

  // ✨ Phase 8: mentor trait — 인접 주니어(level<10) 스킬 성장 +20%
  if (adjacent.traits?.includes('mentor') && (employee.level ?? 1) < 10) {
    buffs.skillGrowth *= 1.2
  }

  // ✨ Phase 8: empathetic trait — 팀 사기 전파 +50%, 이웃 스트레스 흡수
  if (adjacent.traits?.includes('empathetic')) {
    buffs.morale *= 1.5
    buffs.stressGeneration *= 0.85 // 이웃 스트레스 15% 감소
  }
}

/* ── Adjacent Employee Finder ── */

export function getAdjacentEmployees(
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

/* ── Market Stress Calculation ── */

/**
 * 시장 레짐에 따른 스트레스 축적률 계산
 * CRISIS → 기본률 * 2.5배, VOLATILE → 1.5배, CALM → 기본률
 */
export function calculateMarketStress(marketRegime?: MarketRegime): number {
  if (!marketRegime) return STRESS_AI.BASE_RATE

  switch (marketRegime) {
    case 'CRISIS':
      return STRESS_AI.BASE_RATE * STRESS_AI.MARKET_CRISIS_MULTIPLIER
    case 'VOLATILE':
      return STRESS_AI.BASE_RATE * STRESS_AI.MARKET_VOLATILE_MULTIPLIER
    case 'CALM':
    default:
      return STRESS_AI.BASE_RATE
  }
}

/**
 * 직원이 관련된 포지션의 손실에 따른 추가 스트레스 계산
 * 애널리스트가 제안한 종목이 큰 손실을 보고 있으면 추가 스트레스 발생
 */
export function calculatePositionLossStress(
  employee: Employee,
  companies: Company[],
  portfolio: Record<string, { avgBuyPrice: number; shares: number }>,
): number {
  // 트레이더/매니저/애널리스트만 포지션 손실에 스트레스를 받음
  const stressRoles = ['analyst', 'trader', 'manager']
  if (!stressRoles.includes(employee.role)) return 0

  let maxLossRate = 0
  for (const [companyId, position] of Object.entries(portfolio)) {
    if (position.shares <= 0) continue
    const company = companies.find((c) => c.id === companyId)
    if (!company) continue

    const lossRate = (company.price - position.avgBuyPrice) / position.avgBuyPrice
    if (lossRate < maxLossRate) {
      maxLossRate = lossRate
    }
  }

  // 손실률이 임계값 이하면 추가 스트레스 발생 (심각도에 비례)
  if (maxLossRate <= STRESS_AI.POSITION_LOSS_THRESHOLD) {
    const severity = Math.abs(maxLossRate) / Math.abs(STRESS_AI.POSITION_LOSS_THRESHOLD)
    return Math.min(STRESS_AI.POSITION_LOSS_STRESS * severity, 0.20)
  }

  return 0
}

/**
 * 팀 사기 전파: 인접 직원(Manhattan distance ≤ 2)의 평균 스트레스가 높으면 전파
 * 반환값: 전파로 인한 추가 스트레스 (양수) 또는 감소 (음수)
 */
export function calculateTeamMoraleSpread(
  employee: Employee,
  allEmployees: Employee[],
  officeGrid: OfficeGrid,
): number {
  if (employee.seatIndex == null) return 0

  const x = employee.seatIndex % officeGrid.size.width
  const y = Math.floor(employee.seatIndex / officeGrid.size.width)

  // Manhattan distance ≤ 2 범위의 직원 찾기
  const nearbyEmployees: Employee[] = []
  for (const emp of allEmployees) {
    if (emp.id === employee.id || emp.seatIndex == null) continue
    const ex = emp.seatIndex % officeGrid.size.width
    const ey = Math.floor(emp.seatIndex / officeGrid.size.width)
    const dist = Math.abs(x - ex) + Math.abs(y - ey)
    if (dist <= 2) {
      nearbyEmployees.push(emp)
    }
  }

  if (nearbyEmployees.length === 0) return 0

  const avgNearbyStress = nearbyEmployees.reduce((sum, e) => sum + (e.stress ?? 0), 0) / nearbyEmployees.length
  const myStress = employee.stress ?? 0
  const stressDiff = avgNearbyStress - myStress

  // 주변 평균 스트레스가 내 스트레스보다 높으면 전파 (양방향)
  return stressDiff * STRESS_AI.TEAM_MORALE_SPREAD * 0.1 // 0.1 스케일링으로 틱당 적절한 영향
}

/* ── Office System Tick Update ── */

export interface OfficeUpdateResult {
  updatedEmployees: Employee[]
  resignedIds: string[]
  warnings: Array<{ employeeId: string; name: string; type: 'resign_warning' }>
  behaviors: EmployeeBehavior[]
  interactions: Interaction[]
  officeEvents: OfficeEvent[]
}

/** 매 10틱마다 호출 - 직원 스트레스/만족도/스킬 업데이트 + 행동 AI + 상호작용 */
export function updateOfficeSystem(
  employees: Employee[],
  officeGrid: OfficeGrid | undefined,
  time?: GameTime,
  marketRegime?: MarketRegime,
  companies?: Company[],
  portfolio?: Record<string, { avgBuyPrice: number; shares: number }>,
  respecDebuffs?: Record<string, number | undefined>, // employeeId → debuffUntilMonth
  startYear: number = 1995,
): OfficeUpdateResult {
  const resignedIds: string[] = []
  const warnings: Array<{ employeeId: string; name: string; type: 'resign_warning' }> = []
  const allBehaviors: EmployeeBehavior[] = []
  const allInteractions: Interaction[] = []
  const officeEvents: OfficeEvent[] = []

  // 절대 타임스탬프 계산 (쿨다운용) — time 없으면 Date.now()로 폴백 (쿨다운 비교 안전)
  const absoluteTick = time
    ? (time.year - 1995) * 360 * 10 + (time.month - 1) * 30 * 10 + (time.day - 1) * 10 + (time.hour - 9)
    : Date.now()

  const updatedEmployees = employees.map((employee) => {
    const emp = { ...employee }

    // 스킬 deep copy (원본 참조 변형 방지)
    emp.skills = emp.skills
      ? { ...emp.skills }
      : { analysis: 30, trading: 30, research: 30 }
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

        // 4. 행동 AI 결정
        if (time) {
          const behavior = decideAction(emp, adjacentEmployees, time, marketRegime)
          allBehaviors.push(behavior)

          // 시장 상황 기반 스트레스 계산
          const marketStress = calculateMarketStress(marketRegime)

          // 포지션 손실 기반 스트레스 계산
          const positionLossStress = (companies && portfolio)
            ? calculatePositionLossStress(emp, companies, portfolio)
            : 0

          // 팀 사기 전파 계산
          const teamMoraleStress = officeGrid
            ? calculateTeamMoraleSpread(emp, employees, officeGrid)
            : 0

          // 번아웃 체크 및 진입/유지/해제
          const currentBurnoutTicks = emp.burnoutTicks ?? 0
          if (currentBurnoutTicks > 0) {
            // 번아웃 유지 중 — 틱 카운터 증가
            emp.burnoutTicks = currentBurnoutTicks + 1

            // 번아웃 해제 조건: 최소 틱 경과 AND 스트레스 < 임계값
            if (currentBurnoutTicks >= STRESS_AI.BURNOUT_MIN_TICKS && emp.stress < STRESS_AI.BURNOUT_THRESHOLD) {
              emp.burnoutTicks = 0
              emp.stress = STRESS_AI.BURNOUT_RECOVERY_STRESS

              officeEvents.push({
                timestamp: absoluteTick,
                type: 'behavior',
                emoji: '💪',
                message: `${emp.name}: 번아웃에서 회복했습니다!`,
                employeeIds: [emp.id],
              })
            }
          } else if (emp.stress >= STRESS_AI.BURNOUT_THRESHOLD) {
            // 번아웃 진입
            emp.burnoutTicks = 1

            officeEvents.push({
              timestamp: absoluteTick,
              type: 'warning',
              emoji: '🔥',
              message: `${emp.name}: 번아웃 상태에 진입했습니다! 회복이 필요합니다.`,
              employeeIds: [emp.id],
            })
          }

          // 행동 효과 적용
          const actionEffects = getActionEffects(behavior.action)

          // 스트레스: 번아웃 중에는 외부 스트레스 차단 (행동 효과만 적용 → 자연 회복)
          const totalStressDelta = (emp.burnoutTicks ?? 0) > 0
            ? actionEffects.stressDelta
            : actionEffects.stressDelta + marketStress * buffs.stressGeneration + positionLossStress + teamMoraleStress

          emp.stamina = Math.min(
            emp.maxStamina,
            Math.max(0, emp.stamina + actionEffects.staminaDelta + 0.1 * buffs.staminaRecovery),
          )
          emp.stress = Math.min(
            100,
            Math.max(0, emp.stress + totalStressDelta),
          )
          emp.satisfaction = Math.min(
            100,
            Math.max(0, (emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) + actionEffects.satisfactionDelta),
          )

          // ✨ Fix 7: 리스펙 디버프 적용 (스킬 성장 -10%)
          const currentMonth = time
            ? (time.year - startYear) * 12 + time.month
            : 0
          const debuffUntil = respecDebuffs?.[emp.id]
          const respecPenalty = (debuffUntil && currentMonth < debuffUntil) ? 0.9 : 1.0

          // 스킬 성장 (행동 + 버프)
          const growthRate = EMPLOYEE_BALANCE.SKILL_GROWTH_RATE * buffs.skillGrowth * actionEffects.skillMultiplier * respecPenalty
          if (growthRate > 0) {
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
            Object.keys(skills).forEach((key) => {
              const k = key as keyof EmployeeSkills
              if (k !== focusSkill) {
                skills[k] = Math.min(100, skills[k] + growthRate * EMPLOYEE_BALANCE.SKILL_SPILLOVER_RATIO)
              }
            })
          }

          // 행동 이벤트 로그 (중요한 행동만)
          if (
            behavior.action === 'STRESSED_OUT' ||
            behavior.action === 'COUNSELING' ||
            behavior.action === 'SOCIALIZING' ||
            behavior.action === 'BURNOUT'
          ) {
            officeEvents.push({
              timestamp: absoluteTick,
              type: 'behavior',
              emoji: behavior.emoji,
              message: `${emp.name}: ${behavior.message ?? behavior.action}`,
              employeeIds: [emp.id],
            })
          }

          // 5. 상호작용 체크
          const interactions = checkInteractions(emp, adjacentEmployees, absoluteTick)
          for (const interaction of interactions) {
            allInteractions.push(interaction)

            // 상호작용 효과 적용 (initiator = current employee)
            emp.stress = Math.min(100, Math.max(0, emp.stress + interaction.effects.initiator.stressDelta))
            emp.satisfaction = Math.min(100, Math.max(0, (emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) + interaction.effects.initiator.satisfactionDelta))
            emp.stamina = Math.min(emp.maxStamina, Math.max(0, emp.stamina + interaction.effects.initiator.staminaDelta))

            // 스킬 성장 적용
            if (interaction.effects.initiator.skillDelta > 0) {
              const skills = emp.skills as EmployeeSkills
              skills.analysis = Math.min(100, skills.analysis + interaction.effects.initiator.skillDelta)
            }

            // 상호작용 이벤트 로그 (능력치 변화 포함)
            const eff = interaction.effects.initiator
            const changes: string[] = []
            if (eff.stressDelta !== 0) changes.push(`스트레스${eff.stressDelta > 0 ? '+' : ''}${eff.stressDelta}`)
            if (eff.satisfactionDelta !== 0) changes.push(`만족도${eff.satisfactionDelta > 0 ? '+' : ''}${eff.satisfactionDelta}`)
            if (eff.skillDelta > 0) changes.push(`스킬+${eff.skillDelta.toFixed(1)}`)
            if (eff.staminaDelta !== 0) changes.push(`체력${eff.staminaDelta > 0 ? '+' : ''}${eff.staminaDelta}`)
            const changeText = changes.length > 0 ? ` [${changes.join(', ')}]` : ''

            officeEvents.push({
              timestamp: absoluteTick,
              type: 'interaction',
              emoji: interaction.emoji,
              message: `${interaction.initiatorName}: "${interaction.dialogue[0]}" → ${interaction.targetName}: "${interaction.dialogue[1]}"${changeText}`,
              employeeIds: [interaction.initiatorId, interaction.targetId],
            })
          }
        } else {
          // time이 없으면 기존 로직
          emp.stamina = Math.min(emp.maxStamina, emp.stamina + 0.1 * buffs.staminaRecovery)
          emp.stress = Math.min(100, emp.stress + EMPLOYEE_BALANCE.STRESS_ACCUMULATION_RATE * buffs.stressGeneration)
          const fallbackDebuffUntil = respecDebuffs?.[emp.id]
          const fallbackPenalty = (fallbackDebuffUntil && fallbackDebuffUntil > 0) ? 0.9 : 1.0
          const growthRate = EMPLOYEE_BALANCE.SKILL_GROWTH_RATE * buffs.skillGrowth * fallbackPenalty
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
          Object.keys(skills).forEach((key) => {
            const k = key as keyof EmployeeSkills
            if (k !== focusSkill) {
              skills[k] = Math.min(100, skills[k] + growthRate * EMPLOYEE_BALANCE.SKILL_SPILLOVER_RATIO)
            }
          })
        }
      }
    } else {
      // 미배치 직원: 기본 스트레스 감소, 스태미너 천천히 회복
      emp.stamina = Math.min(emp.maxStamina, emp.stamina + EMPLOYEE_BALANCE.IDLE_STAMINA_RECOVERY)
      emp.stress = Math.max(0, emp.stress - EMPLOYEE_BALANCE.IDLE_STRESS_REDUCTION)
    }

    // 만족도 계산 (스트레스 기반) — 행동 AI가 없을 때 폴백
    if (!time) {
      const targetStress = EMPLOYEE_BALANCE.SATISFACTION_STRESS_BASELINE
      const stressDiff = emp.stress - targetStress
      emp.satisfaction = Math.max(
        0,
        Math.min(100, (emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) - stressDiff * EMPLOYEE_BALANCE.SATISFACTION_PENALTY_RATE),
      )
    }

    // 퇴사 경고
    if ((emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) < EMPLOYEE_BALANCE.RESIGN_WARNING_THRESHOLD && (emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) >= EMPLOYEE_BALANCE.AUTO_RESIGN_THRESHOLD) {
      warnings.push({
        employeeId: emp.id,
        name: emp.name,
        type: 'resign_warning',
      })
      officeEvents.push({
        timestamp: absoluteTick,
        type: 'warning',
        emoji: '⚠️',
        message: `${emp.name}의 만족도가 위험 수준입니다!`,
        employeeIds: [emp.id],
      })
    }

    // 자동 퇴사 (만족도 AUTO_RESIGN_THRESHOLD 미만)
    if ((emp.satisfaction ?? EMPLOYEE_BALANCE.DEFAULT_SATISFACTION) < EMPLOYEE_BALANCE.AUTO_RESIGN_THRESHOLD) {
      resignedIds.push(emp.id)
      officeEvents.push({
        timestamp: absoluteTick,
        type: 'resign',
        emoji: '🚪',
        message: `${emp.name}이(가) 퇴사했습니다.`,
        employeeIds: [emp.id],
      })
    }

    return emp
  })

  // 상호작용 target에 대한 효과도 적용
  const finalEmployees = updatedEmployees.map((emp) => {
    const targetInteractions = allInteractions.filter((i) => i.targetId === emp.id)
    if (targetInteractions.length === 0) return emp

    const updated = { ...emp }
    if (updated.stress === undefined) updated.stress = 0
    if (updated.satisfaction === undefined) updated.satisfaction = EMPLOYEE_BALANCE.DEFAULT_SATISFACTION

    for (const interaction of targetInteractions) {
      updated.stress = Math.min(100, Math.max(0, updated.stress + interaction.effects.target.stressDelta))
      updated.satisfaction = Math.min(100, Math.max(0, updated.satisfaction + interaction.effects.target.satisfactionDelta))
      updated.stamina = Math.min(updated.maxStamina, Math.max(0, updated.stamina + interaction.effects.target.staminaDelta))

      if (interaction.effects.target.skillDelta > 0 && updated.skills) {
        updated.skills = { ...updated.skills }
        updated.skills.analysis = Math.min(100, updated.skills.analysis + interaction.effects.target.skillDelta)
      }
    }

    return updated
  })

  return {
    updatedEmployees: finalEmployees.filter((e) => !resignedIds.includes(e.id)),
    resignedIds,
    warnings,
    behaviors: allBehaviors,
    interactions: allInteractions,
    officeEvents,
  }
}
