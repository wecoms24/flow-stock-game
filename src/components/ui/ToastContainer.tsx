import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toastVariants } from '../../utils/motionVariants'

/* ── Toast Types ── */

export type ToastType = 'critical' | 'warning' | 'info' | 'success'

export interface ToastConfig {
  id: string
  type: ToastType
  title: string
  message: string
  icon?: string
  duration?: number
}

const TYPE_STYLES: Record<ToastType, { borderColor: string; iconFallback: string }> = {
  critical: { borderColor: '#CC0000', iconFallback: '🚨' },
  warning: { borderColor: '#CC8800', iconFallback: '⚠️' },
  info: { borderColor: '#0088AA', iconFallback: 'ℹ️' },
  success: { borderColor: '#00AA00', iconFallback: '✅' },
}

const DEFAULT_DURATION = 5000
const MAX_VISIBLE = 3

/* ── Global Toast Event Bus ── */

type ToastHandler = (config: Omit<ToastConfig, 'id'>) => void
let globalToastHandler: ToastHandler | null = null

export function showToast(config: Omit<ToastConfig, 'id'>) {
  globalToastHandler?.(config)
}

let toastIdCounter = 0

/* ── ToastContainer Component ── */

export function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastConfig & { addedAt: number })[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (config: Omit<ToastConfig, 'id'>) => {
      const id = `toast-${++toastIdCounter}`
      const duration = config.duration ?? DEFAULT_DURATION

      setToasts((prev) => {
        const next = [...prev, { ...config, id, addedAt: Date.now() }]
        // Remove oldest if exceeding max
        while (next.length > MAX_VISIBLE) {
          const oldest = next.shift()
          if (oldest) {
            const timer = timersRef.current.get(oldest.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(oldest.id)
            }
          }
        }
        return next
      })

      const timer = setTimeout(() => removeToast(id), duration)
      timersRef.current.set(id, timer)
    },
    [removeToast],
  )

  // Register global handler
  useEffect(() => {
    globalToastHandler = addToast
    return () => {
      if (globalToastHandler === addToast) globalToastHandler = null
    }
  }, [addToast])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  return (
    <div className="fixed top-12 right-3 z-[9000] flex flex-col gap-1.5 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = TYPE_STYLES[toast.type]
          const elapsed = Date.now() - toast.addedAt
          const duration = toast.duration ?? DEFAULT_DURATION
          const progress = Math.max(0, 1 - elapsed / duration)

          return (
            <motion.div
              key={toast.id}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className="win-outset bg-win-face shadow-xl max-w-72 pointer-events-auto cursor-pointer"
              style={{ borderLeft: `3px solid ${style.borderColor}` }}
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-start gap-1.5 px-2 py-1.5">
                <span className="text-sm shrink-0">{toast.icon ?? style.iconFallback}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{toast.title}</div>
                  <div className="text-[10px] text-retro-gray leading-tight">{toast.message}</div>
                </div>
              </div>
              {/* Auto-dismiss progress bar */}
              <div className="h-[2px] bg-win-shadow/20">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: style.borderColor }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (duration - elapsed) / 1000, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
