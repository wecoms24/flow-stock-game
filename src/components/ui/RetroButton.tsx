import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react'

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function RetroButton({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: RetroButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] h-6',
    md: 'px-3 py-1 text-xs h-7',
    lg: 'px-4 py-1.5 text-sm h-8',
  }

  const variantClasses = {
    default: 'bg-win-face',
    primary: 'bg-win-face font-bold',
    danger: 'bg-win-face text-retro-red font-bold',
    success: 'bg-win-face text-success font-bold',
    warning: 'bg-win-face text-warning font-bold',
  }

  const isDisabled = disabled || loading

  return (
    <button
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isDisabled ? 'win-inset opacity-50 cursor-not-allowed' : isPressed ? 'win-pressed' : 'win-outset'}
        ${!isDisabled ? 'active:win-pressed cursor-pointer hover:brightness-105 transition-[transform] duration-[50ms] active:translate-y-[1px]' : ''}
        inline-flex items-center justify-center gap-1
        ${className}
      `}
      onMouseDown={() => !isDisabled && setIsPressed(true)}
      onMouseUp={() => !isDisabled && setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 border border-current border-t-transparent animate-spin" style={{ imageRendering: 'auto' }} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
