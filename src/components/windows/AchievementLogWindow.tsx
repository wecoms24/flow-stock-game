/**
 * AchievementLogWindow — 달성 기록 윈도우
 *
 * 마일스톤 카테고리별 진행도와 달성 내역 표시
 */

import { useMemo, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { MILESTONE_DEFINITIONS } from '../../data/milestones'
import type { Milestone } from '../../types'

type CategoryFilter = 'all' | 'financial' | 'time' | 'achievement' | 'employee'

const CATEGORY_INFO: Record<
  CategoryFilter,
  { label: string; icon: string; color: string }
> = {
  all: { label: '전체', icon: '📋', color: 'text-gray-700' },
  financial: { label: '금융', icon: '💰', color: 'text-green-700' },
  time: { label: '시간', icon: '⏰', color: 'text-blue-700' },
  achievement: { label: '달성', icon: '🏆', color: 'text-purple-700' },
  employee: { label: '직원', icon: '👥', color: 'text-orange-700' },
}

function MilestoneCard({ milestone, def }: { milestone: Milestone; def: (typeof MILESTONE_DEFINITIONS)[number] | undefined }) {
  const time = useGameStore((s) => s.time)
  const currentTick = useGameStore((s) => s.currentTick)

  const progress = useMemo(() => {
    if (!def || milestone.isUnlocked) return 100
    const ctx = {
      totalAssets: useGameStore.getState().player.totalAssetValue,
      cash: useGameStore.getState().player.cash,
      portfolioCount: Object.keys(useGameStore.getState().player.portfolio).length,
      employeeCount: useGameStore.getState().player.employees.length,
      yearsPassed: time.year - useGameStore.getState().config.startYear,
      totalTrades: 0,
      currentYear: time.year,
      officeLevel: useGameStore.getState().player.officeLevel,
      competitorRank: 99,
    }
    const currentValue = def.checkFn(ctx)
    return Math.min(100, Math.floor((currentValue / def.targetValue) * 100))
  }, [def, milestone.isUnlocked, time.year, currentTick])

  return (
    <div
      className={`win-inset p-2 mb-1.5 ${
        milestone.isUnlocked ? 'bg-yellow-50' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-lg ${milestone.isUnlocked ? '' : 'grayscale opacity-50'}`}>
          {milestone.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold ${
                milestone.isUnlocked ? 'text-gray-800' : 'text-gray-500'
              }`}
            >
              {milestone.title}
            </span>
            {milestone.isUnlocked && (
              <span className="text-[8px] text-green-600 font-bold">✅ 달성</span>
            )}
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">{milestone.description}</p>
          {!milestone.isUnlocked && (
            <div className="mt-1">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[8px] text-gray-400 mt-0.5">{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AchievementLogWindow() {
  const milestones = useGameStore((s) => s.milestones)
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const milestoneList = useMemo(() => {
    const entries = Object.values(milestones.milestones)
    if (entries.length === 0) return []

    const filtered =
      filter === 'all' ? entries : entries.filter((m) => m.category === filter)

    return filtered.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1
      if (!a.isUnlocked && b.isUnlocked) return 1
      if (a.isUnlocked && b.isUnlocked) {
        return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)
      }
      return 0
    })
  }, [milestones, filter])

  const stats = useMemo(() => {
    const all = Object.values(milestones.milestones)
    const unlocked = all.filter((m) => m.isUnlocked).length
    return { total: all.length, unlocked }
  }, [milestones])

  return (
    <div className="flex flex-col h-full p-2 text-[11px]">
      {/* Header */}
      <div className="win-inset bg-gray-50 p-2 mb-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-700">🏆 달성 기록</span>
          <span className="text-[10px] text-gray-500">
            {stats.unlocked}/{stats.total} 달성
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all"
            style={{
              width: stats.total > 0 ? `${(stats.unlocked / stats.total) * 100}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-0.5 mb-2 flex-wrap">
        {(Object.keys(CATEGORY_INFO) as CategoryFilter[]).map((cat) => {
          const info = CATEGORY_INFO[cat]
          const isActive = filter === cat
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-1.5 py-0.5 text-[9px] border rounded ${
                isActive
                  ? 'bg-blue-100 border-blue-400 font-bold'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {info.icon} {info.label}
            </button>
          )
        })}
      </div>

      {/* Milestone list */}
      <div className="flex-1 overflow-y-auto">
        {milestoneList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-2xl mb-2">🎯</span>
            <p className="text-[10px]">게임을 진행하면 마일스톤이 표시됩니다</p>
          </div>
        ) : (
          milestoneList.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              def={MILESTONE_DEFINITIONS.find((d) => d.id === m.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
