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
import { TITLE_LABELS, BADGE_COLORS, SKILL_UNLOCKS, badgeForLevel, titleForLevel } from '../../systems/growthSystem'
import { getMoodFace } from '../../data/employeeEmoji'
import { soundManager } from '../../systems/soundManager'
import { selectChatter, selectContextualDialogue, consumeTriggeredChatter, triggerChatter } from '../../data/chatter'
import { SpeechBubbleContainer } from '../office/SpeechBubble'
import { emitFloatingText } from '../../utils/floatingTextEmitter'
import { emitParticles } from '../../systems/particleSystem'
import { AIProposalWindow } from './AIProposalWindow'
import { generateDotLayoutProposal, type DotEmployeeMove, type ProposalInsights } from '../../systems/aiArchitectDot'
import type { LayoutProposal } from '../../systems/aiArchitect'
import { pixelArtCache } from '../../systems/pixelArtSprites'

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
  const monthlyCards = useGameStore((s) => s.monthlyCards)
  const news = useGameStore((s) => s.news)
  const circuitBreaker = useGameStore((s) => s.circuitBreaker)
  const companyProfile = useGameStore((s) => s.companyProfile)
  const config = useGameStore((s) => s.config)
  const competitors = useGameStore((s) => s.competitors)

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
  const [aiProposal, setAiProposal] = useState<(LayoutProposal & { moves: DotEmployeeMove[]; insights: ProposalInsights }) | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)

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

      // 최근 뉴스 감성 (최신 3개 기준)
      const recentNews = news.slice(-3)
      const recentSentiment: 'positive' | 'negative' | 'neutral' | undefined =
        recentNews.length > 0
          ? recentNews.filter((n) => n.sentiment === 'negative').length >= 2
            ? 'negative'
            : recentNews.filter((n) => n.sentiment === 'positive').length >= 2
              ? 'positive'
              : 'neutral'
          : undefined

      // 시장 추세 (KOSPI 세션 대비)
      const kospiReturn = circuitBreaker.kospiSessionOpen > 0
        ? (circuitBreaker.kospiCurrent - circuitBreaker.kospiSessionOpen) / circuitBreaker.kospiSessionOpen
        : 0
      const marketTrend: 'up' | 'down' | 'flat' =
        kospiReturn > 0.01 ? 'up' : kospiReturn < -0.01 ? 'down' : 'flat'

      player.employees.forEach((emp) => {
        if (emp.deskId) {
          const desk = layout.desks.find((d) => d.id === emp.deskId)
          if (desk) {
            // 1순위: 이벤트 트리거 메시지 (AI 제안, 가구 배치 등)
            const triggeredMsg = consumeTriggeredChatter(emp.id)
            if (triggeredMsg) {
              newBubbles.push({
                id: `${emp.id}-${Date.now()}-${Math.random()}`,
                employeeId: emp.id,
                message: triggeredMsg,
                position: { x: desk.position.x, y: Math.max(60, desk.position.y - 20) },
              })
              return
            }

            // 인접 직원 목록 (시너지 범위 내)
            const nearbyEmps = player.employees.filter((other) => {
              if (other.id === emp.id || !other.deskId) return false
              const otherDesk = layout.desks.find((d) => d.id === other.deskId)
              if (!otherDesk) return false
              const dx = desk.position.x - otherDesk.position.x
              const dy = desk.position.y - otherDesk.position.y
              return Math.sqrt(dx * dx + dy * dy) < 120
            })

            // 2순위: 컨텍스트 기반 대화 (시장 상황 + 스트레스)
            const contextMsg = selectContextualDialogue(emp, {
              employeeStress: emp.stress,
              recentSentiment,
              marketTrend,
            })
            // 3순위: 일반 채터
            const msg = contextMsg ?? selectChatter(emp, currentTick, nearbyEmps)
            if (msg) {
              newBubbles.push({
                id: `${emp.id}-${Date.now()}-${Math.random()}`,
                employeeId: emp.id,
                message: msg,
                position: { x: desk.position.x, y: Math.max(60, desk.position.y - 20) },
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
  }, [layout, player.employees, time.hour, time.day, news, circuitBreaker])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 레벨별 사무실 테마 배경
    const level = player.officeLevel
    const themes: Record<number, { bg: string; floor: string; wall: string; accent: string }> = {
      1: { bg: '#c8b8a0', floor: '#b8a888', wall: '#d8c8b0', accent: '#a09070' },    // 창고 (밝은 베이지)
      2: { bg: '#d0c0a8', floor: '#c0b098', wall: '#ddd0b8', accent: '#a89878' },    // 작은 사무실
      3: { bg: '#e8dcc8', floor: '#d4ccb8', wall: '#f0ece4', accent: '#c4b090' },    // 개선된 사무실
      4: { bg: '#e0e8f0', floor: '#c8d4e0', wall: '#eef2f7', accent: '#a0b0c4' },    // 깔끔한 오피스
      5: { bg: '#f0f4f8', floor: '#dce4ec', wall: '#ffffff', accent: '#94a8c0' },     // 모던 오피스
      6: { bg: '#f5f0e8', floor: '#e8dcc8', wall: '#faf7f2', accent: '#c4a870' },     // 럭셔리 오피스
      7: { bg: '#1a1a2e', floor: '#16213e', wall: '#0f3460', accent: '#e94560' },     // 금융 타워
      8: { bg: '#0d1117', floor: '#161b22', wall: '#21262d', accent: '#58a6ff' },     // 하이테크 타워
      9: { bg: '#1a0a2e', floor: '#2d1b4e', wall: '#1a0a2e', accent: '#a855f7' },     // 네온 타워
      10: { bg: '#0a0a14', floor: '#14142a', wall: '#0a0a14', accent: '#ffd700' },    // 골든 펜트하우스
    }
    const theme = themes[Math.min(level, 10)] ?? themes[3]

    // 배경 그라데이션
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    bgGrad.addColorStop(0, theme.wall)
    bgGrad.addColorStop(0.4, theme.bg)
    bgGrad.addColorStop(1, theme.floor)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 바닥 타일 패턴
    const tileSize = 40
    const floorStart = Math.floor(CANVAS_HEIGHT * 0.45)
    for (let gx = 0; gx < CANVAS_WIDTH; gx += tileSize) {
      for (let gy = floorStart; gy < CANVAS_HEIGHT; gy += tileSize) {
        const isLight = (gx / tileSize + gy / tileSize) % 2 === 0
        ctx.fillStyle = isLight ? theme.floor : theme.bg
        ctx.globalAlpha = 0.3
        ctx.fillRect(gx, gy, tileSize, tileSize)
        ctx.globalAlpha = 1.0
        // 타일 경계선
        ctx.strokeStyle = theme.accent
        ctx.lineWidth = 0.5
        ctx.globalAlpha = 0.15
        ctx.strokeRect(gx, gy, tileSize, tileSize)
        ctx.globalAlpha = 1.0
      }
    }

    // 벽-바닥 경계선
    const floorY = Math.floor(CANVAS_HEIGHT * 0.45)
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(CANVAS_WIDTH, floorY)
    ctx.stroke()

    // ── 창문 (레벨에 따라 크기/개수 증가) ──
    const windowCount = Math.min(level, 4) // 1~4개
    const windowW = 60 + level * 5 // 레벨 높을수록 넓은 창
    const windowH = Math.min(floorY - 50, 60 + level * 3)
    const windowY = 38
    const windowSpacing = (CANVAS_WIDTH - windowCount * windowW) / (windowCount + 1)

    for (let wi = 0; wi < windowCount; wi++) {
      const wx = windowSpacing + wi * (windowW + windowSpacing)

      // 창틀
      ctx.fillStyle = level >= 7 ? '#1a2a4a' : '#a0a0a0'
      ctx.fillRect(wx - 2, windowY - 2, windowW + 4, windowH + 4)

      // 하늘/배경 (레벨에 따라 변화)
      const skyGrad = ctx.createLinearGradient(wx, windowY, wx, windowY + windowH)
      if (level <= 2) {
        // 지하 — 콘크리트 벽만 보임
        skyGrad.addColorStop(0, '#555')
        skyGrad.addColorStop(1, '#444')
      } else if (level <= 5) {
        // 저층 — 하늘 + 건물
        skyGrad.addColorStop(0, '#87CEEB')
        skyGrad.addColorStop(0.6, '#B0D4E8')
        skyGrad.addColorStop(1, '#808080')
      } else if (level <= 8) {
        // 고층 — 도시 야경
        skyGrad.addColorStop(0, '#0a1628')
        skyGrad.addColorStop(0.4, '#1a2a4a')
        skyGrad.addColorStop(1, '#2a1a3a')
      } else {
        // 펜트하우스 — 별이 빛나는 밤
        skyGrad.addColorStop(0, '#000020')
        skyGrad.addColorStop(1, '#100030')
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(wx, windowY, windowW, windowH)

      // 고층 건물 실루엣 (레벨 5+)
      if (level >= 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        const buildingCount = 3 + wi
        for (let bi = 0; bi < buildingCount; bi++) {
          const bx = wx + (windowW / buildingCount) * bi
          const bh = 15 + ((bi * 7 + wi * 13) % 25)
          const bw = windowW / buildingCount - 2
          ctx.fillRect(bx, windowY + windowH - bh, bw, bh)
          // 건물 창문 불빛
          ctx.fillStyle = 'rgba(255,200,50,0.3)'
          for (let fy = windowY + windowH - bh + 3; fy < windowY + windowH - 3; fy += 6) {
            for (let fx = bx + 2; fx < bx + bw - 2; fx += 5) {
              if (Math.random() > 0.4) ctx.fillRect(fx, fy, 2, 3)
            }
          }
          ctx.fillStyle = 'rgba(0,0,0,0.4)'
        }
      }

      // 창문 십자 격자
      ctx.strokeStyle = level >= 7 ? '#2a3a5a' : '#b0b0b0'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(wx + windowW / 2, windowY)
      ctx.lineTo(wx + windowW / 2, windowY + windowH)
      ctx.moveTo(wx, windowY + windowH / 2)
      ctx.lineTo(wx + windowW, windowY + windowH / 2)
      ctx.stroke()
    }

    // ── 문 (우측 벽) ──
    const doorX = CANVAS_WIDTH - 50
    const doorW = 30
    const doorH = floorY - 40
    const doorY = floorY - doorH

    // 문틀
    ctx.fillStyle = level >= 6 ? '#8B4513' : '#808080'
    ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 4)
    // 문 패널
    ctx.fillStyle = level >= 6 ? '#A0522D' : '#B0B0B0'
    ctx.fillRect(doorX, doorY, doorW, doorH)
    // 문 손잡이
    ctx.fillStyle = level >= 8 ? '#FFD700' : '#C0C0C0'
    ctx.beginPath()
    ctx.arc(doorX + doorW - 6, doorY + doorH * 0.55, 3, 0, Math.PI * 2)
    ctx.fill()
    // 문 패널 디테일
    ctx.strokeStyle = level >= 6 ? '#6B3410' : '#909090'
    ctx.lineWidth = 1
    ctx.strokeRect(doorX + 4, doorY + 4, doorW - 8, doorH * 0.4)
    ctx.strokeRect(doorX + 4, doorY + doorH * 0.5, doorW - 8, doorH * 0.4)

    // 상단 헤더 바
    ctx.fillStyle = level >= 7 ? 'rgba(0,0,0,0.3)' : '#f0ece4'
    ctx.fillRect(0, 0, CANVAS_WIDTH, 30)
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 30)
    ctx.lineTo(CANVAS_WIDTH, 30)
    ctx.stroke()

    // ── 회사 이름 + 랭킹 + 목표 ──
    const isDark = level >= 7
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = isDark ? '#fff' : '#333'
    ctx.textAlign = 'left'
    ctx.fillText(`${companyProfile?.logo ?? '🏢'} ${companyProfile?.name ?? '레트로 투자운용'}`, 6, 20)
    ctx.textAlign = 'right'
    if (competitors.length > 0) {
      const pROI = config.initialCash > 0 ? ((player.totalAssetValue - config.initialCash) / config.initialCash) * 100 : 0
      const rnk = competitors.filter(c => c.roi > pROI).length + 1
      ctx.font = 'bold 11px sans-serif'
      ctx.fillStyle = rnk === 1 ? '#FFD700' : isDark ? '#aaa' : '#666'
      ctx.fillText(`🏆 ${rnk}위/${competitors.length + 1}명`, CANVAS_WIDTH - 8, 13)
    }
    const tgt = config.targetAsset ?? 1_000_000_000
    const rem = Math.max(0, tgt - player.totalAssetValue)
    const pct = Math.min(100, (player.totalAssetValue / tgt) * 100)
    ctx.fillStyle = isDark ? '#8cf' : '#2563eb'
    ctx.font = '10px sans-serif'
    ctx.fillText(rem > 0 ? `목표까지 ${rem >= 1e8 ? `${(rem/1e8).toFixed(1)}억` : `${Math.floor(rem/1e4).toLocaleString()}만`}원 (${pct.toFixed(0)}%)` : '🎉 목표 달성!', CANVAS_WIDTH - 8, 26)
    ctx.textAlign = 'start'

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
      const isDragging = draggingItem?.type === 'decoration' && draggingItem.id === decoration.id
      const isSelected = selectedItem?.type === 'decoration' && selectedItem.id === decoration.id

      if (isDragging) return

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(decoration.position.x, decoration.position.y, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100, 150, 255, 0.2)'
        ctx.fill()
      }

      const spriteCanvas = pixelArtCache.getFurnitureSprite(decoration.type)
      ctx.drawImage(spriteCanvas as HTMLCanvasElement, decoration.position.x - 16, decoration.position.y - 16, 32, 32)
    })

    layout.desks.forEach((desk) => {
      const isDragging = draggingItem?.type === 'desk' && draggingItem.id === desk.id
      const isSelected = selectedItem?.type === 'desk' && selectedItem.id === desk.id

      if (isDragging) return

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(desk.position.x, desk.position.y, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100, 255, 150, 0.2)'
        ctx.fill()
      }

      // 픽셀아트 책상 렌더링
      const deskSprite = pixelArtCache.getFurnitureSprite(desk.type)
      ctx.drawImage(deskSprite as HTMLCanvasElement, desk.position.x - 16, desk.position.y - 16, 32, 32)

      if (desk.employeeId) {
        const employee = player.employees.find((e) => e.id === desk.employeeId)
        if (employee) {
          // 업무 시간 외(18시 이후, 9시 이전)에는 직원 미표시 — 빈 책상만
          const isBusinessHours = time.hour >= 9 && time.hour < 18
          if (!isBusinessHours) {
            // 퇴근 후: 빈 의자 표시
            ctx.font = '8px sans-serif'
            ctx.fillStyle = 'rgba(0,0,0,0.3)'
            ctx.textAlign = 'center'
            ctx.fillText('퇴근', desk.position.x, desk.position.y - 4)
            ctx.textAlign = 'start'
          } else {
            // 근무 중: 픽셀아트 직원 아바타 렌더링
            const behavior = (employeeBehaviors[employee.id] ?? 'WORKING') as 'WORKING' | 'IDLE' | 'BREAK' | 'SOCIALIZING' | 'COFFEE' | 'MEETING' | 'STRESSED_OUT' | 'COUNSELING' | 'PANIC'
            const badge = badgeForLevel(employee.level ?? 1)
            const hairStyle = employee.id.charCodeAt(0) % 3
            const empSprite = pixelArtCache.getEmployeeSprite(employee.role, badge, behavior, hairStyle)

            // 스트레스/만족도에 따른 오라 효과
            const empStress = employee.stress ?? 0
            const empSat = employee.satisfaction ?? 50
            if (empStress > 70) {
              // 높은 스트레스: 빨간 오라
              ctx.beginPath()
              ctx.arc(desk.position.x, desk.position.y - 16, 18, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(255, 50, 50, ${0.08 + Math.sin(Date.now() / 300) * 0.04})`
              ctx.fill()
            } else if (empSat > 80) {
              // 높은 만족도: 초록 오라
              ctx.beginPath()
              ctx.arc(desk.position.x, desk.position.y - 16, 18, 0, Math.PI * 2)
              ctx.fillStyle = 'rgba(50, 200, 50, 0.08)'
              ctx.fill()
            }

            ctx.drawImage(empSprite as HTMLCanvasElement, desk.position.x - 16, desk.position.y - 36, 32, 40)

            // 상태 이모지 (스트레스 높으면 땀, 만족도 높으면 하트)
            if (empStress > 80) {
              ctx.font = '10px sans-serif'
              ctx.fillText('💦', desk.position.x + 12, desk.position.y - 30)
            } else if (empSat > 85) {
              ctx.font = '10px sans-serif'
              ctx.fillText('✨', desk.position.x + 12, desk.position.y - 30)
            }

            // 이름 표시
            ctx.font = 'bold 9px sans-serif'
            ctx.fillStyle = '#333'
            ctx.textAlign = 'center'
            ctx.fillText(employee.name.substring(0, 4), desk.position.x, desk.position.y + 24)
            ctx.textAlign = 'start'

            // 스트레스 바 + 만족도 바
            const barWidth = 24
            const barHeight = 2
            const barX = desk.position.x - barWidth / 2

            // 스트레스 바 (위)
            const barY1 = desk.position.y + 27
            ctx.fillStyle = '#ddd'
            ctx.fillRect(barX, barY1, barWidth, barHeight)
            ctx.fillStyle = empStress > 70 ? '#f44' : empStress > 50 ? '#fa4' : '#4a4'
            ctx.fillRect(barX, barY1, (barWidth * empStress) / 100, barHeight)

            // 만족도 바 (아래)
            const barY2 = barY1 + 3
            ctx.fillStyle = '#ddd'
            ctx.fillRect(barX, barY2, barWidth, barHeight)
            ctx.fillStyle = empSat > 60 ? '#22c55e' : empSat > 30 ? '#fa4' : '#f44'
            ctx.fillRect(barX, barY2, (barWidth * empSat) / 100, barHeight)

            // 미니 말풍선: 행동 상태 표시
            const empBehavior = employeeBehaviors[employee.id]
            if (empBehavior) {
              const behaviorMap: Record<string, string> = {
                WORKING: '💼 작업중',
                IDLE: '😐 대기',
                BREAK: '☕ 휴식',
                SOCIALIZING: '💬 수다',
                PANIC: '😱 패닉!',
                BURNOUT: '🔥 번아웃',
                COFFEE: '☕ 커피',
                MEETING: '📋 회의',
                STRESSED_OUT: '😫 스트레스',
                COUNSELING: '💬 상담',
                CELEBRATING: '🎉 축하',
                STUDYING: '📖 공부',
                PHONE_CALL: '📱 통화',
              }
              const bubbleText = behaviorMap[empBehavior]
              if (bubbleText) {
                const bubbleW = 40
                const bubbleH = 16
                const bubbleX = desk.position.x - bubbleW / 2
                const bubbleY = desk.position.y - 56
                const bubbleR = 4

                // 말풍선 배경 (다크 모드 대응)
                ctx.fillStyle = isDark ? 'rgba(30, 30, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)'
                ctx.beginPath()
                ctx.moveTo(bubbleX + bubbleR, bubbleY)
                ctx.lineTo(bubbleX + bubbleW - bubbleR, bubbleY)
                ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + bubbleR, bubbleR)
                ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - bubbleR)
                ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - bubbleR, bubbleY + bubbleH, bubbleR)
                ctx.lineTo(bubbleX + bubbleR, bubbleY + bubbleH)
                ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - bubbleR, bubbleR)
                ctx.lineTo(bubbleX, bubbleY + bubbleR)
                ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleR, bubbleY, bubbleR)
                ctx.closePath()
                ctx.fill()

                // 말풍선 테두리
                ctx.strokeStyle = isDark ? 'rgba(100, 100, 140, 0.6)' : 'rgba(0, 0, 0, 0.15)'
                ctx.lineWidth = 0.5
                ctx.stroke()

                // 꼬리 삼각형
                ctx.fillStyle = isDark ? 'rgba(30, 30, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)'
                ctx.beginPath()
                ctx.moveTo(desk.position.x - 3, bubbleY + bubbleH)
                ctx.lineTo(desk.position.x + 3, bubbleY + bubbleH)
                ctx.lineTo(desk.position.x, bubbleY + bubbleH + 4)
                ctx.closePath()
                ctx.fill()

                // 텍스트
                ctx.font = '7px sans-serif'
                ctx.fillStyle = isDark ? '#ddd' : '#333'
                ctx.textAlign = 'center'
                ctx.fillText(bubbleText, desk.position.x, bubbleY + bubbleH - 4)
                ctx.textAlign = 'start'
              }
            }
          }
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
          if (hasCollision) {
            ctx.beginPath()
            ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
            ctx.fill()
          }
          const sprite = pixelArtCache.getFurnitureSprite(desk.type)
          ctx.drawImage(sprite as HTMLCanvasElement, snapped.x - 16, snapped.y - 16, 32, 32)
        }
      } else {
        const decoration = layout.decorations.find((d) => d.id === draggingItem.id)
        if (decoration) {
          if (hasCollision) {
            ctx.beginPath()
            ctx.arc(snapped.x, snapped.y, 20, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
            ctx.fill()
          }
          const sprite = pixelArtCache.getFurnitureSprite(decoration.type)
          ctx.drawImage(sprite as HTMLCanvasElement, snapped.x - 16, snapped.y - 16, 32, 32)
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

    // ── 하단 상태 오버레이 (반투명) ──
    const assignedEmps = player.employees.filter(e => e.deskId)
    if (assignedEmps.length > 0) {
      const overlayH = 50
      const overlayY = CANVAS_HEIGHT - overlayH

      // 반투명 배경
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(0, overlayY, CANVAS_WIDTH, overlayH)

      // 상단 경계선
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, overlayY)
      ctx.lineTo(CANVAS_WIDTH, overlayY)
      ctx.stroke()

      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'

      // 1. 시너지 보너스
      const synergyPairs: [string, string][] = []
      const assignedDesks = layout.desks.filter(d => d.employeeId)
      for (const d1 of assignedDesks) {
        const e1 = player.employees.find(e => e.id === d1.employeeId)
        if (!e1) continue
        for (const d2 of assignedDesks) {
          if (d1.id >= d2.id) continue
          const e2 = player.employees.find(e => e.id === d2.employeeId)
          if (!e2) continue
          const dx = d1.position.x - d2.position.x
          const dy = d1.position.y - d2.position.y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 120) {
            const isPipeline =
              (e1.role === 'analyst' && e2.role === 'manager') ||
              (e1.role === 'manager' && e2.role === 'analyst') ||
              (e1.role === 'manager' && e2.role === 'trader') ||
              (e1.role === 'trader' && e2.role === 'manager') ||
              (e1.role === 'analyst' && e2.role === 'trader') ||
              (e1.role === 'trader' && e2.role === 'analyst')
            if (isPipeline) synergyPairs.push([e1.role, e2.role])
          }
        }
      }

      ctx.fillStyle = '#22c55e'
      ctx.fillText(`⚡ 시너지: ${synergyPairs.length}쌍`, 8, overlayY + 14)

      // 2. 직원 평균 스탯
      const avgStress = assignedEmps.reduce((s, e) => s + (e.stress ?? 0), 0) / assignedEmps.length
      const avgSatisfaction = assignedEmps.reduce((s, e) => s + (e.satisfaction ?? 50), 0) / assignedEmps.length
      const avgStamina = assignedEmps.reduce((s, e) => s + (e.stamina ?? 100), 0) / assignedEmps.length

      ctx.fillStyle = avgStress > 60 ? '#ef4444' : avgStress > 30 ? '#f59e0b' : '#22c55e'
      ctx.fillText(`😰 스트레스: ${Math.round(avgStress)}%`, 140, overlayY + 14)

      ctx.fillStyle = avgSatisfaction > 60 ? '#22c55e' : avgSatisfaction > 30 ? '#f59e0b' : '#ef4444'
      ctx.fillText(`😊 만족도: ${Math.round(avgSatisfaction)}%`, 290, overlayY + 14)

      ctx.fillStyle = avgStamina > 50 ? '#3b82f6' : '#f59e0b'
      ctx.fillText(`💪 체력: ${Math.round(avgStamina)}%`, 430, overlayY + 14)

      // 3. 가구 버프 요약
      const buffSummary: Record<string, number> = {}
      for (const deco of layout.decorations) {
        for (const buff of deco.buffs) {
          const label = buff.type === 'stress_reduction' ? '스트레스↓' :
                        buff.type === 'stamina_recovery' ? '체력↑' :
                        buff.type === 'skill_growth' ? '성장↑' :
                        buff.type === 'trading_speed' ? '속도↑' :
                        buff.type === 'morale' ? '사기↑' : buff.type
          buffSummary[label] = (buffSummary[label] ?? 0) + 1
        }
      }

      ctx.font = '9px sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      const buffText = Object.entries(buffSummary).map(([k, v]) => `${k}×${v}`).join('  ')
      ctx.fillText(`🏢 가구 효과: ${buffText || '없음'}`, 8, overlayY + 32)

      // 4. 배치 직원 수
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillText(`👤 배치: ${assignedEmps.length}/${player.employees.length}명`, 430, overlayY + 32)

      ctx.textAlign = 'start' // reset
    }
  }, [layout, player.employees, player.officeLevel, player.totalAssetValue, employeeBehaviors, mousePos, draggingItem, placementMode, selectedDeskType, selectedDecorationType, selectedItem, time.hour, companyProfile, config, competitors])


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

        // 가구 근처 직원에게 대화 트리거
        for (const desk of layout.desks) {
          if (!desk.employeeId) continue
          const dx = desk.position.x - snapped.x
          const dy = desk.position.y - snapped.y
          if (Math.sqrt(dx * dx + dy * dy) < SYNERGY_RANGE) {
            triggerChatter(desk.employeeId, 'ai_furniture_placed')
          }
        }
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
      setConfirmDialog({
        message: '이 책상을 제거하시겠습니까? (50% 환불)',
        onConfirm: () => { removeDesk(item.id); soundManager.playClick() },
      })
    } else {
      setConfirmDialog({
        message: '이 장식을 제거하시겠습니까? (50% 환불)',
        onConfirm: () => { removeDecoration(item.id); soundManager.playClick() },
      })
    }
    setContextMenu(null)
  }

  return (
    <div className="relative text-xs p-2 space-y-2 overflow-y-auto h-full">
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
        {/* 활성 월간 카드 효과 */}
        {monthlyCards?.activeCards?.length > 0 && (
          <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
            {monthlyCards.activeCards.filter((ac) => ac.remainingTicks > 0).map((ac, i) => (
              <span key={i} className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-300" title={ac.card.description}>
                {ac.card.icon} {ac.card.title} ({Math.ceil(ac.remainingTicks / 300)}개월)
              </span>
            ))}
          </div>
        )}
        {autoPlaceMsg && (
          <div className="mt-1 bg-yellow-50 border border-yellow-400 rounded p-1 text-[11px] text-yellow-800 animate-pulse">
            ⚠️ {autoPlaceMsg}
            {autoPlaceMsg === '책상을 먼저 구매하세요' && (
              <span className="ml-1 text-blue-600"> (아래 카탈로그에서 구매)</span>
            )}
            {autoPlaceMsg === '직원을 먼저 고용하세요' && (
              <span className="ml-1 text-blue-600"> (아래 고용하기 버튼 이용)</span>
            )}
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
            <div className="win-inset bg-white p-1 space-y-0.5 max-h-48 overflow-y-auto">
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
            <div className="win-inset bg-white p-1 space-y-0.5 max-h-48 overflow-y-auto">
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
                <div className="mt-1 text-blue-500 text-[10px]">
                  ↓ 아래 고용하기 버튼을 이용하세요
                </div>
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
                const moodEmoji = getMoodFace(stress, satisfaction)
                const roleBadgeConfig: Record<EmployeeRole, { label: string; color: string }> = {
                  analyst: { label: '분석', color: '#2563eb' },
                  trader: { label: '거래', color: '#16a34a' },
                  manager: { label: '관리', color: '#7c3aed' },
                  intern: { label: '인턴', color: '#6b7280' },
                  ceo: { label: 'CEO', color: '#d97706' },
                  hr_manager: { label: 'HR', color: '#db2777' },
                }
                const roleBadge = roleBadgeConfig[emp.role]
                const empLevel = emp.level ?? 1
                const skillUnlockLevels = Object.keys(SKILL_UNLOCKS).map(Number)
                const reachedUnlocks = skillUnlockLevels.filter((lv) => empLevel >= lv).length
                const usedUnlocks = (emp.unlockedSkills ?? []).length
                const hasSkillToUnlock = reachedUnlocks > usedUnlocks

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
                            onClick={(e) => { e.stopPropagation(); openWindow('employee_detail', { employeeId: emp.id }) }}
                            title="클릭하여 상세 정보 보기"
                          >
                            {emp.name}
                          </span>
                          <span
                            className="px-1 py-0.5 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: roleBadge.color }}
                          >
                            {roleBadge.label}
                          </span>
                          {hasSkillToUnlock && (
                            <span className="text-[9px] bg-yellow-400 text-black px-1 rounded animate-pulse" title="스킬 해금 가능!">
                              🔓 스킬!
                            </span>
                          )}
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
                            setConfirmDialog({
                              message: `${emp.name}을(를) 해고하시겠습니까?`,
                              onConfirm: () => fireEmployee(emp.id),
                            })
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
          <div className="bg-white border-2 border-gray-800 rounded-lg p-4 max-w-md shadow-xl">
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
            const movedEmpIds: string[] = []

            // 1. 책상 구매가 필요한 직원 처리 (toDeskId가 '__new_desk__' 센티널인 경우)
            for (const move of aiProposal.moves) {
              const dotMove = move as DotEmployeeMove
              if (!dotMove.toDeskId.startsWith('__new_desk__')) continue

              // 해당 직원용 책상 구매 제안 찾기
              const deskPurchase = aiProposal.purchases.find(
                (p) => p.forEmployeeId === dotMove.employeeId,
              )
              if (!deskPurchase) continue

              const success = buyDesk(deskPurchase.type as DeskType, deskPurchase.x, deskPurchase.y)
              if (success) {
                // 구매한 위치(x, y)로 새 책상을 정확히 찾아 직원 배정
                const freshDesks = useGameStore.getState().player.officeLayout?.desks ?? []
                const newDesk = freshDesks.find(
                  (d) => !d.employeeId && d.position.x === deskPurchase.x && d.position.y === deskPurchase.y,
                )
                if (newDesk) {
                  assignEmployeeToDesk(dotMove.employeeId, newDesk.id)
                }
              }
              movedEmpIds.push(dotMove.employeeId)
              triggerChatter(dotMove.employeeId, 'ai_moved_closer')
            }

            // 2. 기존 직원 이동 적용 (신규 책상 이동 제외) + 이벤트 트리거 대화
            for (const move of aiProposal.moves) {
              const dotMove = move as DotEmployeeMove
              if (dotMove.toDeskId.startsWith('__new_desk__')) continue // 1단계에서 처리됨
              if (dotMove.fromDeskId) {
                unassignEmployeeFromDesk(dotMove.employeeId)
              }
              assignEmployeeToDesk(dotMove.employeeId, dotMove.toDeskId)
              movedEmpIds.push(dotMove.employeeId)

              // 이동된 직원에게 시너지 관련 대화 트리거
              if (dotMove.fromDeskId) {
                // 재배치 → 시너지 부스트
                const nearbyEmp = player.employees.find((e) =>
                  e.id !== dotMove.employeeId && e.deskId &&
                  layout.desks.some((d) => d.id === e.deskId)
                )
                triggerChatter(dotMove.employeeId, 'ai_synergy_boost', {
                  partner: nearbyEmp?.name ?? '동료',
                })
              } else {
                // 신규 배치 (기존 빈 책상으로)
                triggerChatter(dotMove.employeeId, 'ai_moved_closer')
              }
            }

            // 3. 장식 가구 구매 적용 + 주변 직원 대화 트리거
            for (const purchase of aiProposal.purchases) {
              if (purchase.type === 'basic' || purchase.type === 'premium') continue // 1단계에서 처리됨
              buyDecoration(purchase.type as DecorationType, purchase.x, purchase.y)

              // 가구 근처 직원에게 대화 트리거
              for (const desk of layout.desks) {
                if (!desk.employeeId || movedEmpIds.includes(desk.employeeId)) continue
                const dx = desk.position.x - purchase.x
                const dy = desk.position.y - purchase.y
                if (Math.sqrt(dx * dx + dy * dy) < SYNERGY_RANGE) {
                  triggerChatter(desk.employeeId, 'ai_furniture_placed')
                }
              }
            }

            // 4. 피드백 — 실행 결과 요약 토스트
            const totalMoved = movedEmpIds.length
            const totalPurchased = aiProposal.purchases.filter(
              (p) => p.type !== 'basic' && p.type !== 'premium',
            ).length
            const desksBought = aiProposal.purchases.filter(
              (p) => p.type === 'basic' || p.type === 'premium',
            ).length
            const parts: string[] = []
            if (totalMoved > 0) parts.push(`${totalMoved}명 배치`)
            if (desksBought > 0) parts.push(`책상 ${desksBought}개 구매`)
            if (totalPurchased > 0) parts.push(`가구 ${totalPurchased}개 구매`)
            const resultMsg = parts.length > 0 ? `AI 배치 완료: ${parts.join(', ')}` : 'AI 배치 완료'

            if (autoPlaceMsgTimerRef.current) clearTimeout(autoPlaceMsgTimerRef.current)
            setAutoPlaceMsg(resultMsg)
            autoPlaceMsgTimerRef.current = setTimeout(() => setAutoPlaceMsg(null), 4000)

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

      {confirmDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="win-outset bg-win-face p-3 max-w-[280px] shadow-lg">
            <div className="text-xs whitespace-pre-line mb-3">{confirmDialog.message}</div>
            <div className="flex justify-end gap-1">
              <RetroButton size="sm" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}>
                확인
              </RetroButton>
              <RetroButton size="sm" onClick={() => setConfirmDialog(null)}>
                취소
              </RetroButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
