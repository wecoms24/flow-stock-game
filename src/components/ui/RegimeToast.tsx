import { useState, useEffect, useRef } from 'react'

interface RegimeToast {
  id: number
  regime: 'CALM' | 'VOLATILE' | 'CRISIS'
  message: string
}

const TOAST_DURATION = 6000
const MAX_TOASTS = 2 // 최대 2개의 토스트만 표시

const REGIME_INFO: Record<
  'CALM' | 'VOLATILE' | 'CRISIS',
  { title: string; subtitle: string; borderColor: string; bgStyle: string; textClass: string }
> = {
  CALM: {
    title: '시장이 안정되었습니다. 변동성 감소 → 안전한 매수 기회',
    subtitle: '주가 변동폭 축소 | 안정적 투자 환경',
    borderColor: '#16a34a',
    bgStyle: 'rgba(220, 252, 231, 0.95)',
    textClass: 'text-green-800',
  },
  VOLATILE: {
    title: '시장 불안정! 변동성 증가 → 급등/급락 주의',
    subtitle: '단기 트레이딩 기회 ↑ | 리스크 관리 필수',
    borderColor: '#d97706',
    bgStyle: 'rgba(254, 243, 199, 0.95)',
    textClass: 'text-amber-900',
  },
  CRISIS: {
    title: '시장 위기! 전 종목 급락 위험 → 방어적 투자 필요',
    subtitle: '패닉 매도 위험 | 서킷브레이커 발동 가능',
    borderColor: '#dc2626',
    bgStyle: 'rgba(254, 226, 226, 0.95)',
    textClass: 'text-red-900',
  },
}

export function RegimeToast() {
  const [toasts, setToasts] = useState<RegimeToast[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    // cleanup 함수에서 사용할 로컬 변수로 복사 (ESLint 규칙 준수)
    const timeouts = timeoutsRef.current

    const handleRegimeChange = (e: CustomEvent) => {
      const { regime, message } = e.detail
      const id = ++toastIdRef.current

      const toast: RegimeToast = {
        id,
        regime,
        message,
      }

      setToasts((prev) => {
        // 최대 2개까지만 표시, 오래된 것부터 제거
        const newToasts = [...prev, toast]
        if (newToasts.length > MAX_TOASTS) {
          const removedToast = newToasts.shift()
          if (removedToast) {
            // 제거된 토스트의 타이머만 정리
            const removedTimerId = timeouts.get(removedToast.id)
            if (removedTimerId) {
              clearTimeout(removedTimerId)
              timeouts.delete(removedToast.id)
            }
          }
        }
        return newToasts
      })

      const tid = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        timeouts.delete(id)
      }, TOAST_DURATION)
      timeouts.set(id, tid)
    }

    window.addEventListener('regimeChange', handleRegimeChange as EventListener)

    return () => {
      window.removeEventListener('regimeChange', handleRegimeChange as EventListener)
      timeouts.forEach((tid) => clearTimeout(tid))
      timeouts.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-10 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const info = REGIME_INFO[toast.regime]
        const regimeIcon = toast.regime === 'CALM' ? '🟢' : toast.regime === 'VOLATILE' ? '🟡' : '🔴'
        const regimeLabel = toast.regime === 'CALM' ? '평온' : toast.regime === 'VOLATILE' ? '변동' : '위기'
        const isCrisis = toast.regime === 'CRISIS'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto win-outset shadow-xl ${isCrisis ? 'font-bold' : ''}`}
            style={{
              animation: isCrisis
                ? 'bounceOnce 0.6s ease-out, regimeCrisisPulse 1.5s ease-in-out infinite'
                : 'bounceOnce 0.6s ease-out',
              borderLeft: `4px solid ${info.borderColor}`,
              background: info.bgStyle,
              padding: '8px 14px',
              maxWidth: '320px',
            }}
          >
            <div className={`text-xs font-bold ${info.textClass}`}>
              {regimeIcon} {toast.regime === 'VOLATILE' && '⚠️ '}{toast.regime === 'CRISIS' && '🚨 '}
              시장 레짐: {regimeLabel}
            </div>
            <div className={`text-[11px] mt-1 ${info.textClass}`} style={{ opacity: 0.9 }}>
              {info.title}
            </div>
            <div
              className="text-[10px] mt-1"
              style={{
                color: info.borderColor,
                opacity: 0.8,
                borderTop: `1px solid ${info.borderColor}40`,
                paddingTop: '4px',
              }}
            >
              {info.subtitle}
            </div>
          </div>
        )
      })}
      <style>{`
        @keyframes regimeCrisisPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(220, 38, 38, 0.3); }
          50% { box-shadow: 0 0 12px rgba(220, 38, 38, 0.6); }
        }
      `}</style>
    </div>
  )
}
