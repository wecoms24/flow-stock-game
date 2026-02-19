/**
 * AI Architect for Dot Layout System
 *
 * OfficeLayout (자유 배치) 기반 배치 최적화
 * - 유클리디안 거리 기반 시너지 계산
 * - 직원 배치 최적화 (미배치 + 재배치)
 * - 장식 가구 구매 제안
 */

import type { Employee } from '../types'
import type { OfficeLayout, DeskItem, DecorationItem, DecorationType } from '../types/office'
import { DECORATION_CATALOG } from '../data/furniture'
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
  const purchases: FurniturePurchase[] = []
  const decoTypes = Object.keys(DECORATION_CATALOG) as DecorationType[]
  let spent = 0

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
  const limitedMoves = moves.slice(0, 5)
  const limitedPurchases = purchases.slice(0, 3)

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
