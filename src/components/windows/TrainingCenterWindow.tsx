import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { calculateTotalCost, canStartTraining, getActiveTrainingCount } from '../../engines/trainingEngine'
import type { TrainingProgram } from '../../types/training'
import type { CorporateSkill } from '../../types/corporateSkill'
import type { Employee } from '../../types'

export function TrainingCenterWindow() {
  const [mode, setMode] = useState<'programs' | 'new'>('programs')

  return (
    <div className="flex flex-col h-full text-xs relative">
      {/* Tab Bar */}
      <div className="flex gap-1 mb-2">
        <RetroButton
          onClick={() => setMode('programs')}
          size="sm"
          variant={mode === 'programs' ? 'primary' : 'default'}
        >
          📋 진행중 프로그램
        </RetroButton>
        <RetroButton
          onClick={() => setMode('new')}
          size="sm"
          variant={mode === 'new' ? 'primary' : 'default'}
        >
          ➕ 새 교육 개설
        </RetroButton>
      </div>

      {mode === 'programs' ? <ProgramList /> : <NewProgramForm onCreated={() => setMode('programs')} />}
    </div>
  )
}

/* ── Program List ── */

function ProgramList() {
  const training = useGameStore((s) => s.training)
  const corporateSkills = useGameStore((s) => s.corporateSkills)
  const employees = useGameStore((s) => s.player.employees)
  const cancelTrainingProgram = useGameStore((s) => s.cancelTrainingProgram)
  const [dialog, setDialog] = useState<{ message: string; onConfirm?: () => void } | null>(null)

  const activePrograms = training.programs.filter((p) => p.status === 'in_progress')
  const completedPrograms = training.programs.filter((p) => p.status === 'completed').slice(-5)

  const getSkillName = (skillId: string) => corporateSkills.skills[skillId]?.name ?? skillId
  const getEmployeeName = (empId: string) => employees.find((e) => e.id === empId)?.name ?? empId

  if (activePrograms.length === 0 && completedPrograms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-retro-gray">
        <div className="text-center">
          <div className="text-2xl mb-2">🏫</div>
          <div>진행중인 교육 프로그램이 없습니다</div>
          <div className="text-[10px] mt-1">새 교육 개설 탭에서 교육을 시작하세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {/* Active */}
      {activePrograms.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-green-700 mb-1">
            🔄 진행중 ({activePrograms.length})
          </div>
          {activePrograms.map((prog) => (
            <ProgramCard
              key={prog.id}
              program={prog}
              skillName={getSkillName(prog.targetSkillId)}
              getEmployeeName={getEmployeeName}
              onCancel={() => {
                setDialog({
                  message: '정말 이 교육을 취소하시겠습니까?',
                  onConfirm: () => cancelTrainingProgram(prog.id),
                })
              }}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="win-inset bg-white p-2">
        <div className="flex justify-between text-[10px]">
          <span>총 수료: {training.completedCount}회</span>
          <span>총 수료 인원: {training.totalTraineesGraduated}명</span>
        </div>
      </div>

      {/* Completed (recent) */}
      {completedPrograms.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-blue-700 mb-1">✅ 최근 수료</div>
          {completedPrograms.map((prog) => (
            <div key={prog.id} className="win-inset bg-blue-50 p-1.5 mb-1">
              <div className="flex justify-between">
                <span className="font-bold text-[10px]">{getSkillName(prog.targetSkillId)}</span>
                <span className="text-[9px] text-blue-600">수료 완료</span>
              </div>
              <div className="text-[9px] text-retro-gray">
                수강생: {prog.traineeIds.map(getEmployeeName).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retro Dialog */}
      {dialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="win-outset bg-win-face p-3 max-w-sm shadow-lg">
            <div className="text-xs whitespace-pre-line mb-3 max-h-[60vh] overflow-y-auto">{dialog.message}</div>
            <div className="flex justify-end gap-1">
              {dialog.onConfirm && (
                <RetroButton size="sm" onClick={() => { dialog.onConfirm?.(); setDialog(null) }}>
                  확인
                </RetroButton>
              )}
              <RetroButton size="sm" onClick={() => setDialog(null)}>
                {dialog.onConfirm ? '취소' : '확인'}
              </RetroButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Program Card ── */

interface ProgramCardProps {
  program: TrainingProgram
  skillName: string
  getEmployeeName: (id: string) => string
  onCancel: () => void
}

function ProgramCard({ program, skillName, getEmployeeName, onCancel }: ProgramCardProps) {
  const passedCount = program.checkpoints.filter((cp) => cp.passed === true).length
  const failedCount = program.checkpoints.filter((cp) => cp.passed === false).length
  const totalCheckpoints = program.checkpoints.length

  return (
    <div className="win-inset bg-white p-2 mb-1">
      {/* Title */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-[11px]">{program.name}</div>
          <div className="text-[9px] text-retro-gray">{skillName}</div>
        </div>
        <button
          onClick={onCancel}
          className="text-[9px] text-red-600 hover:text-red-800 border border-red-300 px-1"
        >
          취소
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-1">
        <div className="flex justify-between text-[9px] mb-0.5">
          <span>진행도</span>
          <span>{Math.round(program.progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 border border-gray-400">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(100, program.progress)}%` }}
          />
        </div>
      </div>

      {/* Checkpoints */}
      <div className="flex gap-1 mb-1">
        {program.checkpoints.map((cp, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[8px] border py-0.5 ${
              cp.passed === true
                ? 'bg-green-100 border-green-400 text-green-700'
                : cp.passed === false
                  ? 'bg-red-100 border-red-400 text-red-700'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}
          >
            {cp.passed === true ? '✅' : cp.passed === false ? '❌' : '⏳'} {cp.atProgress}%
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-[9px] text-retro-gray">
        <div>수강생: {program.traineeIds.map(getEmployeeName).join(', ')}</div>
        <div>
          체크포인트: {passedCount}통과 / {failedCount}실패 / {totalCheckpoints}총
        </div>
        <div>비용: {calculateTotalCost(program).toLocaleString()}원</div>
      </div>
    </div>
  )
}

/* ── New Program Form ── */

interface NewProgramFormProps {
  onCreated: () => void
}

function NewProgramForm({ onCreated }: NewProgramFormProps) {
  const corporateSkills = useGameStore((s) => s.corporateSkills)
  const employees = useGameStore((s) => s.player.employees)
  const training = useGameStore((s) => s.training)
  const playerCash = useGameStore((s) => s.player.cash)
  const startTraining = useGameStore((s) => s.startTraining)

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([])
  const [dialogMsg, setDialogMsg] = useState<string | null>(null)

  // Skills that are unlocked and teachable
  const teachableSkills = useMemo(
    () =>
      Object.values(corporateSkills.skills).filter(
        (s) => s.unlocked,
      ),
    [corporateSkills.skills],
  )

  const selectedSkill = selectedSkillId ? corporateSkills.skills[selectedSkillId] : null

  // Eligible employees (not in training, not already learned this skill)
  const eligibleEmployees = useMemo(() => {
    if (!selectedSkillId) return []
    return employees.filter((e) => {
      const inTraining = training.programs.some(
        (p) => p.status === 'in_progress' && p.traineeIds.includes(e.id),
      )
      const alreadyLearned = e.learnedCorporateSkills?.includes(selectedSkillId)
      return !inTraining && !alreadyLearned
    })
  }, [selectedSkillId, employees, training.programs])

  const maxSeats = selectedSkill
    ? selectedSkill.tier === 1
      ? 5
      : selectedSkill.tier === 2
        ? 4
        : 3
    : 0

  const toggleTrainee = (empId: string) => {
    setSelectedTrainees((prev) => {
      if (prev.includes(empId)) return prev.filter((id) => id !== empId)
      if (prev.length >= maxSeats) return prev
      return [...prev, empId]
    })
  }

  const handleStart = () => {
    if (!selectedSkillId || selectedTrainees.length === 0) return

    const result = startTraining(selectedSkillId, selectedTrainees)
    if (result.success) {
      setSelectedSkillId(null)
      setSelectedTrainees([])
      onCreated()
    } else {
      setDialogMsg(result.reason ?? '교육을 시작할 수 없습니다.')
    }
  }

  const activeCount = getActiveTrainingCount(training)

  // Validation preview
  const validationResult = selectedSkill
    ? canStartTraining(selectedSkill, selectedTrainees, employees, training.programs, playerCash)
    : null

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {/* Active count */}
      <div className="win-inset bg-white p-2">
        <div className="text-[10px]">
          현재 진행중: <span className="font-bold">{activeCount}</span>개 프로그램
        </div>
      </div>

      {/* Skill Selection */}
      <div>
        <div className="text-[10px] font-bold mb-1">1. 교육 스킬 선택</div>
        {teachableSkills.length === 0 ? (
          <div className="win-inset bg-yellow-50 p-2 text-[10px] text-yellow-700">
            해금된 회사 스킬이 없습니다. 스킬 라이브러리에서 먼저 스킬을 해금하세요.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {teachableSkills.map((skill) => (
              <SkillSelectCard
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                onClick={() => {
                  setSelectedSkillId(skill.id)
                  setSelectedTrainees([])
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trainee Selection */}
      {selectedSkill && (
        <div>
          <div className="text-[10px] font-bold mb-1">
            2. 수강생 선택 ({selectedTrainees.length}/{maxSeats})
          </div>
          {eligibleEmployees.length === 0 ? (
            <div className="win-inset bg-yellow-50 p-2 text-[10px] text-yellow-700">
              이 스킬을 교육할 수 있는 직원이 없습니다 (이미 학습 완료 또는 다른 교육 중)
            </div>
          ) : (
            <div className="space-y-1">
              {eligibleEmployees.map((emp) => (
                <TraineeSelectCard
                  key={emp.id}
                  employee={emp}
                  isSelected={selectedTrainees.includes(emp.id)}
                  disabled={!selectedTrainees.includes(emp.id) && selectedTrainees.length >= maxSeats}
                  onClick={() => toggleTrainee(emp.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary & Start */}
      {selectedSkill && selectedTrainees.length > 0 && (
        <div className="win-inset bg-white p-2">
          <div className="text-[10px] font-bold mb-1">📋 교육 요약</div>
          <div className="text-[9px] space-y-0.5 mb-2">
            <div>
              스킬: <span className="font-bold">{selectedSkill.name}</span>
            </div>
            <div>수강생: {selectedTrainees.length}명</div>
            <div>최대 인원: {maxSeats}명</div>
            <div>
              예상 기간:{' '}
              {selectedSkill.tier === 1 ? '1주' : selectedSkill.tier === 2 ? '2주' : '3주'}
            </div>
            <div>
              비용:{' '}
              <span className="font-bold">
                {estimateCost(selectedSkill, selectedTrainees.length).toLocaleString()}원
              </span>
            </div>
          </div>

          {validationResult && !validationResult.canStart && (
            <div className="text-[9px] text-red-600 mb-1">⚠️ {validationResult.reason}</div>
          )}

          <RetroButton
            onClick={handleStart}
            size="sm"
            variant="primary"
            className="w-full"
            disabled={!validationResult?.canStart}
          >
            🎓 교육 시작
          </RetroButton>
        </div>
      )}

      {/* Retro Dialog */}
      {dialogMsg && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="win-outset bg-win-face p-3 max-w-sm shadow-lg">
            <div className="text-xs whitespace-pre-line mb-3 max-h-[60vh] overflow-y-auto">{dialogMsg}</div>
            <div className="flex justify-end">
              <RetroButton size="sm" onClick={() => setDialogMsg(null)}>
                확인
              </RetroButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function estimateCost(skill: CorporateSkill, traineeCount: number): number {
  const baseCosts: Record<number, number> = { 1: 200_000, 2: 500_000, 3: 1_000_000 }
  const perTrainee: Record<number, number> = { 1: 50_000, 2: 100_000, 3: 200_000 }
  return (baseCosts[skill.tier] ?? 500_000) + (perTrainee[skill.tier] ?? 100_000) * traineeCount
}

/* ── Skill Select Card ── */

interface SkillSelectCardProps {
  skill: CorporateSkill
  isSelected: boolean
  onClick: () => void
}

function SkillSelectCard({ skill, isSelected, onClick }: SkillSelectCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`border-2 p-1.5 cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{skill.icon}</span>
        <div>
          <div className="text-[10px] font-bold">{skill.name}</div>
          <div className="text-[9px] text-retro-gray">Tier {skill.tier}</div>
        </div>
      </div>
    </div>
  )
}

/* ── Trainee Select Card ── */

interface TraineeSelectCardProps {
  employee: Employee
  isSelected: boolean
  disabled: boolean
  onClick: () => void
}

function TraineeSelectCard({ employee, isSelected, disabled, onClick }: TraineeSelectCardProps) {
  const skills = employee.skills ?? { analysis: 30, trading: 30, research: 30 }
  const learned = employee.learnedCorporateSkills?.length ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border-2 p-1.5 cursor-pointer flex items-center justify-between ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : disabled
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
      }
    >
      <div>
        <div className="text-[10px] font-bold">{employee.name}</div>
        <div className="text-[9px] text-retro-gray">
          Lv.{employee.level ?? 1} | A:{skills.analysis} T:{skills.trading} R:{skills.research} |
          학습: {learned}개
        </div>
      </div>
      <div className="text-sm">
        {isSelected ? '☑️' : '⬜'}
      </div>
    </div>
  )
}
