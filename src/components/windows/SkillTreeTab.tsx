import { useState } from 'react'
import type { Employee } from '../../types'
import { useGameStore } from '../../stores/gameStore'
import { getSkillsByCategory } from '../../data/skillTree'
import { getSkillNodeState, calculateEmployeeStats } from '../../systems/skillSystem'
import { calculateResetCost } from '../../config/skillBalance'
import { formatSkillEffect, formatPrerequisites } from '../../utils/skillFormatter'
import type { SkillNode, SkillNodeState } from '../../types/skills'
import { RetroButton } from '../ui/RetroButton'

interface SkillTreeTabProps {
  employee: Employee
}

export function SkillTreeTab({ employee }: SkillTreeTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'analysis' | 'trading' | 'research'
  >('analysis')
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null)
  const unlockEmployeeSkill = useGameStore((s) => s.unlockEmployeeSkill)
  const resetEmployeeSkillTree = useGameStore((s) => s.resetEmployeeSkillTree)

  const progression = employee.progression
  const skills = calculateEmployeeStats(employee)
  const categorySkills = getSkillsByCategory(selectedCategory)

  const handleUnlockSkill = (skillId: string) => {
    const result = unlockEmployeeSkill(employee.id, skillId)
    if (!result.success) {
      alert(result.reason)
    } else {
      setSelectedSkill(null)
    }
  }

  const handleResetSkills = () => {
    // 리셋할 스킬이 없는 경우
    if (!progression || progression.spentSkillPoints === 0) {
      alert('리셋할 스킬이 없습니다.')
      return
    }

    // 비용 계산 및 확인 다이얼로그
    const cost = calculateResetCost(progression.level)
    const confirmMessage = `스킬 트리를 리셋하시겠습니까?\n\n비용: ${cost.toLocaleString()}원\n환불 SP: ${progression.spentSkillPoints} SP\n\n모든 스킬이 초기화되고 사용한 SP가 환불됩니다.`

    if (!confirm(confirmMessage)) {
      return
    }

    // 리셋 실행
    const result = resetEmployeeSkillTree(employee.id)
    if (!result.success) {
      alert(result.reason || '리셋에 실패했습니다.')
    } else {
      alert(`스킬 트리가 리셋되었습니다.\n환불된 SP: ${progression.spentSkillPoints}\n비용: ${result.cost.toLocaleString()}원`)
      setSelectedSkill(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: SP Info */}
      <div className="win-inset bg-white p-2 mb-2">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold">스킬 포인트</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-retro-gray">
              사용 가능: <span className="font-bold text-blue-600">{progression?.skillPoints ?? 0}</span> SP
            </span>
            <span className="text-[10px] text-retro-gray">
              (총 {(progression?.spentSkillPoints ?? 0) + (progression?.skillPoints ?? 0)} SP)
            </span>
          </div>
        </div>
        <div className="text-[10px] text-retro-gray mt-1">
          레벨업 시 3 SP 획득 | 현재 스탯: Analysis {skills.analysis} / Trading {skills.trading} / Research {skills.research}
        </div>
        {/* Reset Button */}
        {progression && progression.spentSkillPoints > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <RetroButton
              onClick={handleResetSkills}
              size="sm"
              variant="default"
              className="w-full text-[10px]"
            >
              🔄 스킬 리셋 (비용: {calculateResetCost(progression.level).toLocaleString()}원)
            </RetroButton>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-2">
        <RetroButton
          onClick={() => setSelectedCategory('analysis')}
          size="sm"
          variant={selectedCategory === 'analysis' ? 'primary' : 'default'}
        >
          📊 분석
        </RetroButton>
        <RetroButton
          onClick={() => setSelectedCategory('trading')}
          size="sm"
          variant={selectedCategory === 'trading' ? 'primary' : 'default'}
        >
          ⚡ 매매
        </RetroButton>
        <RetroButton
          onClick={() => setSelectedCategory('research')}
          size="sm"
          variant={selectedCategory === 'research' ? 'primary' : 'default'}
        >
          🛡️ 리서치
        </RetroButton>
      </div>

      {/* Skill Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="win-inset bg-white p-2">
          <div className="space-y-2">
            {categorySkills.map((skill) => {
              const state = getSkillNodeState(employee, skill.id)
              return (
                <SkillNodeCard
                  key={skill.id}
                  skill={skill}
                  state={state}
                  isSelected={selectedSkill?.id === skill.id}
                  onClick={() => setSelectedSkill(skill)}
                  onUnlock={() => handleUnlockSkill(skill.id)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected Skill Detail */}
      {selectedSkill && (() => {
        const effects = formatSkillEffect(selectedSkill.effect)
        const prereqInfo = formatPrerequisites(selectedSkill.prerequisites, employee)

        return (
          <div className="mt-2 win-inset bg-white p-2">
            {/* Header */}
            <div className="text-xs font-bold mb-1">
              {selectedSkill.emoji} {selectedSkill.name}
            </div>
            <div className="text-[10px] text-retro-gray mb-2">{selectedSkill.description}</div>

            {/* Effects */}
            <div className="text-[9px] space-y-1 mb-2">
              <div className="font-semibold text-blue-700">효과:</div>
              {effects.map((effectText, idx) => (
                <div key={idx} className="text-blue-600 pl-2">
                  • {effectText}
                </div>
              ))}
            </div>

            {/* Cost & Tier */}
            <div className="text-[9px] space-y-0.5 mb-2">
              <div>
                <span className="font-semibold">비용:</span> {selectedSkill.cost} SP
              </div>
              <div>
                <span className="font-semibold">티어:</span> {selectedSkill.tier}
              </div>
            </div>

            {/* Prerequisites */}
            {prereqInfo.items.length > 0 && (
              <div className="text-[9px] space-y-0.5">
                <div className="font-semibold">선행 조건:</div>
                {prereqInfo.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={item.satisfied ? 'text-green-700' : 'text-red-700'}
                  >
                    {item.satisfied ? '✅' : '❌'} {item.label}
                    {item.currentValue && (
                      <span className="text-retro-gray ml-1">({item.currentValue})</span>
                    )}
                  </div>
                ))}
                {!prereqInfo.allSatisfied && (
                  <div className="text-[8px] text-red-600 mt-1">
                    ⚠️ 조건을 충족해야 해금할 수 있습니다
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

/* ── Skill Node Card ── */

interface SkillNodeCardProps {
  skill: SkillNode
  state: SkillNodeState
  isSelected: boolean
  onClick: () => void
  onUnlock: () => void
}

function SkillNodeCard({ skill, state, isSelected, onClick, onUnlock }: SkillNodeCardProps) {
  const stateStyles = {
    locked: 'bg-gray-100 border-gray-300 text-gray-500',
    insufficient: 'bg-yellow-50 border-yellow-300 text-gray-700',
    available: 'bg-green-50 border-green-400 text-gray-900',
    unlocked: 'bg-blue-50 border-blue-400 text-blue-900',
  }

  const stateIcons = {
    locked: '🔒',
    insufficient: '⚠️',
    available: '✅',
    unlocked: '⭐',
  }

  const tierColor = {
    1: 'text-gray-600',
    2: 'text-green-600',
    3: 'text-blue-600',
    4: 'text-purple-600',
    5: 'text-yellow-600',
  }

  // 🎯 Accessibility: State descriptions for screen readers
  const stateLabels = {
    locked: '잠김 (조건 미충족)',
    insufficient: '잠김 (SP 부족)',
    available: '해금 가능',
    unlocked: '이미 해금됨',
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${skill.name} 스킬 (${stateLabels[state]}, 비용: ${skill.cost} SP, 티어 ${skill.tier})`}
      aria-pressed={isSelected}
      className={`border-2 rounded p-2 cursor-pointer transition-all ${stateStyles[state]} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1">
          <span className="text-lg">{skill.emoji}</span>
          <div>
            <div className="text-[10px] font-bold flex items-center gap-1">
              {skill.name}
              <span className={`text-[8px] ${tierColor[skill.tier]}`}>
                Tier {skill.tier}
              </span>
            </div>
            <div className="text-[9px] text-retro-gray">{skill.description}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs">{stateIcons[state]}</span>
          <span className="text-[9px] font-bold">{skill.cost} SP</span>
        </div>
      </div>

      {state === 'available' && (
        <div className="mt-1">
          <button
            onClick={onUnlock}
            aria-label={`${skill.name} 스킬 해금 (비용: ${skill.cost} SP)`}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold py-1 px-2 rounded border-2 border-blue-700"
          >
            해금하기
          </button>
        </div>
      )}
    </div>
  )
}
