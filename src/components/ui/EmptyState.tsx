import type { ReactNode } from 'react'
import { RetroButton } from './RetroButton'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-3xl mb-2" style={{ imageRendering: 'auto' }}>{icon}</div>
      <div className="text-sm font-bold text-retro-gray mb-1">{title}</div>
      {description && (
        <div className="text-[10px] text-retro-gray/70 max-w-48 leading-relaxed">{description}</div>
      )}
      {action && (
        <div className="mt-3">
          <RetroButton size="sm" variant="primary" onClick={action.onClick}>
            {action.label}
          </RetroButton>
        </div>
      )}
      {children}
    </div>
  )
}
