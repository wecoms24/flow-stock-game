import type { ReactNode } from 'react'

interface RetroPanelProps {
  children: ReactNode
  variant?: 'outset' | 'inset'
  title?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  status?: 'success' | 'danger' | 'warning' | null
  className?: string
}

const PADDING_MAP = {
  none: '',
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3',
}

const STATUS_BORDER = {
  success: 'border-l-[3px] border-l-success',
  danger: 'border-l-[3px] border-l-danger',
  warning: 'border-l-[3px] border-l-warning',
}

export function RetroPanel({
  children,
  variant = 'outset',
  title,
  padding = 'none',
  status,
  className = '',
}: RetroPanelProps) {
  return (
    <div
      className={`bg-win-face ${variant === 'outset' ? 'win-outset' : 'win-inset'} ${
        status ? STATUS_BORDER[status] : ''
      } ${className}`}
    >
      {title && (
        <div className="bg-win-title-active text-win-title-text px-1.5 py-0.5 text-xs font-bold">
          {title}
        </div>
      )}
      <div className={PADDING_MAP[padding]}>{children}</div>
    </div>
  )
}
