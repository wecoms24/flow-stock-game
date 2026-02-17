/**
 * Event Chain Engine
 *
 * FSM 상태 전이, 체인 선택, 진행 관리
 */

import type { EventChainState, EventChain, ActiveEventChainState } from '../types/eventChain'
import { EVENT_CHAIN_TEMPLATES } from '../data/eventChains'

/** 현재 조건에 맞는 체인 중 가중 랜덤 선택 */
export function selectChain(
  currentYear: number,
  completedChainIds: string[],
): EventChain | null {
  const eligible = EVENT_CHAIN_TEMPLATES.filter((c) => {
    if (completedChainIds.includes(c.id)) return false
    if (c.triggerCondition?.minYear && currentYear < c.triggerCondition.minYear) return false
    if (c.triggerCondition?.maxYear && currentYear > c.triggerCondition.maxYear) return false
    return true
  })

  if (eligible.length === 0) return null

  const totalWeight = eligible.reduce((sum, c) => sum + c.weight, 0)
  let roll = Math.random() * totalWeight

  for (const chain of eligible) {
    roll -= chain.weight
    if (roll <= 0) return chain
  }

  return eligible[eligible.length - 1]
}

/** 체인 시작 → EventChainState 생성 */
export function initChainState(chainId: string, currentTick: number): EventChainState {
  const template = EVENT_CHAIN_TEMPLATES.find((c) => c.id === chainId)
  return {
    chainId,
    currentWeek: 0,
    status: 'active',
    startedAtTick: currentTick,
    lastAdvanceTick: currentTick,
    playerActions: [],
    totalWeeks: template?.weeks.length ?? 3,
  }
}

/** 체인을 시작할 수 있는 조건 확인 */
export function canStartChain(
  state: ActiveEventChainState,
  currentTick: number,
): boolean {
  // 활성 체인이 이미 있으면 불가
  if (state.chains.some((c) => c.status === 'active')) return false
  // 쿨다운 (최소 720 틱 = ~3일)
  if (currentTick - state.lastChainEndTick < 720) return false
  return true
}

/** 주간 진행: currentWeek 증가 + 완료 체크 */
export function advanceChainWeek(
  chainState: EventChainState,
  currentTick: number,
): EventChainState {
  const template = EVENT_CHAIN_TEMPLATES.find((c) => c.id === chainState.chainId)
  if (!template) return { ...chainState, status: 'completed' }

  const nextWeek = chainState.currentWeek + 1

  // 분기 진행 (선택된 분기가 있으면 분기의 weeks를 사용)
  const totalWeeks = chainState.selectedBranchIndex != null
    ? template.weeks.length + (template.branches[chainState.selectedBranchIndex]?.nextWeeks.length ?? 0)
    : template.weeks.length

  if (nextWeek >= totalWeeks) {
    return { ...chainState, currentWeek: nextWeek, status: 'completed', lastAdvanceTick: currentTick }
  }

  return { ...chainState, currentWeek: nextWeek, lastAdvanceTick: currentTick }
}

/** 현재 주차의 이벤트 수정자 가져오기 */
export function getCurrentWeekModifiers(chainState: EventChainState) {
  const template = EVENT_CHAIN_TEMPLATES.find((c) => c.id === chainState.chainId)
  if (!template) return null

  // 분기 이전 주차
  if (chainState.currentWeek < template.weeks.length) {
    return template.weeks[chainState.currentWeek]
  }

  // 분기 이후 주차
  if (chainState.selectedBranchIndex != null) {
    const branch = template.branches[chainState.selectedBranchIndex]
    const branchWeekIndex = chainState.currentWeek - template.weeks.length
    return branch?.nextWeeks[branchWeekIndex] ?? null
  }

  return null
}
