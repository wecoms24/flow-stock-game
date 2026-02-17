/**
 * NumberCounter
 *
 * 숫자 카운팅 애니메이션 컴포넌트 (수익:초록, 손실:빨강)
 */

import { useNumberCounter } from '../../hooks/useNumberCounter'

interface NumberCounterProps {
  from: number
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  color?: 'green' | 'red' | 'white'
  className?: string
}

const COLOR_MAP = {
  green: 'text-green-400',
  red: 'text-red-400',
  white: 'text-white',
}

export function NumberCounter({
  from,
  to,
  duration = 400,
  prefix = '',
  suffix = '',
  color = 'white',
  className = '',
}: NumberCounterProps) {
  const value = useNumberCounter({ from, to, duration })
  const formatted = value.toLocaleString('ko-KR')

  return (
    <span className={`font-mono text-lg font-bold ${COLOR_MAP[color]} ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
