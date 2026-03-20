import { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import { generateEndgameRecap } from '../../engines/endgameRecapEngine'
import { formatMoney } from '../../utils/formatMoney'
import type { EndgameRecap, SectorAnalysis } from '../../types/endgame'
import { checkMetaAchievements, loadMetaProgression } from '../../systems/metaProgressionSystem'
import { META_ACHIEVEMENTS } from '../../data/metaAchievements'
import { loadPrestige, recordPrestigeCompletion, getPrestigeStars } from '../../systems/prestigeSystem'
import type { CorporateSkill } from '../../types/corporateSkill'

type RecapTab = 'summary' | 'timeline' | 'employees' | 'competitors' | 'analysis'

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

const SECTOR_LABELS: Record<string, string> = {
  tech: '기술',
  finance: '금융',
  energy: '에너지',
  healthcare: '헬스케어',
  consumer: '소비재',
  industrial: '산업재',
  telecom: '통신',
  materials: '소재',
  utilities: '유틸리티',
  realestate: '부동산',
}

const formatMoneyWon = (amount: number) => formatMoney(amount, { suffix: true, trillion: true })

export function EndingScreen() {
  const { endingResult, player, time, config, startGame, competitors, employeeBios, realizedTrades, monthlyCashFlowSummaries, companies, companyProfile, corporateSkills } = useGameStore()
  const [tab, setTab] = useState<RecapTab>('summary')
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [showSkillSelect, setShowSkillSelect] = useState(false)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const prestige = useMemo(() => loadPrestige(), [])

  // 해금된 Corporate Skill 목록
  const unlockedSkills: CorporateSkill[] = useMemo(() => {
    if (!corporateSkills?.skills) return []
    return Object.values(corporateSkills.skills).filter((s) => s.unlocked)
  }, [corporateSkills])

  const handleNewGamePlus = () => {
    if (unlockedSkills.length > 0) {
      setShowSkillSelect(true)
    } else {
      executeNewGamePlus(null)
    }
  }

  const executeNewGamePlus = (skillId: string | null) => {
    const totalROI = recap?.totalROI ?? 0
    const finalAssets = recap?.finalAssets ?? player.totalAssetValue
    recordPrestigeCompletion(finalAssets, totalROI, skillId)
    setShowSkillSelect(false)
    startGame(config.difficulty, config.targetAsset)
  }

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

  useEffect(() => {
    if (!recap) return
    const unlocked = checkMetaAchievements(recap, recap.decisionAnalysis)
    if (unlocked.length > 0) setNewAchievements(unlocked)
  }, [recap])

  if (!endingResult || !recap) return null

  const returnRate = recap.totalROI

  const handleShare = () => {
    const text = [
      `🎮 ${companyProfile?.logo || ''} ${companyProfile?.name || 'Retro Stock OS'} — ${recap.playYears}년 회고`,
      ``,
      `📊 ${endingResult.title}`,
      recap.oneLineStory,
      `최종 자산: ${formatMoneyWon(recap.finalAssets)}`,
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
          <span>{companyProfile?.logo || ENDING_ICONS[endingResult.type] || '📊'}</span>
          <span>{companyProfile?.name || '회사'} 회고록 ({config.startYear}-{time.year})</span>
        </div>

        {/* Meta achievement banner */}
        {newAchievements.length > 0 && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-3 py-1.5 text-xs">
            🏆 <strong>업적 해금!</strong>{' '}
            {newAchievements.map((id) => {
              const def = META_ACHIEVEMENTS.find((a) => a.id === id)
              return def ? `${def.icon} ${def.title}` : id
            }).join(', ')}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-win-shadow bg-win-bg">
          {([
            ['summary', '📊 요약'],
            ['timeline', '📅 타임라인'],
            ['employees', '👥 직원들'],
            ['competitors', '⚔️ 라이벌'],
            ['analysis', '🔍 분석'],
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
          {tab === 'competitors' && <CompetitorsTab recap={recap} companyName={companyProfile?.name} />}
          {tab === 'analysis' && <DecisionAnalysisTab recap={recap} />}
        </div>

        {/* Prestige banner */}
        {prestige.level > 0 && (
          <div className="bg-purple-50 border-b border-purple-200 px-3 py-1.5 text-xs text-center">
            {getPrestigeStars(prestige.level)} 프레스티지 Lv.{prestige.level} · 총 {prestige.totalCompletions}회 클리어
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-center p-3 border-t border-win-shadow flex-wrap">
          <RetroButton variant="primary" onClick={handleNewGamePlus}>
            ⭐ New Game+
          </RetroButton>
          <RetroButton onClick={() => startGame(config.difficulty, config.targetAsset)}>
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

      {/* Skill Carryover Selection Modal */}
      {showSkillSelect && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[20001]">
          <RetroPanel className="p-1 max-w-lg w-full mx-4">
            <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold flex justify-between items-center">
              <span>⭐ New Game+ — 스킬 이월</span>
              <button
                onClick={() => setShowSkillSelect(false)}
                className="text-win-title-text hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-retro-gray text-center">
                이월할 기업 스킬을 1개 선택하세요.
                <br />
                선택한 스킬은 다음 게임 시작 시 자동 해금됩니다.
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {unlockedSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={`w-full text-left p-2 text-xs border rounded transition-colors ${
                      selectedSkillId === skill.id
                        ? 'border-win-highlight bg-win-highlight/10 font-bold'
                        : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{skill.icon}</span>
                      <div>
                        <div className="font-semibold">{skill.name}</div>
                        <div className="text-[10px] text-retro-gray">{skill.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-xs text-center text-retro-gray">
                프레스티지 Lv.{prestige.level + 1} — 초기 자본 +{Math.min((prestige.level + 1) * 5, 50)}%
              </div>

              <div className="flex gap-2 justify-center">
                <RetroButton
                  variant="primary"
                  onClick={() => executeNewGamePlus(selectedSkillId)}
                >
                  {selectedSkillId ? '스킬 이월하고 시작' : '스킬 없이 시작'}
                </RetroButton>
                <RetroButton onClick={() => setShowSkillSelect(false)}>취소</RetroButton>
              </div>
            </div>
          </RetroPanel>
        </div>
      )}
    </div>
  )
}

/* ── Tab Components ── */

function SummaryTab({ recap, endingResult }: { recap: EndgameRecap; endingResult: { title: string; description: string; type: string } }) {
  return (
    <div className="space-y-3">
      {/* One-line story banner */}
      <div className="win-inset bg-[#1a1a2e] p-3 text-center">
        <div className="text-green-400 font-mono text-[11px] leading-relaxed">
          {recap.oneLineStory}
        </div>
      </div>

      {/* Main result */}
      <div className="text-center">
        <div className="text-4xl mb-1">{ENDING_ICONS[endingResult.type] ?? '📊'}</div>
        <div className="text-lg font-bold">{endingResult.title}</div>
        <div className="text-xs text-retro-gray">{endingResult.description}</div>
      </div>

      {/* Stats grid */}
      <div className="win-inset bg-white p-3 text-xs space-y-1.5">
        <StatRow label="플레이 기간" value={`${recap.startYear} ~ ${recap.endYear}년 (${recap.playYears}년)`} />
        <StatRow label="최종 자산" value={formatMoneyWon(recap.finalAssets)} bold />
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
  if (recap.keyEvents.length === 0 && recap.assetCurve.length === 0) {
    return <div className="text-xs text-retro-gray text-center py-8">기록된 이벤트가 없습니다</div>
  }

  // ASCII bar chart from assetCurve (yearly max)
  const yearlyAssets = new Map<number, number>()
  for (const point of recap.assetCurve) {
    const existing = yearlyAssets.get(point.year) ?? 0
    yearlyAssets.set(point.year, Math.max(existing, point.cash))
  }
  const yearEntries = Array.from(yearlyAssets.entries()).sort((a, b) => a[0] - b[0])
  const maxAsset = Math.max(...yearEntries.map(([, v]) => v), 1)

  // Turning point years for highlighting
  const turningPointYears = new Set(recap.turningPoints.map((tp) => tp.year))

  return (
    <div className="space-y-3">
      {/* Asset curve */}
      {yearEntries.length > 0 && (
        <div className="win-inset bg-white p-2">
          <div className="text-xs font-bold text-retro-dark mb-1">📈 현금 추이</div>
          <div className="font-mono text-[10px] space-y-0.5">
            {yearEntries.map(([year, assets]) => {
              const barLen = Math.max(1, Math.round((assets / maxAsset) * 30))
              const isTurningPoint = turningPointYears.has(year)
              return (
                <div key={year} className="flex items-center gap-1">
                  <span className="text-retro-gray w-8 text-right">{year}</span>
                  <span className={isTurningPoint ? 'text-yellow-500' : 'text-blue-500'}>
                    {'█'.repeat(barLen)}
                  </span>
                  {isTurningPoint && <span className="text-yellow-500">★</span>}
                  <span className="text-retro-gray text-[9px]">{formatMoneyWon(assets)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Turning points */}
      {recap.turningPoints.length > 0 && (
        <div className="win-inset bg-yellow-50 p-2">
          <div className="text-xs font-bold text-retro-dark mb-1">⭐ 전환점</div>
          {recap.turningPoints.map((tp, i) => (
            <div key={i} className="text-xs flex gap-1">
              <span className="text-yellow-500">★</span>
              <span>
                {tp.year > 0 ? `${tp.year}.${String(tp.month).padStart(2, '0')}` : ''} {tp.label}
                {tp.value != null ? ` (${formatMoneyWon(tp.value)})` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      <div className="text-xs font-bold text-retro-dark">📅 {recap.startYear}-{recap.endYear} 타임라인</div>
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
                {emp.totalPnlContribution >= 0 ? '+' : ''}{formatMoneyWon(emp.totalPnlContribution)}
              </span>
            </div>
            {emp.bestTradeTicker && (
              <div className="flex justify-between">
                <span className="text-retro-gray">최고 거래:</span>
                <span className="text-stock-up">{emp.bestTradeTicker} (+{formatMoneyWon(emp.bestTradeProfit)})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-retro-gray">마일스톤:</span>
              <span>
                {emp.milestoneCount >= 10 ? '💎 ' : emp.milestoneCount >= 5 ? '⭐ ' : ''}
                {emp.milestoneCount}개 달성
              </span>
            </div>
          </div>

          <div className="bg-blue-50 p-2 rounded text-xs italic text-retro-dark border-l-2 border-blue-300">
            &ldquo;{emp.testimonial}&rdquo;
          </div>
        </div>
      ))}
    </div>
  )
}

function CompetitorsTab({ recap, companyName }: { recap: EndgameRecap; companyName?: string }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-retro-dark">⚔️ 최종 순위</div>

      {/* Player rank */}
      <div className="win-inset bg-yellow-50 p-2 text-xs flex items-center gap-2">
        <span className="text-xl font-bold">#{recap.playerRank}</span>
        <div>
          <div className="font-bold">{companyName || '나'} (플레이어)</div>
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
            &ldquo;{comp.finalQuote}&rdquo;
          </div>
        </div>
      ))}
    </div>
  )
}

function DecisionAnalysisTab({ recap }: { recap: EndgameRecap }) {
  const { decisionAnalysis: analysis } = recap
  const meta = useMemo(() => loadMetaProgression(), [])

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-retro-dark">🔍 의사결정 분석</div>

      {/* Risk profile */}
      <div className="win-inset bg-white p-2.5">
        <div className="text-xs font-bold mb-1">🎯 투자 성향: {analysis.riskBehavior.label}</div>
        <div className="text-[10px] text-retro-gray space-y-0.5">
          {analysis.riskBehavior.evidence.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <span className="text-retro-gray">리스크 점수:</span>
          <div className="flex-1 bg-gray-200 h-2 rounded">
            <div
              className="h-2 rounded bg-blue-500"
              style={{ width: `${analysis.riskBehavior.riskScore}%` }}
            />
          </div>
          <span className="font-bold">{analysis.riskBehavior.riskScore}/100</span>
        </div>
      </div>

      {/* Sector breakdown */}
      <div className="win-inset bg-white p-2.5">
        <div className="text-xs font-bold mb-1">📊 섹터별 성과</div>
        {analysis.sectorBreakdown.length === 0 ? (
          <div className="text-[10px] text-retro-gray">거래 기록 없음</div>
        ) : (
          <div className="space-y-1">
            {analysis.sectorBreakdown.slice(0, 5).map((s: SectorAnalysis) => (
              <div key={s.sector} className="text-[10px] flex items-center gap-1">
                <span className="w-12 text-retro-gray">{SECTOR_LABELS[s.sector] ?? s.sector}</span>
                <div className="flex-1 bg-gray-200 h-1.5 rounded">
                  <div
                    className="h-1.5 rounded bg-blue-400"
                    style={{ width: `${Math.min(100, s.concentration * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right">{(s.concentration * 100).toFixed(0)}%</span>
                <span className={`w-14 text-right font-bold ${s.totalPnl >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                  {s.totalPnl >= 0 ? '+' : ''}{formatMoneyWon(s.totalPnl)}
                </span>
                <span className="w-10 text-right text-retro-gray">
                  승률 {(s.winRate * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timing stats */}
      <div className="win-inset bg-white p-2.5">
        <div className="text-xs font-bold mb-1">⏱️ 타이밍 분석</div>
        <div className="text-[10px] space-y-0.5">
          <StatRow label="수익 실현률" value={`${(analysis.timing.sellHighRate * 100).toFixed(0)}%`} />
          <StatRow label="위기 중 매매 비율" value={`${(analysis.timing.buyLowRate * 100).toFixed(0)}%`} />
          <StatRow label="패닉 매도 횟수" value={`${analysis.timing.panicSellCount}회`} />
          <StatRow label="위기 보유 유지" value={`${analysis.timing.panicHoldCount}회`} />
          <StatRow
            label="위기 기간 ROI"
            value={`${analysis.timing.crisisROI >= 0 ? '+' : ''}${analysis.timing.crisisROI.toFixed(1)}%`}
            color={analysis.timing.crisisROI >= 0 ? 'text-stock-up' : 'text-stock-down'}
          />
        </div>
      </div>

      {/* Personal insight */}
      <div className="win-inset bg-[#1a1a2e] p-3">
        <div className="text-yellow-400 font-bold text-[10px] mb-1">💡 인사이트</div>
        <div className="text-green-400 font-mono text-[11px] leading-relaxed">
          {analysis.personalInsight}
        </div>
      </div>

      {/* Meta achievements */}
      <div className="win-inset bg-white p-2.5">
        <div className="text-xs font-bold mb-1">🏆 업적 ({Object.values(meta.achievements).filter((a) => a.unlocked).length}/{META_ACHIEVEMENTS.length})</div>
        <div className="grid grid-cols-2 gap-1">
          {META_ACHIEVEMENTS.map((def) => {
            const achieved = meta.achievements[def.id]?.unlocked
            return (
              <div
                key={def.id}
                className={`text-[10px] p-1 rounded ${achieved ? 'bg-yellow-50' : 'bg-gray-100 opacity-50'}`}
              >
                <span>{def.icon}</span> {def.title}
              </div>
            )
          })}
        </div>
        <div className="text-[10px] text-retro-gray mt-1">
          총 플레이: {meta.totalGamesPlayed}회 | 최고 ROI: {meta.bestROI.toFixed(1)}%
        </div>
      </div>
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
