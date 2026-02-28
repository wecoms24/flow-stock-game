import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import { generateEndgameRecap } from '../../engines/endgameRecapEngine'
import type { EndgameRecap } from '../../types/endgame'

type RecapTab = 'summary' | 'timeline' | 'employees' | 'competitors'

const STYLE_LABELS: Record<string, string> = {
  aggressive: '공격형 투자자',
  balanced: '균형형 투자자',
  conservative: '안정형 투자자',
  dividend: '배당형 투자자',
}

const ENDING_ICONS: Record<string, string> = {
  billionaire: '💰',
  legend: '⭐',
  retirement: '🏖️',
  survivor: '🛡️',
  bankrupt: '💀',
}

function formatMoney(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toFixed(1)}조원`
  }
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`
  }
  if (Math.abs(amount) >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만원`
  }
  return `${amount.toLocaleString()}원`
}

export function EndingScreen() {
  const { endingResult, player, time, config, startGame, competitors, employeeBios, realizedTrades, monthlyCashFlowSummaries, companies } = useGameStore()
  const [tab, setTab] = useState<RecapTab>('summary')

  const recap: EndgameRecap | null = useMemo(() => {
    if (!endingResult) return null
    return generateEndgameRecap({
      player,
      config,
      time,
      competitors,
      companies,
      employeeBios,
      realizedTrades: realizedTrades ?? [],
      monthlyCashFlowSummaries: monthlyCashFlowSummaries ?? [],
    })
  }, [endingResult, player, config, time, competitors, companies, employeeBios, realizedTrades, monthlyCashFlowSummaries])

  if (!endingResult || !recap) return null

  const returnRate = recap.totalROI

  const handleShare = () => {
    const text = [
      `🎮 Retro Stock OS — ${recap.playYears}년 회고`,
      ``,
      `📊 ${endingResult.title}`,
      `최종 자산: ${formatMoney(recap.finalAssets)}`,
      `총 수익률: ${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(1)}%`,
      `투자 스타일: ${STYLE_LABELS[recap.investmentStyle] ?? recap.investmentStyle}`,
      `순위: ${recap.playerRank}등 / ${recap.competitorResults.length + 1}명`,
      ``,
      recap.headlines[0] ?? '',
    ].join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[20000]">
      <RetroPanel className="p-1 max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Title bar */}
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold flex items-center gap-2">
          <span>{ENDING_ICONS[endingResult.type] ?? '📊'}</span>
          <span>회사 회고록 ({config.startYear}-{time.year})</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-win-shadow bg-win-bg">
          {([
            ['summary', '📊 요약'],
            ['timeline', '📅 타임라인'],
            ['employees', '👥 직원들'],
            ['competitors', '⚔️ 라이벌'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`px-3 py-1.5 text-xs font-bold border-r border-win-shadow ${
                tab === key
                  ? 'bg-white text-retro-dark border-b-white -mb-px'
                  : 'bg-win-bg text-retro-gray hover:bg-gray-100'
              }`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {tab === 'summary' && <SummaryTab recap={recap} endingResult={endingResult} />}
          {tab === 'timeline' && <TimelineTab recap={recap} />}
          {tab === 'employees' && <EmployeesTab recap={recap} />}
          {tab === 'competitors' && <CompetitorsTab recap={recap} />}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-center p-3 border-t border-win-shadow">
          <RetroButton variant="primary" onClick={() => startGame(config.difficulty, config.targetAsset)}>
            다시 시작
          </RetroButton>
          <RetroButton onClick={() => startGame('easy', config.targetAsset)}>Easy</RetroButton>
          <RetroButton onClick={() => startGame('normal', config.targetAsset)}>Normal</RetroButton>
          <RetroButton variant="danger" onClick={() => startGame('hard', config.targetAsset)}>
            Hard
          </RetroButton>
          <RetroButton onClick={handleShare}>📋 공유</RetroButton>
        </div>
      </RetroPanel>
    </div>
  )
}

/* ── Tab Components ── */

function SummaryTab({ recap, endingResult }: { recap: EndgameRecap; endingResult: { title: string; description: string; type: string } }) {
  return (
    <div className="space-y-3">
      {/* Main result */}
      <div className="text-center">
        <div className="text-4xl mb-1">{ENDING_ICONS[endingResult.type] ?? '📊'}</div>
        <div className="text-lg font-bold">{endingResult.title}</div>
        <div className="text-xs text-retro-gray">{endingResult.description}</div>
      </div>

      {/* Stats grid */}
      <div className="win-inset bg-white p-3 text-xs space-y-1.5">
        <StatRow label="플레이 기간" value={`${recap.startYear} ~ ${recap.endYear}년 (${recap.playYears}년)`} />
        <StatRow label="최종 자산" value={formatMoney(recap.finalAssets)} bold />
        <StatRow
          label="총 수익률"
          value={`${recap.totalROI >= 0 ? '+' : ''}${recap.totalROI.toFixed(1)}%`}
          color={recap.totalROI >= 0 ? 'text-stock-up' : 'text-stock-down'}
          bold
        />
        <StatRow label="투자 스타일" value={STYLE_LABELS[recap.investmentStyle] ?? recap.investmentStyle} />
        <StatRow label="최종 순위" value={`${recap.playerRank}등 / ${recap.competitorResults.length + 1}명`} bold />
        <StatRow label="총 거래 횟수" value={`${recap.totalTradesExecuted}회`} />
        <StatRow label="직원 수" value={`현재 ${recap.currentEmployeeCount}명 (총 ${recap.totalEmployeesEverHired}명 고용)`} />
        {recap.bestYear && (
          <StatRow label="최고의 해" value={`${recap.bestYear.year}년`} />
        )}
        {recap.worstYear && (
          <StatRow label="최악의 해" value={`${recap.worstYear.year}년`} />
        )}
      </div>

      {/* Headlines */}
      <div className="win-inset bg-[#1a1a2e] p-3 text-xs space-y-2">
        <div className="text-yellow-400 font-bold text-center text-[10px]">📰 언론 헤드라인</div>
        {recap.headlines.map((h, i) => (
          <div key={i} className="text-green-400 text-center font-mono text-[11px]">
            {h}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineTab({ recap }: { recap: EndgameRecap }) {
  if (recap.keyEvents.length === 0) {
    return <div className="text-xs text-retro-gray text-center py-8">기록된 이벤트가 없습니다</div>
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-retro-dark mb-2">📅 {recap.startYear}-{recap.endYear} 타임라인</div>
      {recap.keyEvents.map((event, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 text-xs p-1.5 rounded ${
            event.impact === 'positive'
              ? 'bg-green-50'
              : event.impact === 'negative'
                ? 'bg-red-50'
                : 'bg-gray-50'
          }`}
        >
          <span className="text-base shrink-0">{event.icon}</span>
          <div className="min-w-0">
            <div className="font-bold">
              <span className="text-retro-gray">{event.year}.{String(event.month).padStart(2, '0')}</span>
              {' '}{event.title}
            </div>
            <div className="text-retro-gray text-[10px]">{event.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmployeesTab({ recap }: { recap: EndgameRecap }) {
  if (recap.starEmployees.length === 0) {
    return <div className="text-xs text-retro-gray text-center py-8">직원이 없습니다</div>
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-retro-dark">
        👥 함께한 직원들 (총 {recap.totalEmployeesEverHired}명 중 상위 기여자)
      </div>

      {recap.longestTenureEmployee && (
        <div className="win-inset bg-yellow-50 p-2 text-xs">
          💎 최장 근속: <strong>{recap.longestTenureEmployee.name}</strong> ({Math.floor(recap.longestTenureEmployee.months / 12)}년 {recap.longestTenureEmployee.months % 12}개월)
        </div>
      )}

      {recap.starEmployees.map((emp) => (
        <div key={emp.id} className="win-inset bg-white p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm">{emp.name}</span>
              <span className="text-xs text-retro-gray ml-1">
                ({
                  ({ analyst: '애널리스트', trader: '트레이더', manager: '매니저', intern: '인턴', ceo: 'CEO', hr_manager: 'HR매니저' } as Record<string, string>)[emp.role] ?? emp.role
                })
              </span>
            </div>
            <div className="text-xs text-retro-gray">
              Lv.{emp.finalLevel} / {Math.floor(emp.monthsEmployed / 12)}년 근무
            </div>
          </div>

          <div className="text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-retro-gray">수익 기여:</span>
              <span className={emp.totalPnlContribution >= 0 ? 'text-stock-up font-bold' : 'text-stock-down font-bold'}>
                {emp.totalPnlContribution >= 0 ? '+' : ''}{formatMoney(emp.totalPnlContribution)}
              </span>
            </div>
            {emp.bestTradeTicker && (
              <div className="flex justify-between">
                <span className="text-retro-gray">최고 거래:</span>
                <span className="text-stock-up">{emp.bestTradeTicker} (+{formatMoney(emp.bestTradeProfit)})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-retro-gray">마일스톤:</span>
              <span>{emp.milestoneCount}개 달성</span>
            </div>
          </div>

          <div className="bg-blue-50 p-2 rounded text-xs italic text-retro-dark border-l-2 border-blue-300">
            "{emp.testimonial}"
          </div>
        </div>
      ))}
    </div>
  )
}

function CompetitorsTab({ recap }: { recap: EndgameRecap }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-retro-dark">⚔️ 최종 순위</div>

      {/* Player rank */}
      <div className="win-inset bg-yellow-50 p-2 text-xs flex items-center gap-2">
        <span className="text-xl font-bold">#{recap.playerRank}</span>
        <div>
          <div className="font-bold">나 (플레이어)</div>
          <div className={recap.totalROI >= 0 ? 'text-stock-up' : 'text-stock-down'}>
            ROI: {recap.totalROI >= 0 ? '+' : ''}{recap.totalROI.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Competitors */}
      {recap.competitorResults.map((comp) => (
        <div key={comp.id} className="win-inset bg-white p-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-retro-gray">#{comp.rank}</span>
            <span className="text-lg">{comp.styleIcon}</span>
            <div className="flex-1">
              <div className="font-bold text-sm">{comp.name}</div>
              <div className="text-[10px] text-retro-gray">
                {comp.style === 'aggressive' ? '공격형' : comp.style === 'conservative' ? '안정형' : comp.style === 'trend-follower' ? '추세추종' : '역발상'}
              </div>
            </div>
            <div className={`text-sm font-bold ${comp.roi >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
              {comp.roi >= 0 ? '+' : ''}{comp.roi.toFixed(1)}%
            </div>
          </div>

          <div className="flex justify-between text-xs text-retro-gray">
            <span>대결 전적: {comp.headToHeadWins}승 {comp.headToHeadLosses}패</span>
            <span>
              {comp.headToHeadWins > comp.headToHeadLosses
                ? '라이벌 우세'
                : comp.headToHeadWins < comp.headToHeadLosses
                  ? '내가 우세'
                  : '호각'}
            </span>
          </div>

          <div className="bg-gray-50 p-2 rounded text-xs italic text-retro-dark border-l-2 border-gray-300">
            "{comp.finalQuote}"
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Helpers ── */

function StatRow({
  label,
  value,
  bold,
  color,
}: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-retro-gray">{label}:</span>
      <span className={`${bold ? 'font-bold' : ''} ${color ?? ''}`}>{value}</span>
    </div>
  )
}
