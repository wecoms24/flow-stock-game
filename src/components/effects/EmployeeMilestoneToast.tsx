import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../../stores/gameStore'

export function EmployeeMilestoneToast() {
  const notifications = useGameStore((s) => s.milestoneNotifications)
  const dismiss = useGameStore((s) => s.dismissMilestoneNotification)
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null)

  useEffect(() => {
    if (notifications.length > 0 && visibleIndex === null) {
      setVisibleIndex(0)
    }
  }, [notifications.length, visibleIndex])

  useEffect(() => {
    if (visibleIndex === null) return
    const timer = setTimeout(() => {
      dismiss(0)
      setVisibleIndex(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [visibleIndex, dismiss])

  if (notifications.length === 0 || visibleIndex === null) return null

  const n = notifications[0]
  if (!n) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[15000] animate-slide-in-right pointer-events-auto">
      <div
        className="win-border bg-win-bg shadow-lg max-w-xs cursor-pointer"
        onClick={() => {
          dismiss(0)
          setVisibleIndex(null)
        }}
      >
        <div className="bg-win-title-active text-win-title-text px-2 py-0.5 text-xs font-bold flex items-center gap-1">
          <span>{n.icon}</span>
          <span>직원 마일스톤</span>
          <span className="ml-auto cursor-pointer hover:bg-red-500 px-1">x</span>
        </div>
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{n.icon}</span>
            <div>
              <div className="text-sm font-bold">{n.title}</div>
              <div className="text-xs text-retro-gray">{n.employeeName}</div>
            </div>
          </div>
          <div className="text-xs text-retro-dark mt-1">{n.description}</div>
        </div>
      </div>
      {notifications.length > 1 && (
        <div className="text-xs text-retro-gray text-right mt-1 pr-1">
          +{notifications.length - 1}개 더
        </div>
      )}
    </div>,
    document.body,
  )
}
