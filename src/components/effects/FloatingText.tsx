import { useEffect, useState } from 'react'

interface FloatingTextItem {
  id: number
  text: string
  x: number
  y: number
  color: string
}

let nextId = 0

// Global event bus for floating text
type FloatingTextListener = (item: Omit<FloatingTextItem, 'id'>) => void
const listeners: FloatingTextListener[] = []

export function emitFloatingText(text: string, x: number, y: number, color = '#FFD700') {
  listeners.forEach((fn) => fn({ text, x, y, color }))
}

export function FloatingTextContainer() {
  const [items, setItems] = useState<FloatingTextItem[]>([])

  useEffect(() => {
    const handler: FloatingTextListener = (item) => {
      const id = nextId++
      setItems((prev) => [...prev, { ...item, id }])

      // Auto-remove after animation
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }, 1200)
    }

    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[8500]">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute text-sm font-bold floating-text-anim"
          style={{
            left: item.x,
            top: item.y,
            color: item.color,
            textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}
