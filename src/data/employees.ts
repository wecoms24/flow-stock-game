import type { EmployeeRole, EmployeeSkills, EmployeeTrait, Sector } from '../types'
import type { AssignedSector } from '../types/trade'
import { TRAIT_DEFINITIONS } from './traits'

/* ── Employee Name Pool ── */
const FIRST_NAMES = [
  '김민수',
  '이서연',
  '박지훈',
  '정하늘',
  '최수현',
  '강태양',
  '윤미래',
  '조현우',
  '한소희',
  '임도윤',
  '송재훈',
  '오은지',
  '배준서',
  '신다은',
  '류시온',
  '홍유진',
  '전승민',
  '장서윤',
  '권도영',
  '남하린',
]

let nameIdx = 0

export function generateEmployeeName(): string {
  const name = FIRST_NAMES[nameIdx % FIRST_NAMES.length]
  nameIdx++
  return name
}

export function resetNamePool(): void {
  nameIdx = 0
}

/* ── Employee Trait System ── */

/**
 * 가중치 기반 랜덤 성격 태그 생성 (1-2개)
 */
export function generateRandomTraits(): EmployeeTrait[] {
  const traitCount = Math.random() > 0.7 ? 2 : 1
  const allTraits = Object.keys(TRAIT_DEFINITIONS) as EmployeeTrait[]

  // rarity에 따른 가중치 배열 생성
  const weightedTraits = allTraits.flatMap((trait) => {
    const { rarity } = TRAIT_DEFINITIONS[trait]
    const weight = rarity === 'common' ? 7 : rarity === 'uncommon' ? 2 : 1
    return Array(weight).fill(trait)
  })

  // 중복 없이 선택 (무한 루프 방지)
  const selected: EmployeeTrait[] = []
  let attempts = 0
  while (selected.length < traitCount && attempts < 100) {
    attempts++
    const randomTrait = weightedTraits[Math.floor(Math.random() * weightedTraits.length)]
    if (!selected.includes(randomTrait)) {
      selected.push(randomTrait)
    }
  }

  return selected
}

/**
 * 직책에 따른 초기 스킬 생성
 */
export function generateInitialSkills(
  role: EmployeeRole,
  traits: EmployeeTrait[],
): EmployeeSkills {
  // 직책별 기본 스킬
  const baseSkills: Record<EmployeeRole, EmployeeSkills> = {
    intern: { analysis: 30, trading: 30, research: 30 },
    analyst: { analysis: 60, trading: 30, research: 70 },
    trader: { analysis: 30, trading: 70, research: 40 },
    manager: { analysis: 50, trading: 50, research: 50 },
    ceo: { analysis: 70, trading: 70, research: 70 },
    hr_manager: { analysis: 50, trading: 30, research: 60 },
  }

  const skills = { ...baseSkills[role] }

  // tech_savvy 태그 있으면 모든 스킬 +10
  if (traits.includes('tech_savvy')) {
    skills.analysis = Math.min(100, skills.analysis + 10)
    skills.trading = Math.min(100, skills.trading + 10)
    skills.research = Math.min(100, skills.research + 10)
  }

  // perfectionist 태그 있으면 분석/리서치 +5
  if (traits.includes('perfectionist')) {
    skills.analysis = Math.min(100, skills.analysis + 5)
    skills.research = Math.min(100, skills.research + 5)
  }

  // risk_averse 태그 있으면 거래 -5
  if (traits.includes('risk_averse')) {
    skills.trading = Math.max(0, skills.trading - 5)
  }

  return skills
}

/* ── Analyst Sector Assignment ── */

const ALL_SECTORS: Sector[] = [
  'tech', 'finance', 'energy', 'healthcare', 'consumer',
  'industrial', 'telecom', 'materials', 'utilities', 'realestate',
]

/**
 * Analyst 고용 시 담당 섹터 랜덤 할당 (1-2개)
 */
export function generateAssignedSectors(): AssignedSector[] {
  const count = Math.random() > 0.6 ? 2 : 1
  const shuffled = [...ALL_SECTORS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
