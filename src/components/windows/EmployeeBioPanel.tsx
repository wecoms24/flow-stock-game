/**
 * EmployeeBioPanel
 *
 * 직원 바이오 상세 패널 (EmployeeDetailWindow 내 탭)
 */

import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { EmotionBadge } from '../ui/EmotionBadge'
import { EMOTION_CONFIG } from '../../types/employeeBio'
import { EMPLOYEE_MILESTONES } from '../../data/employeeMilestones'

interface EmployeeBioPanelProps {
  employeeId: string
}

export function EmployeeBioPanel({ employeeId }: EmployeeBioPanelProps) {
  const bio = useGameStore((s) => s.employeeBios[employeeId])

  const recentEvents = useMemo(
    () => (bio?.lifeEvents ?? []).slice(-10).reverse(),
    [bio],
  )

  if (!bio) {
    return (
      <div className="text-xs text-gray-400 text-center p-4">
        바이오 정보가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-3 text-xs">
      {/* Personality & Backstory */}
      <div className="border border-gray-600 p-2 bg-gray-800/50">
        <p className="text-[10px] text-gray-400 mb-1">성격</p>
        <p className="text-white">{bio.personality}</p>
        <p className="text-[10px] text-gray-400 mt-2 mb-1">배경</p>
        <p className="text-gray-300">{bio.backstory}</p>
      </div>

      {/* Current Emotion */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400">현재 감정:</span>
        <EmotionBadge emotion={bio.currentEmotion} size="md" />
      </div>

      {/* Emotion History */}
      {bio.emotionHistory.length > 1 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">감정 이력</p>
          <div className="flex gap-0.5 flex-wrap">
            {bio.emotionHistory.slice(-8).map((entry, i) => (
              <span
                key={i}
                title={EMOTION_CONFIG[entry.emotion].label}
                className="text-sm"
              >
                {EMOTION_CONFIG[entry.emotion].icon}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personal Goals */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">개인 목표</p>
        <div className="space-y-1">
          {bio.goals.map((goal) => {
            const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100)
            return (
              <div key={goal.id} className="border border-gray-700 p-1.5 bg-gray-800/30">
                <div className="flex justify-between items-center">
                  <span className={goal.isCompleted ? 'text-green-400' : 'text-white'}>
                    {goal.isCompleted ? '✅' : '🎯'} {goal.title}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {goal.currentValue}/{goal.targetValue}
                  </span>
                </div>
                <div className="w-full h-1 bg-gray-700 mt-1">
                  <div
                    className={`h-full ${goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[8px] text-gray-500 mt-0.5">{goal.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="border border-gray-700 p-1 text-center">
          <p className="text-gray-400">근속</p>
          <p className="text-white font-bold">{bio.monthsEmployed}개월</p>
        </div>
        <div className="border border-gray-700 p-1 text-center">
          <p className="text-gray-400">거래 참여</p>
          <p className="text-white font-bold">{bio.totalTradesParticipated}회</p>
        </div>
        <div className="border border-gray-700 p-1 text-center">
          <p className="text-gray-400">성공 거래</p>
          <p className="text-white font-bold">{bio.totalSuccessfulTrades}회</p>
        </div>
        <div className="border border-gray-700 p-1 text-center">
          <p className="text-gray-400">상담</p>
          <p className="text-white font-bold">{bio.counselingCount}회</p>
        </div>
      </div>

      {/* Milestones */}
      {(bio.unlockedMilestones ?? []).length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">
            달성 마일스톤 ({(bio.unlockedMilestones ?? []).length}개)
          </p>
          <div className="flex gap-1 flex-wrap">
            {(bio.unlockedMilestones ?? []).map((milestoneId) => {
              const def = EMPLOYEE_MILESTONES.find((m) => m.id === milestoneId)
              if (!def) return null
              return (
                <span
                  key={milestoneId}
                  title={`${def.title}\n${def.description}`}
                  className="text-base cursor-default"
                >
                  {def.icon}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Life Events */}
      {recentEvents.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">최근 이벤트</p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="text-[9px] text-gray-400 flex gap-1">
                <span className="text-gray-600">•</span>
                <span>{evt.title}: {evt.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
