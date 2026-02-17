/**
 * Animation Scheduler
 *
 * 우선순위 큐 + RAF 조율로 60Hz 프레임 예산 내에서 애니메이션 실행
 * 동시에 1개의 시퀀스만 재생, 나머지는 큐에 대기
 */

import type { AnimationSequence, AnimationStep } from '../types/animation'

export type StepHandler = (step: AnimationStep) => Promise<void>

interface SchedulerState {
  isRunning: boolean
  currentSequence: AnimationSequence | null
  currentStepIndex: number
  rafId: number | null
  stepStartTime: number
  onComplete: (() => void) | null
}

const state: SchedulerState = {
  isRunning: false,
  currentSequence: null,
  currentStepIndex: 0,
  rafId: null,
  stepStartTime: 0,
  onComplete: null,
}

let stepHandler: StepHandler | null = null

export function setStepHandler(handler: StepHandler): void {
  stepHandler = handler
}

export async function runSequence(
  sequence: AnimationSequence,
  onComplete?: () => void,
): Promise<void> {
  if (state.isRunning) return

  state.isRunning = true
  state.currentSequence = sequence
  state.currentStepIndex = 0
  state.onComplete = onComplete ?? null

  await executeNextStep()
}

async function executeNextStep(): Promise<void> {
  if (!state.currentSequence) return

  const { steps } = state.currentSequence
  if (state.currentStepIndex >= steps.length) {
    finishSequence()
    return
  }

  const step = steps[state.currentStepIndex]

  if (stepHandler) {
    try {
      await stepHandler(step)
    } catch {
      // Step failed, continue to next
    }
  }

  // Wait for step duration then advance
  state.stepStartTime = performance.now()
  state.rafId = requestAnimationFrame(() => waitForStep(step.duration))
}

function waitForStep(duration: number): void {
  const elapsed = performance.now() - state.stepStartTime
  if (elapsed >= duration) {
    state.currentStepIndex++
    executeNextStep()
  } else {
    state.rafId = requestAnimationFrame(() => waitForStep(duration))
  }
}

function finishSequence(): void {
  const onComplete = state.onComplete
  state.isRunning = false
  state.currentSequence = null
  state.currentStepIndex = 0
  state.onComplete = null
  if (state.rafId) {
    cancelAnimationFrame(state.rafId)
    state.rafId = null
  }
  onComplete?.()
}

export function cancelScheduler(): void {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId)
    state.rafId = null
  }
  state.isRunning = false
  state.currentSequence = null
  state.currentStepIndex = 0
  state.onComplete = null
}

export function isSchedulerRunning(): boolean {
  return state.isRunning
}
