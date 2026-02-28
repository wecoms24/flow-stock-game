/* ── Chapter System Types ── */

export interface ChapterObjective {
  id: string
  label: string
  description: string
  targetValue?: number
}

export interface Chapter {
  id: number
  name: string
  yearRange: [number, number]
  description: string
  objectives: ChapterObjective[]
  unlockedFeatures?: string[]
}

export interface ChapterProgress {
  currentChapter: number
  objectiveStatus: Record<string, { progress: number; completed: boolean }>
  chapterShown: Record<number, boolean>
}

export function defaultChapterProgress(): ChapterProgress {
  return {
    currentChapter: 1,
    objectiveStatus: {},
    chapterShown: {},
  }
}

/* ── Company Profile Types ── */

export type InvestmentStyle = 'aggressive' | 'stable' | 'analytical'

export interface CompanyProfile {
  name: string
  style: InvestmentStyle
  logo: string
}

export function defaultCompanyProfile(): CompanyProfile {
  return {
    name: '레트로 투자운용',
    style: 'stable',
    logo: '🏢',
  }
}
