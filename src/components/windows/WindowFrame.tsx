import { useRef, useCallback, type ReactNode } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { WindowState } from '../../types'

interface WindowFrameProps {
  window: WindowState
  children: ReactNode
}

export function WindowFrame({ window: win, children }: WindowFrameProps) {
  const { closeWindow, minimizeWindow, focusWindow, moveWindow } = useGameStore()
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(
    null,
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      focusWindow(win.id)
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
    [win.id, win.x, win.y, focusWindow, moveWindow],
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
          onClick={() => closeWindow(win.id)}
        >
          X
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto m-0.5 win-inset p-1">{children}</div>
    </div>
  )
}
