/**
 * Office Tutorial Component
 *
 * 신규 사용자를 위한 5단계 튜토리얼
 */

import { useState, useEffect, useRef } from 'react'
import type { TutorialStep } from '../../types/tutorial'
import {
  loadTutorialState,
  updateTutorialStep,
  completeTutorial,
  resetTutorial,
} from '../../utils/tutorialStorage'

interface OfficeTutorialProps {
  onClose: () => void
  onAIProposalClick?: () => void
}

interface StepContent {
  title: string
  description: string
  nextLabel?: string
  skipLabel?: string
}

const STEP_CONTENT: Record<TutorialStep, StepContent> = {
  intro: {
    title: '🏢 Office Window에 오신 것을 환영합니다!',
    description:
      '이곳에서 직원을 고용하고 가구를 배치하여 최적의 사무실을 구성할 수 있습니다. 직원들은 매매 제안을 생성하고, 가구는 직원들의 능력을 향상시킵니다.',
    nextLabel: '시작하기',
    skipLabel: '튜토리얼 건너뛰기',
  },
  ai_proposal: {
    title: '🤖 AI 자동 최적화',
    description:
      '우측 상단의 "🤖 AI" 버튼을 클릭하면 AI가 자동으로 최적의 사무실 배치를 제안합니다. 직원과 가구를 어디에 배치할지 고민된다면 AI의 도움을 받아보세요!',
    nextLabel: '다음',
    skipLabel: '건너뛰기',
  },
  approve: {
    title: '✅ 제안 검토 및 승인',
    description:
      'AI가 제안한 배치를 검토하고 승인하세요. 제안된 배치는 시너지 효과를 극대화하도록 설계되어 있습니다. 마음에 들지 않으면 수동으로 조정할 수도 있습니다.',
    nextLabel: '다음',
    skipLabel: '건너뛰기',
  },
  manual: {
    title: '🛠️ 수동 배치',
    description:
      '직원과 가구를 직접 배치할 수도 있습니다. 좌측의 직원 목록에서 직원을 선택하고 그리드에 배치하세요. 가구 탭에서 가구를 구매하여 버프 효과를 누리세요!',
    nextLabel: '완료',
    skipLabel: '건너뛰기',
  },
  complete: {
    title: '🎉 튜토리얼 완료!',
    description:
      '이제 사무실 운영의 모든 것을 배웠습니다. 직원들의 스트레스를 관리하고, 최적의 배치를 통해 최고의 수익을 올려보세요!',
    nextLabel: '시작하기',
  },
}

export function OfficeTutorial({ onClose, onAIProposalClick }: OfficeTutorialProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('intro')
  const [isVisible, setIsVisible] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const state = loadTutorialState()
    if (!state.completed) {
      setCurrentStep(state.currentStep)
      setIsVisible(true)
    }
  }, [])

  // Focus trap: 튜토리얼 열릴 때 첫 버튼에 포커스
  useEffect(() => {
    if (isVisible && firstButtonRef.current) {
      firstButtonRef.current.focus()
    }
  }, [isVisible, currentStep])

  // ESC key to close tutorial
  useEffect(() => {
    if (!isVisible) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isVisible])

  const handleNext = () => {
    const stepOrder: TutorialStep[] = ['intro', 'ai_proposal', 'approve', 'manual', 'complete']
    const currentIndex = stepOrder.indexOf(currentStep)

    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1]
      setCurrentStep(nextStep)
      updateTutorialStep(nextStep)

      // AI Proposal 단계에서 버튼 강조
      if (nextStep === 'ai_proposal' && onAIProposalClick) {
        // 하이라이트 효과는 OfficeWindow에서 처리
      }
    } else {
      // 완료
      completeTutorial()
      setIsVisible(false)
      onClose()
    }
  }

  const handleSkip = () => {
    completeTutorial()
    setIsVisible(false)
    onClose()
  }

  if (!isVisible) return null

  const content = STEP_CONTENT[currentStep]
  const stepIndex = ['intro', 'ai_proposal', 'approve', 'manual', 'complete'].indexOf(currentStep)

  return (
    <>
      {/* 오버레이 배경 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
        aria-hidden="true"
      />

      {/* 튜토리얼 카드 - ARIA 접근성 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101]"
      >
        <div className="bg-white border-4 border-black rounded-lg shadow-retro w-[400px] p-4">
          {/* 진행 표시 */}
          <div className="flex justify-center gap-1 mb-4" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={5}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded ${
                  i <= stepIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                aria-label={`Step ${i + 1}${i <= stepIndex ? ' completed' : ''}`}
              />
            ))}
          </div>

          {/* 제목 */}
          <h2 id="tutorial-title" className="text-xl font-bold mb-3 text-center">{content.title}</h2>

          {/* 설명 */}
          <p id="tutorial-description" className="text-sm leading-relaxed mb-6 text-center text-gray-700">
            {content.description}
          </p>

          {/* 버튼 */}
          <div className="flex gap-2 justify-center">
            {content.skipLabel && (
              <button
                ref={firstButtonRef}
                onClick={handleSkip}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 border-2 border-black rounded font-bold text-sm transition-colors"
                aria-label={`${content.skipLabel} tutorial`}
              >
                {content.skipLabel}
              </button>
            )}
            {content.nextLabel && (
              <button
                ref={!content.skipLabel ? firstButtonRef : undefined}
                onClick={handleNext}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-black rounded font-bold text-sm transition-colors"
                aria-label={`${content.nextLabel} step`}
              >
                {content.nextLabel}
              </button>
            )}
          </div>

          {/* 단계 표시 */}
          <div className="mt-4 text-center text-xs text-gray-500">
            {stepIndex + 1} / 5
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * 튜토리얼 다시 보기 버튼
 */
export function TutorialResetButton({ onClick }: { onClick: () => void }) {
  const handleReset = () => {
    resetTutorial()
    onClick()
  }

  return (
    <button
      onClick={handleReset}
      className="text-[8px] px-2 py-1 bg-gray-200 hover:bg-gray-300 border border-black rounded"
      title="튜토리얼 다시 보기"
    >
      ❓ 도움말
    </button>
  )
}
