import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { EmptyState } from '../ui/EmptyState'
import { CompetitorPortrait } from '../ui/CompetitorPortrait'
import { formatMoney } from '../../utils/formatMoney'
import { SPY_CONFIG } from '../../config/spyConfig'
import { canStartMission, getMissionCost } from '../../engines/spyEngine'
import type { SpyMissionTier, SpyIntel, SpyMission } from '../../types/spy'
import type { TradingStyle } from '../../types'

/* ── Constants ── */
const TIER_LABELS: Record<SpyMissionTier, string> = {
  basic: '기본 정탐',
  advanced: '정밀 정탐',
  deep: '심층 정탐',
}

const TIER_DESCRIPTIONS: Record<SpyMissionTier, string> = {
  basic: '포트폴리오 구성만 확인',
  advanced: '포트폴리오 + 최근 거래 + 총 자산',
  deep: '모든 정보 + 전략 분석',
}

const TIER_COLORS: Record<SpyMissionTier, string> = {
  basic: 'bg-blue-500',
  advanced: 'bg-purple-500',
  deep: 'bg-red-500',
}

const STYLE_LABELS: Record<TradingStyle, string> = {
  aggressive: '공격형',
  conservative: '안정형',
  'trend-follower': '추세형',
  contrarian: '역발상형',
}

const STATUS_LABELS: Record<SpyMission['status'], string> = {
  in_progress: '진행 중',
  success: '성공',
  failed: '실패',
  lawsuit: '소송 발생',
}

const STATUS_COLORS: Record<SpyMission['status'], string> = {
  in_progress: 'text-blue-600',
  success: 'text-green-600',
  failed: 'text-red-500',
  lawsuit: 'text-red-700',
}

type TabId = 'target' | 'missions' | 'intel'

export function SpyWindow() {
  const competitors = useGameStore((s) => s.competitors)
  const spyMissions = useGameStore((s) => s.spyMissions)
  const spyIntel = useGameStore((s) => s.spyIntel)
  const currentTick = useGameStore((s) => s.currentTick)
  const playerCash = useGameStore((s) => s.player.cash)
  const companies = useGameStore((s) => s.companies)
  const startSpyMission = useGameStore((s) => s.startSpyMission)

  const [activeTab, setActiveTab] = useState<TabId>('target')
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<SpyMissionTier>('basic')
  const [expandedIntelId, setExpandedIntelId] = useState<string | null>(null)

  // 경쟁사별 마지막 정탐 시간
  const lastMissionByTarget = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of spyMissions) {
      if (!map[m.targetCompetitorId] || m.startTick > map[m.targetCompetitorId]) {
        map[m.targetCompetitorId] = m.startTick
      }
    }
    return map
  }, [spyMissions])

  // 진행 중 미션
  const activeMissions = useMemo(
    () => spyMissions.filter((m) => m.status === 'in_progress'),
    [spyMissions],
  )

  // 완료된 미션 (최근 20개)
  const completedMissions = useMemo(
    () =>
      spyMissions
        .filter((m) => m.status !== 'in_progress')
        .sort((a, b) => b.startTick - a.startTick)
        .slice(0, 20),
    [spyMissions],
  )

  // 유효한 인텔 (만료되지 않은)
  const validIntel = useMemo(
    () =>
      spyIntel
        .filter((i) => i.expiresAt > currentTick)
        .sort((a, b) => b.obtainedAt - a.obtainedAt),
    [spyIntel, currentTick],
  )

  const getCompetitorName = (id: string) => {
    return competitors.find((c) => c.id === id)?.name ?? '알 수 없음'
  }

  const getCompetitorStyle = (id: string): TradingStyle | undefined => {
    return competitors.find((c) => c.id === id)?.style
  }

  const getCompanyName = (id: string) => {
    return companies.find((c) => c.id === id)?.name ?? id
  }

  const handleStartMission = () => {
    if (!selectedCompetitorId) return
    startSpyMission(selectedCompetitorId, selectedTier)
  }

  const missionCheck = useMemo(() => {
    if (!selectedCompetitorId) return { canStart: false, reason: '대상을 선택하세요' }
    return canStartMission(spyMissions, selectedCompetitorId, currentTick)
  }, [selectedCompetitorId, spyMissions, currentTick])

  const cost = getMissionCost(selectedTier)
  const canAfford = playerCash >= cost

  /* ── Tab: 타겟 선택 ── */
  function renderTargetTab() {
    if (competitors.length === 0) {
      return (
        <EmptyState
          icon="🕵️"
          title="경쟁사가 없습니다"
          description="게임 시작 시 경쟁사를 활성화해야 스파이 시스템을 사용할 수 있습니다."
        />
      )
    }

    return (
      <div className="flex flex-col gap-2 p-2">
        {/* 경쟁사 목록 */}
        <div className="text-[10px] font-bold text-retro-gray mb-1">정탐 대상 선택</div>
        <div className="flex flex-col gap-1">
          {competitors.map((comp) => {
            const isSelected = selectedCompetitorId === comp.id
            const lastTick = lastMissionByTarget[comp.id]
            return (
              <button
                key={comp.id}
                onClick={() => setSelectedCompetitorId(comp.id)}
                className={`flex items-center gap-2 p-1.5 border text-left text-[10px] transition-colors ${
                  isSelected
                    ? 'border-win-highlight bg-win-highlight/10'
                    : 'border-retro-gray/30 hover:bg-retro-gray/5'
                }`}
              >
                <CompetitorPortrait
                  style={comp.style}
                  mood={comp.roi > 0 ? 'winning' : comp.roi < -10 ? 'panic' : 'normal'}
                  size={24}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{comp.name}</div>
                  <div className="text-retro-gray/60">
                    {STYLE_LABELS[comp.style]} | ROI: {comp.roi >= 0 ? '+' : ''}{comp.roi.toFixed(1)}%
                  </div>
                </div>
                <div className="text-retro-gray/50 text-[9px] shrink-0">
                  {lastTick ? `마지막: ${currentTick - lastTick}h전` : '미정탐'}
                </div>
              </button>
            )
          })}
        </div>

        {/* 티어 선택 */}
        {selectedCompetitorId && (
          <div className="mt-2 border-t border-retro-gray/20 pt-2">
            <div className="text-[10px] font-bold text-retro-gray mb-1">정탐 등급 선택</div>
            <div className="flex gap-1">
              {(['basic', 'advanced', 'deep'] as SpyMissionTier[]).map((tier) => {
                const tierConfig = SPY_CONFIG.TIERS[tier]
                const isActive = selectedTier === tier
                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`flex-1 p-1.5 border text-[9px] transition-colors ${
                      isActive
                        ? 'border-win-highlight bg-win-highlight/10 font-bold'
                        : 'border-retro-gray/30 hover:bg-retro-gray/5'
                    }`}
                  >
                    <div className={`text-white text-center text-[8px] px-1 py-0.5 mb-1 ${TIER_COLORS[tier]}`}>
                      {TIER_LABELS[tier]}
                    </div>
                    <div className="text-retro-gray/70">{TIER_DESCRIPTIONS[tier]}</div>
                    <div className="font-bold mt-0.5">{formatMoney(tierConfig.cost)}원</div>
                    <div className="text-retro-gray/50">
                      소요: {tierConfig.duration}h | 실패: {(tierConfig.failRate * 100).toFixed(0)}%
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 발주 버튼 */}
            <div className="flex items-center justify-between mt-2 p-1.5 bg-retro-gray/5 border border-retro-gray/20">
              <div className="text-[10px]">
                <span className="font-bold">{getCompetitorName(selectedCompetitorId)}</span>
                <span className="text-retro-gray/60 ml-1">{TIER_LABELS[selectedTier]}</span>
                <span className="ml-2 font-bold">{formatMoney(cost)}원</span>
              </div>
              <RetroButton
                size="sm"
                variant="primary"
                onClick={handleStartMission}
                disabled={!missionCheck.canStart || !canAfford}
              >
                정탐 발주
              </RetroButton>
            </div>
            {!missionCheck.canStart && missionCheck.reason && (
              <div className="text-[9px] text-red-500 mt-1">{missionCheck.reason}</div>
            )}
            {missionCheck.canStart && !canAfford && (
              <div className="text-[9px] text-red-500 mt-1">자금 부족</div>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ── Tab: 미션 관리 ── */
  function renderMissionsTab() {
    return (
      <div className="flex flex-col gap-2 p-2">
        {/* 진행 중 미션 */}
        <div className="text-[10px] font-bold text-retro-gray">
          진행 중 ({activeMissions.length}/{SPY_CONFIG.MAX_CONCURRENT_MISSIONS})
        </div>
        {activeMissions.length === 0 ? (
          <div className="text-[9px] text-retro-gray/50 p-2 text-center">진행 중인 미션 없음</div>
        ) : (
          activeMissions.map((mission) => (
            <div key={mission.id} className="border border-retro-gray/30 p-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold">{getCompetitorName(mission.targetCompetitorId)}</span>
                <span className={`text-white text-[8px] px-1 py-0.5 ${TIER_COLORS[mission.tier]}`}>
                  {TIER_LABELS[mission.tier]}
                </span>
              </div>
              {/* 프로그레스 바 */}
              <div className="mt-1 h-2 bg-retro-gray/20 border border-retro-gray/30">
                <div
                  className="h-full bg-win-highlight transition-all"
                  style={{ width: `${mission.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-retro-gray/60 mt-0.5">
                <span>{mission.progress.toFixed(0)}%</span>
                <span>
                  {Math.max(0, mission.duration - (currentTick - mission.startTick))}h 남음
                </span>
              </div>
            </div>
          ))
        )}

        {/* 완료된 미션 기록 */}
        <div className="text-[10px] font-bold text-retro-gray mt-2 border-t border-retro-gray/20 pt-2">
          최근 미션 기록
        </div>
        {completedMissions.length === 0 ? (
          <div className="text-[9px] text-retro-gray/50 p-2 text-center">미션 기록 없음</div>
        ) : (
          <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
            {completedMissions.map((mission) => (
              <div
                key={mission.id}
                className="flex items-center justify-between text-[9px] p-1 border border-retro-gray/10"
              >
                <span>{getCompetitorName(mission.targetCompetitorId)}</span>
                <span className={`text-white text-[8px] px-1 ${TIER_COLORS[mission.tier]}`}>
                  {TIER_LABELS[mission.tier]}
                </span>
                <span className={STATUS_COLORS[mission.status]}>
                  {STATUS_LABELS[mission.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── Tab: 정보 열람 ── */
  function renderIntelTab() {
    if (validIntel.length === 0) {
      return (
        <EmptyState
          icon="📋"
          title="수집된 정보 없음"
          description="스파이 미션을 통해 경쟁사 정보를 수집하세요."
        />
      )
    }

    return (
      <div className="flex flex-col gap-1 p-2 max-h-80 overflow-y-auto">
        {validIntel.map((intel) => {
          const isExpanded = expandedIntelId === intel.id
          const remaining = intel.expiresAt - currentTick
          const style = getCompetitorStyle(intel.targetCompetitorId)

          return (
            <div key={intel.id} className="border border-retro-gray/30">
              {/* 헤더 */}
              <button
                onClick={() => setExpandedIntelId(isExpanded ? null : intel.id)}
                className="w-full flex items-center justify-between p-1.5 text-[10px] hover:bg-retro-gray/5"
              >
                <div className="flex items-center gap-1">
                  {style && (
                    <CompetitorPortrait style={style} mood="normal" size={16} />
                  )}
                  <span className="font-bold">{getCompetitorName(intel.targetCompetitorId)}</span>
                  <span className={`text-white text-[8px] px-1 ${TIER_COLORS[intel.tier]}`}>
                    {TIER_LABELS[intel.tier]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] ${remaining < 100 ? 'text-red-500' : 'text-retro-gray/50'}`}>
                    {remaining}h 남음
                  </span>
                  <span className="text-retro-gray/40">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* 상세 정보 */}
              {isExpanded && (
                <div className="border-t border-retro-gray/20 p-1.5 text-[9px]">
                  {renderIntelDetails(intel)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderIntelDetails(intel: SpyIntel) {
    return (
      <div className="flex flex-col gap-1.5">
        {/* 총 자산 */}
        {intel.totalAssets != null && (
          <div className="flex justify-between items-center p-1 bg-retro-gray/5">
            <span className="text-retro-gray/70">총 자산</span>
            <span className="font-bold">{formatMoney(intel.totalAssets)}원</span>
          </div>
        )}

        {/* 트레이딩 스타일 */}
        {intel.tradingStyle && (
          <div className="flex justify-between items-center p-1 bg-retro-gray/5">
            <span className="text-retro-gray/70">투자 스타일</span>
            <span className="font-bold">
              {STYLE_LABELS[intel.tradingStyle as TradingStyle] ?? intel.tradingStyle}
            </span>
          </div>
        )}

        {/* 전략 설명 */}
        {intel.strategy && (
          <div className="p-1 bg-retro-gray/5">
            <div className="text-retro-gray/70 mb-0.5">전략 분석</div>
            <div className="text-retro-gray leading-relaxed">{intel.strategy}</div>
          </div>
        )}

        {/* 포트폴리오 */}
        {intel.portfolio && intel.portfolio.length > 0 && (
          <div>
            <div className="text-retro-gray/70 mb-0.5">포트폴리오</div>
            <table className="w-full text-[9px]">
              <thead>
                <tr className="bg-retro-gray/10">
                  <th className="text-left p-0.5">종목</th>
                  <th className="text-right p-0.5">수량</th>
                  <th className="text-right p-0.5">평균가</th>
                </tr>
              </thead>
              <tbody>
                {intel.portfolio.map((pos) => (
                  <tr key={pos.companyId} className="border-t border-retro-gray/10">
                    <td className="p-0.5">{getCompanyName(pos.companyId)}</td>
                    <td className="text-right p-0.5">{pos.shares.toLocaleString()}</td>
                    <td className="text-right p-0.5">{formatMoney(pos.avgPrice)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {intel.portfolio && intel.portfolio.length === 0 && (
          <div className="text-retro-gray/50 text-center p-1">보유 종목 없음</div>
        )}

        {/* 최근 거래 */}
        {intel.recentTrades && intel.recentTrades.length > 0 && (
          <div>
            <div className="text-retro-gray/70 mb-0.5">최근 거래</div>
            <div className="flex flex-col gap-0.5">
              {intel.recentTrades.map((trade, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-0.5 bg-retro-gray/5"
                >
                  <span>{getCompanyName(trade.companyId)}</span>
                  <span className={trade.action === 'buy' ? 'text-stock-up' : 'text-stock-down'}>
                    {trade.action === 'buy' ? '매수' : '매도'} {trade.amount.toLocaleString()}주
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── Render ── */
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'target', label: '대상 선택' },
    { id: 'missions', label: '미션 관리', count: activeMissions.length },
    { id: 'intel', label: '정보 열람', count: validIntel.length },
  ]

  return (
    <div className="flex flex-col h-full text-[11px]">
      {/* 탭 */}
      <div className="flex border-b border-retro-gray/30 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold transition-colors ${
              activeTab === tab.id
                ? 'bg-white border-b-2 border-win-highlight text-win-highlight'
                : 'bg-retro-gray/5 text-retro-gray/70 hover:bg-retro-gray/10'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1 text-[8px] bg-win-highlight text-white px-1 py-0.5 rounded-sm">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'target' && renderTargetTab()}
        {activeTab === 'missions' && renderMissionsTab()}
        {activeTab === 'intel' && renderIntelTab()}
      </div>
    </div>
  )
}
