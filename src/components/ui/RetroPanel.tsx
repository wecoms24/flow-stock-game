import type { ReactNode } from 'react'

interface RetroPanelProps {
  children: ReactNode
  variant?: 'outset' | 'inset'
  className?: string
}

export function RetroPanel({ children, variant = 'outset', className = '' }: RetroPanelProps) {
  return (
    <div className={`bg-win-face ${variant === 'outset' ? 'win-outset' : 'win-inset'} ${className}`}>
      {children}
    </div>
  )
}
