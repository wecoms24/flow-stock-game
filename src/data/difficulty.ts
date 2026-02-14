import type { DifficultyConfig, Difficulty } from '../types'

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
    initialCash: 100_000_000,
    maxCompanies: 100,
    eventChance: 0.005, // 0.5% per tick → fewer surprises
    volatilityMultiplier: 0.7, // 30% less volatile
    employeeSalaryMultiplier: 0.8, // cheaper employees
    staminaDrainMultiplier: 0.6, // slow fatigue
  },
  normal: {
    startYear: 1995,
    endYear: 2025,
    initialCash: 50_000_000,
    maxCompanies: 100,
    eventChance: 0.01, // 1% per tick (baseline)
    volatilityMultiplier: 1.0,
    employeeSalaryMultiplier: 1.0,
    staminaDrainMultiplier: 1.0,
  },
  hard: {
    startYear: 1995,
    endYear: 2025,
    initialCash: 20_000_000,
    maxCompanies: 100,
    eventChance: 0.02, // 2% per tick → chaotic markets
    volatilityMultiplier: 1.4, // 40% more volatile
    employeeSalaryMultiplier: 1.3, // expensive employees
    staminaDrainMultiplier: 1.5, // fast fatigue
  },
}
