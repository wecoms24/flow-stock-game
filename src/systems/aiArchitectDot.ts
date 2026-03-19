/**
 * AI Architect for Dot Layout System
 *
 * OfficeLayout (자유 배치) 기반 배치 최적화
 * - 유클리디안 거리 기반 시너지 계산
 * - 직원 배치 최적화 (미배치 + 재배치)
 * - 장식 가구 구매 제안
 * - AI 경영 컨설턴트 추천 (채용/가구/경고/업그레이드)
 */

import type { Employee } from '../types'
import type { OfficeLayout, DeskItem, DecorationItem, DecorationType } from '../types/office'
import { DECORATION_CATALOG, DESK_CATALOG } from '../data/furniture'
import type { LayoutProposal, EmployeeMove, FurniturePurchase } from './aiArchitect'

/* ── 역할 시너지 매트릭스 ── */
const ROLE_SYNERGY: Record<string, Record<string, number>> = {
  analyst: { manager: 20, trader: 15, analyst: 10, intern: 10 },
  manager: { analyst: 20, trader: 10, ceo: 15 },
  trader: { analyst: 15, manager: 10, trader: 5 },
  intern: { analyst: 10, trader: 5 },
  ceo: { manager: 15, hr_manager: 10 },
  hr_manager: { ceo: 10, manager: 5 },
}

const SYNERGY_RANGE_PX = 120
const GRID_SCALE = 40 // 좌표 표시용 스케일

/* ── DotEmployeeMove: deskId 포함 ── */
export interface DotEmployeeMove extends EmployeeMove {
  fromDeskId: string | null
  toDeskId: string
}

/* ── 유틸리티 ── */
function eucDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

/* ── 책상 시너지 점수 계산 ── */
function calcDeskScore(
  emp: Employee,
  desk: DeskItem,
  desks: DeskItem[],
  employees: Employee[],
  decorations: DecorationItem[],
  canvasSize: { width: number; height: number },
): number {
  let score = 50

  // 1. 역할 시너지 (인접 직원)
  for (const other of desks) {
    if (other.id === desk.id || !other.employeeId) continue
    const d = eucDist(desk.position.x, desk.position.y, other.position.x, other.position.y)
    if (d > SYNERGY_RANGE_PX) continue

    const otherEmp = employees.find((e) => e.id === other.employeeId)
    if (!otherEmp) continue

    const bonus = ROLE_SYNERGY[emp.role]?.[otherEmp.role] || 0
    if (bonus > 0) {
      score += Math.round(bonus * (1 - d / SYNERGY_RANGE_PX))
    }
  }

  // 2. 장식 가구 버프
  for (const deco of decorations) {
    const d = eucDist(desk.position.x, desk.position.y, deco.position.x, deco.position.y)
    for (const buff of deco.buffs) {
      if (d <= buff.range) {
        score += Math.round((buff.value - 1) * 100)
      }
    }
  }

  // 3. 특성 위치 선호
  if (emp.traits) {
    const isCorner =
      (desk.position.x < 80 || desk.position.x > canvasSize.width - 80) &&
      (desk.position.y < 80 || desk.position.y > canvasSize.height - 80)
    const centerDist = eucDist(
      desk.position.x,
      desk.position.y,
      canvasSize.width / 2,
      canvasSize.height / 2,
    )

    for (const trait of emp.traits) {
      if (['introvert', 'workaholic', 'perfectionist'].includes(trait) && isCorner) score += 10
      if (['social', 'ambitious'].includes(trait) && centerDist < 150) score += 10
    }
  }

  return Math.max(0, Math.min(100, score))
}

/* ── 전체 레이아웃 점수 ── */
function calcOverallScore(employees: Employee[], layout: OfficeLayout): number {
  const assigned = employees.filter((e) => e.deskId)
  if (assigned.length === 0) return 0

  let total = 0
  for (const emp of assigned) {
    const desk = layout.desks.find((d) => d.id === emp.deskId)
    if (!desk) continue
    total += calcDeskScore(emp, desk, layout.desks, employees, layout.decorations, layout.canvasSize)
  }
  return total / assigned.length
}

/* ── 픽셀 좌표 → 그리드 좌표 (표시용) ── */
function toGridCoord(px: number, py: number): { x: number; y: number } {
  return { x: Math.round(px / GRID_SCALE), y: Math.round(py / GRID_SCALE) }
}

/* ── 메인: 도트 레이아웃 배치 제안 생성 ── */
export function generateDotLayoutProposal(
  employees: Employee[],
  layout: OfficeLayout,
  cash: number,
  officeLevel: number,
  budgetRatio: number = 0.1,
): LayoutProposal & { moves: DotEmployeeMove[] } {
  const budget = cash * budgetRatio
  const currentScore = calcOverallScore(employees, layout)
  const moves: DotEmployeeMove[] = []
  const purchases: FurniturePurchase[] = []
  let spent = 0

  // 시뮬레이션용 복사 (원본 변경 방지)
  const simDesks = layout.desks.map((d) => ({ ...d }))
  const simEmps = employees.map((e) => ({ ...e }))

  // 1. 미배치 직원 → 최적 빈 책상에 배치
  const unassigned = simEmps.filter((e) => !e.deskId)
  for (const emp of unassigned) {
    const available = simDesks.filter((d) => !d.employeeId)
    if (available.length === 0) break

    let bestDesk = available[0]
    let bestScore = -1
    for (const desk of available) {
      const s = calcDeskScore(emp, desk, simDesks, simEmps, layout.decorations, layout.canvasSize)
      if (s > bestScore) {
        bestScore = s
        bestDesk = desk
      }
    }

    const toGrid = toGridCoord(bestDesk.position.x, bestDesk.position.y)
    moves.push({
      employeeId: emp.id,
      employeeName: emp.name,
      from: -1,
      to: 0,
      fromDeskId: null,
      toDeskId: bestDesk.id,
      fromCoord: { x: -1, y: -1 },
      toCoord: toGrid,
      reason: `신규 배치: 시너지 ${bestScore}점`,
      scoreImprovement: bestScore,
      currentScore: 0,
      newScore: bestScore,
    })

    // 시뮬레이션 반영
    bestDesk.employeeId = emp.id
    emp.deskId = bestDesk.id
  }

  // 1b. 여전히 미배치된 직원 → 기본 책상 구매 제안
  const deskCat = DESK_CATALOG['basic']
  for (const emp of simEmps.filter((e) => !e.deskId)) {
    if (simDesks.length >= layout.maxDesks) break
    if (spent + deskCat.cost > budget) break

    // 빈 위치 탐색 (충돌 없는 픽셀 좌표)
    const allItems: { position: { x: number; y: number } }[] = [...simDesks, ...layout.decorations]
    let pos: { x: number; y: number } | null = null
    outerLoop: for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 7; col++) {
        const px = 60 + col * 80
        const py = 50 + row * 70
        if (px > layout.canvasSize.width - 40 || py > layout.canvasSize.height - 40) continue
        const hasCollision = allItems.some((item) => eucDist(px, py, item.position.x, item.position.y) < 50)
        if (!hasCollision) {
          pos = { x: px, y: py }
          break outerLoop
        }
      }
    }
    if (!pos) break

    const toGrid = toGridCoord(pos.x, pos.y)
    // 이동 제안 추가 (toDeskId는 '__new_desk__' 센티널 → apply 시 실제 ID로 대체)
    moves.push({
      employeeId: emp.id,
      employeeName: emp.name,
      from: -1,
      to: 0,
      fromDeskId: null,
      toDeskId: `__new_desk__${emp.id}`,
      fromCoord: { x: -1, y: -1 },
      toCoord: toGrid,
      reason: `${emp.name} 의자 없음 → 기본 책상 구매 후 배치`,
      scoreImprovement: 50,
      currentScore: 0,
      newScore: 50,
    })

    // 구매 제안 추가 (최우선 priority)
    purchases.push({
      type: 'basic',
      x: pos.x,
      y: pos.y,
      cost: deskCat.cost,
      reason: `${emp.name} 의자 구매`,
      roi: 1,
      paybackPeriod: deskCat.cost / 100,
      priority: 999,
      forEmployeeId: emp.id,
    })
    spent += deskCat.cost

    // 시뮬레이션 반영
    const simDeskId = `__new_desk__${emp.id}`
    simDesks.push({
      id: simDeskId,
      type: 'basic',
      position: pos,
      employeeId: emp.id,
      buffs: [],
      cost: deskCat.cost,
      sprite: '🪑',
    })
    emp.deskId = simDeskId
  }

  // 2. 배치된 직원 재배치 (테마 기반 다양한 제안)
  const assigned = simEmps.filter((e) => e.deskId)
  const themeRoll = Math.random()
  const theme = themeRoll < 0.4 ? 'synergy' : themeRoll < 0.7 ? 'wellness' : themeRoll < 0.9 ? 'pipeline' : 'social'
  const relocThreshold = 0.15 + Math.random() * 0.10 // 15~25% 개선 시 제안

  for (const emp of assigned) {
    if (moves.some((m) => m.employeeId === emp.id)) continue

    const curDesk = simDesks.find((d) => d.id === emp.deskId)
    if (!curDesk) continue

    const curScore = calcDeskScore(
      emp,
      curDesk,
      simDesks,
      simEmps,
      layout.decorations,
      layout.canvasSize,
    )
    const available = simDesks.filter((d) => !d.employeeId)

    for (const altDesk of available) {
      const altScore = calcDeskScore(
        emp,
        altDesk,
        simDesks,
        simEmps,
        layout.decorations,
        layout.canvasSize,
      )
      if (altScore / Math.max(curScore, 1) >= 1 + relocThreshold) {
        const fromGrid = toGridCoord(curDesk.position.x, curDesk.position.y)
        const toGrid = toGridCoord(altDesk.position.x, altDesk.position.y)

        // 테마별 이유 텍스트
        let reason: string
        switch (theme) {
          case 'synergy':
            reason = `업무 효율 개선: ${curScore}점 → ${altScore}점`
            break
          case 'wellness':
            reason = `${emp.name}님 스트레스 관리를 위한 재배치`
            break
          case 'pipeline':
            reason = `분석가↔매니저 파이프라인 최적화`
            break
          case 'social':
            reason = `${emp.name}님 소통 강화 배치`
            break
        }

        moves.push({
          employeeId: emp.id,
          employeeName: emp.name,
          from: 0,
          to: 0,
          fromDeskId: curDesk.id,
          toDeskId: altDesk.id,
          fromCoord: fromGrid,
          toCoord: toGrid,
          reason,
          scoreImprovement: altScore - curScore,
          currentScore: curScore,
          newScore: altScore,
        })

        // 시뮬레이션: 이동 반영
        curDesk.employeeId = null
        altDesk.employeeId = emp.id
        emp.deskId = altDesk.id
        break
      }
    }
  }

  // 3. 장식 가구 구매 제안
  const decoTypes = Object.keys(DECORATION_CATALOG) as DecorationType[]

  for (const type of decoTypes) {
    const cat = DECORATION_CATALOG[type]
    if (cat.cost > budget - spent) continue
    if (cat.unlockLevel && cat.unlockLevel > officeLevel) continue
    if (layout.decorations.filter((d) => d.type === type).length >= 2) continue

    // 최적 위치 탐색 (직원에게 가장 많은 혜택을 주는 위치)
    const allItems = [...layout.desks, ...layout.decorations]
    let bestX = 0
    let bestY = 0
    let bestVal = 0

    for (let x = 60; x < layout.canvasSize.width - 40; x += 20) {
      for (let y = 60; y < layout.canvasSize.height - 40; y += 20) {
        const hasCollision = allItems.some(
          (item) => eucDist(x, y, item.position.x, item.position.y) < 30,
        )
        if (hasCollision) continue

        let val = 0
        for (const desk of layout.desks) {
          if (!desk.employeeId) continue
          const d = eucDist(x, y, desk.position.x, desk.position.y)
          const range = cat.buffs[0]?.range ?? 100
          if (d <= range) val += Math.max(1, Math.round(10 * (1 - d / range)))
        }

        if (val > bestVal) {
          bestVal = val
          bestX = x
          bestY = y
        }
      }
    }

    if (bestVal > 0) {
      purchases.push({
        type,
        x: bestX,
        y: bestY,
        cost: cat.cost,
        reason: `${cat.name} (${bestVal}점 위치)`,
        roi: bestVal / cat.cost,
        paybackPeriod: cat.cost / Math.max(1, bestVal * 100),
        priority: bestVal,
      })
      spent += cat.cost
    }
  }

  purchases.sort((a, b) => b.priority - a.priority)

  // 제한: 최대 5개 이동, 3개 가구
  // purchases 먼저 확정 후, 대응하는 __new_desk__ move도 함께 일관성 유지
  const limitedPurchases = purchases.slice(0, 3)
  const includedNewDeskEmpIds = new Set(
    limitedPurchases.filter((p) => p.forEmployeeId).map((p) => p.forEmployeeId!),
  )
  const limitedMoves = moves
    .filter((m) => {
      if (!(m as DotEmployeeMove).toDeskId.startsWith('__new_desk__')) return true
      return includedNewDeskEmpIds.has(m.employeeId)
    })
    .slice(0, 5)

  const avgImprovement =
    limitedMoves.length > 0
      ? limitedMoves.reduce((sum, m) => sum + m.scoreImprovement, 0) / limitedMoves.length
      : 0
  const safeCurrentScore = Math.max(currentScore, 1) // division by zero 방지
  const projectedScore = safeCurrentScore + avgImprovement

  return {
    score: projectedScore,
    currentScore: safeCurrentScore,
    projectedScore,
    moves: limitedMoves,
    purchases: limitedPurchases,
    estimatedCost: limitedPurchases.reduce((sum, p) => sum + p.cost, 0),
    estimatedBenefit: limitedPurchases.reduce((sum, p) => sum + p.roi * p.cost, 0),
  }
}

/* ══════════════════════════════════════════════════════════════
   AI 경영 컨설턴트 — 스마트 추천 시스템
   ══════════════════════════════════════════════════════════════ */

export interface AIAdvisorRecommendation {
  type: 'hire' | 'furniture' | 'fire' | 'upgrade' | 'warning'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  cost?: number
  expectedBenefit: string
}

const PRIORITY_ORDER: Record<AIAdvisorRecommendation['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/**
 * AI 경영 컨설턴트 추천 생성
 *
 * 현재 팀 구성, 사무실 상태, 재무 상황을 종합 분석하여
 * 채용/가구/경고/업그레이드 추천을 우선순위별로 반환한다.
 *
 * @param employees 전체 직원 목록
 * @param officeLayout 현재 사무실 레이아웃 (null이면 미초기화)
 * @param officeLevel 사무실 레벨 (1-8+)
 * @param cash 현재 보유 현금
 * @param totalAssets 총 자산 (현금 + 포트폴리오)
 * @returns 최대 5개의 우선순위 정렬된 추천 목록
 */
export function generateAIRecommendations(
  employees: Employee[],
  officeLayout: OfficeLayout | null,
  officeLevel: number,
  cash: number,
  _totalAssets: number,
): AIAdvisorRecommendation[] {
  const recommendations: AIAdvisorRecommendation[] = []

  // ── 역할 분류 ──
  const analysts = employees.filter((e) => e.role === 'analyst')
  const traders = employees.filter((e) => e.role === 'trader')
  const managers = employees.filter((e) => e.role === 'manager')
  const totalCount = employees.length

  // ── 스트레스/만족도 통계 ──
  const stressValues = employees.map((e) => e.stress ?? 0)
  const avgStress = stressValues.length > 0
    ? stressValues.reduce((a, b) => a + b, 0) / stressValues.length
    : 0

  // ── 월급 합계 ──
  const monthlySalary = employees.reduce((sum, e) => sum + e.salary, 0)

  // ── 장식 가구 타입 집합 (현재 보유) ──
  const ownedDecoTypes = new Set(
    officeLayout?.decorations.map((d) => d.type) ?? [],
  )

  /* ────────────────────────────────
     1. 채용 추천 (Hire)
  ──────────────────────────────── */

  if (analysts.length === 0) {
    recommendations.push({
      type: 'hire',
      priority: 'high',
      title: '분석가 채용 필수!',
      description: '분석가 채용 필수! 매매 신호 생성이 안 됩니다',
      expectedBenefit: '자동 매매 신호 생성 활성화',
    })
  }

  if (traders.length === 0) {
    recommendations.push({
      type: 'hire',
      priority: 'high',
      title: '트레이더 채용 추천',
      description: '트레이더 채용 추천. 자동 매매 실행 불가',
      expectedBenefit: '승인된 거래 자동 체결',
    })
  }

  if (managers.length === 0 && (analysts.length > 0 || traders.length > 0)) {
    recommendations.push({
      type: 'hire',
      priority: 'medium',
      title: '매니저 부재 — 실수율 30%',
      description: '매니저 없이는 30% 실수율',
      expectedBenefit: '거래 실수율 0%로 감소',
    })
  }

  if (totalCount === 1) {
    recommendations.push({
      type: 'hire',
      priority: 'high',
      title: '최소 인원 미달',
      description: '최소 3명 (분석가+매니저+트레이더) 구성 권장',
      expectedBenefit: '완전한 자동 매매 파이프라인 구축',
    })
  }

  if (cash > 50_000_000 && totalCount < 3) {
    recommendations.push({
      type: 'hire',
      priority: 'medium',
      title: '인력 확충 시기',
      description: '자금 여유 있음. 인력 확충 시기',
      expectedBenefit: '매매 파이프라인 효율 극대화',
    })
  }

  /* ────────────────────────────────
     2. 가구 추천 (Furniture)
  ──────────────────────────────── */

  // 미배치 직원 체크 (책상 없음)
  if (officeLayout) {
    const unassignedCount = employees.filter((e) => !e.deskId).length
    if (unassignedCount > 0) {
      recommendations.push({
        type: 'furniture',
        priority: 'high',
        title: '미배치 직원 발견',
        description: `배치 안 된 직원 ${unassignedCount}명 있음! 책상 구매 필요`,
        cost: DESK_CATALOG.basic.cost * unassignedCount,
        expectedBenefit: `${unassignedCount}명 업무 투입 가능`,
      })
    }
  }

  // 높은 평균 스트레스 → 화분/소파 추천
  if (avgStress > 60 && totalCount > 0) {
    const stressItems: string[] = []
    if (!ownedDecoTypes.has('plant')) stressItems.push('화분')
    if (!ownedDecoTypes.has('lounge_chair')) stressItems.push('소파')
    if (!ownedDecoTypes.has('air_purifier')) stressItems.push('공기청정기')

    if (stressItems.length > 0) {
      recommendations.push({
        type: 'furniture',
        priority: 'high',
        title: '직원 스트레스 높음',
        description: `직원 스트레스 높음 (평균 ${Math.round(avgStress)}). ${stressItems.join('/')} 추천`,
        cost: stressItems.reduce((sum, item) => {
          if (item === '화분') return sum + DECORATION_CATALOG.plant.cost
          if (item === '소파') return sum + DECORATION_CATALOG.lounge_chair.cost
          if (item === '공기청정기') return sum + DECORATION_CATALOG.air_purifier.cost
          return sum
        }, 0),
        expectedBenefit: '스트레스 20~30% 감소',
      })
    }
  }

  // 커피머신 추천
  if (!ownedDecoTypes.has('coffee_machine') && totalCount > 3) {
    recommendations.push({
      type: 'furniture',
      priority: 'medium',
      title: '커피머신 추천',
      description: '커피머신 추천. 스태미너 회복↑',
      cost: DECORATION_CATALOG.coffee_machine.cost,
      expectedBenefit: '주변 직원 스태미너 회복 30% 증가',
    })
  }

  // 수족관 추천 (레벨 4+)
  if (officeLevel >= 4 && !ownedDecoTypes.has('aquarium')) {
    recommendations.push({
      type: 'furniture',
      priority: 'low',
      title: '수족관 추천',
      description: '수족관 추천. 전직원 스트레스↓',
      cost: DECORATION_CATALOG.aquarium.cost,
      expectedBenefit: '전 직원 스트레스 25% 감소 + 만족도 증가',
    })
  }

  /* ────────────────────────────────
     3. 경고 (Warning)
  ──────────────────────────────── */

  // 개별 직원 위험 스트레스
  for (const emp of employees) {
    if ((emp.stress ?? 0) > 80) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: `${emp.name} 스트레스 위험`,
        description: `${emp.name} 스트레스 위험! 즉시 휴식/상담 필요`,
        expectedBenefit: '퇴사/업무 마비 방지',
      })
    }
  }

  // 개별 직원 불만족
  for (const emp of employees) {
    if ((emp.satisfaction ?? 50) < 30) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: `${emp.name} 불만족`,
        description: `${emp.name} 불만족. 칭찬/보너스 고려`,
        expectedBenefit: '만족도 회복, 퇴사 방지',
      })
    }
  }

  // 자금 위기 경고
  if (monthlySalary > 0 && cash < monthlySalary * 3) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: '자금 위기',
      description: '자금 위기! 3개월 월급도 안 남음',
      expectedBenefit: '인력 구조조정 또는 매도로 현금 확보',
    })
  }

  /* ────────────────────────────────
     4. 업그레이드 추천 (Upgrade)
  ──────────────────────────────── */

  // 모든 책상 슬롯이 찬 경우
  if (officeLayout && officeLayout.desks.length >= officeLayout.maxDesks) {
    recommendations.push({
      type: 'upgrade',
      priority: 'medium',
      title: '사무실 레벨업 고려',
      description: '사무실 레벨업 고려. 더 많은 직원 배치 가능',
      expectedBenefit: '추가 직원 고용 및 배치 가능',
    })
  }

  // 자금 충분 + 낮은 레벨
  if (cash > 1_000_000 && officeLevel < 3) {
    recommendations.push({
      type: 'upgrade',
      priority: 'low',
      title: '사무실 업그레이드 추천',
      description: '사무실 업그레이드 추천',
      expectedBenefit: '더 넓은 공간, 고급 가구 해금',
    })
  }

  /* ────────────────────────────────
     정렬 + 상위 5개 반환
  ──────────────────────────────── */

  recommendations.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  return recommendations.slice(0, 5)
}
