/* ── Skill Path System Types ── */

export type SkillPathType = 'trading' | 'analysis'

export interface SkillBonus {
  level: number // 이 보너스가 활성화되는 레벨
  name: string
  description: string
  effect: SkillBonusEffect
}

export type SkillBonusEffect =
  | { type: 'slippage_reduction'; value: number } // 슬리피지 감소 (e.g. 0.005 = 0.5%)
  | { type: 'execution_speed'; value: number } // 실행 속도 보너스 (e.g. 0.2 = 20%)
  | { type: 'confidence_boost'; value: number } // 분석 신뢰도 보너스 (e.g. 5 = +5)
  | { type: 'research_quality'; value: number } // 리서치 품질 보너스 (e.g. 0.1 = 10%)
  | { type: 'stamina_efficiency'; value: number } // 스태미너 소비 감소 (e.g. 0.15 = 15%)
  | { type: 'xp_boost'; value: number } // 경험치 획득 보너스 (e.g. 0.1 = 10%)
  | { type: 'skill_unlock'; skillNodeId: string } // 특정 스킬노드 해금

export interface SkillPath {
  type: SkillPathType
  name: string
  description: string
  icon: string
  color: string // TailwindCSS color class
  bonuses: SkillBonus[]
}

export interface EmployeeSkillPathState {
  selectedPath: SkillPathType | null // null = 아직 선택 안 함 (레벨 5 미만)
  pathLevel: number // 경로 내 레벨 (선택 시점 = 0, 이후 레벨업마다 +1)
  unlockedBonuses: number[] // 해금된 보너스 레벨 목록
}
