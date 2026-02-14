import { useGameStore } from '../../stores/gameStore'

export function OfficeWindow() {
  const { player, time } = useGameStore()

  const totalStockValue = Object.values(player.portfolio).reduce((sum, pos) => {
    const company = useGameStore.getState().companies.find((c) => c.id === pos.companyId)
    return sum + (company ? company.price * pos.shares : 0)
  }, 0)

  const holdingCount = Object.keys(player.portfolio).length

  return (
    <div className="text-xs p-1 space-y-3">
      {/* Office header */}
      <div className="text-center">
        <div className="text-sm font-bold">🏢 나의 투자 사무실</div>
        <div className="text-retro-gray text-[10px]">
          {time.year}년 {time.month}월 {time.day}일
        </div>
      </div>

      {/* Office ASCII art */}
      <div className="win-inset bg-white p-2 text-[10px] leading-tight font-mono whitespace-pre">
{`  ╔═══════════════════════╗
  ║  ┌───┐  📊  ┌───┐   ║
  ║  │ PC│  $$  │ PC│   ║
  ║  └─┬─┘      └─┬─┘   ║
  ║  ──┴──────────┴──   ║
  ║   🪑            🪑   ║
  ║                      ║
  ║  ☕  💼  📁  🗄️    ║
  ╚═══════════════════════╝`}
      </div>

      {/* Stats */}
      <div className="space-y-1">
        <div className="font-bold">사무실 현황</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <span className="text-retro-gray">직원 수:</span>
          <span className="text-right">{player.employees.length}명</span>
          <span className="text-retro-gray">보유 종목:</span>
          <span className="text-right">{holdingCount}개</span>
          <span className="text-retro-gray">주식 평가액:</span>
          <span className="text-right">{totalStockValue.toLocaleString()}원</span>
          <span className="text-retro-gray">보유 현금:</span>
          <span className="text-right">{player.cash.toLocaleString()}원</span>
          <span className="text-retro-gray">월 지출:</span>
          <span className="text-right">{player.monthlyExpenses.toLocaleString()}원</span>
        </div>
      </div>

      <div className="text-[10px] text-retro-gray text-center">
        직원 시스템과 사무실 업그레이드는 향후 업데이트 예정
      </div>
    </div>
  )
}
