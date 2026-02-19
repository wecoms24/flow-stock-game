/**
 * AI Architect System
 *
 * 직원 배치 최적화를 위한 AI 시스템
 * - 시너지 평가: 직원 간 협업 효과 계산
 * - 최적 배치: Greedy 알고리즘으로 최적 위치 탐색
 * - 가구 제안: ROI 기반 구매 우선순위
 */

import type { Employee, EmployeeRole, EmployeeTrait } from '../types'
import type { OfficeGrid, FurnitureType, FurnitureItem } from '../types/office'
import { FURNITURE_CATALOG } from '../data/furniture'

/**
 * 시너지 점수 결과
 */
export interface SynergyScore {
  value: number // 0-100 (높을수록 좋음)
  reason: string // 점수 설명
  contributors: Array<{
    source: string // 시너지 원천 (직원 ID, 가구 ID, 특성 등)
    bonus: number // 기여도
    description: string
  }>
}

/**
 * 직원 이동 제안
 */
export interface EmployeeMove {
  employeeId: string
  employeeName: string
  from: number // 현재 좌석 인덱스
  to: number // 목표 좌석 인덱스
  fromCoord: { x: number; y: number }
  toCoord: { x: number; y: number }
  reason: string
  scoreImprovement: number // 점수 증가량
  currentScore: number
  newScore: number
}

/**
 * 가구 구매 제안
 */
export interface FurniturePurchase {
  type: FurnitureType
  x: number
  y: number
  cost: number
  reason: string
  roi: number // 투자 대비 수익 (높을수록 좋음)
  paybackPeriod: number // 회수 기간 (시간)
  priority: number // 0-100 (높을수록 우선)
  forEmployeeId?: string // 책상 구매 시 배치할 직원 ID (옵셔널)
}

/**
 * 배치 최적화 제안
 */
export interface LayoutProposal {
  score: number // 제안의 전체 효율 점수 (0-100)
  currentScore: number // 현재 배치 점수
  projectedScore: number // 적용 후 예상 점수
  moves: EmployeeMove[]
  purchases: FurniturePurchase[]
  estimatedCost: number
  estimatedBenefit: number // 시간당 예상 수익 증가
}

/**
 * 직종 간 시너지 매트릭스
 *
 * 값: 인접 시 보너스 점수 (0-30)
 */
const ROLE_SYNERGY_MATRIX: Record<EmployeeRole, Partial<Record<EmployeeRole, number>>> = {
  intern: {
    analyst: 10, // 인턴은 분석가로부터 학습
    trader: 5,
  },
  analyst: {
    manager: 20, // 분석 → 의사결정 파이프라인
    trader: 15, // 분석 → 거래 파이프라인
    analyst: 10, // 동료 협업
  },
  trader: {
    analyst: 15, // 분석 정보 수신
    manager: 10, // 거래 승인
    trader: 5, // 동료 협업
  },
  manager: {
    analyst: 20, // 분석 보고 수신
    trader: 10, // 거래 지시
    ceo: 15, // 경영진 소통
  },
  ceo: {
    manager: 15, // 관리자 소통
    hr_manager: 10, // HR 협업
  },
  hr_manager: {
    ceo: 10,
    manager: 5,
  },
}

/**
 * 특성별 선호 위치
 */
interface TraitPreference {
  preferCorner?: boolean // 구석 선호
  preferCenter?: boolean // 중앙 선호
  preferWindow?: boolean // 창가 선호 (현재는 구석으로 근사)
  avoidNoise?: boolean // 시끄러운 곳 회피
  needSpace?: boolean // 넓은 공간 필요
}

const TRAIT_PREFERENCES: Partial<Record<EmployeeTrait, TraitPreference>> = {
  introvert: {
    preferCorner: true,
    avoidNoise: true,
  },
  social: {
    preferCenter: true,
  },
  workaholic: {
    preferCorner: true, // 집중력
  },
  perfectionist: {
    preferCorner: true, // 집중 필요
  },
  ambitious: {
    preferCenter: true, // 활동적
  },
}

/**
 * 그리드 좌표를 인덱스로 변환
 */
export function coordToIndex(x: number, y: number, gridWidth: number): number {
  return y * gridWidth + x
}

/**
 * 인덱스를 그리드 좌표로 변환
 */
function indexToCoord(index: number, gridWidth: number): { x: number; y: number } {
  return {
    x: index % gridWidth,
    y: Math.floor(index / gridWidth),
  }
}

/**
 * 두 좌표 간 Manhattan 거리 계산
 */
function manhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

/**
 * 구석 좌석 여부 확인
 */
function isCornerSeat(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
  return (
    (x === 0 || x === gridWidth - 1) &&
    (y === 0 || y === gridHeight - 1)
  )
}

/**
 * 중앙 좌석 여부 확인 (중심으로부터 거리)
 */
function isCenterSeat(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
  const centerX = Math.floor(gridWidth / 2)
  const centerY = Math.floor(gridHeight / 2)
  const dist = manhattanDistance(x, y, centerX, centerY)
  return dist <= 2 // 중심으로부터 2칸 이내
}

/**
 * 인접 직원 조회 (Manhattan 거리 3 이내)
 */
function getAdjacentEmployees(
  position: number,
  grid: OfficeGrid,
  allEmployees: Employee[],
  maxDistance: number = 3,
): Employee[] {
  const coord = indexToCoord(position, grid.size.width)
  const adjacent: Employee[] = []

  allEmployees.forEach((emp) => {
    if (emp.seatIndex == null || emp.seatIndex === position) return

    const empCoord = indexToCoord(emp.seatIndex, grid.size.width)
    const dist = manhattanDistance(coord.x, coord.y, empCoord.x, empCoord.y)

    if (dist <= maxDistance) {
      adjacent.push(emp)
    }
  })

  return adjacent
}

/**
 * 범위 내 가구 조회
 */
function getFurnitureInRange(
  position: number,
  grid: OfficeGrid,
  maxDistance: number = 3,
): FurnitureItem[] {
  const coord = indexToCoord(position, grid.size.width)
  const nearby: FurnitureItem[] = []

  grid.furniture.forEach((furn) => {
    const dist = manhattanDistance(coord.x, coord.y, furn.position.x, furn.position.y)
    if (dist <= maxDistance) {
      nearby.push(furn)
    }
  })

  return nearby
}

/**
 * 특정 위치의 시너지 점수 계산
 *
 * @param employee 평가할 직원
 * @param position 좌석 인덱스
 * @param grid 오피스 그리드
 * @param allEmployees 전체 직원 목록
 * @returns 시너지 점수
 */
export function calculateSynergy(
  employee: Employee,
  position: number,
  grid: OfficeGrid,
  allEmployees: Employee[],
): SynergyScore {
  let score = 50 // 기본 점수
  const contributors: SynergyScore['contributors'] = []

  const coord = indexToCoord(position, grid.size.width)

  // 1. 직종 간 시너지
  const adjacentEmployees = getAdjacentEmployees(position, grid, allEmployees)
  adjacentEmployees.forEach((adj) => {
    const bonus = ROLE_SYNERGY_MATRIX[employee.role]?.[adj.role] || 0
    if (bonus > 0) {
      score += bonus
      contributors.push({
        source: adj.id,
        bonus,
        description: `${adj.name}와 협업 (+${bonus})`,
      })
    }
  })

  // 2. 특성 기반 위치 선호도
  if (employee.traits) {
    employee.traits.forEach((trait) => {
      const pref = TRAIT_PREFERENCES[trait]
      if (!pref) return

      if (pref.preferCorner && isCornerSeat(coord.x, coord.y, grid.size.width, grid.size.height)) {
        score += 15
        contributors.push({
          source: `trait_${trait}`,
          bonus: 15,
          description: `${trait}: 구석 선호 (+15)`,
        })
      }

      if (pref.preferCenter && isCenterSeat(coord.x, coord.y, grid.size.width, grid.size.height)) {
        score += 15
        contributors.push({
          source: `trait_${trait}`,
          bonus: 15,
          description: `${trait}: 중앙 선호 (+15)`,
        })
      }

      if (pref.avoidNoise && adjacentEmployees.length > 3) {
        score -= 10
        contributors.push({
          source: `trait_${trait}`,
          bonus: -10,
          description: `${trait}: 소음 회피 (-10)`,
        })
      }
    })
  }

  // 3. 가구 효과
  const nearbyFurniture = getFurnitureInRange(position, grid)
  nearbyFurniture.forEach((furn) => {
    const catalog = FURNITURE_CATALOG[furn.type]
    if (!catalog.buffs) return

    catalog.buffs.forEach((buff) => {
      const bonusValue = Math.round((buff.value - 1) * 100) // 1.2 → 20
      if (bonusValue > 0) {
        score += bonusValue
        contributors.push({
          source: furn.id,
          bonus: bonusValue,
          description: `${catalog.name} 효과 (+${bonusValue})`,
        })
      }
    })
  })

  // 점수 제한 (0-100)
  score = Math.max(0, Math.min(100, score))

  // 이유 생성
  const topContributors = contributors
    .sort((a, b) => b.bonus - a.bonus)
    .slice(0, 3)
    .map((c) => c.description)
    .join(', ')

  const reason = topContributors || '기본 배치'

  return {
    value: score,
    reason,
    contributors,
  }
}

/**
 * 빈 좌석 조회
 */
function getEmptySeats(grid: OfficeGrid, employees: Employee[]): number[] {
  const occupiedSeats = new Set(
    employees
      .filter((e) => e.seatIndex != null)
      .map((e) => e.seatIndex as number),
  )

  const emptySeats: number[] = []
  const totalSeats = grid.size.width * grid.size.height

  for (let i = 0; i < totalSeats; i++) {
    const coord = indexToCoord(i, grid.size.width)
    const cell = grid.cells[coord.y]?.[coord.x]

    // 비어있고, 가구로 차지되지 않은 자리
    if (!occupiedSeats.has(i) && (!cell || cell.occupiedBy === null)) {
      emptySeats.push(i)
    }
  }

  return emptySeats
}

/**
 * 특정 직원의 최적 좌석 찾기
 */
export function findOptimalSeat(
  employee: Employee,
  grid: OfficeGrid,
  allEmployees: Employee[],
): { index: number; score: number; reason: string } | null {
  const emptySeats = getEmptySeats(grid, allEmployees)

  if (emptySeats.length === 0) {
    return null
  }

  const scores = emptySeats.map((seat) => {
    const synergy = calculateSynergy(employee, seat, grid, allEmployees)
    return {
      index: seat,
      score: synergy.value,
      reason: synergy.reason,
    }
  })

  // 점수 내림차순 정렬
  scores.sort((a, b) => b.score - a.score)

  return scores[0]
}

/**
 * 현재 배치의 전체 점수 계산
 */
export function calculateOverallScore(
  employees: Employee[],
  grid: OfficeGrid,
): number {
  const placedEmployees = employees.filter((e) => e.seatIndex != null)

  if (placedEmployees.length === 0) return 0

  const totalScore = placedEmployees.reduce((sum, emp) => {
    const synergy = calculateSynergy(emp, emp.seatIndex!, grid, employees)
    return sum + synergy.value
  }, 0)

  return totalScore / placedEmployees.length // 평균 점수
}

/* ──────────────────────────────────────────────────────────────
   Task 2.3: 가구 ROI 계산기
────────────────────────────────────────────────────────────── */

/**
 * 가구 ROI (투자 대비 수익) 계산
 *
 * @param furnitureType 가구 타입
 * @param employees 직원 목록
 * @param cash 현재 보유 현금
 * @param grid 오피스 그리드
 * @returns ROI 정보 (null이면 구매 불가)
 */
export function calculateFurnitureROI(
  furnitureType: FurnitureType,
  employees: Employee[],
  cash: number,
  grid: OfficeGrid,
): {
  type: FurnitureType
  cost: number
  benefitPerHour: number // 시간당 예상 수익 증가
  paybackPeriod: number // 회수 기간 (시간)
  priority: number // 0-100 우선순위
  affectedEmployees: number // 혜택 받을 직원 수
} | null {
  void grid // 향후 위치 기반 계산 시 사용 예정
  const catalog = FURNITURE_CATALOG[furnitureType]

  if (!catalog || catalog.cost > cash) {
    return null
  }

  // 혜택 받을 직원 수 계산
  let affectedCount = 0
  let totalProductivityIncrease = 0

  employees.forEach((emp) => {
    if (!catalog.buffs) return

    catalog.buffs.forEach((buff) => {
      affectedCount++

      // 생산성 증가 추정
      const productivityBonus = (buff.value - 1) * 100 // 1.2 → 20%
      const employeeProductivity = emp.skills?.analysis || 50 // 기본 스킬
      totalProductivityIncrease += (employeeProductivity * productivityBonus) / 100
    })
  })

  if (affectedCount === 0) {
    return null // 아무도 혜택을 못 받으면 구매 의미 없음
  }

  // 시간당 수익 증가 추정 (매우 단순한 모델)
  // 생산성 1당 시간당 $100 수익 가정
  const benefitPerHour = totalProductivityIncrease * 100

  // 회수 기간 계산
  const paybackPeriod = catalog.cost / benefitPerHour

  // 우선순위 계산 (낮은 회수 기간 + 많은 직원 영향 = 높은 우선순위)
  let priority = 0
  if (paybackPeriod > 0) {
    priority = Math.min(100, (affectedCount * 10) / paybackPeriod * 10)
  }

  return {
    type: furnitureType,
    cost: catalog.cost,
    benefitPerHour,
    paybackPeriod,
    priority,
    affectedEmployees: affectedCount,
  }
}

/**
 * 가구 배치 최적 위치 찾기
 *
 * @param furnitureType 가구 타입
 * @param grid 오피스 그리드
 * @returns 최적 위치 (null이면 공간 없음)
 */
export function findBestSpotForFurniture(
  furnitureType: FurnitureType,
  grid: OfficeGrid,
): { x: number; y: number; score: number } | null {
  const catalog = FURNITURE_CATALOG[furnitureType]
  if (!catalog) return null

  const { width: furnWidth, height: furnHeight } = catalog.size ?? { width: 1, height: 1 }
  const candidates: Array<{ x: number; y: number; score: number }> = []

  // 모든 위치 탐색
  for (let y = 0; y <= grid.size.height - furnHeight; y++) {
    for (let x = 0; x <= grid.size.width - furnWidth; x++) {
      // 해당 위치가 비어있는지 확인
      let isValid = true
      for (let dy = 0; dy < furnHeight; dy++) {
        for (let dx = 0; dx < furnWidth; dx++) {
          const cell = grid.cells[y + dy]?.[x + dx]
          if (!cell || cell.occupiedBy !== null) {
            isValid = false
            break
          }
        }
        if (!isValid) break
      }

      if (!isValid) continue

      // 점수 계산: 주변 직원 수 (가구 효과를 받을 직원이 많을수록 좋음)
      let score = 0
      for (let dy = -3; dy <= furnHeight + 3; dy++) {
        for (let dx = -3; dx <= furnWidth + 3; dx++) {
          const checkY = y + dy
          const checkX = x + dx
          if (checkY < 0 || checkY >= grid.size.height) continue
          if (checkX < 0 || checkX >= grid.size.width) continue

          const cell = grid.cells[checkY]?.[checkX]
          if (cell && cell.occupiedBy && cell.occupiedBy.startsWith('emp_')) {
            const dist = Math.abs(dx) + Math.abs(dy)
            score += Math.max(0, 10 - dist) // 가까울수록 높은 점수
          }
        }
      }

      candidates.push({ x, y, score })
    }
  }

  if (candidates.length === 0) return null

  // 점수 내림차순 정렬
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}

/**
 * 예산 내에서 최적의 가구 구매 제안
 *
 * @param employees 직원 목록
 * @param cash 현재 보유 현금
 * @param budget 사용 가능 예산
 * @param grid 오피스 그리드
 * @returns 가구 구매 제안 목록
 */
export function suggestFurniturePurchases(
  employees: Employee[],
  cash: number,
  budget: number,
  grid: OfficeGrid,
): FurniturePurchase[] {
  void cash // 향후 현금 잔액 검증 시 사용 예정
  const allFurnitureTypes = Object.keys(FURNITURE_CATALOG) as FurnitureType[]

  // ROI 계산
  const rois = allFurnitureTypes
    .map((type) => calculateFurnitureROI(type, employees, budget, grid))
    .filter((roi): roi is NonNullable<typeof roi> => roi !== null)
    .sort((a, b) => b.priority - a.priority)

  const purchases: FurniturePurchase[] = []
  let spent = 0

  for (const roi of rois) {
    if (spent + roi.cost > budget) continue

    const position = findBestSpotForFurniture(roi.type, grid)
    if (!position) continue

    const catalog = FURNITURE_CATALOG[roi.type]

    purchases.push({
      type: roi.type,
      x: position.x,
      y: position.y,
      cost: roi.cost,
      reason: `${roi.affectedEmployees}명 혜택, ${roi.paybackPeriod.toFixed(1)}시간 회수`,
      roi: roi.benefitPerHour / roi.cost, // 단위당 수익
      paybackPeriod: roi.paybackPeriod,
      priority: roi.priority,
    })

    spent += roi.cost

    // 배치 시뮬레이션 (다음 가구 배치를 위해)
    for (let dy = 0; dy < (catalog.size?.height ?? 1); dy++) {
      for (let dx = 0; dx < (catalog.size?.width ?? 1); dx++) {
        const cell = grid.cells[position.y + dy]?.[position.x + dx]
        if (cell) {
          cell.occupiedBy = `furn_temp_${roi.type}` // 임시 점유
        }
      }
    }
  }

  // 임시 점유 해제
  grid.cells.forEach((row) => {
    row.forEach((cell) => {
      if (cell.occupiedBy?.startsWith('furn_temp_')) {
        cell.occupiedBy = null
      }
    })
  })

  return purchases
}

/* ──────────────────────────────────────────────────────────────
   Task 2.2: 최적 배치 알고리즘 (Greedy Search)
────────────────────────────────────────────────────────────── */

/**
 * Greedy 알고리즘으로 최적 배치 제안 생성
 *
 * @param employees 직원 목록
 * @param grid 오피스 그리드
 * @param cash 현재 보유 현금
 * @param budgetRatio 예산 비율 (0.1 = 현금의 10%)
 * @returns 배치 최적화 제안
 */
export function generateOptimalLayout(
  employees: Employee[],
  grid: OfficeGrid,
  cash: number,
  budgetRatio: number = 0.1,
  maxMoves: number = 999, // 최대 이동 제안 수
  maxPurchases: number = 999, // 최대 가구 구매 제안 수
): LayoutProposal {
  const budget = cash * budgetRatio
  const currentScore = calculateOverallScore(employees, grid)

  const moves: EmployeeMove[] = []
  const placements: EmployeeMove[] = [] // 미배치 직원 배치 제안

  // 각 직원에 대해 최적 위치 탐색
  employees.forEach((emp) => {
    // ✨ 미배치 직원 처리: 최적 위치에 배치
    if (emp.seatIndex == null) {
      const bestSeat = findOptimalSeat(emp, grid, employees)
      if (!bestSeat) return

      const toCoord = indexToCoord(bestSeat.index, grid.size.width)
      placements.push({
        employeeId: emp.id,
        employeeName: emp.name,
        from: -1, // 미배치 표시
        to: bestSeat.index,
        fromCoord: { x: -1, y: -1 },
        toCoord,
        reason: `신규 배치: ${bestSeat.reason}`,
        scoreImprovement: bestSeat.score,
        currentScore: 0,
        newScore: bestSeat.score,
      })

      // 시뮬레이션에 반영
      emp.seatIndex = bestSeat.index
      return
    }

    // 기존 로직: 이미 배치된 직원 이동
    const currentSynergy = calculateSynergy(emp, emp.seatIndex, grid, employees)
    const bestSeat = findOptimalSeat(emp, grid, employees)

    if (!bestSeat) return

    // 20% 이상 개선 시에만 제안
    const improvementRatio = bestSeat.score / currentSynergy.value
    if (improvementRatio < 1.2) return

    const fromCoord = indexToCoord(emp.seatIndex, grid.size.width)
    const toCoord = indexToCoord(bestSeat.index, grid.size.width)

    moves.push({
      employeeId: emp.id,
      employeeName: emp.name,
      from: emp.seatIndex,
      to: bestSeat.index,
      fromCoord,
      toCoord,
      reason: bestSeat.reason,
      scoreImprovement: bestSeat.score - currentSynergy.value,
      currentScore: currentSynergy.value,
      newScore: bestSeat.score,
    })

    // 이동 시뮬레이션 (다음 직원 평가를 위해)
    emp.seatIndex = bestSeat.index
  })

  // 시뮬레이션 되돌리기
  moves.forEach((move) => {
    const emp = employees.find((e) => e.id === move.employeeId)
    if (emp) {
      emp.seatIndex = move.from
    }
  })
  placements.forEach((placement) => {
    const emp = employees.find((e) => e.id === placement.employeeId)
    if (emp) {
      emp.seatIndex = null // 원상복구
    }
  })

  // 점수 내림차순 정렬 (가장 효과적인 이동 우선)
  moves.sort((a, b) => b.scoreImprovement - a.scoreImprovement)
  placements.sort((a, b) => b.scoreImprovement - a.scoreImprovement)

  // ✨ 제안 개수 제한 적용
  const limitedMoves = [...placements, ...moves].slice(0, maxMoves)

  // 가구 구매 제안
  const allPurchases = suggestFurniturePurchases(employees, cash, budget, grid)

  // ✨ 가구 구매 제안 개수 제한
  const limitedPurchases = allPurchases.slice(0, maxPurchases)

  // 예상 점수 계산 (제한된 이동 기준)
  const avgImprovement = limitedMoves.length > 0
    ? limitedMoves.reduce((sum, m) => sum + m.scoreImprovement, 0) / limitedMoves.length
    : 0
  const projectedScore = currentScore + avgImprovement

  // 예상 수익 계산 (제한된 가구 기준)
  const estimatedBenefit = limitedPurchases.reduce((sum, p) => sum + p.roi * p.cost, 0)

  return {
    score: projectedScore,
    currentScore,
    projectedScore,
    moves: limitedMoves, // ✨ 제한된 이동 반환
    purchases: limitedPurchases, // ✨ 제한된 구매 반환
    estimatedCost: limitedPurchases.reduce((sum, p) => sum + p.cost, 0),
    estimatedBenefit,
  }
}

/**
 * 배치 제안의 효율성 평가
 */
export function evaluateProposal(proposal: LayoutProposal): {
  efficiency: number // 0-100 (높을수록 효율적)
  recommendation: 'highly_recommended' | 'recommended' | 'optional' | 'not_recommended'
  summary: string
} {
  const improvement = proposal.projectedScore - proposal.currentScore
  const improvementRatio = improvement / proposal.currentScore

  let efficiency = 0
  let recommendation: 'highly_recommended' | 'recommended' | 'optional' | 'not_recommended' =
    'not_recommended'

  if (improvementRatio >= 0.3) {
    // 30% 이상 개선
    efficiency = 100
    recommendation = 'highly_recommended'
  } else if (improvementRatio >= 0.15) {
    // 15% 이상 개선
    efficiency = 75
    recommendation = 'recommended'
  } else if (improvementRatio >= 0.05) {
    // 5% 이상 개선
    efficiency = 50
    recommendation = 'optional'
  } else {
    efficiency = 25
    recommendation = 'not_recommended'
  }

  const summary = `${proposal.moves.length}개 이동, ${proposal.purchases.length}개 가구 구매 → ${improvementRatio > 0 ? '+' : ''}${(improvementRatio * 100).toFixed(1)}% 효율 증가`

  return {
    efficiency,
    recommendation,
    summary,
  }
}
