import { useRef, useCallback, useState, useMemo, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { windowVariants } from '../../utils/motionVariants'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { WindowState, WindowType } from '../../types'

/* ── Window-type specific title bar colors (active state) ── */
const TITLE_BAR_COLORS: Partial<Record<WindowType, string>> = {
  portfolio: '#000080',      // default blue
  chart: '#0c0c1e',          // dark navy
  trading: '#1a5c2a',        // green tint
  office: '#5c3a1a',         // warm brown
  office_dot: '#5c3a1a',     // warm brown
  news: '#8b5a00',           // orange tint
  ranking: '#4a1a6b',        // purple tint
  settings: '#555555',       // gray
  proposals: '#1a4a5c',      // teal
  dashboard: '#1a3a6b',      // deeper blue
  negotiation: '#5c1a4a',    // magenta tint
}
const DEFAULT_TITLE_COLOR = '#000080'
const INACTIVE_TITLE_COLOR = '#808080'

/* ── Snap Zone Config ── */
const SNAP_THRESHOLD = 20 // px from edge to trigger snap
type SnapZone = 'left' | 'right' | 'top' | null

/* ── Window Size Constraints ── */
const WINDOW_SIZE_CONSTRAINTS: Record<
  WindowType,
  { minWidth: number; minHeight: number; maxWidth?: number; maxHeight?: number }
> = {
  portfolio: { minWidth: 320, minHeight: 250 },
  chart: { minWidth: 400, minHeight: 300 },
  trading: { minWidth: 360, minHeight: 460 },
  news: { minWidth: 380, minHeight: 350 },
  office: { minWidth: 700, minHeight: 600 },
  office_dot: { minWidth: 700, minHeight: 600 },
  ranking: { minWidth: 380, minHeight: 420 },
  office_history: { minWidth: 300, minHeight: 250 },
  employee_detail: { minWidth: 380, minHeight: 450 },
  settings: { minWidth: 360, minHeight: 320 },
  ending: { minWidth: 500, minHeight: 400 },
  institutional: { minWidth: 450, minHeight: 500 },
  proposals: { minWidth: 420, minHeight: 380 },
  acquisition: { minWidth: 620, minHeight: 500 },
  dashboard: { minWidth: 800, minHeight: 600 },
  achievement_log: { minWidth: 440, minHeight: 380 },
  monthly_cards: { minWidth: 560, minHeight: 420 },
  event_chain_tracker: { minWidth: 440, minHeight: 380 },
  skill_library: { minWidth: 540, minHeight: 440 },
  training_center: { minWidth: 540, minHeight: 440 },
  playstyle_analytics: { minWidth: 360, minHeight: 400 },
  spy: { minWidth: 400, minHeight: 500 },
  negotiation: { minWidth: 360, minHeight: 480 },
}

/* ── Resize Handle Directions ── */
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
}

interface WindowFrameProps {
  window: WindowState
  children: ReactNode
}

export function WindowFrame({ window: win, children }: WindowFrameProps) {
  const { closeWindow, minimizeWindow, toggleMaximizeWindow, focusWindow, moveWindow, resizeWindow } =
    useGameStore()
  const maxZIndex = useGameStore((s) => Math.max(...s.windows.map((w) => w.zIndex)))
  const isFocused = win.zIndex === maxZIndex
  const reducedMotion = useReducedMotion()

  const titleBarBg = useMemo(() => {
    if (!isFocused) return INACTIVE_TITLE_COLOR
    return TITLE_BAR_COLORS[win.type] ?? DEFAULT_TITLE_COLOR
  }, [isFocused, win.type])
  const [snapZone, setSnapZone] = useState<SnapZone>(null)
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(
    null,
  )
  const resizeRef = useRef<{
    direction: ResizeDirection
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startWinX: number
    startWinY: number
  } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      focusWindow(win.id)
      if (win.isMaximized) return
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        winX: win.x,
        winY: win.y,
      }

      const detectSnapZone = (clientX: number, clientY: number): SnapZone => {
        if (clientX <= SNAP_THRESHOLD) return 'left'
        if (clientX >= window.innerWidth - SNAP_THRESHOLD) return 'right'
        if (clientY <= SNAP_THRESHOLD) return 'top'
        return null
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.startX
        const dy = ev.clientY - dragRef.current.startY
        moveWindow(win.id, dragRef.current.winX + dx, dragRef.current.winY + dy)
        setSnapZone(detectSnapZone(ev.clientX, ev.clientY))
      }

      const handleMouseUp = (ev: MouseEvent) => {
        const zone = detectSnapZone(ev.clientX, ev.clientY)
        if (zone === 'top') {
          toggleMaximizeWindow(win.id)
        } else if (zone === 'left') {
          const h = window.innerHeight - 45 // taskbar + ticker height
          moveWindow(win.id, 0, 20)
          resizeWindow(win.id, Math.floor(window.innerWidth / 2), h)
        } else if (zone === 'right') {
          const h = window.innerHeight - 45
          moveWindow(win.id, Math.floor(window.innerWidth / 2), 20)
          resizeWindow(win.id, Math.floor(window.innerWidth / 2), h)
        }
        setSnapZone(null)
        dragRef.current = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [win.id, win.x, win.y, win.isMaximized, focusWindow, moveWindow, resizeWindow, toggleMaximizeWindow],
  )

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      e.stopPropagation()
      focusWindow(win.id)

      resizeRef.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: win.width,
        startHeight: win.height,
        startWinX: win.x,
        startWinY: win.y,
      }

      const constraints = WINDOW_SIZE_CONSTRAINTS[win.type]

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return

        const { direction, startX, startY, startWidth, startHeight, startWinX, startWinY } =
          resizeRef.current
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startWinX
        let newY = startWinY

        // Calculate new dimensions based on direction
        if (direction.includes('e')) newWidth = startWidth + dx
        if (direction.includes('w')) {
          newWidth = startWidth - dx
          newX = startWinX + dx
        }
        if (direction.includes('s')) newHeight = startHeight + dy
        if (direction.includes('n')) {
          newHeight = startHeight - dy
          newY = startWinY + dy
        }

        // Apply constraints
        newWidth = Math.max(constraints.minWidth, newWidth)
        newHeight = Math.max(constraints.minHeight, newHeight)

        if (constraints.maxWidth) newWidth = Math.min(constraints.maxWidth, newWidth)
        if (constraints.maxHeight) newHeight = Math.min(constraints.maxHeight, newHeight)

        // Adjust position if constrained (for west/north directions)
        if (direction.includes('w') && newWidth === constraints.minWidth) {
          newX = startWinX + startWidth - constraints.minWidth
        }
        if (direction.includes('n') && newHeight === constraints.minHeight) {
          newY = startWinY + startHeight - constraints.minHeight
        }

        // Prevent moving off-screen (left/top)
        newX = Math.max(0, newX)
        newY = Math.max(0, newY)

        // Update window
        resizeWindow(win.id, newWidth, newHeight)
        if (direction.includes('w') || direction.includes('n')) {
          moveWindow(win.id, newX, newY)
        }
      }

      const handleMouseUp = () => {
        resizeRef.current = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [win.id, win.type, win.width, win.height, win.x, win.y, focusWindow, resizeWindow, moveWindow],
  )

  if (win.isMinimized) return null

  return (
    <motion.div
      className="absolute win-outset bg-win-face flex flex-col group/window"
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      variants={reducedMotion ? undefined : windowVariants}
      initial={reducedMotion ? undefined : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      exit={reducedMotion ? undefined : "minimized"}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Title Bar */}
      <div
        className="flex items-center px-0.5 py-0.5 gap-1 cursor-move shrink-0"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => {
          dragRef.current = null
          toggleMaximizeWindow(win.id)
        }}
      >
        <div
          className="flex-1 text-win-title-text px-1.5 py-0.5 text-xs font-bold truncate transition-colors duration-150"
          style={{ backgroundColor: titleBarBg }}
        >
          {win.title}
        </div>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:brightness-110 active:win-pressed active:translate-y-[1px] transition-transform duration-[50ms]"
          onClick={() => minimizeWindow(win.id)}
          aria-label="최소화"
        >
          _
        </button>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:brightness-110 active:win-pressed active:translate-y-[1px] transition-transform duration-[50ms]"
          onClick={() => toggleMaximizeWindow(win.id)}
          title={win.isMaximized ? '이전 크기로' : '최대화'}
          aria-label={win.isMaximized ? '이전 크기로 복원' : '최대화'}
        >
          {win.isMaximized ? '❐' : '□'}
        </button>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:brightness-110 active:win-pressed active:translate-y-[1px] transition-transform duration-[50ms]"
          onClick={() => closeWindow(win.id)}
          aria-label="닫기"
        >
          X
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto m-0.5 win-inset p-1">{children}</div>

      {/* Resize Handles - 8 directions (hidden when maximized, visible on window hover) */}
      {!win.isMaximized && <>
      {/* Top */}
      <div
        className="absolute top-0 left-2 right-2 h-1 opacity-0 group-hover/window:opacity-100 transition-opacity border-t border-dotted border-win-shadow/40"
        style={{ cursor: RESIZE_CURSORS.n }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
      />
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-2 right-2 h-1 opacity-0 group-hover/window:opacity-100 transition-opacity border-b border-dotted border-win-shadow/40"
        style={{ cursor: RESIZE_CURSORS.s }}
        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
      />
      {/* Left */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 opacity-0 group-hover/window:opacity-100 transition-opacity border-l border-dotted border-win-shadow/40"
        style={{ cursor: RESIZE_CURSORS.w }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
      />
      {/* Right */}
      <div
        className="absolute right-0 top-2 bottom-2 w-1 opacity-0 group-hover/window:opacity-100 transition-opacity border-r border-dotted border-win-shadow/40"
        style={{ cursor: RESIZE_CURSORS.e }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
      />
      {/* Top-Left */}
      <div
        className="absolute top-0 left-0 w-2 h-2"
        style={{ cursor: RESIZE_CURSORS.nw }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
      />
      {/* Top-Right */}
      <div
        className="absolute top-0 right-0 w-2 h-2"
        style={{ cursor: RESIZE_CURSORS.ne }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
      />
      {/* Bottom-Left */}
      <div
        className="absolute bottom-0 left-0 w-2 h-2"
        style={{ cursor: RESIZE_CURSORS.sw }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
      />
      {/* Bottom-Right — visible resize grip */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize group"
        style={{ cursor: RESIZE_CURSORS.se }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
      >
        <svg
          className="w-full h-full opacity-40 group-hover:opacity-80 transition-opacity"
          viewBox="0 0 12 12"
        >
          <line x1="10" y1="2" x2="2" y2="10" stroke="#808080" strokeWidth="1" />
          <line x1="10" y1="5" x2="5" y2="10" stroke="#808080" strokeWidth="1" />
          <line x1="10" y1="8" x2="8" y2="10" stroke="#808080" strokeWidth="1" />
          <line x1="11" y1="2" x2="2" y2="11" stroke="#fff" strokeWidth="1" />
          <line x1="11" y1="5" x2="5" y2="11" stroke="#fff" strokeWidth="1" />
          <line x1="11" y1="8" x2="8" y2="11" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>
      </>}

      {/* Snap zone preview overlay */}
      {snapZone && (
        <div
          className="fixed pointer-events-none z-[9990] border-2 border-win-title-active bg-win-title-active/10"
          style={
            snapZone === 'left'
              ? { left: 0, top: 20, width: '50%', bottom: 36 }
              : snapZone === 'right'
                ? { right: 0, top: 20, width: '50%', bottom: 36 }
                : { left: 0, top: 20, right: 0, bottom: 36 }
          }
        />
      )}
    </motion.div>
  )
}
