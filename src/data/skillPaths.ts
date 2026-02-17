/**
 * Skill Paths
 *
 * Trading / Analysis 경로 보너스 정의 (Lv5/10/20/30)
 */

import type { SkillPath } from '../types/skillPath'

export const SKILL_PATHS: Record<string, SkillPath> = {
  trading: {
    type: 'trading',
    name: '트레이딩 마스터',
    description: '매매 실행력 극대화. 슬리피지 감소, 실행 속도 향상, 스태미너 효율 강화.',
    icon: '⚡',
    color: 'text-blue-400',
    bonuses: [
      {
        level: 5,
        name: '빠른 손',
        description: '주문 실행 속도 +15%',
        effect: { type: 'execution_speed', value: 0.15 },
      },
      {
        level: 10,
        name: '시장 감각',
        description: '슬리피지 0.3% 감소',
        effect: { type: 'slippage_reduction', value: 0.003 },
      },
      {
        level: 20,
        name: '체력 관리',
        description: '스태미너 소비 20% 감소',
        effect: { type: 'stamina_efficiency', value: 0.2 },
      },
      {
        level: 30,
        name: '전설의 트레이더',
        description: '슬리피지 0.5% 추가 감소 + 실행 속도 +25%',
        effect: { type: 'slippage_reduction', value: 0.005 },
      },
    ],
  },
  analysis: {
    type: 'analysis',
    name: '분석 마스터',
    description: '분석 정확도 극대화. 신뢰도 향상, 리서치 품질 향상, 경험치 부스트.',
    icon: '🔍',
    color: 'text-purple-400',
    bonuses: [
      {
        level: 5,
        name: '예리한 눈',
        description: '분석 신뢰도 +5',
        effect: { type: 'confidence_boost', value: 5 },
      },
      {
        level: 10,
        name: '깊은 리서치',
        description: '리서치 품질 +15%',
        effect: { type: 'research_quality', value: 0.15 },
      },
      {
        level: 20,
        name: '학구열',
        description: '경험치 획득 +20%',
        effect: { type: 'xp_boost', value: 0.2 },
      },
      {
        level: 30,
        name: '전설의 분석가',
        description: '분석 신뢰도 +10 + 리서치 품질 +25%',
        effect: { type: 'confidence_boost', value: 10 },
      },
    ],
  },
}
