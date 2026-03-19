import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RetroButton } from '../ui/RetroButton'

/* ── Tutorial Step Definition ── */

interface TutorialStep {
  /** CSS selector for the target element to spotlight */
  targetSelector: string
  /** Title of this step */
  title: string
  /** Description text */
  description: string
  /** Position of tooltip relative to spotlight */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="speed-controls"]',
    title: '시간 제어',
    description: '게임 속도를 조절할 수 있습니다. 일시정지, 1x~16x 속도를 선택하세요.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="quick-launch-chart"]',
    title: '차트 보기',
    description: '주가 차트를 열어 종목의 가격 변동을 확인하세요.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="quick-launch-trading"]',
    title: '주식 매매',
    description: '매수/매도 창을 열어 주식을 거래하세요. 수익을 올려보세요!',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="quick-launch-portfolio"]',
    title: '포트폴리오',
    description: '보유 현금, 주식 평가액, 총 자산을 확인할 수 있습니다.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="quick-launch-office"]',
    title: '오피스',
    description: '직원을 고용하고 자동 매매 시스템을 구축하세요.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="quick-launch-news"]',
    title: '뉴스',
    description: '시장 뉴스와 이벤트를 확인하세요. 뉴스가 주가에 영향을 줍니다.',
    position: 'top',
  },
]

const STORAGE_KEY = 'tutorial_game_completed'

/* ── Spotlight Component ── */

interface SpotlightOverlayProps {
  onComplete: () => void
}

export function TutorialSpotlight({ onComplete }: SpotlightOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const step = TUTORIAL_STEPS[currentStep]

  // Find and measure target element
  useEffect(() => {
    if (!step) return

    const findTarget = () => {
      const el = document.querySelector(step.targetSelector)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    findTarget()
    // Re-measure on resize
    window.addEventListener('resize', findTarget)
    return () => window.removeEventListener('resize', findTarget)
  }, [step])

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      localStorage.setItem(STORAGE_KEY, 'true')
      onComplete()
    }
  }, [currentStep, onComplete])

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onComplete()
  }, [onComplete])

  if (!step) return null

  const padding = 6
  const cutout = targetRect
    ? {
        x: targetRect.x - padding,
        y: targetRect.y - padding,
        w: targetRect.width + padding * 2,
        h: targetRect.height + padding * 2,
      }
    : null

  // Tooltip positioning
  const tooltipStyle: React.CSSProperties = {}
  if (cutout) {
    const pos = step.position ?? 'top'
    if (pos === 'top') {
      tooltipStyle.left = cutout.x + cutout.w / 2
      tooltipStyle.bottom = window.innerHeight - cutout.y + 12
      tooltipStyle.transform = 'translateX(-50%)'
    } else if (pos === 'bottom') {
      tooltipStyle.left = cutout.x + cutout.w / 2
      tooltipStyle.top = cutout.y + cutout.h + 12
      tooltipStyle.transform = 'translateX(-50%)'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9500]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Dark overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {cutout && (
                <rect
                  x={cutout.x}
                  y={cutout.y}
                  width={cutout.w}
                  height={cutout.h}
                  rx={2}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#spotlight-mask)"
          />
          {/* Pulsing border around cutout */}
          {cutout && (
            <rect
              x={cutout.x}
              y={cutout.y}
              width={cutout.w}
              height={cutout.h}
              rx={2}
              fill="none"
              stroke="#FFFF00"
              strokeWidth={2}
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Tooltip */}
        {cutout && (
          <motion.div
            className="fixed win-outset bg-win-face p-2 max-w-64 z-[9501]"
            style={tooltipStyle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            key={currentStep}
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold text-win-title-active">{step.title}</span>
              <span className="text-[10px] text-retro-gray ml-auto">
                {currentStep + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>
            <div className="text-[10px] text-retro-gray leading-relaxed mb-2">
              {step.description}
            </div>
            <div className="flex items-center gap-1">
              <RetroButton size="sm" onClick={handleSkip}>
                건너뛰기
              </RetroButton>
              <RetroButton size="sm" variant="primary" onClick={handleNext}>
                {currentStep < TUTORIAL_STEPS.length - 1 ? '다음' : '완료'}
              </RetroButton>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/** Check if tutorial was already completed */
export function isTutorialCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}
