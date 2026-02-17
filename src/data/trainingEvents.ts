/**
 * Training Checkpoint Event Templates
 *
 * 교육 프로그램 진행 중 발생하는 체크포인트 이벤트 데이터
 * Corporate Skill ID별 맞춤 퀴즈/시뮬레이션/토론/챌린지
 */

import type { TrainingCheckpoint, TrainingCheckpointType } from '../types/training'

interface CheckpointTemplate {
  type: TrainingCheckpointType
  title: string
  description: string
  reward: { xpBonus: number; skillBonus: number }
  penalty: { stressIncrease: number; progressLoss: number }
}

/** 스킬 카테고리별 기본 체크포인트 */
const CATEGORY_CHECKPOINTS: Record<string, CheckpointTemplate[]> = {
  policy: [
    {
      type: 'quiz',
      title: '정책 이해도 테스트',
      description: '전사 정책의 핵심 내용을 정확히 이해하고 있는지 평가합니다.',
      reward: { xpBonus: 300, skillBonus: 2 },
      penalty: { stressIncrease: 5, progressLoss: 10 },
    },
    {
      type: 'simulation',
      title: '정책 적용 시뮬레이션',
      description: '실제 상황에서 정책을 올바르게 적용하는 능력을 테스트합니다.',
      reward: { xpBonus: 500, skillBonus: 3 },
      penalty: { stressIncrease: 8, progressLoss: 12 },
    },
    {
      type: 'discussion',
      title: '정책 개선 토론',
      description: '현행 정책의 장단점을 토론하고 개선안을 제시합니다.',
      reward: { xpBonus: 400, skillBonus: 2 },
      penalty: { stressIncrease: 3, progressLoss: 5 },
    },
  ],
  tool: [
    {
      type: 'quiz',
      title: '도구 사용법 테스트',
      description: '분석 도구의 기능과 사용법을 정확히 이해하고 있는지 평가합니다.',
      reward: { xpBonus: 350, skillBonus: 2 },
      penalty: { stressIncrease: 5, progressLoss: 8 },
    },
    {
      type: 'challenge',
      title: '실전 분석 챌린지',
      description: '제한 시간 내 도구를 활용하여 실전 분석 문제를 해결합니다.',
      reward: { xpBonus: 600, skillBonus: 4 },
      penalty: { stressIncrease: 10, progressLoss: 15 },
    },
    {
      type: 'simulation',
      title: '도구 활용 시뮬레이션',
      description: '복합 상황에서 도구를 효율적으로 사용하는 능력을 평가합니다.',
      reward: { xpBonus: 500, skillBonus: 3 },
      penalty: { stressIncrease: 7, progressLoss: 10 },
    },
  ],
  infrastructure: [
    {
      type: 'quiz',
      title: '시스템 이해도 테스트',
      description: '인프라 구조와 작동 원리를 이해하고 있는지 평가합니다.',
      reward: { xpBonus: 400, skillBonus: 2 },
      penalty: { stressIncrease: 5, progressLoss: 8 },
    },
    {
      type: 'challenge',
      title: '장애 대응 챌린지',
      description: '인프라 장애 상황에서 신속하게 대응하는 능력을 평가합니다.',
      reward: { xpBonus: 700, skillBonus: 5 },
      penalty: { stressIncrease: 12, progressLoss: 15 },
    },
    {
      type: 'discussion',
      title: '인프라 개선 토론',
      description: '현재 시스템의 병목 지점과 개선 방안을 토론합니다.',
      reward: { xpBonus: 350, skillBonus: 2 },
      penalty: { stressIncrease: 3, progressLoss: 5 },
    },
  ],
  knowledge: [
    {
      type: 'quiz',
      title: '지식 평가 테스트',
      description: '분석 이론과 핵심 개념을 정확히 이해하고 있는지 평가합니다.',
      reward: { xpBonus: 400, skillBonus: 3 },
      penalty: { stressIncrease: 5, progressLoss: 10 },
    },
    {
      type: 'simulation',
      title: '실전 분석 시뮬레이션',
      description: '습득한 지식을 실제 시장 데이터에 적용하는 능력을 테스트합니다.',
      reward: { xpBonus: 600, skillBonus: 4 },
      penalty: { stressIncrease: 8, progressLoss: 12 },
    },
    {
      type: 'discussion',
      title: '심화 토론',
      description: '고급 분석 기법의 장단점과 적용 사례를 토론합니다.',
      reward: { xpBonus: 500, skillBonus: 3 },
      penalty: { stressIncrease: 4, progressLoss: 5 },
    },
  ],
}

/**
 * Corporate Skill에 맞는 체크포인트 3개 생성 (25%, 50%, 75% 진행 시점)
 */
export function generateCheckpoints(
  skillCategory: string,
): TrainingCheckpoint[] {
  const templates = CATEGORY_CHECKPOINTS[skillCategory] ?? CATEGORY_CHECKPOINTS.tool
  const progressPoints = [25, 50, 75]

  return progressPoints.map((progress, i) => ({
    ...templates[i % templates.length],
    atProgress: progress,
    passed: null,
  }))
}

/** Tier에 따른 교육 기간 (틱 단위, 3600틱 = 1일) */
export function getTrainingDuration(tier: number): number {
  switch (tier) {
    case 1: return 3600 * 7  // 1주
    case 2: return 3600 * 14 // 2주
    case 3: return 3600 * 21 // 3주
    default: return 3600 * 14
  }
}

/** Tier에 따른 기본 교육 비용 */
export function getTrainingBaseCost(tier: number): number {
  switch (tier) {
    case 1: return 200_000
    case 2: return 500_000
    case 3: return 1_000_000
    default: return 500_000
  }
}

/** 1인당 추가 비용 */
export function getTrainingCostPerTrainee(tier: number): number {
  switch (tier) {
    case 1: return 50_000
    case 2: return 100_000
    case 3: return 200_000
    default: return 100_000
  }
}
