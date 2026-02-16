import { useEffect, useState } from 'react'
import type { FloatingTextItem } from '../../utils/floatingTextEmitter'
import { addFloatingTextListener } from '../../utils/floatingTextEmitter'

let nextId = 0

export function FloatingTextContainer() {
  const [items, setItems] = useState<FloatingTextItem[]>([])

  useEffect(() => {
    const removeListener = addFloatingTextListener((item) => {
      const id = nextId++
      setItems((prev) => [...prev, { ...item, id }])

      // Auto-remove after animation
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }, 1200)
    })

    return removeListener
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
