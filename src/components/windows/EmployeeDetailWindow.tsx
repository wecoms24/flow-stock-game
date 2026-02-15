import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { XPBar } from '../ui/XPBar'
import { BadgeIcon } from '../ui/BadgeIcon'
import { EMPLOYEE_ROLE_CONFIG } from '../../types'
import { TRAIT_DEFINITIONS } from '../../data/traits'
import { ROLE_EMOJI, getMoodFace } from '../../data/employeeEmoji'
import {
  TITLE_LABELS,
  BADGE_COLORS,
  SKILL_UNLOCKS,
  badgeForLevel,
  titleForLevel,
} from '../../systems/growthSystem'

function getStatColor(value: number, isStress: boolean): string {
  if (isStress) {
    if (value > 70) return 'bg-red-500'
    if (value > 50) return 'bg-orange-400'
    return 'bg-green-400'
  }
  if (value < 30) return 'bg-red-500'
  if (value < 60) return 'bg-yellow-400'
  return 'bg-blue-400'
}

interface EmployeeDetailWindowProps {
  employeeId?: string
}

export function EmployeeDetailWindow({ employeeId }: EmployeeDetailWindowProps) {
  const employees = useGameStore((s) => s.player.employees)
  const time = useGameStore((s) => s.time)
  const praiseEmployee = useGameStore((s) => s.praiseEmployee)
  const scoldEmployee = useGameStore((s) => s.scoldEmployee)
  const fireEmployee = useGameStore((s) => s.fireEmployee)

  const emp = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId],
  )

  if (!emp) {
    return (
      <div className="text-xs text-retro-gray text-center p-4">
        직원을 찾을 수 없습니다
      </div>
    )
  }

  const stress = emp.stress ?? 0
  const satisfaction = emp.satisfaction ?? 80
  const skills = emp.skills ?? { analysis: 30, trading: 30, research: 30 }
  const level = emp.level ?? 1
  const badge = emp.badge ?? badgeForLevel(level)
  const empTitle = emp.title ?? titleForLevel(level)
  const mood = emp.mood ?? 50
  const hiredMonths = Math.floor(
    (time.year - 1995) * 12 + time.month - emp.hiredMonth,
  )
  const canPraise = (emp.praiseCooldown ?? 0) <= 0
  const canScold = (emp.scoldCooldown ?? 0) <= 0

  const roleEmoji = ROLE_EMOJI[emp.role]
  const moodEmoji = getMoodFace(stress, satisfaction)

  const growthLog = emp.growthLog ?? []
  const recentLog = growthLog.slice(-10).reverse()

  // Skill unlocks
  const unlockedSkills = Object.entries(SKILL_UNLOCKS)
    .filter(([lvl]) => level >= parseInt(lvl))
    .map(([, info]) => info)

  const nextUnlock = Object.entries(SKILL_UNLOCKS).find(
    ([lvl]) => level < parseInt(lvl),
  )

  return (
    <div className="text-xs p-2 space-y-2 overflow-y-auto h-full">
      {/* Profile Header */}
      <div className="win-inset bg-white p-2">
        <div className="flex items-center gap-2">
          <div className="text-3xl">{roleEmoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <BadgeIcon badge={badge} title={empTitle} size={16} />
              <span className="text-sm font-bold">{emp.name}</span>
              <span className="text-lg">{moodEmoji}</span>
            </div>
            <div className="text-[10px] text-retro-gray">
              {EMPLOYEE_ROLE_CONFIG[emp.role].title}
              <span className="mx-1">|</span>
              <span style={{ color: BADGE_COLORS[badge] }}>
                {TITLE_LABELS[empTitle]}
              </span>
              <span className="mx-1">|</span>
              근속 {hiredMonths}개월
            </div>
            <div className="text-[10px] text-retro-gray">
              월급: {emp.salary.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* Traits */}
        {emp.traits && emp.traits.length > 0 && (
          <div className="mt-1 flex gap-1 flex-wrap">
            {emp.traits.map((trait) => {
              const def = TRAIT_DEFINITIONS[trait]
              return (
                <span
                  key={trait}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] ${
                    def.rarity === 'rare'
                      ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                      : def.rarity === 'uncommon'
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                >
                  {def.icon} {def.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* XP / Level */}
      <div className="win-inset bg-white p-2">
        <div className="font-bold text-[10px] mb-1">성장</div>
        <XPBar employee={emp} />
        {/* Unlocked skills */}
        {unlockedSkills.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {unlockedSkills.map((skill) => (
              <div
                key={skill.name}
                className="text-[9px] text-green-700 bg-green-50 px-1 py-0.5 rounded"
              >
                {skill.name}: {skill.description}
              </div>
            ))}
          </div>
        )}
        {nextUnlock && (
          <div className="mt-1 text-[9px] text-retro-gray">
            Lv.{nextUnlock[0]}에서 해금: {nextUnlock[1].name}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="win-inset bg-white p-2">
        <div className="font-bold text-[10px] mb-1">상태</div>
        <div className="space-y-1">
          {/* Stamina */}
          <div>
            <div className="flex justify-between text-[9px]">
              <span>스태미너</span>
              <span>
                {Math.round(emp.stamina)}/{emp.maxStamina}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(emp.stamina / emp.maxStamina) * 100}%` }}
              />
            </div>
          </div>
          {/* Stress */}
          <div>
            <div className="flex justify-between text-[9px]">
              <span>스트레스</span>
              <span>{Math.round(stress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getStatColor(stress, true)}`}
                style={{ width: `${stress}%` }}
              />
            </div>
          </div>
          {/* Satisfaction */}
          <div>
            <div className="flex justify-between text-[9px]">
              <span>만족도</span>
              <span>{Math.round(satisfaction)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getStatColor(satisfaction, false)}`}
                style={{ width: `${satisfaction}%` }}
              />
            </div>
          </div>
          {/* Mood */}
          <div>
            <div className="flex justify-between text-[9px]">
              <span>기분</span>
              <span>{Math.round(mood)}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  mood >= 70 ? 'bg-pink-400' : mood <= 30 ? 'bg-gray-500' : 'bg-blue-300'
                }`}
                style={{ width: `${mood}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="win-inset bg-white p-2">
        <div className="font-bold text-[10px] mb-1">스킬</div>
        <div className="space-y-1">
          {[
            { key: 'analysis', label: '분석', color: 'bg-purple-500', value: skills.analysis },
            { key: 'trading', label: '거래', color: 'bg-red-500', value: skills.trading },
            { key: 'research', label: '리서치', color: 'bg-blue-500', value: skills.research },
          ].map((skill) => (
            <div key={skill.key}>
              <div className="flex justify-between text-[9px]">
                <span>{skill.label}</span>
                <span>{Math.round(skill.value)}/100</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${skill.color} rounded-full transition-all`}
                  style={{ width: `${skill.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <RetroButton
          size="sm"
          onClick={() => praiseEmployee(emp.id)}
          disabled={!canPraise}
          className="flex-1 text-[10px]"
        >
          {canPraise ? '칭찬하기 (+5 XP)' : '칭찬 쿨다운'}
        </RetroButton>
        <RetroButton
          size="sm"
          onClick={() => scoldEmployee(emp.id)}
          disabled={!canScold}
          className="flex-1 text-[10px]"
        >
          {canScold ? '꾸짖기 (업무 복귀)' : '꾸짖기 쿨다운'}
        </RetroButton>
        <RetroButton
          size="sm"
          variant="danger"
          onClick={() => {
            if (confirm(`${emp.name}을(를) 해고하시겠습니까?`)) {
              fireEmployee(emp.id)
            }
          }}
          className="text-[10px]"
        >
          해고
        </RetroButton>
      </div>

      {/* Growth Log */}
      {recentLog.length > 0 && (
        <div className="win-inset bg-white p-2">
          <div className="font-bold text-[10px] mb-1">최근 활동</div>
          <div className="space-y-0.5">
            {recentLog.map((log, i) => (
              <div key={i} className="text-[9px] flex items-center gap-1">
                <span className="text-retro-gray">Day {log.day}</span>
                <span
                  className={
                    log.event === 'LEVEL_UP'
                      ? 'text-yellow-600'
                      : log.event === 'SKILL_UNLOCK'
                        ? 'text-purple-600'
                        : log.event === 'PRAISED'
                          ? 'text-pink-500'
                          : log.event === 'SCOLDED'
                            ? 'text-red-500'
                            : 'text-blue-600'
                  }
                >
                  {log.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Bonus Summary */}
      <div className="win-inset bg-white p-2">
        <div className="font-bold text-[10px] mb-1">보너스 효과</div>
        <div className="grid grid-cols-2 gap-x-2 text-[9px]">
          <div>
            수익률 +{(emp.bonus.driftBoost * 100).toFixed(1)}%
          </div>
          <div>
            변동성 -{(emp.bonus.volatilityReduction * 100).toFixed(1)}%
          </div>
          <div>
            거래 할인 -{(emp.bonus.tradingDiscount * 100).toFixed(0)}%
          </div>
          <div>
            회복 +{emp.bonus.staminaRecovery}
          </div>
        </div>
      </div>
    </div>
  )
}
