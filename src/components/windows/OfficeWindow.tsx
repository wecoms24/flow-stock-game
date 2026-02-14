import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { IsometricOffice } from './IsometricOffice'
import type { EmployeeRole } from '../../types'
import { EMPLOYEE_ROLE_CONFIG } from '../../types'

const HIRE_ROLES: EmployeeRole[] = ['intern', 'analyst', 'trader', 'manager', 'ceo']

export function OfficeWindow() {
  const { player, time, companies, hireEmployee, fireEmployee, difficultyConfig } = useGameStore()

  const totalStockValue = Object.values(player.portfolio).reduce((sum, pos) => {
    const company = companies.find((c) => c.id === pos.companyId)
    return sum + (company ? company.price * pos.shares : 0)
  }, 0)

  return (
    <div className="text-xs p-1 space-y-2 overflow-y-auto h-full">
      {/* Header */}
      <div className="text-center">
        <div className="text-sm font-bold">사무실</div>
        <div className="text-retro-gray text-[10px]">
          {time.year}년 {time.month}월 | 월 지출: {player.monthlyExpenses.toLocaleString()}원
        </div>
      </div>

      {/* Isometric Office View */}
      <div className="win-inset bg-white" style={{ height: 140 }}>
        <IsometricOffice employees={player.employees} />
      </div>

      {/* Financial Summary */}
      <div className="win-inset bg-white p-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
        <span className="text-retro-gray">보유 현금:</span>
        <span className="text-right">{player.cash.toLocaleString()}원</span>
        <span className="text-retro-gray">주식 평가:</span>
        <span className="text-right">{totalStockValue.toLocaleString()}원</span>
        <span className="text-retro-gray">총 자산:</span>
        <span className="text-right font-bold">{player.totalAssetValue.toLocaleString()}원</span>
      </div>

      {/* Employee List */}
      <div className="space-y-1">
        <div className="font-bold">직원 ({player.employees.length}명)</div>

        {player.employees.length === 0 ? (
          <div className="text-retro-gray text-center py-2">
            직원이 없습니다. 아래에서 고용하세요.
          </div>
        ) : (
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {player.employees.map((emp) => {
              const staminaColor =
                emp.stamina > 60 ? 'bg-retro-green' : emp.stamina > 20 ? 'bg-retro-yellow' : 'bg-retro-red'
              return (
                <div key={emp.id} className="win-inset bg-white p-1 flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold truncate">{emp.name}</span>
                      <span className="text-retro-gray text-[10px]">
                        {EMPLOYEE_ROLE_CONFIG[emp.role].title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-retro-gray/30 relative">
                        <div
                          className={`h-full ${staminaColor}`}
                          style={{ width: `${emp.stamina}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-retro-gray">
                        {Math.round(emp.stamina)}%
                      </span>
                      <span className="text-[10px] text-retro-gray ml-auto">
                        {emp.salary.toLocaleString()}원/월
                      </span>
                    </div>
                  </div>
                  <RetroButton
                    size="sm"
                    variant="danger"
                    onClick={() => fireEmployee(emp.id)}
                    title="해고"
                  >
                    X
                  </RetroButton>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hire Panel */}
      <div className="space-y-1">
        <div className="font-bold">고용하기</div>
        <div className="space-y-0.5">
          {HIRE_ROLES.map((role) => {
            const config = EMPLOYEE_ROLE_CONFIG[role]
            const salary = Math.round(config.baseSalary * difficultyConfig.employeeSalaryMultiplier)
            const canAfford = player.cash >= salary * 3

            return (
              <div key={role} className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <span className="font-bold">{config.title}</span>
                  <span className="text-retro-gray text-[10px] ml-1">
                    {salary.toLocaleString()}원/월
                  </span>
                </div>
                <RetroButton
                  size="sm"
                  variant="primary"
                  onClick={() => hireEmployee(role)}
                  disabled={!canAfford}
                  title={canAfford ? '고용' : `3개월치 (${(salary * 3).toLocaleString()}원) 필요`}
                >
                  고용
                </RetroButton>
              </div>
            )
          })}
        </div>
        <div className="text-[10px] text-retro-gray">
          * 고용 시 3개월치 월급 이상의 현금이 필요합니다
        </div>
      </div>
    </div>
  )
}
