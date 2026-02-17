/**
 * Training Engine
 *
 * 교육 프로그램 관리 순수 함수 모듈
 * - 프로그램 생성/시작/진행/수료
 * - 체크포인트 이벤트 처리
 * - 직원 스킬 반영
 */

import type { Employee } from '../types'
import type { CorporateSkill } from '../types/corporateSkill'
import type { TrainingProgram, TrainingState, TrainingCheckpoint } from '../types/training'
import { generateCheckpoints, getTrainingDuration, getTrainingBaseCost, getTrainingCostPerTrainee } from '../data/trainingEvents'
import { SKILL_TREE } from '../data/skillTree'

/**
 * 새 교육 프로그램 생성
 */
export function createTrainingProgram(
  skill: CorporateSkill,
  traineeIds: string[],
  instructorId: string | null,
  currentTick: number,
): TrainingProgram {
  const maxSeats = skill.tier === 1 ? 5 : skill.tier === 2 ? 4 : 3
  const actualTrainees = traineeIds.slice(0, maxSeats)

  return {
    id: `training-${currentTick}-${skill.id}`,
    targetSkillId: skill.id,
    name: `${skill.name} 교육`,
    instructorId,
    traineeIds: actualTrainees,
    maxSeats,
    startTick: currentTick,
    durationTicks: getTrainingDuration(skill.tier),
    progress: 0,
    baseCost: getTrainingBaseCost(skill.tier),
    costPerTrainee: getTrainingCostPerTrainee(skill.tier),
    requiredFurniture: [],
    checkpoints: generateCheckpoints(skill.category),
    status: 'in_progress',
  }
}

/**
 * 교육 프로그램 총 비용 계산
 */
export function calculateTotalCost(program: TrainingProgram): number {
  return program.baseCost + program.costPerTrainee * program.traineeIds.length
}

/**
 * 교육 진행도 업데이트 (매 틱)
 * @returns 업데이트된 프로그램 + 도달한 체크포인트 (있으면)
 */
export function advanceTraining(
  program: TrainingProgram,
  currentTick: number,
): { program: TrainingProgram; reachedCheckpoint: TrainingCheckpoint | null } {
  if (program.status !== 'in_progress') {
    return { program, reachedCheckpoint: null }
  }

  const elapsed = currentTick - program.startTick
  const newProgress = Math.min(100, (elapsed / program.durationTicks) * 100)

  // 체크포인트 도달 확인
  let reachedCheckpoint: TrainingCheckpoint | null = null
  const updatedCheckpoints = program.checkpoints.map((cp) => {
    if (cp.passed === null && newProgress >= cp.atProgress) {
      // 아직 처리하지 않은 체크포인트 도달
      if (!reachedCheckpoint) {
        reachedCheckpoint = cp
      }
      return cp // 아직 passed를 결정하지 않음 (resolveCheckpoint에서 처리)
    }
    return cp
  })

  const isCompleted = newProgress >= 100

  return {
    program: {
      ...program,
      progress: newProgress,
      checkpoints: updatedCheckpoints,
      status: isCompleted ? 'completed' : program.status,
      completedAt: isCompleted ? currentTick : undefined,
      graduateIds: isCompleted ? program.traineeIds : undefined,
    },
    reachedCheckpoint,
  }
}

/**
 * 체크포인트 결과 처리
 * 성공률은 직원 스킬과 성격 특성에 따라 결정
 */
export function resolveCheckpoint(
  program: TrainingProgram,
  checkpointProgress: number,
  trainees: Employee[],
): {
  program: TrainingProgram
  xpRewards: Record<string, number>  // employeeId → XP
  stressChanges: Record<string, number> // employeeId → stress delta
  passed: boolean
} {
  const xpRewards: Record<string, number> = {}
  const stressChanges: Record<string, number> = {}

  const checkpoint = program.checkpoints.find((cp) => cp.atProgress === checkpointProgress)
  if (!checkpoint || checkpoint.passed !== null) {
    return { program, xpRewards, stressChanges, passed: checkpoint?.passed ?? false }
  }

  // 수강생 평균 능력으로 합/불 판정
  let totalScore = 0
  for (const trainee of trainees) {
    const skills = trainee.skills ?? { analysis: 30, trading: 30, research: 30 }
    const avgSkill = (skills.analysis + skills.trading + skills.research) / 3
    const stress = trainee.stress ?? 0
    const stressPenalty = stress > 60 ? (stress - 60) * 0.5 : 0

    let traitBonus = 0
    const traits = trainee.traits ?? []
    if (checkpoint.type === 'quiz' && traits.includes('perfectionist')) traitBonus += 15
    if (checkpoint.type === 'discussion' && traits.includes('social')) traitBonus += 10
    if (checkpoint.type === 'discussion' && traits.includes('introvert')) traitBonus -= 10
    if (checkpoint.type === 'challenge' && traits.includes('ambitious')) traitBonus += 10
    if (checkpoint.type === 'simulation' && traits.includes('tech_savvy')) traitBonus += 10

    totalScore += avgSkill + traitBonus - stressPenalty
  }

  const avgScore = trainees.length > 0 ? totalScore / trainees.length : 30
  // 50점 커트라인 + 랜덤 분산 40 (±20): score 10→0%, 30→25%, 50→75%, 70→100%
  const passed = avgScore + (Math.random() * 40 - 10) >= 50

  // 결과 적용
  for (const trainee of trainees) {
    if (passed) {
      xpRewards[trainee.id] = checkpoint.reward.xpBonus
    } else {
      stressChanges[trainee.id] = checkpoint.penalty.stressIncrease
    }
  }

  // 체크포인트 상태 업데이트
  const updatedCheckpoints = program.checkpoints.map((cp) =>
    cp.atProgress === checkpointProgress ? { ...cp, passed } : cp,
  )

  // 실패 시 진행도 후퇴
  const progressLoss = passed ? 0 : checkpoint.penalty.progressLoss
  const newProgress = Math.max(0, program.progress - progressLoss)

  return {
    program: {
      ...program,
      checkpoints: updatedCheckpoints,
      progress: newProgress,
    },
    xpRewards,
    stressChanges,
    passed,
  }
}

/**
 * 교육 프로그램 취소
 */
export function cancelTraining(program: TrainingProgram): TrainingProgram {
  return { ...program, status: 'cancelled' }
}

/**
 * 교육 시작 가능 여부 검증
 */
export function canStartTraining(
  skill: CorporateSkill,
  traineeIds: string[],
  employees: Employee[],
  existingPrograms: TrainingProgram[],
  cash: number,
): { canStart: boolean; reason?: string } {
  if (!skill.unlocked) {
    return { canStart: false, reason: '해당 스킬이 아직 해금되지 않았습니다.' }
  }

  if (traineeIds.length === 0) {
    return { canStart: false, reason: '수강생을 1명 이상 선택해야 합니다.' }
  }

  // 수강생이 이미 다른 교육 중인지 확인
  const busyTrainees = traineeIds.filter((id) =>
    existingPrograms.some(
      (p) => p.status === 'in_progress' && p.traineeIds.includes(id),
    ),
  )
  if (busyTrainees.length > 0) {
    const names = busyTrainees.map((id) => employees.find((e) => e.id === id)?.name ?? id)
    return { canStart: false, reason: `${names.join(', ')}이(가) 이미 교육 중입니다.` }
  }

  // 이미 학습 완료한 직원 제외 확인
  const alreadyLearned = traineeIds.filter((id) => {
    const emp = employees.find((e) => e.id === id)
    return emp?.learnedCorporateSkills?.includes(skill.id)
  })
  if (alreadyLearned.length === traineeIds.length) {
    return { canStart: false, reason: '모든 수강생이 이미 이 스킬을 습득했습니다.' }
  }

  // 비용 확인
  const tier = skill.tier
  const baseCost = getTrainingBaseCost(tier)
  const perTrainee = getTrainingCostPerTrainee(tier)
  const totalCost = baseCost + perTrainee * traineeIds.length
  if (cash < totalCost) {
    return { canStart: false, reason: `자금 부족 (필요: ${totalCost.toLocaleString()}원)` }
  }

  return { canStart: true }
}

/**
 * 교육 수료 시 직원 업데이트
 * - learnedCorporateSkills에 스킬 추가
 * - 관련 스킬 수치 증가
 * - teachablePassiveId → unlockedSkills에 패시브 스킬 추가
 * - activeTrainingId 해제
 */
export function applyGraduation(
  employee: Employee,
  skill: CorporateSkill,
  checkpointPassCount: number,
): Employee {
  const learnedSkills = [...(employee.learnedCorporateSkills ?? []), skill.id]
  const skillBonus = 2 + checkpointPassCount * 2 // 체크포인트 성공할수록 보너스 증가
  const baseSkills = employee.skills ?? { analysis: 30, trading: 30, research: 30 }
  const skills = { ...baseSkills }

  // 카테고리별 스킬 수치 증가
  switch (skill.category) {
    case 'policy':
    case 'knowledge':
      skills.research = Math.min(100, skills.research + skillBonus)
      break
    case 'tool':
      skills.analysis = Math.min(100, skills.analysis + skillBonus)
      break
    case 'infrastructure':
      skills.trading = Math.min(100, skills.trading + skillBonus)
      break
  }

  // ✨ teachablePassiveId: 회사 스킬 교육을 통해 RPG 패시브 스킬 해금
  // SKILL_TREE에 존재하는 스킬만 추가 (아직 정의되지 않은 ID는 무시)
  let unlockedSkills = [...(employee.unlockedSkills ?? [])]
  const passiveId = skill.effects.teachablePassiveId
  if (passiveId) {
    if (SKILL_TREE[passiveId]) {
      if (!unlockedSkills.includes(passiveId)) {
        unlockedSkills = [...unlockedSkills, passiveId]
      }
    } else if (import.meta.env.DEV) {
      console.warn(`[TrainingEngine] teachablePassiveId '${passiveId}' not found in SKILL_TREE (skill: ${skill.id})`)
    }
  }

  return {
    ...employee,
    learnedCorporateSkills: learnedSkills,
    unlockedSkills,
    activeTrainingId: null,
    skills,
  }
}

/**
 * 진행 중인 프로그램 수 확인
 */
export function getActiveTrainingCount(state: TrainingState): number {
  return state.programs.filter((p) => p.status === 'in_progress').length
}
