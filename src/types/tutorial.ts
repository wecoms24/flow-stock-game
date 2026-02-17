/**
 * Tutorial System Types
 *
 * 신규 사용자를 위한 튜토리얼 시스템
 */

export type TutorialStep = 'intro' | 'ai_proposal' | 'approve' | 'manual' | 'complete'

export interface TutorialState {
  completed: boolean
  currentStep: TutorialStep
  seenSteps: TutorialStep[]
}

export interface TutorialStepConfig {
  step: TutorialStep
  title: string
  description: string
  highlightTarget?: string // CSS selector for highlighting
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: {
    label: string
    onClick: () => void
  }
}
