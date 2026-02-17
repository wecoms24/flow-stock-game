/**
 * Training System Types
 *
 * 회사 스킬을 직원에게 교육하는 프로그램 시스템
 * 교육 진행 중 체크포인트(퀴즈/시뮬레이션/토론) 이벤트 발생
 */

export type TrainingCheckpointType = 'quiz' | 'simulation' | 'discussion' | 'challenge'
export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface TrainingCheckpoint {
  atProgress: number // 발동 진행도 (0-100, 예: 25, 50, 75)
  type: TrainingCheckpointType
  title: string
  description: string
  passed: boolean | null // null = 미도달
  reward: {
    xpBonus: number
    skillBonus: number // 스킬 수치 직접 증가
  }
  penalty: {
    stressIncrease: number
    progressLoss: number // 진행도 감소 (예: 10 → 10% 후퇴)
  }
}

export interface TrainingProgram {
  id: string
  /** 교육 대상 Corporate Skill ID */
  targetSkillId: string
  /** 교육명 */
  name: string
  /** 멘토 직원 ID (없으면 외부 강사) */
  instructorId: string | null
  /** 수강생 직원 ID 배열 */
  traineeIds: string[]
  maxSeats: number

  /** 일정 */
  startTick: number
  durationTicks: number // 예: 50400 = 2주 (3600틱/일 * 14일)
  progress: number // 0-100

  /** 비용 */
  baseCost: number
  costPerTrainee: number

  /** 요구 시설 */
  requiredFurniture: string[] // FurnitureType 문자열

  /** 체크포인트 이벤트 */
  checkpoints: TrainingCheckpoint[]

  /** 상태 */
  status: TrainingStatus

  /** 결과 */
  completedAt?: number
  graduateIds?: string[] // 수료한 직원 ID 배열
}

/** 교육 시스템 전체 상태 */
export interface TrainingState {
  programs: TrainingProgram[]
  completedCount: number
  totalTraineesGraduated: number
}
