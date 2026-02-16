// Global event bus for floating text
// Separated from FloatingText.tsx for React Fast Refresh compatibility

export interface FloatingTextItem {
  id: number
  text: string
  x: number
  y: number
  color: string
}

export type FloatingTextListener = (item: Omit<FloatingTextItem, 'id'>) => void

const listeners: FloatingTextListener[] = []

export function emitFloatingText(text: string, x: number, y: number, color = '#FFD700') {
  listeners.forEach((fn) => fn({ text, x, y, color }))
}

export function addFloatingTextListener(listener: FloatingTextListener) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) listeners.splice(index, 1)
  }
}
