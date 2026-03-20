import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'

interface RegimeToast {
  id: number
  regime: 'CALM' | 'VOLATILE' | 'CRISIS'
  message: string
}

const TOAST_DURATION = 8000
const MAX_TOASTS = 2

const REGIME_INFO: Record<
  'CALM' | 'VOLATILE' | 'CRISIS',
  {
    label: string
    what: string
    impact: string
    myCompany: string
    action: string
    borderColor: string
    bgStyle: string
    textClass: string
  }
> = {
  CALM: {
    label: '🟢 평온 시장',
    what: '시장 변동성이 낮아졌습니다. 주가가 안정적으로 움직입니다.',
    impact: '변동폭 축소 · 급등/급락 확률 감소 · 안정적 투자 환경',
    myCompany: '💡 매수 적기! 안정적인 종목 발굴에 집중하세요.',
    action: '직원 스트레스↓ · AI 분석 정확도↑',
    borderColor: '#16a34a',
    bgStyle: 'rgba(220, 252, 231, 0.97)',
    textClass: 'text-green-800',
  },
  VOLATILE: {
    label: '🟡⚠️ 변동성 증가',
    what: '시장 불안정! 주가가 크게 오르내릴 수 있습니다.',
    impact: '변동폭 확대 · 급등/급락 빈도 증가 · 리스크 상승',
    myCompany: '⚡ 단기 매매 기회↑ 하지만 손절 라인을 반드시 설정하세요!',
    action: '직원 긴장↑ · 커피 소비↑ · 트레이더 집중 모드',
    borderColor: '#d97706',
    bgStyle: 'rgba(254, 243, 199, 0.97)',
    textClass: 'text-amber-900',
  },
  CRISIS: {
    label: '🔴🚨 시장 위기!',
    what: '전 종목 급락 위험! 서킷브레이커가 발동할 수 있습니다.',
    impact: '대규모 하락 · 패닉 매도 · 거래 정지 가능',
    myCompany: '🛡️ 방어 전략! 현금 확보 + 손절 + 신규 매수 자제!',
    action: '직원 스트레스 급등 · 패닉 행동↑ · 긴급 회의',
    borderColor: '#dc2626',
    bgStyle: 'rgba(254, 226, 226, 0.97)',
    textClass: 'text-red-900',
  },
}

export function RegimeToast() {
  const [toasts, setToasts] = useState<RegimeToast[]>([])
  const toastIdRef = useRef(0)
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const openWindow = useGameStore((s) => s.openWindow)

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
    <div className="fixed top-9 right-4 z-[10001] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const info = REGIME_INFO[toast.regime]
        const isCrisis = toast.regime === 'CRISIS'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto win-outset shadow-xl cursor-pointer hover:brightness-105 transition-all ${isCrisis ? 'font-bold' : ''}`}
            style={{
              animation: isCrisis
                ? 'bounceOnce 0.6s ease-out, regimeCrisisPulse 1.5s ease-in-out infinite'
                : 'bounceOnce 0.6s ease-out',
              borderLeft: `5px solid ${info.borderColor}`,
              background: info.bgStyle,
              padding: '10px 14px',
              maxWidth: '360px',
            }}
            onClick={() => openWindow('chart')}
            title="클릭하여 차트 확인"
          >
            {/* 헤더: 레짐 이름 */}
            <div className={`text-sm font-bold ${info.textClass}`}>
              {info.label}
            </div>

            {/* 무엇인지 설명 */}
            <div className={`text-[11px] mt-1 ${info.textClass}`}>
              {info.what}
            </div>

            {/* 시장 영향 */}
            <div className="text-[10px] mt-1.5 opacity-80" style={{ color: info.borderColor }}>
              📊 {info.impact}
            </div>

            {/* 내 회사에 미치는 영향 */}
            <div
              className={`text-[11px] mt-1.5 font-bold ${info.textClass}`}
              style={{ borderTop: `1px solid ${info.borderColor}30`, paddingTop: '5px' }}
            >
              {info.myCompany}
            </div>

            {/* 직원 반응 */}
            <div className="text-[9px] mt-1 opacity-60" style={{ color: info.borderColor }}>
              👥 {info.action}
            </div>

            {/* 바로가기 힌트 */}
            <div className="text-[9px] mt-1.5 text-right opacity-50">
              📈 차트 확인하기 →
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
