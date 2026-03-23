import type { DifficultyConfig, Difficulty, VictoryGoal } from '../types'

/* ── [Plan Track] 난이도별 변수 차등 세분화 테이블 ── */
/*
 * Easy: 넉넉한 자본, 낮은 변동성, 느린 스태미너 소모, 이벤트 적음
 * Normal: 표준 밸런스
 * Hard: 적은 자본, 높은 변동성, 빠른 스태미너 소모, 이벤트 많음
 */
export const DIFFICULTY_TABLE: Record<Difficulty, DifficultyConfig> = {
  easy: {
    startYear: 1995,
    endYear: 2025,
    initialCash: 250_000_000, // v7.2: 2억→2.5억 (Easy > Normal 유지)
    maxCompanies: 100,
    eventChance: 0.005, // 0.5% per tick → fewer surprises
    volatilityMultiplier: 0.7, // 30% less volatile
    employeeSalaryMultiplier: 0.8, // cheaper employees
    staminaDrainMultiplier: 0.6, // slow fatigue
  },
  normal: {
    startYear: 1995,
    endYear: 2025,
    initialCash: 200_000_000, // v7.2: 1억→2억 (30년 완주 + 위기 생존)
    maxCompanies: 100,
    eventChance: 0.01,
    volatilityMultiplier: 0.8, // v7.2: 1.0→0.8 (초기 손실 완화)
    employeeSalaryMultiplier: 0.8,
    staminaDrainMultiplier: 1.0,
  },
  hard: {
    startYear: 1995,
    endYear: 2025,
    initialCash: 30_000_000,
    maxCompanies: 100,
    eventChance: 0.02, // 2% per tick → chaotic markets
    volatilityMultiplier: 1.4, // 40% more volatile
    employeeSalaryMultiplier: 1.3, // expensive employees
    staminaDrainMultiplier: 1.5, // fast fatigue
  },
}

/* ── Victory Goal Presets ── */
export const VICTORY_GOALS: VictoryGoal[] = [
  {
    id: 'casual',
    label: '편한 은퇴',
    icon: '🏖️',
    targetAsset: 500_000_000,
    description: '5억원 달성',
  },
  {
    id: 'standard',
    label: '억만장자',
    icon: '💰',
    targetAsset: 1_000_000_000,
    description: '10억원 달성',
  },
  {
    id: 'hardcore',
    label: '투자의 신',
    icon: '⭐',
    targetAsset: 5_000_000_000,
    description: '50억원 달성',
  },
  {
    id: 'impossible',
    label: '워렌 버핏',
    icon: '🔥',
    targetAsset: 10_000_000_000,
    description: '100억원 달성',
  },
]
