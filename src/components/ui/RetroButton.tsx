import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react'

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function RetroButton({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: RetroButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const variantClasses = {
    default: 'bg-win-face',
    primary: 'bg-win-face font-bold',
    danger: 'bg-win-face text-retro-red font-bold',
  }

  return (
    <button
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isPressed ? 'win-pressed' : 'win-outset'}
        active:win-pressed
        cursor-pointer
        ${className}
      `}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {children}
    </button>
  )
}
