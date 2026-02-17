/**
 * Tutorial Storage Utility
 *
 * localStorage를 사용한 튜토리얼 상태 저장/불러오기
 */

import type { TutorialState, TutorialStep } from '../types/tutorial'

const STORAGE_KEY = 'retro-stock-os-tutorial'

const DEFAULT_STATE: TutorialState = {
  completed: false,
  currentStep: 'intro',
  seenSteps: [],
}

/**
 * 런타임 타입 가드: TutorialState 검증
 */
function isValidTutorialState(data: unknown): data is TutorialState {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>

  // completed 필드 검증
  if (typeof obj.completed !== 'boolean') return false

  // currentStep 필드 검증
  const validSteps: TutorialStep[] = ['intro', 'ai_proposal', 'approve', 'manual', 'complete']
  if (typeof obj.currentStep !== 'string' || !validSteps.includes(obj.currentStep as TutorialStep)) {
    return false
  }

  // seenSteps 필드 검증
  if (!Array.isArray(obj.seenSteps)) return false
  if (!obj.seenSteps.every((step) => typeof step === 'string' && validSteps.includes(step as TutorialStep))) {
    return false
  }

  return true
}

/**
 * 튜토리얼 상태 불러오기 (런타임 검증 포함)
 */
export function loadTutorialState(): TutorialState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_STATE

    const parsed: unknown = JSON.parse(stored)

    // 런타임 검증: 타입 가드 사용
    if (!isValidTutorialState(parsed)) {
      console.warn('[Tutorial] Invalid stored state, using default')
      return DEFAULT_STATE
    }

    return { ...DEFAULT_STATE, ...parsed }
  } catch (error) {
    console.error('[Tutorial] Failed to load state:', error)
    return DEFAULT_STATE
  }
}

/**
 * 튜토리얼 상태 저장
 */
export function saveTutorialState(state: TutorialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('[Tutorial] Failed to save state:', error)
  }
}

/**
 * 현재 단계 업데이트
 */
export function updateTutorialStep(step: TutorialStep): void {
  const state = loadTutorialState()
  state.currentStep = step

  if (!state.seenSteps.includes(step)) {
    state.seenSteps.push(step)
  }

  saveTutorialState(state)
}

/**
 * 튜토리얼 완료 처리
 */
export function completeTutorial(): void {
  const state = loadTutorialState()
  state.completed = true
  state.currentStep = 'complete'
  saveTutorialState(state)
}

/**
 * 튜토리얼 리셋 (다시 보기)
 */
export function resetTutorial(): void {
  saveTutorialState(DEFAULT_STATE)
}

/**
 * 튜토리얼 완료 여부 확인
 */
export function isTutorialCompleted(): boolean {
  return loadTutorialState().completed
}
