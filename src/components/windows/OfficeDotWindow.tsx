import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { XPBar } from '../ui/XPBar'
import { BadgeIcon } from '../ui/BadgeIcon'
import { DESK_CATALOG, DECORATION_CATALOG, canBuyDesk, canBuyDecoration } from '../../data/furniture'
import type { DeskType, DecorationType, DeskItem, DecorationItem } from '../../types/office'
import type { EmployeeRole } from '../../types'
import { EMPLOYEE_ROLE_CONFIG } from '../../types'
import { TRAIT_DEFINITIONS } from '../../data/traits'
import { TITLE_LABELS, BADGE_COLORS, badgeForLevel, titleForLevel } from '../../systems/growthSystem'
import { ROLE_EMOJI, getMoodFace, BEHAVIOR_EMOJI } from '../../data/employeeEmoji'
import { soundManager } from '../../systems/soundManager'
import { selectChatter } from '../../data/chatter'
import { SpeechBubbleContainer } from '../office/SpeechBubble'
import { emitFloatingText } from '../../utils/floatingTextEmitter'
import { emitParticles } from '../../systems/particleSystem'
import { AIProposalWindow } from './AIProposalWindow'
import { generateDotLayoutProposal, type DotEmployeeMove } from '../../systems/aiArchitectDot'
import type { LayoutProposal } from '../../systems/aiArchitect'

const CANVAS_WIDTH = 580
const CANVAS_HEIGHT = 360
const MAX_DESKS = 7
const GRID_SIZE = 40
const SYNERGY_RANGE = 120
const SYNERGY_ROLE_PAIRS: [string, string][] = [
  ['analyst', 'manager'],
  ['manager', 'trader'],
  ['analyst', 'trader'],
]

type PlacementMode = 'desk' | 'decoration' | null

const HIRE_ROLES: EmployeeRole[] = ['intern', 'analyst', 'trader', 'manager', 'ceo', 'hr_manager']

function snapToGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  }
}

function checkCollision(
  x: number,
  y: number,
  excludeId: string | undefined,
  desks: DeskItem[],
  decorations: DecorationItem[]
): boolean {
  const radius = 30

  for (const desk of desks) {
    if (desk.id === excludeId) continue
    const dx = desk.position.x - x
    const dy = desk.position.y - y
    if (Math.sqrt(dx * dx + dy * dy) < radius) return true
  }

  for (const decoration of decorations) {
    if (decoration.id === excludeId) continue
    const dx = decoration.position.x - x
    const dy = decoration.position.y - y
    if (Math.sqrt(dx * dx + dy * dy) < radius) return true
  }

  return false
}

function getStatColor(value: number, isStress: boolean): string {
  if (isStress) {
    if (value > 70) return 'bg-red-500'
    if (value > 50) return 'bg-orange-400'
    return 'bg-green-400'
  }
  if (value < 30) return 'bg-red-500'
  if (value < 60) return 'bg-yellow-400'
  return 'bg-blue-400'
}

export function OfficeDotWindow() {
  const {
    player,
    time,
    hireEmployee,
    fireEmployee,
    difficultyConfig,
    initializeOfficeLayout,
    buyDesk,
    buyDecoration,
    removeDesk,
    removeDecoration,
    assignEmployeeToDesk,
    unassignEmployeeFromDesk,
    moveDeskPosition,
    moveDecorationPosition,
    praiseEmployee,
    scoldEmployee,
    openWindow,
  } = useGameStore()
  const employeeBehaviors = useGameStore((s) => s.employeeBehaviors)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [placementMode, setPlacementMode] = useState<PlacementMode>(null)
  const [selectedDeskType, setSelectedDeskType] = useState<DeskType | null>(null)
  const [selectedDecorationType, setSelectedDecorationType] = useState<DecorationType | null>(null)
  const [draggingItem, setDraggingItem] = useState<{ type: 'desk' | 'decoration'; id: string } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    item: { type: 'desk' | 'decoration'; id: string }
  } | null>(null)
  const [selectedItem, setSelectedItem] = useState<{ type: 'desk' | 'decoration'; id: string } | null>(null)
  const [speechBubbles, setSpeechBubbles] = useState<Array<{
    id: string
    employeeId: string
    message: string
    position: { x: number; y: number }
  }>>([])
  const [showDotTutorial, setShowDotTutorial] = useState(false)
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const [autoPlaceMsg, setAutoPlaceMsg] = useState<string | null>(null)
  const autoPlaceMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [aiProposal, setAiProposal] = useState<(LayoutProposal & { moves: DotEmployeeMove[] }) | null>(null)

  useEffect(() => {
    if (!player.officeLayout) {
      initializeOfficeLayout()
    }
  }, [player.officeLayout, initializeOfficeLayout])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacementMode(null)
        setSelectedDeskType(null)
        setSelectedDecorationType(null)
        setDraggingItem(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Phase 4: 첫 방문 튜토리얼
  useEffect(() => {
    const DOT_TUTORIAL_KEY = 'retro-stock-os-dot-office-tutorial'
    if (!localStorage.getItem(DOT_TUTORIAL_KEY)) {
      setShowDotTutorial(true)
    }
  }, [])

  // Phase 1: 말풍선 업데이트 (2초마다)
  const layout = player.officeLayout
  useEffect(() => {
    if (!layout) return

    const interval = setInterval(() => {
      const currentTick = (time.hour - 9) + time.day * 10
      const newBubbles: Array<{
        id: string
        employeeId: string
        message: string
        position: { x: number; y: number }
      }> = []

      player.employees.forEach((emp) => {
        if (emp.deskId) {
          const desk = layout.desks.find((d) => d.id === emp.deskId)
          if (desk) {
            const msg = selectChatter(emp, currentTick)
            if (msg) {
              newBubbles.push({
                id: `${emp.id}-${Date.now()}-${Math.random()}`,
                employeeId: emp.id,
                message: msg,
                position: { x: desk.position.x, y: desk.position.y - 20 },
              })
            }
          }
        }
      })

      if (newBubbles.length > 0) {
        setSpeechBubbles((prev) => [...prev, ...newBubbles])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [layout, player.employees, time.hour, time.day])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Phase 2: officeLevel 기반 배경색
    const bgColors: Record<number, string> = {
      1: '#e8dcc8',
      2: '#e2d8c4',
      3: '#dcd4be',
      4: '#d4ccb4',
      5: '#ccc4aa',
    }
    ctx.fillStyle = bgColors[player.officeLevel] ?? '#e8dcc8'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = '#ddd0b8'
    ctx.lineWidth = 0.5
    for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#f0ece4'
    ctx.fillRect(0, 0, CANVAS_WIDTH, 30)
    ctx.strokeStyle = '#c4b8a0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 30)
    ctx.lineTo(CANVAS_WIDTH, 30)
    ctx.stroke()

    if (layout.desks.length === 0 && layout.decorations.length === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('아래에서 책상/장식을 구매하여 배치하세요', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10)
      ctx.font = '11px sans-serif'
      ctx.fillText('드래그로 이동 | 우클릭으로 삭제', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15)
      ctx.textAlign = 'start'
    }

    if (placementMode || draggingItem) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      for (let gx = GRID_SIZE; gx < CANVAS_WIDTH; gx += GRID_SIZE) {
        for (let gy = GRID_SIZE + 30; gy < CANVAS_HEIGHT; gy += GRID_SIZE) {
          ctx.beginPath()
          ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    if (selectedItem && selectedItem.type === 'decoration') {
      const decoration = layout.decorations.find((d) => d.id === selectedItem.id)
      if (decoration) {
        decoration.buffs.forEach((buff) => {
          ctx.beginPath()
          ctx.arc(decoration.position.x, decoration.position.y, buff.range, 0, Math.PI * 2)
          if (buff.type === 'stress_reduction' && buff.value < 1) {
            ctx.fillStyle = 'rgba(100, 200, 100, 0.1)'
          } else if (buff.type === 'stamina_recovery') {
            ctx.fillStyle = 'rgba(100, 150, 255, 0.1)'
          } else if (buff.type === 'skill_growth') {
            ctx.fillStyle = 'rgba(200, 100, 255, 0.1)'
          } else if (buff.type === 'trading_speed') {
            ctx.fillStyle = 'rgba(255, 200, 100, 0.1)'
          } else {
            ctx.fillStyle = 'rgba(255, 200, 0, 0.1)'
          }
          ctx.fill()
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      }
    }

    layout.decorations.forEach((decoration) => {
      const catalog = DECORATION_CATALOG[decoration.type]
      const isDragging = draggingItem?.type === 'decoration' && draggingItem.id === decoration.id
      const isSelected = selectedItem?.type === 'decoration' && selectedItem.id === decoration.id

      if (isDragging) return

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(decoration.position.x, decoration.position.y, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100, 150, 255, 0.2)'
        ctx.fill()
      }

      ctx.font = '24px sans-serif'
      ctx.fillStyle = '#333'
      ctx.fillText(catalog.sprite, decoration.position.x - 12, decoration.position.y + 8)
    })

    layout.desks.forEach((desk) => {
      const catalog = DESK_CATALOG[desk.type]
      const isDragging = draggingItem?.type === 'desk' && draggingItem.id === desk.id
      const isSelected = selectedItem?.type === 'desk' && selectedItem.id === desk.id

      if (isDragging) return

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(desk.position.x, desk.position.y, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100, 255, 150, 0.2)'
        ctx.fill()
      }

      ctx.font = '32px sans-serif'
      ctx.fillStyle = '#333'
      ctx.fillText(catalog.sprite, desk.position.x - 16, desk.position.y + 10)

      if (desk.employeeId) {
        const employee = player.employees.find((e) => e.id === desk.employeeId)
        if (employee) {
          // 행동 이모지 표시
          const behavior = employeeBehaviors[employee.id]
          if (behavior && BEHAVIOR_EMOJI[behavior as keyof typeof BEHAVIOR_EMOJI]) {
            ctx.font = '12px sans-serif'
            ctx.fillText(BEHAVIOR_EMOJI[behavior as keyof typeof BEHAVIOR_EMOJI], desk.position.x + 14, desk.position.y - 8)
          }

          ctx.font = 'bold 10px sans-serif'
          ctx.fillStyle = '#333'
          ctx.fillText(employee.name.substring(0, 4), desk.position.x - 12, desk.position.y + 30)

          const stress = employee.stress ?? 0
          const barWidth = 24
          const barHeight = 3
          const barX = desk.position.x - barWidth / 2
          const barY = desk.position.y + 35

          ctx.fillStyle = '#ddd'
          ctx.fillRect(barX, barY, barWidth, barHeight)

          const stressColor = stress > 70 ? '#f44' : stress > 50 ? '#fa4' : '#4a4'
          ctx.fillStyle = stressColor
          ctx.fillRect(barX, barY, (barWidth * stress) / 100, barHeight)
        }
      }
    })

    // Phase 2: 시너지 라인 (선택된 아이템이 책상일 때만 표시)
    if (selectedItem?.type === 'desk') {
      const assignedDesks = layout.desks.filter((d) => d.employeeId)

      assignedDesks.forEach((desk1) => {
        const emp1 = player.employees.find((e) => e.id === desk1.employeeId)
        if (!emp1) return

        assignedDesks.forEach((desk2) => {
          if (desk1.id >= desk2.id) return
          const emp2 = player.employees.find((e) => e.id === desk2.employeeId)
          if (!emp2) return

          const isPair = SYNERGY_ROLE_PAIRS.some(
            ([r1, r2]) =>
              (emp1.role === r1 && emp2.role === r2) || (emp1.role === r2 && emp2.role === r1),
          )
          if (!isPair) return

          const ddx = desk1.position.x - desk2.position.x
          const ddy = desk1.position.y - desk2.position.y
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist > SYNERGY_RANGE) return

          ctx.beginPath()
          ctx.setLineDash([4, 3])
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)'
          ctx.lineWidth = 1.5
          ctx.moveTo(desk1.position.x, desk1.position.y)
          ctx.lineTo(desk2.position.x, desk2.position.y)
          ctx.stroke()
          ctx.setLineDash([])

          const midX = (desk1.position.x + desk2.position.x) / 2
          const midY = (desk1.position.y + desk2.position.y) / 2
          ctx.font = '10px sans-serif'
          ctx.fillStyle = '#16a34a'
          ctx.fillText('⚡', midX - 5, midY + 4)
        })
      })
    }

    if (draggingItem && mousePos) {
      const snapped = snapToGrid(mousePos.x, mousePos.y)
      const hasCollision = checkCollision(snapped.x, snapped.y, draggingItem.id, layout.desks, layout.decorations)

      ctx.globalAlpha = 0.6

      if (draggingItem.type === 'desk') {
        const desk = layout.desks.find((d) => d.id === draggingItem.id)
        if (desk) {
          const catalog = DESK_CATALOG[desk.type]
          if (hasCollision) {
            ctx.beginPath()
            ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
            ctx.fill()
          }
          ctx.font = '32px sans-serif'
          ctx.fillStyle = hasCollision ? '#f44' : '#333'
          ctx.fillText(catalog.sprite, snapped.x - 16, snapped.y + 10)
        }
      } else {
        const decoration = layout.decorations.find((d) => d.id === draggingItem.id)
        if (decoration) {
          const catalog = DECORATION_CATALOG[decoration.type]
          if (hasCollision) {
            ctx.beginPath()
            ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
            ctx.fill()
          }
          ctx.font = '24px sans-serif'
          ctx.fillStyle = hasCollision ? '#f44' : '#333'
          ctx.fillText(catalog.sprite, snapped.x - 12, snapped.y + 8)
        }
      }

      ctx.globalAlpha = 1.0
    }

    if (placementMode && mousePos && !draggingItem) {
      const snapped = snapToGrid(mousePos.x, mousePos.y)
      const hasCollision = checkCollision(snapped.x, snapped.y, undefined, layout.desks, layout.decorations)

      ctx.globalAlpha = 0.5

      if (placementMode === 'desk' && selectedDeskType) {
        const catalog = DESK_CATALOG[selectedDeskType]
        if (hasCollision) {
          ctx.beginPath()
          ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(100, 255, 100, 0.3)'
          ctx.fill()
        }
        ctx.font = '32px sans-serif'
        ctx.fillStyle = hasCollision ? '#f44' : '#4a4'
        ctx.fillText(catalog.sprite, snapped.x - 16, snapped.y + 10)
      } else if (placementMode === 'decoration' && selectedDecorationType) {
        const catalog = DECORATION_CATALOG[selectedDecorationType]
        if (hasCollision) {
          ctx.beginPath()
          ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(100, 200, 255, 0.3)'
          ctx.fill()
        }
        ctx.font = '24px sans-serif'
        ctx.fillStyle = hasCollision ? '#f44' : '#48a'
        ctx.fillText(catalog.sprite, snapped.x - 12, snapped.y + 8)

        const buffs = catalog.buffs
        buffs.forEach((buff) => {
          ctx.beginPath()
          ctx.arc(snapped.x, snapped.y, buff.range, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      }

      ctx.globalAlpha = 1.0
    }
  }, [layout, player.employees, player.officeLevel, employeeBehaviors, mousePos, draggingItem, placementMode, selectedDeskType, selectedDecorationType, selectedItem])


  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        사무실을 초기화하는 중...
      </div>
    )
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    clickStartPosRef.current = { x, y }

    if (placementMode) return

    for (let i = layout.desks.length - 1; i >= 0; i--) {
      const desk = layout.desks[i]
      const dx = desk.position.x - x
      const dy = desk.position.y - y
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        setDraggingItem({ type: 'desk', id: desk.id })
        setSelectedItem({ type: 'desk', id: desk.id })
        return
      }
    }

    for (let i = layout.decorations.length - 1; i >= 0; i--) {
      const decoration = layout.decorations[i]
      const dx = decoration.position.x - x
      const dy = decoration.position.y - y
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        setDraggingItem({ type: 'decoration', id: decoration.id })
        setSelectedItem({ type: 'decoration', id: decoration.id })
        return
      }
    }

    setSelectedItem(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 배치/드래그 모드가 아니면 불필요한 리렌더 방지
    if (!placementMode && !draggingItem) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePos({ x, y })
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (placementMode === 'desk' && selectedDeskType) {
      const snapped = snapToGrid(x, y)
      const hasCollision = checkCollision(snapped.x, snapped.y, undefined, layout.desks, layout.decorations)

      if (!hasCollision) {
        buyDesk(selectedDeskType, snapped.x, snapped.y)
        soundManager.playClick()
        emitParticles('sparkle', snapped.x, snapped.y, 6)
      }

      setPlacementMode(null)
      setSelectedDeskType(null)
    } else if (placementMode === 'decoration' && selectedDecorationType) {
      const snapped = snapToGrid(x, y)
      const hasCollision = checkCollision(snapped.x, snapped.y, undefined, layout.desks, layout.decorations)

      if (!hasCollision) {
        buyDecoration(selectedDecorationType, snapped.x, snapped.y)
        soundManager.playClick()
        emitParticles('sparkle', snapped.x, snapped.y, 6)
      }

      setPlacementMode(null)
      setSelectedDecorationType(null)
    } else if (draggingItem) {
      const startPos = clickStartPosRef.current
      const isClick = startPos && Math.abs(startPos.x - x) < 5 && Math.abs(startPos.y - y) < 5

      // 클릭(드래그 아님)이고 책상에 직원이 있으면 상세 창 열기
      if (isClick && draggingItem.type === 'desk') {
        const desk = layout.desks.find((d) => d.id === draggingItem.id)
        if (desk?.employeeId) {
          openWindow('employee_detail', { employeeId: desk.employeeId })
          setDraggingItem(null)
          clickStartPosRef.current = null
          return
        }
      }

      const snapped = snapToGrid(x, y)
      const hasCollision = checkCollision(snapped.x, snapped.y, draggingItem.id, layout.desks, layout.decorations)

      if (!hasCollision) {
        if (draggingItem.type === 'desk') {
          moveDeskPosition(draggingItem.id, snapped.x, snapped.y)
        } else {
          moveDecorationPosition(draggingItem.id, snapped.x, snapped.y)
        }
        soundManager.playClick()
      }

      setDraggingItem(null)
    }
    clickStartPosRef.current = null
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (let i = layout.desks.length - 1; i >= 0; i--) {
      const desk = layout.desks[i]
      const dx = desk.position.x - x
      const dy = desk.position.y - y
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        setContextMenu({ x: e.clientX, y: e.clientY, item: { type: 'desk', id: desk.id } })
        return
      }
    }

    for (let i = layout.decorations.length - 1; i >= 0; i--) {
      const decoration = layout.decorations[i]
      const dx = decoration.position.x - x
      const dy = decoration.position.y - y
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        setContextMenu({ x: e.clientX, y: e.clientY, item: { type: 'decoration', id: decoration.id } })
        return
      }
    }
  }

  const handleDelete = (item: { type: 'desk' | 'decoration'; id: string }) => {
    if (item.type === 'desk') {
      if (confirm('이 책상을 제거하시겠습니까? (50% 환불)')) {
        removeDesk(item.id)
        soundManager.playClick()
      }
    } else {
      if (confirm('이 장식을 제거하시겠습니까? (50% 환불)')) {
        removeDecoration(item.id)
        soundManager.playClick()
      }
    }
    setContextMenu(null)
  }

  return (
    <div className="text-xs p-2 space-y-2 overflow-y-auto h-full">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm font-bold">사무실 (레벨 {player.officeLevel})</div>
          <RetroButton
            size="sm"
            onClick={() => openWindow('office_history')}
            className="text-[10px]"
            title="사무실 히스토리"
          >
            📋
          </RetroButton>
          {(() => {
            const unassignedCount = player.employees.filter((e) => !e.deskId).length
            const emptyDeskCount = layout.desks.filter((d) => !d.employeeId).length
            const isDisabled = unassignedCount === 0 || emptyDeskCount === 0
            const tooltipText = unassignedCount === 0
              ? '모든 직원이 이미 배치됨'
              : emptyDeskCount === 0
                ? layout.desks.length === 0 ? '책상을 먼저 구매하세요' : '빈 책상이 없습니다'
                : `미배치 ${unassignedCount}명 → 빈 책상 ${emptyDeskCount}개`
            return (
              <RetroButton
                size="sm"
                onClick={() => {
                  if (isDisabled) {
                    // 비활성 시 안내 메시지 표시 (이전 타이머 클리어)
                    if (autoPlaceMsgTimerRef.current) clearTimeout(autoPlaceMsgTimerRef.current)
                    setAutoPlaceMsg(tooltipText)
                    autoPlaceMsgTimerRef.current = setTimeout(() => setAutoPlaceMsg(null), 3000)
                    return
                  }

                  const unassigned = player.employees.filter((e) => !e.deskId)
                  const emptyDesks = [...layout.desks.filter((d) => !d.employeeId)]

                  // Phase 3: 역할 인접성 기반 스마트 배치
                  const pipelineOrder: EmployeeRole[] = ['analyst', 'manager', 'trader']
                  const sorted = [...unassigned].sort((a, b) => {
                    const ai = pipelineOrder.indexOf(a.role)
                    const bi = pipelineOrder.indexOf(b.role)
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
                  })

                  const usedDesks = new Set<string>()
                  sorted.forEach((emp) => {
                    const available = emptyDesks.filter((d) => !usedDesks.has(d.id))
                    if (available.length === 0) return

                    const partnerRoles = pipelineOrder.includes(emp.role)
                      ? pipelineOrder.filter((r) => r !== emp.role)
                      : []
                    const partnerDesks = layout.desks.filter((d) => {
                      if (!d.employeeId) return false
                      const empRole = player.employees.find((e) => e.id === d.employeeId)?.role
                      return empRole ? partnerRoles.includes(empRole) : false
                    })

                    let bestDesk = available[0]
                    if (partnerDesks.length > 0) {
                      bestDesk = available.reduce((best, desk) => {
                        const minDistDesk = Math.min(
                          ...partnerDesks.map((pd) => {
                            const ddx = pd.position.x - desk.position.x
                            const ddy = pd.position.y - desk.position.y
                            return ddx * ddx + ddy * ddy
                          })
                        )
                        const minDistBest = Math.min(
                          ...partnerDesks.map((pd) => {
                            const ddx = pd.position.x - best.position.x
                            const ddy = pd.position.y - best.position.y
                            return ddx * ddx + ddy * ddy
                          })
                        )
                        return minDistDesk < minDistBest ? desk : best
                      })
                    }

                    assignEmployeeToDesk(emp.id, bestDesk.id)
                    usedDesks.add(bestDesk.id)
                  })

                  soundManager.playClick()
                  emitParticles('star', 300, 200, 8)
                }}
                className={`text-[10px] ${isDisabled ? 'opacity-40 cursor-help' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                title={tooltipText}
              >
                🤖 자동배치 {!isDisabled && `(${Math.min(unassignedCount, emptyDeskCount)})`}
              </RetroButton>
            )
          })()}
          <RetroButton
            size="sm"
            onClick={() => {
              if (player.employees.length === 0) {
                if (autoPlaceMsgTimerRef.current) clearTimeout(autoPlaceMsgTimerRef.current)
                setAutoPlaceMsg('직원을 먼저 고용하세요')
                autoPlaceMsgTimerRef.current = setTimeout(() => setAutoPlaceMsg(null), 3000)
                return
              }
              const proposal = generateDotLayoutProposal(
                player.employees,
                layout,
                player.cash,
                player.officeLevel,
              )
              setAiProposal(proposal)
              soundManager.playClick()
            }}
            className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white"
            title="AI가 최적 배치를 제안합니다"
          >
            🧠 AI 제안
          </RetroButton>
        </div>
        <div className="text-retro-gray text-[11px]">
          {time.year}년 {time.month}월 | 직원: {player.employees.length}/{MAX_DESKS}명 | 책상: {layout.desks.length}/{layout.maxDesks}개 | 월 지출: {player.monthlyExpenses.toLocaleString()}원
        </div>
        {autoPlaceMsg && (
          <div className="mt-1 bg-yellow-50 border border-yellow-400 rounded p-1 text-[11px] text-yellow-800 animate-pulse">
            ⚠️ {autoPlaceMsg}
          </div>
        )}
        {layout.desks.length === 0 && player.employees.length > 0 && (
          <div className="mt-1 bg-orange-100 border border-orange-400 rounded p-1 text-[11px] text-orange-800 font-bold animate-pulse">
            아래 카탈로그에서 책상을 구매한 후 캔버스를 클릭하여 배치하세요!
          </div>
        )}
        {placementMode && (
          <div className="mt-1 bg-yellow-100 border-2 border-yellow-400 rounded p-1">
            <div className="text-[11px] font-bold text-yellow-900">
              {placementMode === 'desk' && selectedDeskType && (
                <>
                  <span className="text-base mr-1">{DESK_CATALOG[selectedDeskType].sprite}</span>
                  {DESK_CATALOG[selectedDeskType].name} 배치 중
                </>
              )}
              {placementMode === 'decoration' && selectedDecorationType && (
                <>
                  <span className="text-base mr-1">{DECORATION_CATALOG[selectedDecorationType].sprite}</span>
                  {DECORATION_CATALOG[selectedDecorationType].name} 배치 중
                </>
              )}
            </div>
            <div className="text-[10px] text-yellow-800 mt-0.5">
              사무실 바닥을 클릭하여 배치하세요
            </div>
            <RetroButton
              size="sm"
              onClick={() => {
                setPlacementMode(null)
                setSelectedDeskType(null)
                setSelectedDecorationType(null)
              }}
              className="mt-1 text-[10px]"
            >
              취소 (ESC)
            </RetroButton>
          </div>
        )}
        {draggingItem && (
          <div className="mt-1 bg-blue-100 border-2 border-blue-400 rounded p-1">
            <div className="text-[11px] font-bold text-blue-900">
              아이템 이동 중 (드래그 앤 드롭)
            </div>
          </div>
        )}
      </div>

      {/* Canvas + Speech Bubbles */}
      <div className="win-inset p-1" style={{ background: '#c4b8a0' }}>
        <div className="relative mx-auto" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`block ${placementMode ? 'cursor-cell' : 'cursor-default'}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => setMousePos(null)}
            onContextMenu={handleCanvasContextMenu}
            style={{ imageRendering: 'pixelated', borderRadius: '2px' }}
          />
          {/* Phase 1: Speech Bubbles */}
          <SpeechBubbleContainer
            bubbles={speechBubbles}
            onRemoveBubble={(id) => {
              setSpeechBubbles((prev) => prev.filter((b) => b.id !== id))
            }}
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border-2 border-gray-400 shadow-lg z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer text-[11px]"
            onClick={() => handleDelete(contextMenu.item)}
          >
            🗑️ 삭제 (50% 환불)
          </div>
        </div>
      )}

      {/* Bottom Panels - 2 column: left=catalogs, right=employees */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left: Catalogs */}
        <div className="space-y-2">
          {/* Desk Purchase Panel */}
          <div className="space-y-1">
            <div className="font-bold text-[11px]">책상 ({layout.desks.length}/{layout.maxDesks})</div>
            <div className="win-inset bg-white p-1 space-y-0.5 max-h-32 overflow-y-auto">
              {Object.values(DESK_CATALOG).map((desk) => {
                const { canBuy, reason } = canBuyDesk(
                  desk.type,
                  player.officeLevel,
                  player.cash,
                  layout.desks.length,
                  layout.maxDesks
                )
                const isActive = placementMode === 'desk' && selectedDeskType === desk.type

                return (
                  <div
                    key={desk.type}
                    className={`
                      border rounded p-1 cursor-pointer transition-all
                      ${isActive
                        ? 'border-blue-500 bg-blue-100'
                        : canBuy
                          ? 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }
                    `}
                    onClick={() => {
                      if (canBuy) {
                        setPlacementMode('desk')
                        setSelectedDeskType(desk.type)
                        setSelectedDecorationType(null)
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xl">{desk.sprite}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">{desk.name}</div>
                        <div className="text-[10px] text-gray-500">{desk.cost.toLocaleString()}원</div>
                      </div>
                    </div>
                    {desk.buffs.length > 0 && (
                      <div className="text-[9px] text-blue-600 mt-0.5 truncate">
                        {desk.buffs.map(b => {
                          const names: Record<string, string> = { stamina_recovery: '스태미나', stress_reduction: '스트레스', skill_growth: '성장', trading_speed: '속도' }
                          return `${names[b.type] ?? b.type} x${b.value}`
                        }).join(', ')}
                      </div>
                    )}
                    {!canBuy && reason && (
                      <div className="text-[9px] text-red-500 mt-0.5">{reason}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Decoration Purchase Panel */}
          <div className="space-y-1">
            <div className="font-bold text-[11px]">장식 가구</div>
            <div className="win-inset bg-white p-1 space-y-0.5 max-h-32 overflow-y-auto">
              {Object.values(DECORATION_CATALOG).map((deco) => {
                const { canBuy, reason } = canBuyDecoration(
                  deco.type,
                  player.officeLevel,
                  player.cash,
                )
                const isActive = placementMode === 'decoration' && selectedDecorationType === deco.type

                return (
                  <div
                    key={deco.type}
                    className={`
                      border rounded p-1 cursor-pointer transition-all
                      ${isActive
                        ? 'border-purple-500 bg-purple-100'
                        : canBuy
                          ? 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }
                    `}
                    onClick={() => {
                      if (canBuy) {
                        setPlacementMode('decoration')
                        setSelectedDecorationType(deco.type)
                        setSelectedDeskType(null)
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xl">{deco.sprite}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">{deco.name}</div>
                        <div className="text-[10px] text-gray-500">{deco.cost.toLocaleString()}원</div>
                      </div>
                    </div>
                    <div className="text-[9px] text-purple-600 mt-0.5 truncate">
                      {deco.buffs.map(b => {
                        const names: Record<string, string> = { stamina_recovery: '스태미나', stress_reduction: '스트레스', skill_growth: '성장', trading_speed: '속도', morale: '사기' }
                        const pct = Math.round((b.value - 1) * 100)
                        return `${names[b.type] ?? b.type} ${pct > 0 ? '+' : ''}${pct}% (${b.range}px)`
                      }).join(', ')}
                    </div>
                    {!canBuy && reason && (
                      <div className="text-[9px] text-red-500 mt-0.5">{reason}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Employee Panel */}
        <div className="space-y-1">
          <div className="font-bold text-[11px]">직원 ({player.employees.length}/{MAX_DESKS})</div>
          <div className="win-inset bg-white p-1 space-y-1 max-h-72 overflow-y-auto">
            {player.employees.length === 0 ? (
              <div className="text-[11px] text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded">
                직원을 고용하세요
              </div>
            ) : (
              player.employees.map((emp) => {
                const isAssigned = emp.deskId !== null && emp.deskId !== undefined
                const stress = emp.stress ?? 0
                const satisfaction = emp.satisfaction ?? 80
                const skills = emp.skills ?? { analysis: 30, trading: 30, research: 30 }
                const badge = emp.badge ?? badgeForLevel(emp.level ?? 1)
                const empTitle = emp.title ?? titleForLevel(emp.level ?? 1)
                const canPraise = (emp.praiseCooldown ?? 0) <= 0
                const canScold = (emp.scoldCooldown ?? 0) <= 0
                const roleEmoji = ROLE_EMOJI[emp.role]
                const moodEmoji = getMoodFace(stress, satisfaction)

                return (
                  <div
                    key={emp.id}
                    className={`
                      border-2 rounded p-1.5 transition-all
                      ${isAssigned ? 'border-green-300 bg-green-50/30' : 'border-gray-300 bg-white'}
                    `}
                  >
                    {/* Row 1: Name + Badge + Traits + Actions */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <BadgeIcon badge={badge} title={empTitle} size={14} />
                          <span
                            className="text-[11px] font-bold truncate cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => openWindow('employee_detail', { employeeId: emp.id })}
                            title="클릭하여 상세 정보 보기"
                          >
                            {emp.name}
                          </span>
                          <span className="text-[11px]">{roleEmoji}</span>
                          <span className="text-[11px]">{moodEmoji}</span>
                          {emp.traits?.map((trait, traitIndex) => (
                            <span
                              key={`${emp.id}-${trait}-${traitIndex}`}
                              className="text-[10px]"
                              title={TRAIT_DEFINITIONS[trait]?.name}
                            >
                              {TRAIT_DEFINITIONS[trait]?.icon}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-600">
                          {EMPLOYEE_ROLE_CONFIG[emp.role].title}
                          <span className="mx-0.5">|</span>
                          <span style={{ color: BADGE_COLORS[badge] }}>
                            {TITLE_LABELS[empTitle]}
                          </span>
                          <span className={`ml-1 ${isAssigned ? 'text-green-600' : 'text-orange-600'}`}>
                            {isAssigned ? '✓ 배치됨' : '○ 미배치'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <RetroButton
                          size="sm"
                          onClick={(e) => {
                            praiseEmployee(emp.id)
                            soundManager.playPraise()
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            emitFloatingText('+5 XP', rect.left, rect.top - 10, '#FF69B4')
                            emitParticles('heart', rect.left + 10, rect.top, 5)
                          }}
                          disabled={!canPraise}
                          className="text-[10px]"
                          title={canPraise ? '칭찬 (기분+, XP+5)' : '쿨다운 중'}
                        >
                          ♥
                        </RetroButton>
                        <RetroButton
                          size="sm"
                          onClick={(e) => {
                            scoldEmployee(emp.id)
                            soundManager.playScold()
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            emitFloatingText('복귀!', rect.left, rect.top - 10, '#FF4444')
                            emitParticles('sparkle', rect.left + 10, rect.top, 3)
                          }}
                          disabled={!canScold}
                          className="text-[10px]"
                          title={canScold ? '꾸짖기 (업무 복귀, 스트레스+)' : '쿨다운 중'}
                        >
                          !
                        </RetroButton>
                        {isAssigned ? (
                          <RetroButton
                            size="sm"
                            onClick={() => unassignEmployeeFromDesk(emp.id)}
                            className="text-[9px] px-1"
                          >
                            해제
                          </RetroButton>
                        ) : (
                          <RetroButton
                            size="sm"
                            onClick={() => {
                              const emptyDesk = layout.desks.find((d) => !d.employeeId)
                              if (emptyDesk) {
                                assignEmployeeToDesk(emp.id, emptyDesk.id)
                                soundManager.playClick()
                              }
                            }}
                            className="text-[9px] px-1"
                            disabled={!layout.desks.some((d) => !d.employeeId)}
                            title={layout.desks.length === 0 ? '책상을 먼저 구매하세요' : '빈 책상에 배치'}
                          >
                            배치
                          </RetroButton>
                        )}
                        <RetroButton
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`${emp.name}을(를) 해고하시겠습니까?`)) {
                              fireEmployee(emp.id)
                            }
                          }}
                          className="text-[9px] px-1"
                        >
                          X
                        </RetroButton>
                      </div>
                    </div>

                    {/* Row 2: XP Bar */}
                    <div className="mt-1">
                      <XPBar employee={emp} compact />
                    </div>

                    {/* Row 3: Stress + Satisfaction bars */}
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1" title={`스트레스: ${Math.round(stress)}%`}>
                        <div className="flex justify-between text-[9px] text-gray-500">
                          <span>스트레스</span>
                          <span>{Math.round(stress)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${getStatColor(stress, true)} rounded-full transition-all`} style={{ width: `${stress}%` }} />
                        </div>
                      </div>
                      <div className="flex-1" title={`만족도: ${Math.round(satisfaction)}%`}>
                        <div className="flex justify-between text-[9px] text-gray-500">
                          <span>만족도</span>
                          <span>{Math.round(satisfaction)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${getStatColor(satisfaction, false)} rounded-full transition-all`} style={{ width: `${satisfaction}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Skills mini display */}
                    <div className="flex gap-2 mt-0.5 text-[9px]">
                      <span className="text-purple-600" title={`분석: ${Math.round(skills.analysis)}`}>분석:{Math.round(skills.analysis)}</span>
                      <span className="text-red-600" title={`거래: ${Math.round(skills.trading)}`}>거래:{Math.round(skills.trading)}</span>
                      <span className="text-blue-600" title={`조사: ${Math.round(skills.research)}`}>조사:{Math.round(skills.research)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Hire Panel */}
      <div className="space-y-1">
        <div className="font-bold text-[11px]">고용하기</div>
        <div className="grid grid-cols-3 gap-0.5">
          {HIRE_ROLES.map((role) => {
            const config = EMPLOYEE_ROLE_CONFIG[role]
            const salary = Math.round(config.baseSalary * difficultyConfig.employeeSalaryMultiplier)
            const canAfford = player.cash >= salary * 3

            return (
              <RetroButton
                key={role}
                size="sm"
                variant="primary"
                onClick={() => hireEmployee(role)}
                disabled={!canAfford}
                className="text-[10px]"
                title={canAfford ? `${salary.toLocaleString()}원/월` : `3개월치 필요 (${(salary * 3).toLocaleString()}원)`}
              >
                {config.title} 고용
              </RetroButton>
            )
          })}
        </div>
      </div>

      {/* Phase 4: 첫 방문 튜토리얼 */}
      {showDotTutorial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-800 rounded-lg p-4 max-w-sm shadow-xl">
            <h3 className="font-bold text-sm mb-2">🏢 사무실 안내</h3>
            <ul className="text-[11px] space-y-1.5 text-gray-700">
              <li>📌 아래 카탈로그에서 <b>책상/장식</b>을 구매하세요</li>
              <li>🖱️ 캔버스를 클릭하여 <b>배치</b>하세요</li>
              <li>🔄 배치된 아이템은 <b>드래그</b>로 이동</li>
              <li>🗑️ <b>우클릭</b>으로 아이템 삭제 (50% 환불)</li>
              <li>👤 직원 패널에서 <b>배치 버튼</b>으로 책상 배정</li>
              <li>⚡ 분석가↔매니저↔트레이더가 가까이 있으면 <b>시너지 보너스</b>!</li>
            </ul>
            <RetroButton
              size="sm"
              variant="primary"
              onClick={() => {
                setShowDotTutorial(false)
                localStorage.setItem('retro-stock-os-dot-office-tutorial', 'seen')
              }}
              className="mt-3 w-full"
            >
              확인
            </RetroButton>
          </div>
        </div>
      )}

      {/* AI Architect Proposal Popup */}
      {aiProposal && (
        <AIProposalWindow
          proposal={aiProposal}
          employees={player.employees}
          currentCash={player.cash}
          onApprove={() => {
            // 1. 직원 이동 적용
            for (const move of aiProposal.moves) {
              const dotMove = move as DotEmployeeMove
              if (dotMove.fromDeskId) {
                unassignEmployeeFromDesk(dotMove.employeeId)
              }
              assignEmployeeToDesk(dotMove.employeeId, dotMove.toDeskId)
            }
            // 2. 가구 구매 적용
            for (const purchase of aiProposal.purchases) {
              buyDecoration(purchase.type as DecorationType, purchase.x, purchase.y)
            }
            // 3. 피드백
            soundManager.playClick()
            emitParticles('star', 300, 200, 12)
            setAiProposal(null)
          }}
          onReject={() => {
            soundManager.playClick()
            setAiProposal(null)
          }}
          onClose={() => setAiProposal(null)}
        />
      )}
    </div>
  )
}
