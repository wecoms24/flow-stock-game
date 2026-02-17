import { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { XPBar } from '../ui/XPBar'
import { BadgeIcon } from '../ui/BadgeIcon'
import type { EmployeeRole } from '../../types'
import type { FurnitureType } from '../../types/office'
import { EMPLOYEE_ROLE_CONFIG } from '../../types'
import { FURNITURE_CATALOG } from '../../data/furniture'
import { TRAIT_DEFINITIONS } from '../../data/traits'
import { selectChatter } from '../../data/chatter'
import { TITLE_LABELS, BADGE_COLORS, badgeForLevel, titleForLevel } from '../../systems/growthSystem'
import { soundManager } from '../../systems/soundManager'
import { emitFloatingText } from '../../utils/floatingTextEmitter'
import { ROLE_EMOJI, BEHAVIOR_EMOJI, getMoodFace } from '../../data/employeeEmoji'
import { AIProposalWindow } from './AIProposalWindow'
import { BlueprintOverlay } from '../office/BlueprintOverlay'
import { SynergyLines } from '../office/SynergyLines'
import { SpeechBubbleContainer } from '../office/SpeechBubble'
import { emitParticles } from '../../systems/particleSystem'
import { OfficeTutorial, TutorialResetButton } from '../tutorial/OfficeTutorial'
import { isTutorialCompleted } from '../../utils/tutorialStorage'
import { OfficeCanvas } from '../office/OfficeCanvas'

const HIRE_ROLES: EmployeeRole[] = ['intern', 'analyst', 'trader', 'manager', 'ceo', 'hr_manager']

type PlacementMode = 'furniture' | 'employee' | null

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

const BEHAVIOR_ANIM_CLASS: Record<string, string> = {
  WORKING: 'sprite-working',
  IDLE: 'sprite-idle',
  BREAK: 'sprite-break',
  SOCIALIZING: 'sprite-socializing',
  COFFEE: 'sprite-coffee',
  MEETING: 'sprite-meeting',
  STRESSED_OUT: 'sprite-stressed',
  COUNSELING: 'sprite-counseling',
}

export function OfficeWindow() {
  const {
    player,
    time,
    hireEmployee,
    fireEmployee,
    difficultyConfig,
    initializeOfficeGrid,
    placeFurniture,
    removeFurniture,
    assignEmployeeSeat,
    unassignEmployeeSeat,
    praiseEmployee,
    scoldEmployee,
    openWindow,
    aiProposal,
    generateAIProposal,
    applyAIProposal,
    rejectAIProposal,
  } = useGameStore()
  const employeeBehaviors = useGameStore((s) => s.employeeBehaviors)

  // UI State
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null)
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<FurnitureType | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [speechBubbles, setSpeechBubbles] = useState<Array<{
    id: string
    employeeId: string
    message: string
    position: { x: number; y: number }
  }>>([])
  const [showFPS] = useState(import.meta.env.DEV) // 개발 모드에서만 FPS 표시
  const [fps, setFps] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)

  // 튜토리얼 자동 시작 (첫 실행 시)
  useEffect(() => {
    if (!isTutorialCompleted()) {
      setShowTutorial(true)
    }
  }, [])

  // 말풍선 업데이트 (2초마다)
  useEffect(() => {
    if (!player.officeGrid) return

    const interval = setInterval(() => {
      const currentTick = (time.hour - 9) + time.day * 10
      const newBubbles: Array<{
        id: string
        employeeId: string
        message: string
        position: { x: number; y: number }
      }> = []

      player.employees.forEach((emp) => {
        if (emp.seatIndex != null && player.officeGrid) {
          const msg = selectChatter(emp, currentTick)
          if (msg) {
            // seatIndex → 그리드 좌표 변환
            const gridX = emp.seatIndex % player.officeGrid.size.width
            const gridY = Math.floor(emp.seatIndex / player.officeGrid.size.width)

            // 그리드 좌표 → 화면 px 좌표
            // Grid container: padding 8px, cell: 40px width + 4px gap
            const GRID_PADDING = 8
            const CELL_SIZE = 40
            const CELL_GAP = 4
            const px = GRID_PADDING + gridX * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
            const py = GRID_PADDING + gridY * (CELL_SIZE + CELL_GAP)

            newBubbles.push({
              id: `${emp.id}-${Date.now()}`,
              employeeId: emp.id,
              message: msg,
              position: { x: px, y: py }
            })
          }
        }
      })

      if (newBubbles.length > 0) {
        setSpeechBubbles((prev) => [...prev, ...newBubbles])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [player.employees, player.officeGrid, time.hour, time.day])

  // Initialize grid if not exists (must be in useEffect to avoid setState during render)
  useEffect(() => {
    if (!player.officeGrid) {
      initializeOfficeGrid()
    }
  }, [player.officeGrid, initializeOfficeGrid])

  // ESC key to cancel placement (must be before early return to maintain hook order)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementMode) {
        cancelPlacement()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [placementMode])

  // Calculate placement preview (must be before early return to maintain hook order)
  const placementPreview = useMemo(() => {
    if (!player.officeGrid || !hoveredCell || !selectedFurnitureType) return null
    const catalog = FURNITURE_CATALOG[selectedFurnitureType]
    const cells: { x: number; y: number; valid: boolean }[] = []

    for (let dy = 0; dy < (catalog.size?.height ?? 1); dy++) {
      for (let dx = 0; dx < (catalog.size?.width ?? 1); dx++) {
        const x = hoveredCell.x + dx
        const y = hoveredCell.y + dy
        const valid =
          x < player.officeGrid.size.width &&
          y < player.officeGrid.size.height &&
          player.officeGrid.cells[y]?.[x]?.occupiedBy === null
        cells.push({ x, y, valid })
      }
    }

    return { cells, allValid: cells.every((c) => c.valid) }
  }, [hoveredCell, selectedFurnitureType, player.officeGrid])

  // Early return if grid not initialized yet
  if (!player.officeGrid) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        사무실을 초기화하는 중...
      </div>
    )
  }

  const grid = player.officeGrid

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    const cell = grid.cells[y][x]

    if (placementMode === 'furniture' && selectedFurnitureType) {
      // Place furniture
      const success = placeFurniture(selectedFurnitureType, x, y)
      if (success) {
        setPlacementMode(null)
        setSelectedFurnitureType(null)

        // Emit sparkle particles at furniture position
        const GRID_PADDING = 8
        const CELL_SIZE = 40
        const CELL_GAP = 4
        const px = GRID_PADDING + x * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
        const py = GRID_PADDING + y * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
        emitParticles('sparkle', px, py, 12)
      }
    } else if (placementMode === 'employee' && selectedEmployeeId) {
      // Place employee
      const success = assignEmployeeSeat(selectedEmployeeId, x, y)
      if (success) {
        setPlacementMode(null)
        setSelectedEmployeeId(null)
      }
    } else if (cell.occupiedBy) {
      // Remove furniture or employee
      const furniture = grid.furniture.find((f) => f.id === cell.occupiedBy)
      if (furniture) {
        if (confirm(`${FURNITURE_CATALOG[furniture.type].name}을(를) 제거하시겠습니까? (50% 환불)`)) {
          removeFurniture(furniture.id)
        }
      } else {
        // Employee - open detail window
        const employee = player.employees.find((e) => e.id === cell.occupiedBy)
        if (employee) {
          openWindow('employee_detail', { employeeId: employee.id })
        }
      }
    }
  }

  // Handle furniture selection
  const handleFurnitureSelect = (type: FurnitureType) => {
    const catalog = FURNITURE_CATALOG[type]
    const canAfford = player.cash >= catalog.cost
    const levelOk = !catalog.unlockLevel || player.officeLevel >= catalog.unlockLevel

    if (!levelOk) {
      alert(`레벨 ${catalog.unlockLevel} 사무실이 필요합니다.`)
      return
    }
    if (!canAfford) {
      alert(`자금이 부족합니다. ${catalog.cost.toLocaleString()}원이 필요합니다.`)
      return
    }

    setPlacementMode('furniture')
    setSelectedFurnitureType(type)
  }

  // Handle employee placement
  const handleEmployeePlacement = (employeeId: string) => {
    setPlacementMode('employee')
    setSelectedEmployeeId(employeeId)
  }

  // Cancel placement
  const cancelPlacement = () => {
    setPlacementMode(null)
    setSelectedFurnitureType(null)
    setSelectedEmployeeId(null)
  }

  // Get cell display info with buff visualization
  const getCellInfo = (x: number, y: number) => {
    const cell = grid.cells[y][x]
    const hasBuffs = cell.buffs && cell.buffs.length > 0

    if (!cell.occupiedBy) {
      return {
        type: 'empty',
        label: '',
        color: hasBuffs ? 'bg-gradient-to-br from-yellow-50 to-gray-50' : 'bg-gradient-to-br from-gray-50 to-gray-100',
        hasBuffs
      }
    }

    // Check if furniture
    const furniture = grid.furniture.find((f) => f.id === cell.occupiedBy)
    if (furniture) {
      const catalog = FURNITURE_CATALOG[furniture.type]
      // Only show label on top-left cell
      const isTopLeft = x === furniture.position.x && y === furniture.position.y
      const label = isTopLeft ? (catalog.sprite || catalog.name.substring(0, 2)) : ''

      return {
        type: 'furniture',
        label,
        color: hasBuffs
          ? 'bg-gradient-to-br from-blue-200 to-blue-300'
          : 'bg-gradient-to-br from-blue-100 to-blue-200',
        tooltip: catalog.name,
        hasBuffs,
        sprite: catalog.sprite,
        isMultiCell: (catalog.size?.width ?? 1) > 1 || (catalog.size?.height ?? 1) > 1,
        isTopLeft,
      }
    }

    // Check if employee
    const employee = player.employees.find((e) => e.id === cell.occupiedBy)
    if (employee) {
      const stressLevel = employee.stress ?? 0
      const satisfaction = employee.satisfaction ?? 80
      const stressColor = stressLevel > 70 ? 'from-red-200 to-red-300' : stressLevel > 50 ? 'from-orange-200 to-orange-300' : hasBuffs ? 'from-green-200 to-green-300' : 'from-green-100 to-green-200'
      const roleEmoji = ROLE_EMOJI[employee.role]
      const moodEmoji = getMoodFace(stressLevel, satisfaction)
      return {
        type: 'employee',
        label: employee.name.substring(0, 2),
        color: `bg-gradient-to-br ${stressColor}`,
        tooltip: `${employee.name} (${EMPLOYEE_ROLE_CONFIG[employee.role].title}) | 스트레스: ${Math.round(stressLevel)}% | 만족도: ${Math.round(satisfaction)}%`,
        hasBuffs,
        employeeId: employee.id,
        roleEmoji,
        moodEmoji,
        stressLevel,
      }
    }

    return { type: 'empty', label: '', color: 'bg-gradient-to-br from-gray-50 to-gray-100', hasBuffs: false }
  }

  return (
    <div className="text-xs p-1 space-y-2 overflow-y-auto h-full">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm font-bold">사무실 (레벨 {player.officeLevel})</div>
          <RetroButton
            size="sm"
            onClick={() => openWindow('office_history')}
            className="text-[8px]"
            title="사무실 히스토리"
          >
            📋
          </RetroButton>
          <RetroButton
            size="sm"
            onClick={() => {
              console.log('🤖 AI 버튼 클릭됨')
              console.log('Office grid:', !!player.officeGrid)
              console.log('Employee count:', player.employees.length)

              // 오피스 그리드 확인
              if (!player.officeGrid) {
                alert(
                  '⚠️ 오피스가 초기화되지 않았습니다.\n\n' +
                  '게임을 시작하면 자동으로 오피스가 생성됩니다.'
                )
                console.error('❌ Office grid가 없습니다.')
                return
              }

              // AI 제안 생성 (직원 없으면 가구만, 있으면 직원+가구)
              try {
                const hasEmployees = player.employees.length > 0
                const maxMoves = hasEmployees ? 5 : 0  // 직원 없으면 이동 제안 안 함
                const maxPurchases = 3  // 가구는 항상 제안

                console.log('AI 제안 생성 시작:', {
                  maxMoves,
                  maxPurchases,
                  employeeCount: player.employees.length,
                  mode: hasEmployees ? '직원 배치 + 가구' : '가구만'
                })

                generateAIProposal(maxMoves, maxPurchases)
                soundManager.playAIProposalOpen()

                console.log('✅ AI 제안 생성 완료')
              } catch (error) {
                console.error('❌ AI 제안 생성 중 오류:', error)
                alert(
                  '❌ AI 제안 생성 중 오류가 발생했습니다.\n\n' +
                  '오류: ' + String(error) + '\n\n' +
                  '브라우저 콘솔(F12)에서 자세한 정보를 확인하세요.'
                )
              }
            }}
            className="text-[8px] bg-blue-600 hover:bg-blue-500"
            title="AI 자동 최적화 (직원 배치 + 가구 제안)"
          >
            🤖 AI
          </RetroButton>
          <TutorialResetButton onClick={() => setShowTutorial(true)} />
        </div>
        <div className="text-retro-gray text-[10px] flex items-center justify-between">
          <span>
            {time.year}년 {time.month}월 | 월 지출: {player.monthlyExpenses.toLocaleString()}원
          </span>
          {showFPS && (
            <span className={`ml-2 font-mono ${fps >= 55 ? 'text-green-600' : fps >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
              {fps} FPS
            </span>
          )}
        </div>
        {placementMode && (
          <div className="mt-1 bg-yellow-100 border-2 border-yellow-400 rounded p-1">
            <div className="text-[10px] font-bold text-yellow-900">
              {placementMode === 'furniture' && selectedFurnitureType && (
                <>
                  <span className="text-base mr-1">{FURNITURE_CATALOG[selectedFurnitureType].sprite}</span>
                  {FURNITURE_CATALOG[selectedFurnitureType].name} 배치 중
                </>
              )}
              {placementMode === 'employee' && selectedEmployeeId && (
                <>
                  <span className="mr-1">👤</span>
                  {player.employees.find((e) => e.id === selectedEmployeeId)?.name} 배치 중
                </>
              )}
            </div>
            <div className="text-[8px] text-yellow-800 mt-0.5">
              그리드에서 원하는 위치를 클릭하세요
            </div>
            <RetroButton size="sm" onClick={cancelPlacement} className="mt-1 text-[8px]">
              취소 (ESC)
            </RetroButton>
          </div>
        )}
      </div>

      {/* 10x10 Grid - 40x40px cells */}
      <div className="win-inset bg-white p-2 relative">
        {/* Canvas rendering (background, ambient, particle) */}
        <OfficeCanvas
          officeLevel={player.officeLevel}
          onFpsUpdate={showFPS ? setFps : undefined}
        />
        <div className="grid grid-cols-10 gap-1 relative" style={{ width: '420px', height: '420px', zIndex: 10 }}>
          {grid.cells.map((row, y) =>
            row.map((_cell, x) => {
              const info = getCellInfo(x, y)
              const isPreview = placementPreview?.cells.some((c) => c.x === x && c.y === y)
              const previewValid = placementPreview?.allValid

              return (
                <div
                  key={`${x}-${y}`}
                  className={`
                    w-10 h-10 border-2 flex items-center justify-center cursor-pointer
                    transition-all relative
                    ${info.type === 'empty' ? 'border-gray-300' : info.type === 'furniture' ? 'border-blue-400' : 'border-green-400'}
                    ${info.color}
                    ${isPreview ? (previewValid ? 'ring-2 ring-green-500 ring-offset-1' : 'ring-2 ring-red-500 ring-offset-1') : ''}
                    ${!isPreview && !placementMode ? 'hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1' : ''}
                    ${info.hasBuffs ? 'shadow-sm' : ''}
                  `}
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={info.tooltip || `위치: (${x}, ${y})`}
                >
                  {/* Buff indicator */}
                  {info.hasBuffs && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                  )}

                  {/* Cell content */}
                  {info.type === 'furniture' && info.isTopLeft ? (
                    <span className="text-2xl">{info.sprite}</span>
                  ) : info.type === 'employee' ? (
                    <div className={`flex flex-col items-center leading-none ${info.employeeId ? (BEHAVIOR_ANIM_CLASS[employeeBehaviors[info.employeeId] ?? 'IDLE'] ?? '') : ''}`}>
                      {/* 역할 + 행동 + 표정 이모지 */}
                      <div className="flex items-center gap-0">
                        <span className="text-[10px]">{info.roleEmoji}</span>
                        {info.employeeId && employeeBehaviors[info.employeeId] && (
                          <span className="text-[8px]">{BEHAVIOR_EMOJI[employeeBehaviors[info.employeeId] as keyof typeof BEHAVIOR_EMOJI] ?? ''}</span>
                        )}
                        <span className="text-[10px]">{info.moodEmoji}</span>
                      </div>
                      {/* 스트레스 미니바 */}
                      <div className="w-6 h-0.5 bg-gray-300 rounded-full mt-0.5">
                        <div
                          className={`h-full rounded-full ${(info.stressLevel ?? 0) > 70 ? 'bg-red-500' : (info.stressLevel ?? 0) > 50 ? 'bg-orange-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(100, info.stressLevel ?? 0)}%` }}
                        />
                      </div>
                      {/* 이름 축약 */}
                      <span className="text-[6px] font-bold text-gray-700 mt-0.5">{info.label}</span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-gray-400">{info.label}</span>
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-2 gap-1">
        {/* Furniture Panel - Card Grid */}
        <div className="space-y-1">
          <div className="font-bold text-[10px]">가구 구매</div>
          <div className="win-inset bg-white p-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1">
              {Object.values(FURNITURE_CATALOG).map((item) => {
                const canAfford = player.cash >= item.cost
                const levelOk = !item.unlockLevel || player.officeLevel >= item.unlockLevel
                const isSelected = selectedFurnitureType === item.type

                // 버프 요약 생성
                const buffSummary = (item.buffs || [])
                  .map((buff) => {
                    const typeNames: Record<string, string> = {
                      stamina_recovery: '스태미너',
                      stress_reduction: '스트레스',
                      trading_speed: '거래속도',
                      analysis_quality: '분석력',
                      satisfaction: '만족도',
                    }
                    const percentage = Math.round((buff.value - 1) * 100)
                    const sign = percentage > 0 ? '+' : ''
                    return `${typeNames[buff.type] || buff.type} ${sign}${percentage}%`
                  })
                  .join(', ')

                return (
                  <div
                    key={item.type}
                    className={`
                      border-2 rounded p-1 cursor-pointer transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : canAfford && levelOk
                          ? 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }
                    `}
                    onClick={() => canAfford && levelOk && handleFurnitureSelect(item.type)}
                  >
                    {/* 아이콘 & 이름 */}
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xl">{item.sprite}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold truncate">{item.name}</div>
                        <div className="text-[8px] text-gray-600">{item.cost.toLocaleString()}원</div>
                      </div>
                    </div>

                    {/* 버프 요약 */}
                    {buffSummary && (
                      <div className="text-[7px] text-blue-700 bg-blue-100/50 rounded px-1 py-0.5 mb-0.5 truncate">
                        {buffSummary}
                      </div>
                    )}

                    {/* 상태 표시 */}
                    {!levelOk && (
                      <div className="text-[7px] text-red-600 bg-red-100 rounded px-1 py-0.5">
                        레벨 {item.unlockLevel} 필요
                      </div>
                    )}
                    {levelOk && !canAfford && (
                      <div className="text-[7px] text-orange-600 bg-orange-100 rounded px-1 py-0.5">
                        자금 부족
                      </div>
                    )}
                    {levelOk && canAfford && isSelected && (
                      <div className="text-[7px] text-green-600 bg-green-100 rounded px-1 py-0.5 text-center">
                        ✓ 선택됨 - 그리드 클릭
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Employee Panel */}
        <div className="space-y-1">
          <div className="font-bold text-[10px]">직원 목록 ({player.employees.length}명)</div>
          <div className="win-inset bg-white p-1 space-y-1 overflow-y-auto">
            {player.employees.length === 0 ? (
              <div className="text-[9px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded">
                직원을 고용하세요
              </div>
            ) : (
              player.employees.map((emp) => {
                const isPlaced = emp.seatIndex !== null && emp.seatIndex !== undefined
                const isSelected = selectedEmployeeId === emp.id
                const stress = emp.stress ?? 0
                const satisfaction = emp.satisfaction ?? 80
                const skills = emp.skills ?? { analysis: 30, trading: 30, research: 30 }
                const badge = emp.badge ?? badgeForLevel(emp.level ?? 1)
                const empTitle = emp.title ?? titleForLevel(emp.level ?? 1)
                const canPraise = (emp.praiseCooldown ?? 0) <= 0
                const canScold = (emp.scoldCooldown ?? 0) <= 0
                const mood = emp.mood ?? 50

                return (
                  <div
                    key={emp.id}
                    className={`
                      border-2 rounded p-1 transition-all
                      ${isSelected
                        ? 'border-green-500 bg-green-50'
                        : isPlaced
                          ? 'border-green-300 bg-green-50/30'
                          : 'border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <BadgeIcon badge={badge} title={empTitle} size={12} />
                          <span
                            className="text-[10px] font-bold truncate cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => openWindow('employee_detail', { employeeId: emp.id })}
                          >
                            {emp.name}
                          </span>
                          {emp.traits?.map((trait, traitIndex) => (
                            <span
                              key={`${emp.id}-${trait}-${traitIndex}`}
                              className="text-[8px]"
                              title={TRAIT_DEFINITIONS[trait].name}
                            >
                              {TRAIT_DEFINITIONS[trait].icon}
                            </span>
                          ))}
                          <span
                            className="text-[8px]"
                            title={`기분: ${mood}`}
                            style={{ color: mood >= 70 ? '#00AA00' : mood <= 30 ? '#CC0000' : '#808080' }}
                          >
                            {mood >= 70 ? ':-)' : mood <= 30 ? ':-(' : ':-|'}
                          </span>
                        </div>
                        <div className="text-[8px] text-gray-600">
                          {EMPLOYEE_ROLE_CONFIG[emp.role].title}
                          <span className="mx-0.5">|</span>
                          <span className="text-[7px]" style={{ color: BADGE_COLORS[badge] }}>
                            {TITLE_LABELS[empTitle]}
                          </span>
                          <span className={`ml-1 ${isPlaced ? 'text-green-600' : 'text-orange-600'}`}>
                            {isPlaced ? '✓' : '○'}
                          </span>
                        </div>
                        {/* XP Bar */}
                        <div className="mt-0.5">
                          <XPBar employee={emp} compact />
                        </div>
                        {/* Stress / Satisfaction bars */}
                        <div className="flex gap-1 mt-0.5">
                          <div className="flex-1" title={`스트레스: ${Math.round(stress)}%`}>
                            <div className="text-[7px] text-gray-500">S</div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${getStatColor(stress, true)} rounded-full transition-all`} style={{ width: `${stress}%` }} />
                            </div>
                          </div>
                          <div className="flex-1" title={`만족도: ${Math.round(satisfaction)}%`}>
                            <div className="text-[7px] text-gray-500">M</div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${getStatColor(satisfaction, false)} rounded-full transition-all`} style={{ width: `${satisfaction}%` }} />
                            </div>
                          </div>
                        </div>
                        {/* Skills mini display */}
                        <div className="flex gap-0.5 mt-0.5">
                          <span className="text-[7px] text-purple-600" title={`분석: ${Math.round(skills.analysis)}`}>A:{Math.round(skills.analysis)}</span>
                          <span className="text-[7px] text-red-600" title={`거래: ${Math.round(skills.trading)}`}>T:{Math.round(skills.trading)}</span>
                          <span className="text-[7px] text-blue-600" title={`조사: ${Math.round(skills.research)}`}>R:{Math.round(skills.research)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <RetroButton
                          size="sm"
                          onClick={(e) => {
                            if (!canPraise) return
                            praiseEmployee(emp.id)
                            soundManager.playPraise()
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            emitFloatingText('+5 XP', rect.left, rect.top - 10, '#FF69B4')

                            // Emit heart particles at employee position
                            if (emp.seatIndex != null && player.officeGrid) {
                              const gridX = emp.seatIndex % player.officeGrid.size.width
                              const gridY = Math.floor(emp.seatIndex / player.officeGrid.size.width)
                              const GRID_PADDING = 8
                              const CELL_SIZE = 40
                              const CELL_GAP = 4
                              const px = GRID_PADDING + gridX * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
                              const py = GRID_PADDING + gridY * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
                              emitParticles('heart', px, py, 8)
                            }
                          }}
                          disabled={!canPraise}
                          className="text-[8px]"
                          title={canPraise ? '칭찬 (기분+, XP+5)' : '쿨다운 중'}
                        >
                          ♥
                        </RetroButton>
                        <RetroButton
                          size="sm"
                          onClick={(e) => {
                            if (!canScold) return
                            scoldEmployee(emp.id)
                            soundManager.playScold()
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            emitFloatingText('복귀!', rect.left, rect.top - 10, '#FF4444')
                          }}
                          disabled={!canScold}
                          className="text-[8px]"
                          title={canScold ? '꾸짖기 (업무 복귀, 스트레스+)' : '쿨다운 중'}
                        >
                          !
                        </RetroButton>
                        <RetroButton
                          size="sm"
                          onClick={() => (isPlaced ? unassignEmployeeSeat(emp.id) : handleEmployeePlacement(emp.id))}
                          className="text-[8px]"
                        >
                          {isPlaced ? '해제' : '배치'}
                        </RetroButton>
                        <RetroButton
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`${emp.name}을(를) 해고하시겠습니까?`)) {
                              fireEmployee(emp.id)
                            }
                          }}
                          className="text-[8px]"
                        >
                          X
                        </RetroButton>
                      </div>
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
        <div className="font-bold text-[10px]">고용하기</div>
        <div className="grid grid-cols-2 gap-0.5">
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
                className="text-[9px]"
                title={canAfford ? `${salary.toLocaleString()}원/월` : `3개월치 필요 (${(salary * 3).toLocaleString()}원)`}
              >
                {config.title} 고용
              </RetroButton>
            )
          })}
        </div>
      </div>

      {/* AI Proposal Window (Week 4 Integration) */}
      {aiProposal && (
        <AIProposalWindow
          proposal={aiProposal}
          employees={player.employees}
          currentCash={player.cash}
          onApprove={() => {
            applyAIProposal()

            // Emit star particles at grid center
            const GRID_PADDING = 8
            const CELL_SIZE = 40
            const CELL_GAP = 4
            const gridCenterX = GRID_PADDING + 5 * (CELL_SIZE + CELL_GAP)
            const gridCenterY = GRID_PADDING + 5 * (CELL_SIZE + CELL_GAP)
            emitParticles('star', gridCenterX, gridCenterY, 20)
          }}
          onReject={() => {
            rejectAIProposal()
          }}
          onClose={() => {
            rejectAIProposal()
          }}
        />
      )}

      {/* Blueprint Overlay (미리보기) */}
      {aiProposal && player.officeGrid && (
        <BlueprintOverlay
          proposal={aiProposal}
          employees={player.employees}
          grid={player.officeGrid}
          cellSize={40} // 그리드 셀 크기 (px)
        />
      )}

      {/* Synergy Lines (시너지 연결선) */}
      {selectedEmployeeId && player.officeGrid && (
        <SynergyLines
          selectedEmployee={player.employees.find((e) => e.id === selectedEmployeeId) ?? null}
          employees={player.employees}
          grid={player.officeGrid}
          cellSize={40} // 그리드 셀 크기 (px)
        />
      )}

      {/* Speech Bubbles (말풍선) */}
      <SpeechBubbleContainer
        bubbles={speechBubbles}
        onRemoveBubble={(id) => {
          setSpeechBubbles((prev) => prev.filter((b) => b.id !== id))
        }}
      />

      {/* Tutorial Overlay */}
      {showTutorial && (
        <OfficeTutorial
          onClose={() => setShowTutorial(false)}
          onAIProposalClick={() => {
            generateAIProposal()
            soundManager.playAIProposalOpen()
          }}
        />
      )}
    </div>
  )
}
