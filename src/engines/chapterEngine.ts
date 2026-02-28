import { CHAPTERS, getChapterNumber } from '../data/chapters'
import type { ChapterProgress } from '../types/chapter'

interface ChapterCheckContext {
  year: number
  cash: number
  totalAssetValue: number
  employeeCount: number
  officeLevel: number
  competitorAssets: number[] // competitors' totalAssetValues
  corporateSkillsUnlocked: number
  initialCash: number
  targetAsset: number
}

/** 매 시간 호출: 현재 챕터 목표 진행도를 가볍게 체크 */
export function evaluateChapterObjectives(
  ctx: ChapterCheckContext,
  progress: ChapterProgress,
): ChapterProgress {
  const chapterNum = getChapterNumber(ctx.year)
  const chapter = CHAPTERS.find((ch) => ch.id === chapterNum)
  if (!chapter) return progress

  let hasChanges = false
  const updated = { ...progress.objectiveStatus }

  for (const obj of chapter.objectives) {
    const prev = updated[obj.id]
    if (prev?.completed) continue

    let pct = 0

    switch (obj.id) {
      case 'ch1_survive':
        pct = ctx.cash > 0 ? 100 : 0
        break
      case 'ch1_employees':
        pct = Math.min(100, (ctx.employeeCount / (obj.targetValue ?? 2)) * 100)
        break
      case 'ch2_networth':
        pct = Math.min(100, (ctx.totalAssetValue / (obj.targetValue ?? 500_000_000)) * 100)
        break
      case 'ch2_profit':
        pct = ctx.totalAssetValue > ctx.initialCash ? 100 : 50
        break
      case 'ch3_employees':
        pct = Math.min(100, (ctx.employeeCount / (obj.targetValue ?? 5)) * 100)
        break
      case 'ch3_positive':
        pct = ctx.totalAssetValue > ctx.initialCash ? 100 : 50
        break
      case 'ch4_ranking': {
        const rank = ctx.competitorAssets.filter((a) => a > ctx.totalAssetValue).length + 1
        pct = rank <= ctx.competitorAssets.length ? 100 : 30
        break
      }
      case 'ch4_office':
        pct = Math.min(100, (ctx.officeLevel / (obj.targetValue ?? 2)) * 100)
        break
      case 'ch5_networth_half':
        pct = Math.min(100, (ctx.totalAssetValue / (ctx.targetAsset * 0.5)) * 100)
        break
      case 'ch5_skills':
        pct = Math.min(100, (ctx.corporateSkillsUnlocked / (obj.targetValue ?? 3)) * 100)
        break
      case 'ch6_ending':
        pct = ctx.totalAssetValue >= ctx.targetAsset
          ? 100
          : Math.min(99, (ctx.totalAssetValue / ctx.targetAsset) * 100)
        break
      case 'ch6_top_rank': {
        const rank = ctx.competitorAssets.filter((a) => a > ctx.totalAssetValue).length + 1
        pct = rank === 1 ? 100 : Math.max(10, 100 - rank * 20)
        break
      }
      default:
        continue
    }

    const rounded = Math.round(pct)
    const completed = rounded >= 100

    if (!prev || prev.progress !== rounded || prev.completed !== completed) {
      updated[obj.id] = { progress: rounded, completed }
      hasChanges = true
    }
  }

  if (!hasChanges) return progress

  return {
    ...progress,
    currentChapter: chapterNum,
    objectiveStatus: updated,
  }
}
