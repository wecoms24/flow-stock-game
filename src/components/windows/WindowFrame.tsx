import { useRef, useCallback, type ReactNode } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { WindowState, WindowType } from '../../types'

/* ── Window Size Constraints ── */
const WINDOW_SIZE_CONSTRAINTS: Record<
  WindowType,
  { minWidth: number; minHeight: number; maxWidth?: number; maxHeight?: number }
> = {
  portfolio: { minWidth: 320, minHeight: 250 },
  chart: { minWidth: 400, minHeight: 300 },
  trading: { minWidth: 320, minHeight: 400 },
  news: { minWidth: 300, minHeight: 200 },
  office: { minWidth: 400, minHeight: 350 },
  ranking: { minWidth: 340, minHeight: 380 },
  office_history: { minWidth: 300, minHeight: 250 },
  employee_detail: { minWidth: 280, minHeight: 350 },
  settings: { minWidth: 320, minHeight: 280 },
  ending: { minWidth: 500, minHeight: 400 },
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

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.startX
        const dy = ev.clientY - dragRef.current.startY
        moveWindow(win.id, dragRef.current.winX + dx, dragRef.current.winY + dy)
      }

      const handleMouseUp = () => {
        dragRef.current = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [win.id, win.x, win.y, win.isMaximized, focusWindow, moveWindow],
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
    <div
      className="absolute win-outset bg-win-face flex flex-col"
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
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
        <div className="flex-1 bg-win-title-active text-win-title-text px-1.5 py-0.5 text-xs font-bold truncate">
          {win.title}
        </div>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer"
          onClick={() => minimizeWindow(win.id)}
        >
          _
        </button>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer"
          onClick={() => toggleMaximizeWindow(win.id)}
          title={win.isMaximized ? '이전 크기로' : '최대화'}
        >
          {win.isMaximized ? '❐' : '□'}
        </button>
        <button
          className="win-outset bg-win-face w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer"
          onClick={() => closeWindow(win.id)}
        >
          X
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto m-0.5 win-inset p-1">{children}</div>

      {/* Resize Handles - 8 directions (hidden when maximized) */}
      {!win.isMaximized && <>
      {/* Top */}
      <div
        className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize"
        style={{ cursor: RESIZE_CURSORS.n }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
      />
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize"
        style={{ cursor: RESIZE_CURSORS.s }}
        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
      />
      {/* Left */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 cursor-ew-resize"
        style={{ cursor: RESIZE_CURSORS.w }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
      />
      {/* Right */}
      <div
        className="absolute right-0 top-2 bottom-2 w-1 cursor-ew-resize"
        style={{ cursor: RESIZE_CURSORS.e }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
      />
      {/* Top-Left */}
      <div
        className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize"
        style={{ cursor: RESIZE_CURSORS.nw }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
      />
      {/* Top-Right */}
      <div
        className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize"
        style={{ cursor: RESIZE_CURSORS.ne }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
      />
      {/* Bottom-Left */}
      <div
        className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize"
        style={{ cursor: RESIZE_CURSORS.sw }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
      />
      {/* Bottom-Right */}
      <div
        className="absolute bottom-0 right-0 w-2 h-2 cursor-nwse-resize"
        style={{ cursor: RESIZE_CURSORS.se }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
      />
      </>}
    </div>
  )
}
