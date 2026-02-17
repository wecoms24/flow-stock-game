/**
 * EmployeeCardGrid
 *
 * 직원 카드 그리드 (스트레스 색상 코딩)
 */

import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

function getStressColor(stress: number): string {
  if (stress >= 80) return 'border-red-500 bg-red-900/30'
  if (stress >= 50) return 'border-yellow-500 bg-yellow-900/20'
  return 'border-green-500 bg-green-900/20'
}

function getStressIcon(stress: number): string {
  if (stress >= 80) return '😤'
  if (stress >= 50) return '😐'
  return '😊'
}

export function EmployeeCardGrid() {
  const employees = useGameStore((s) => s.player.employees)

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => (b.stress ?? 0) - (a.stress ?? 0)),
    [employees],
  )

  if (employees.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xs py-4">
        아직 채용된 직원이 없습니다
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {sortedEmployees.slice(0, 6).map((emp) => {
        const stress = emp.stress ?? 0
        const stam = emp.stamina ?? 100
        return (
          <div
            key={emp.id}
            className={`p-1.5 border text-xs ${getStressColor(stress)}`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span>{getStressIcon(stress)}</span>
              <span className="font-bold truncate text-white">{emp.name}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Lv.{emp.level ?? 1}</span>
              <span>체력 {Math.round(stam)}%</span>
            </div>
            {/* Stress bar */}
            <div className="h-1 bg-gray-700 mt-0.5">
              <div
                className={`h-full transition-all ${stress >= 80 ? 'bg-red-500' : stress >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${stress}%` }}
              />
            </div>
          </div>
        )
      })}
      {employees.length > 6 && (
        <div className="p-1.5 text-center text-[10px] text-gray-500">
          +{employees.length - 6}명 더
        </div>
      )}
    </div>
  )
}
