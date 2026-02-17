import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { CorporateSkill, CorporateSkillTier, CorporateSkillCategory } from '../../types/corporateSkill'
import { arePrerequisitesMet } from '../../data/corporateSkills'

type FilterCategory = 'all' | CorporateSkillCategory

export function SkillLibraryWindow() {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const corporateSkills = useGameStore((s) => s.corporateSkills)
  const playerCash = useGameStore((s) => s.player.cash)
  const unlockCorporateSkill = useGameStore((s) => s.unlockCorporateSkill)

  const skills = Object.values(corporateSkills.skills)
  const filtered =
    selectedCategory === 'all'
      ? skills
      : skills.filter((s) => s.category === selectedCategory)

  // Group by tier
  const tier1 = filtered.filter((s) => s.tier === 1)
  const tier2 = filtered.filter((s) => s.tier === 2)
  const tier3 = filtered.filter((s) => s.tier === 3)

  const selectedSkill = selectedSkillId ? corporateSkills.skills[selectedSkillId] : null

  const handleUnlock = (skillId: string) => {
    const result = unlockCorporateSkill(skillId)
    if (!result.success) {
      alert(result.reason)
    }
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Header Stats */}
      <div className="win-inset bg-white p-2 mb-2">
        <div className="flex justify-between items-center">
          <span className="font-bold">📚 회사 지식자산</span>
          <span className="text-retro-gray">
            해금: {corporateSkills.totalUnlocked}/{skills.length} |
            투자: {corporateSkills.totalSpent.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 mb-2">
        {(['all', 'policy', 'tool', 'infrastructure', 'knowledge'] as const).map((cat) => (
          <RetroButton
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            size="sm"
            variant={selectedCategory === cat ? 'primary' : 'default'}
          >
            {CATEGORY_LABELS[cat]}
          </RetroButton>
        ))}
      </div>

      {/* Skill Tree */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {[
          { tier: 1 as CorporateSkillTier, label: 'Tier 1 — 기초', skills: tier1 },
          { tier: 2 as CorporateSkillTier, label: 'Tier 2 — 중급', skills: tier2 },
          { tier: 3 as CorporateSkillTier, label: 'Tier 3 — 고급', skills: tier3 },
        ].map(
          (group) =>
            group.skills.length > 0 && (
              <div key={group.tier}>
                <div className={`text-[10px] font-bold mb-1 ${TIER_COLORS[group.tier]}`}>
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {group.skills.map((skill) => (
                    <CorpSkillCard
                      key={skill.id}
                      skill={skill}
                      allSkills={corporateSkills.skills}
                      playerCash={playerCash}
                      isSelected={selectedSkillId === skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                      onUnlock={() => handleUnlock(skill.id)}
                    />
                  ))}
                </div>
              </div>
            ),
        )}
      </div>

      {/* Detail Panel */}
      {selectedSkill && (
        <SkillDetailPanel
          skill={selectedSkill}
          allSkills={corporateSkills.skills}
          playerCash={playerCash}
          onUnlock={() => handleUnlock(selectedSkill.id)}
        />
      )}
    </div>
  )
}

/* ── Sub-components ── */

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: '전체',
  policy: '🛡️ 정책',
  tool: '🔧 도구',
  infrastructure: '⚡ 인프라',
  knowledge: '📚 지식',
}

const TIER_COLORS: Record<CorporateSkillTier, string> = {
  1: 'text-gray-600',
  2: 'text-blue-600',
  3: 'text-purple-600',
}

function getSkillState(
  skill: CorporateSkill,
  allSkills: Record<string, CorporateSkill>,
  playerCash: number,
): 'unlocked' | 'available' | 'locked' | 'insufficient' {
  if (skill.unlocked) return 'unlocked'
  if (!arePrerequisitesMet(skill.id, allSkills)) return 'locked'
  if (playerCash < skill.cost) return 'insufficient'
  return 'available'
}

interface CorpSkillCardProps {
  skill: CorporateSkill
  allSkills: Record<string, CorporateSkill>
  playerCash: number
  isSelected: boolean
  onClick: () => void
  onUnlock: () => void
}

function CorpSkillCard({ skill, allSkills, playerCash, isSelected, onClick, onUnlock }: CorpSkillCardProps) {
  const state = getSkillState(skill, allSkills, playerCash)

  const stateStyles = {
    locked: 'bg-gray-100 border-gray-300 opacity-60',
    insufficient: 'bg-yellow-50 border-yellow-300',
    available: 'bg-green-50 border-green-400',
    unlocked: 'bg-blue-50 border-blue-400',
  }

  const stateIcons = {
    locked: '🔒',
    insufficient: '💰',
    available: '✅',
    unlocked: '⭐',
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border-2 p-1.5 cursor-pointer transition-all ${stateStyles[state]} ${
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
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm flex-shrink-0">{skill.icon}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold truncate">{skill.name}</div>
            <div className="text-[9px] text-retro-gray truncate">{skill.cost.toLocaleString()}원</div>
          </div>
        </div>
        <span className="text-[10px] flex-shrink-0">{stateIcons[state]}</span>
      </div>

      {state === 'available' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUnlock()
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-bold py-0.5 mt-1 border border-blue-700"
        >
          해금
        </button>
      )}
    </div>
  )
}

interface SkillDetailPanelProps {
  skill: CorporateSkill
  allSkills: Record<string, CorporateSkill>
  playerCash: number
  onUnlock: () => void
}

function SkillDetailPanel({ skill, allSkills, playerCash, onUnlock }: SkillDetailPanelProps) {
  const state = getSkillState(skill, allSkills, playerCash)

  return (
    <div className="mt-2 win-inset bg-white p-2">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-lg">{skill.icon}</span>
        <div>
          <div className="text-[11px] font-bold">{skill.name}</div>
          <div className="text-[9px] text-retro-gray">
            Tier {skill.tier} | {CATEGORY_LABELS[skill.category]}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-gray-700 mb-2">{skill.description}</div>

      {/* Effects */}
      <div className="text-[9px] space-y-0.5 mb-2">
        <div className="font-semibold text-blue-700">효과:</div>
        {skill.effects.global && (
          <>
            {skill.effects.global.signalAccuracyBonus != null && (
              <div className="text-blue-600 pl-2">
                + 신호 정확도 {(skill.effects.global.signalAccuracyBonus * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.global.slippageReduction != null && (
              <div className="text-blue-600 pl-2">
                + 슬리피지 감소 {(skill.effects.global.slippageReduction * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.global.commissionDiscount != null && (
              <div className="text-blue-600 pl-2">
                + 수수료 할인 {(skill.effects.global.commissionDiscount * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.global.maxPendingProposals != null && (
              <div className="text-blue-600 pl-2">
                + 제안서 한도 +{skill.effects.global.maxPendingProposals}개
              </div>
            )}
            {skill.effects.global.riskReductionBonus != null && (
              <div className="text-blue-600 pl-2">
                + 리스크 감소 {(skill.effects.global.riskReductionBonus * 100).toFixed(0)}%
              </div>
            )}
          </>
        )}
        {skill.effects.conditional && (
          <>
            {skill.effects.conditional.stopLossThreshold != null && (
              <div className="text-orange-600 pl-2">
                자동 손절: {(skill.effects.conditional.stopLossThreshold * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.conditional.takeProfitThreshold != null && (
              <div className="text-green-600 pl-2">
                자동 익절: +{(skill.effects.conditional.takeProfitThreshold * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.conditional.trailingStopPercent != null && (
              <div className="text-orange-600 pl-2">
                트레일링 스톱: {(skill.effects.conditional.trailingStopPercent * 100).toFixed(0)}%
              </div>
            )}
            {skill.effects.conditional.maxSinglePositionPercent != null && (
              <div className="text-orange-600 pl-2">
                단일종목 제한: {(skill.effects.conditional.maxSinglePositionPercent * 100).toFixed(0)}%
              </div>
            )}
          </>
        )}
        {skill.effects.teachablePassiveId && (
          <div className="text-purple-600 pl-2">
            🎓 교육 가능: {skill.effects.teachablePassiveId}
          </div>
        )}
      </div>

      {/* Prerequisites */}
      {skill.prerequisites.length > 0 && (
        <div className="text-[9px] mb-2">
          <div className="font-semibold">선행 조건:</div>
          {skill.prerequisites.map((prereqId) => {
            const prereq = allSkills[prereqId]
            const met = prereq?.unlocked
            return (
              <div key={prereqId} className={met ? 'text-green-700' : 'text-red-700'}>
                {met ? '✅' : '❌'} {prereq?.name ?? prereqId}
              </div>
            )
          })}
        </div>
      )}

      {/* Cost */}
      <div className="text-[9px] mb-2">
        <span className="font-semibold">비용:</span>{' '}
        <span className={playerCash >= skill.cost ? 'text-green-700' : 'text-red-700'}>
          {skill.cost.toLocaleString()}원
        </span>
        <span className="text-retro-gray ml-1">(보유: {playerCash.toLocaleString()}원)</span>
      </div>

      {/* Action */}
      {state === 'available' && (
        <RetroButton onClick={onUnlock} size="sm" variant="primary" className="w-full">
          해금하기
        </RetroButton>
      )}
      {state === 'unlocked' && (
        <div className="text-center text-[10px] text-blue-600 font-bold">⭐ 해금 완료</div>
      )}
      {state === 'locked' && (
        <div className="text-center text-[10px] text-red-600">🔒 선행 조건 미충족</div>
      )}
      {state === 'insufficient' && (
        <div className="text-center text-[10px] text-yellow-700">💰 자금 부족</div>
      )}
    </div>
  )
}
