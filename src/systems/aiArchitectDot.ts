/**
 * AI Architect for Dot Layout System
 *
 * OfficeLayout (자유 배치) 기반 배치 최적화
 * - 유클리디안 거리 기반 시너지 계산
 * - 파이프라인 클러스터 배치 (분석가→매니저→트레이더)
 * - 구역 기반 가구 배치 (업무/휴식/지원)
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
const SNAP_GRID = 40 // 40px 그리드 스냅
const MIN_ITEM_SPACING = 36 // 아이템 간 최소 거리 (충돌 방지)
const EDGE_MARGIN = 40 // 캔버스 가장자리 여백

/* ── 파이프라인 역할 순서 (좌→우 배치) ── */
const PIPELINE_ROLES = ['analyst', 'manager', 'trader'] as const

/* ── 가구 카테고리별 배치 선호 구역 ── */
type FurnitureZone = 'near_analysts' | 'near_traders' | 'center' | 'corner' | 'edge' | 'break_area'
const FURNITURE_ZONE_PREF: Partial<Record<DecorationType, FurnitureZone>> = {
  whiteboard: 'near_analysts',
  bookshelf: 'near_analysts',
  server_rack: 'near_traders',
  desktop_pc: 'near_traders',
  dual_monitor: 'near_traders',
  coffee_machine: 'center',
  trophy: 'center',
  neon_sign: 'center',
  art_painting: 'center',
  plant: 'edge',
  air_purifier: 'edge',
  lounge_chair: 'break_area',
  massage_chair: 'break_area',
  mini_bar: 'break_area',
  aquarium: 'corner',
  golf_set: 'corner',
}

/* ── 제안 분석 요약 (UI에 전달) ── */
export interface ProposalInsights {
  synergyPairsActivated: number
  stressCoveragePercent: number
  pipelineAdjacent: boolean
  highlights: string[]
}

/* ── DotEmployeeMove: deskId 포함 ── */
export interface DotEmployeeMove extends EmployeeMove {
  fromDeskId: string | null
  toDeskId: string
}

/* ── 유틸리티 ── */
function eucDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

/** 좌표를 SNAP_GRID에 스냅 */
function snapTo(v: number): number {
  return Math.round(v / SNAP_GRID) * SNAP_GRID
}

/** 캔버스 내 유효 좌표인지 확인 */
function inBounds(x: number, y: number, cw: number, ch: number): boolean {
  return x >= EDGE_MARGIN && x <= cw - EDGE_MARGIN && y >= EDGE_MARGIN && y <= ch - EDGE_MARGIN
}

/** 기존 아이템들과 충돌하는지 확인 */
function hasCollisionAt(
  x: number,
  y: number,
  items: { position: { x: number; y: number }; id?: string }[],
  excludeId?: string,
): boolean {
  return items.some(
    (item) =>
      (excludeId === undefined || item.id !== excludeId) &&
      eucDist(x, y, item.position.x, item.position.y) < MIN_ITEM_SPACING,
  )
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

/* ══════════════════════════════════════════════════════════════
   파이프라인 클러스터 배치 시스템
   ══════════════════════════════════════════════════════════════ */

/**
 * 파이프라인 클러스터 좌표 생성
 *
 * 캔버스를 3구역으로 분할하여 분석가(좌), 매니저(중), 트레이더(우) 배치
 * 각 클러스터 내에서 SNAP_GRID 간격으로 삼각형/행 배치
 */
function generateClusterPositions(
  clusterSize: number,
  centerX: number,
  centerY: number,
  canvasSize: { width: number; height: number },
  allItems: { position: { x: number; y: number }; id?: string }[],
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const spacing = SNAP_GRID * 2 // 80px spacing within cluster

  if (clusterSize === 0) return positions

  // Generate candidate positions in a compact formation around center
  // Try triangle pattern first, then row, then expand outward
  const offsets: { dx: number; dy: number }[] = [
    { dx: 0, dy: 0 }, // center
    { dx: spacing, dy: 0 }, // right
    { dx: -spacing, dy: 0 }, // left
    { dx: 0, dy: spacing }, // below
    { dx: spacing, dy: spacing }, // below-right
    { dx: -spacing, dy: spacing }, // below-left
    { dx: 0, dy: -spacing }, // above
  ]

  for (let i = 0; i < clusterSize && i < offsets.length; i++) {
    let x = snapTo(centerX + offsets[i].dx)
    let y = snapTo(centerY + offsets[i].dy)

    // Clamp to canvas bounds
    x = Math.max(EDGE_MARGIN, Math.min(canvasSize.width - EDGE_MARGIN, x))
    y = Math.max(EDGE_MARGIN, Math.min(canvasSize.height - EDGE_MARGIN, y))

    // If collision, scan nearby grid cells for a free spot
    if (hasCollisionAt(x, y, [...allItems, ...positions.map((p) => ({ position: p }))])) {
      let found = false
      for (let r = 1; r <= 4 && !found; r++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            const nx = snapTo(centerX + dx * SNAP_GRID)
            const ny = snapTo(centerY + dy * SNAP_GRID)
            if (!inBounds(nx, ny, canvasSize.width, canvasSize.height)) continue
            if (!hasCollisionAt(nx, ny, [...allItems, ...positions.map((p) => ({ position: p }))])) {
              x = nx
              y = ny
              found = true
            }
          }
        }
      }
      if (!found) continue // skip if truly no space
    }

    positions.push({ x, y })
  }

  return positions
}

/* ══════════════════════════════════════════════════════════════
   구역 기반 가구 배치 시스템
   ══════════════════════════════════════════════════════════════ */

/** 가구 타입에 따른 최적 위치 후보 생성 */
function findZonePosition(
  zone: FurnitureZone,
  canvasSize: { width: number; height: number },
  desks: DeskItem[],
  employees: Employee[],
  allItems: { position: { x: number; y: number } }[],
  buffRange: number,
): { x: number; y: number; val: number } | null {
  const cw = canvasSize.width
  const ch = canvasSize.height

  // Define scanning regions based on zone
  let scanRegion: { xMin: number; xMax: number; yMin: number; yMax: number }

  switch (zone) {
    case 'near_analysts': {
      // Left third of canvas (where analysts sit in pipeline layout)
      scanRegion = { xMin: EDGE_MARGIN, xMax: Math.round(cw * 0.4), yMin: EDGE_MARGIN, yMax: ch - EDGE_MARGIN }
      break
    }
    case 'near_traders': {
      // Right third of canvas
      scanRegion = { xMin: Math.round(cw * 0.6), xMax: cw - EDGE_MARGIN, yMin: EDGE_MARGIN, yMax: ch - EDGE_MARGIN }
      break
    }
    case 'center': {
      // Center of canvas
      scanRegion = { xMin: Math.round(cw * 0.25), xMax: Math.round(cw * 0.75), yMin: Math.round(ch * 0.25), yMax: Math.round(ch * 0.75) }
      break
    }
    case 'corner': {
      // Corners only (pick best one)
      scanRegion = { xMin: EDGE_MARGIN, xMax: cw - EDGE_MARGIN, yMin: EDGE_MARGIN, yMax: ch - EDGE_MARGIN }
      break
    }
    case 'edge': {
      // Along walls (edges of canvas)
      scanRegion = { xMin: EDGE_MARGIN, xMax: cw - EDGE_MARGIN, yMin: EDGE_MARGIN, yMax: ch - EDGE_MARGIN }
      break
    }
    case 'break_area': {
      // Bottom portion of canvas (away from work area)
      scanRegion = { xMin: EDGE_MARGIN, xMax: cw - EDGE_MARGIN, yMin: Math.round(ch * 0.6), yMax: ch - EDGE_MARGIN }
      break
    }
  }

  let bestX = 0
  let bestY = 0
  let bestVal = -1

  for (let x = snapTo(scanRegion.xMin); x <= scanRegion.xMax; x += SNAP_GRID) {
    for (let y = snapTo(scanRegion.yMin); y <= scanRegion.yMax; y += SNAP_GRID) {
      if (!inBounds(x, y, cw, ch)) continue
      if (hasCollisionAt(x, y, allItems as { position: { x: number; y: number }; id?: string }[])) continue

      let val = 0

      // Score based on how many occupied desks are in buff range
      for (const desk of desks) {
        if (!desk.employeeId) continue
        const d = eucDist(x, y, desk.position.x, desk.position.y)
        const effectiveRange = buffRange > 0 ? buffRange : 100
        if (d <= effectiveRange) {
          val += Math.max(1, Math.round(10 * (1 - d / effectiveRange)))

          // Bonus: role affinity (e.g., whiteboard near analysts gets extra)
          const emp = employees.find((e) => e.id === desk.employeeId)
          if (emp) {
            if (zone === 'near_analysts' && emp.role === 'analyst') val += 5
            if (zone === 'near_traders' && emp.role === 'trader') val += 5
          }
        }
      }

      // Zone preference bonus
      if (zone === 'corner') {
        const isCorner =
          (x < 100 || x > cw - 100) && (y < 100 || y > ch - 100)
        if (isCorner) val += 3
      }
      if (zone === 'edge') {
        const isEdge = x < 80 || x > cw - 80 || y < 80 || y > ch - 80
        if (isEdge) val += 2
      }

      if (val > bestVal) {
        bestVal = val
        bestX = x
        bestY = y
      }
    }
  }

  if (bestVal <= 0) return null
  return { x: bestX, y: bestY, val: bestVal }
}

/* ══════════════════════════════════════════════════════════════
   제안 분석 (Insights) 계산
   ══════════════════════════════════════════════════════════════ */

function computeInsights(
  simDesks: DeskItem[],
  simEmps: Employee[],
  decorations: DecorationItem[],
): ProposalInsights {
  const highlights: string[] = []

  // 1. Count active synergy pairs
  let synergyPairs = 0
  const occupiedDesks = simDesks.filter((d) => d.employeeId)
  for (let i = 0; i < occupiedDesks.length; i++) {
    for (let j = i + 1; j < occupiedDesks.length; j++) {
      const d = eucDist(
        occupiedDesks[i].position.x,
        occupiedDesks[i].position.y,
        occupiedDesks[j].position.x,
        occupiedDesks[j].position.y,
      )
      if (d > SYNERGY_RANGE_PX) continue
      const empA = simEmps.find((e) => e.id === occupiedDesks[i].employeeId)
      const empB = simEmps.find((e) => e.id === occupiedDesks[j].employeeId)
      if (!empA || !empB) continue
      const bonusAB = ROLE_SYNERGY[empA.role]?.[empB.role] || 0
      const bonusBA = ROLE_SYNERGY[empB.role]?.[empA.role] || 0
      if (bonusAB > 0 || bonusBA > 0) synergyPairs++
    }
  }
  if (synergyPairs > 0) highlights.push(`시너지 보너스 ${synergyPairs}쌍 활성화`)

  // 2. Stress coverage: % of occupied desks within range of a stress-reducing decoration
  const stressDecos = decorations.filter((d) =>
    d.buffs.some((b) => b.type === 'stress_reduction' && b.value < 1),
  )
  let covered = 0
  for (const desk of occupiedDesks) {
    for (const deco of stressDecos) {
      const d = eucDist(desk.position.x, desk.position.y, deco.position.x, deco.position.y)
      const range = deco.buffs.find((b) => b.type === 'stress_reduction')?.range ?? 0
      if (d <= range) {
        covered++
        break
      }
    }
  }
  const stressCoveragePercent = occupiedDesks.length > 0
    ? Math.round((covered / occupiedDesks.length) * 100)
    : 0
  if (stressCoveragePercent > 0) highlights.push(`스트레스 감소 범위 ${stressCoveragePercent}% 커버`)

  // 3. Pipeline adjacency check (analyst <120px> manager <120px> trader)
  let pipelineAdjacent = false
  const analystDesks = occupiedDesks.filter((d) => {
    const emp = simEmps.find((e) => e.id === d.employeeId)
    return emp?.role === 'analyst'
  })
  const managerDesks = occupiedDesks.filter((d) => {
    const emp = simEmps.find((e) => e.id === d.employeeId)
    return emp?.role === 'manager'
  })
  const traderDesks = occupiedDesks.filter((d) => {
    const emp = simEmps.find((e) => e.id === d.employeeId)
    return emp?.role === 'trader'
  })

  if (analystDesks.length > 0 && managerDesks.length > 0 && traderDesks.length > 0) {
    // Check if there exists at least one chain: analyst -> manager -> trader all within range
    for (const ad of analystDesks) {
      for (const md of managerDesks) {
        if (eucDist(ad.position.x, ad.position.y, md.position.x, md.position.y) > SYNERGY_RANGE_PX) continue
        for (const td of traderDesks) {
          if (eucDist(md.position.x, md.position.y, td.position.x, td.position.y) <= SYNERGY_RANGE_PX) {
            pipelineAdjacent = true
            break
          }
        }
        if (pipelineAdjacent) break
      }
      if (pipelineAdjacent) break
    }
    if (pipelineAdjacent) highlights.push('파이프라인 인접 배치 완료')
  }

  return { synergyPairsActivated: synergyPairs, stressCoveragePercent, pipelineAdjacent, highlights }
}

/* ── 메인: 도트 레이아웃 배치 제안 생성 ── */
export function generateDotLayoutProposal(
  employees: Employee[],
  layout: OfficeLayout,
  cash: number,
  officeLevel: number,
  budgetRatio: number = 0.1,
): LayoutProposal & { moves: DotEmployeeMove[]; insights: ProposalInsights } {
  const budget = cash * budgetRatio
  const currentScore = calcOverallScore(employees, layout)
  const moves: DotEmployeeMove[] = []
  const purchases: FurniturePurchase[] = []
  let spent = 0

  // 시뮬레이션용 복사 (원본 변경 방지)
  const simDesks = layout.desks.map((d) => ({ ...d }))
  const simDecorations = layout.decorations.map((d) => ({ ...d }))
  const simEmps = employees.map((e) => ({ ...e }))

  const cw = layout.canvasSize.width
  const ch = layout.canvasSize.height

  // ── 1. 미배치 직원 → 파이프라인 클러스터 기반 최적 배치 ──
  const unassigned = simEmps.filter((e) => !e.deskId)

  if (unassigned.length > 0) {
    // Sort unassigned by pipeline priority: analyst first, then manager, then trader, then others
    const pipelineIndex = (role: string) => {
      const idx = PIPELINE_ROLES.indexOf(role as typeof PIPELINE_ROLES[number])
      return idx >= 0 ? idx : 99
    }
    unassigned.sort((a, b) => pipelineIndex(a.role) - pipelineIndex(b.role))

    // For each unassigned employee, find the best available desk
    // Prioritize desks near same-pipeline partners
    for (const emp of unassigned) {
      const available = simDesks.filter((d) => !d.employeeId)
      if (available.length === 0) break

      // Score each desk considering pipeline cluster proximity
      let bestDesk = available[0]
      let bestScore = -1
      for (const desk of available) {
        let s = calcDeskScore(emp, desk, simDesks, simEmps, simDecorations, layout.canvasSize)

        // Pipeline cluster bonus: prefer desks near pipeline partners
        const isPipelineRole = PIPELINE_ROLES.includes(emp.role as typeof PIPELINE_ROLES[number])
        if (isPipelineRole) {
          for (const other of simDesks) {
            if (other.id === desk.id || !other.employeeId) continue
            const otherEmp = simEmps.find((e) => e.id === other.employeeId)
            if (!otherEmp) continue
            const otherIsPipeline = PIPELINE_ROLES.includes(otherEmp.role as typeof PIPELINE_ROLES[number])
            if (!otherIsPipeline) continue

            const d = eucDist(desk.position.x, desk.position.y, other.position.x, other.position.y)
            if (d <= SYNERGY_RANGE_PX) {
              // Bonus for being near pipeline partner
              s += 5
              // Extra bonus for direct pipeline adjacency (analyst→manager, manager→trader)
              const empIdx = PIPELINE_ROLES.indexOf(emp.role as typeof PIPELINE_ROLES[number])
              const otherIdx = PIPELINE_ROLES.indexOf(otherEmp.role as typeof PIPELINE_ROLES[number])
              if (Math.abs(empIdx - otherIdx) === 1) s += 8
            }
          }
        }

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
  }

  // ── 1b. 여전히 미배치된 직원 → 파이프라인 위치에 책상 구매 ──
  const deskCat = DESK_CATALOG['basic']
  const stillUnassigned = simEmps.filter((e) => !e.deskId)
  if (stillUnassigned.length > 0) {
    // Determine cluster centers for pipeline layout
    // Divide canvas into 3 columns: analyst(left), manager(center), trader(right)
    const colCenters = {
      analyst: { x: snapTo(cw * 0.2), y: snapTo(ch * 0.4) },
      manager: { x: snapTo(cw * 0.5), y: snapTo(ch * 0.4) },
      trader: { x: snapTo(cw * 0.8), y: snapTo(ch * 0.4) },
      other: { x: snapTo(cw * 0.5), y: snapTo(ch * 0.7) },
    }

    // Sort by pipeline priority
    const pipelineIndex = (role: string) => {
      const idx = PIPELINE_ROLES.indexOf(role as typeof PIPELINE_ROLES[number])
      return idx >= 0 ? idx : 99
    }
    stillUnassigned.sort((a, b) => pipelineIndex(a.role) - pipelineIndex(b.role))

    // Group by role for cluster position generation
    const roleGroups: Record<string, Employee[]> = {}
    for (const emp of stillUnassigned) {
      const key = PIPELINE_ROLES.includes(emp.role as typeof PIPELINE_ROLES[number]) ? emp.role : 'other'
      if (!roleGroups[key]) roleGroups[key] = []
      roleGroups[key].push(emp)
    }

    for (const [role, empGroup] of Object.entries(roleGroups)) {
      const center = colCenters[role as keyof typeof colCenters] ?? colCenters.other
      const allItems: { position: { x: number; y: number }; id?: string }[] = [
        ...simDesks,
        ...simDecorations,
      ]
      const positions = generateClusterPositions(
        empGroup.length,
        center.x,
        center.y,
        layout.canvasSize,
        allItems,
      )

      for (let i = 0; i < empGroup.length && i < positions.length; i++) {
        const emp = empGroup[i]
        const pos = positions[i]

        if (simDesks.length >= layout.maxDesks) break
        if (spent + deskCat.cost > budget) break

        const toGrid = toGridCoord(pos.x, pos.y)
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
    }
  }

  // ── 2. 배치된 직원 재배치 (파이프라인 클러스터 최적화) ──
  // Try to swap employees to create better pipeline adjacency
  const assigned = simEmps.filter((e) => e.deskId)
  const relocThreshold = 0.12 // 12% 개선 시 제안

  // First pass: identify employees that are far from their pipeline partners
  for (const emp of assigned) {
    if (moves.some((m) => m.employeeId === emp.id)) continue

    const curDesk = simDesks.find((d) => d.id === emp.deskId)
    if (!curDesk) continue

    const curScore = calcDeskScore(emp, curDesk, simDesks, simEmps, simDecorations, layout.canvasSize)

    // Calculate pipeline-aware score for alternative desks
    const available = simDesks.filter((d) => !d.employeeId)
    let bestAltDesk: DeskItem | null = null
    let bestAltScore = curScore

    for (const altDesk of available) {
      let altScore = calcDeskScore(emp, altDesk, simDesks, simEmps, simDecorations, layout.canvasSize)

      // Pipeline adjacency bonus for relocation scoring
      const isPipelineRole = PIPELINE_ROLES.includes(emp.role as typeof PIPELINE_ROLES[number])
      if (isPipelineRole) {
        for (const other of simDesks) {
          if (other.id === altDesk.id || !other.employeeId) continue
          const otherEmp = simEmps.find((e) => e.id === other.employeeId)
          if (!otherEmp) continue
          const d = eucDist(altDesk.position.x, altDesk.position.y, other.position.x, other.position.y)
          if (d <= SYNERGY_RANGE_PX) {
            const empIdx = PIPELINE_ROLES.indexOf(emp.role as typeof PIPELINE_ROLES[number])
            const otherIdx = PIPELINE_ROLES.indexOf(otherEmp.role as typeof PIPELINE_ROLES[number])
            if (Math.abs(empIdx - otherIdx) === 1) altScore += 5
          }
        }
      }

      if (altScore / Math.max(curScore, 1) >= 1 + relocThreshold && altScore > bestAltScore) {
        bestAltScore = altScore
        bestAltDesk = altDesk
      }
    }

    if (bestAltDesk) {
      const fromGrid = toGridCoord(curDesk.position.x, curDesk.position.y)
      const toGrid = toGridCoord(bestAltDesk.position.x, bestAltDesk.position.y)

      // Determine reason based on what improved
      let reason: string
      const isPipelineRole = PIPELINE_ROLES.includes(emp.role as typeof PIPELINE_ROLES[number])
      if (isPipelineRole) {
        // Check if moved closer to pipeline partner
        const partnerNearby = simDesks.some((d) => {
          if (d.id === bestAltDesk!.id || !d.employeeId) return false
          const otherEmp = simEmps.find((e) => e.id === d.employeeId)
          if (!otherEmp) return false
          const empIdx = PIPELINE_ROLES.indexOf(emp.role as typeof PIPELINE_ROLES[number])
          const otherIdx = PIPELINE_ROLES.indexOf(otherEmp.role as typeof PIPELINE_ROLES[number])
          return Math.abs(empIdx - otherIdx) === 1 &&
            eucDist(bestAltDesk!.position.x, bestAltDesk!.position.y, d.position.x, d.position.y) <= SYNERGY_RANGE_PX
        })
        reason = partnerNearby
          ? `파이프라인 최적화: ${curScore}점 → ${bestAltScore}점`
          : `업무 효율 개선: ${curScore}점 → ${bestAltScore}점`
      } else {
        reason = `업무 효율 개선: ${curScore}점 → ${bestAltScore}점`
      }

      moves.push({
        employeeId: emp.id,
        employeeName: emp.name,
        from: 0,
        to: 0,
        fromDeskId: curDesk.id,
        toDeskId: bestAltDesk.id,
        fromCoord: fromGrid,
        toCoord: toGrid,
        reason,
        scoreImprovement: bestAltScore - curScore,
        currentScore: curScore,
        newScore: bestAltScore,
      })

      // 시뮬레이션: 이동 반영
      curDesk.employeeId = null
      bestAltDesk.employeeId = emp.id
      emp.deskId = bestAltDesk.id
    }
  }

  // ── 3. 구역 기반 가구 구매 제안 ──
  const decoTypes = Object.keys(DECORATION_CATALOG) as DecorationType[]
  const allItemsForDeco: { position: { x: number; y: number } }[] = [...simDesks, ...simDecorations]

  for (const type of decoTypes) {
    const cat = DECORATION_CATALOG[type]
    if (cat.cost > budget - spent) continue
    if (cat.unlockLevel && cat.unlockLevel > officeLevel) continue
    if (simDecorations.filter((d) => d.type === type).length >= 2) continue

    // Determine zone preference for this furniture type
    const zone = FURNITURE_ZONE_PREF[type] ?? 'center'
    const buffRange = cat.buffs[0]?.range ?? 100

    const result = findZonePosition(zone, layout.canvasSize, simDesks, simEmps, allItemsForDeco, buffRange)

    if (result && result.val > 0) {
      purchases.push({
        type,
        x: result.x,
        y: result.y,
        cost: cat.cost,
        reason: `${cat.name} (${result.val}점 위치)`,
        roi: result.val / cat.cost,
        paybackPeriod: cat.cost / Math.max(1, result.val * 100),
        priority: result.val,
      })
      spent += cat.cost

      // Track for future collision avoidance
      allItemsForDeco.push({ position: { x: result.x, y: result.y } })
      simDecorations.push({
        id: `__new_deco__${type}`,
        type,
        position: { x: result.x, y: result.y },
        buffs: cat.buffs,
        cost: cat.cost,
        sprite: cat.sprite,
      })
    }
  }

  purchases.sort((a, b) => b.priority - a.priority)

  // ── 제한: 최대 5개 이동, 3개 가구 ──
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

  // ── 제안 분석 (Insights) ──
  const insights = computeInsights(simDesks, simEmps, simDecorations)

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
    insights,
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
