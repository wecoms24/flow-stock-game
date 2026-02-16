import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { AcquisitionTarget } from '../../types'

export function AcquisitionWindow() {
  const companies = useGameStore((s) => s.companies)
  const player = useGameStore((s) => s.player)
  const playerAcquireCompany = useGameStore((s) => s.playerAcquireCompany)

  const [selectedId, setSelectedId] = useState<string>('')
  const [premium, setPremium] = useState(0.3) // 30% 기본값
  const [layoffRate, setLayoffRate] = useState(0.3) // 30% 기본값
  const [showConfirm, setShowConfirm] = useState(false)

  // 인수 가능 회사 목록 계산
  const acquisitionTargets = useMemo<AcquisitionTarget[]>(() => {
    const activeCompanies = companies.filter((c) => c.status === 'active')
    if (activeCompanies.length < 2) return []

    // 시가총액 정렬
    const sorted = [...activeCompanies].sort((a, b) => b.marketCap - a.marketCap)
    const medianIndex = Math.floor(sorted.length * 0.5)

    // 타깃 조건: 시총 하위 50% + 가격 20% 이상 하락
    return sorted
      .slice(medianIndex)
      .filter((c) => {
        const priceDropRatio = 1 - c.price / c.basePrice
        return priceDropRatio >= 0.2
      })
      .map((company) => {
        const minPremium = 0.3 // 30% 최소
        const totalCost = company.marketCap * (1 + minPremium)

        // 리스크 점수 계산 (0-100)
        const debtRisk = Math.min(100, (company.financials.debtRatio / 3.0) * 50)
        const profitRisk = company.financials.netIncome < 0 ? 30 : 0
        const volatilityRisk = Math.min(20, company.volatility * 100)
        const riskScore = Math.round(debtRisk + profitRisk + volatilityRisk)

        // 시너지 점수 계산 (0-100)
        const growthSynergy = Math.min(50, company.financials.growthRate * 100)
        const sectorSynergy = 30 // 섹터 다각화 기본값
        const scaleSynergy = Math.min(20, (company.marketCap / 100_000_000_000) * 20)
        const synergy = Math.round(growthSynergy + sectorSynergy + scaleSynergy)

        return {
          company,
          premium: minPremium,
          totalCost,
          riskScore: Math.min(100, Math.max(0, riskScore)),
          synergy: Math.min(100, Math.max(0, synergy)),
          expectedLayoffRate: company.layoffRateOnAcquisition ?? 0.3,
        }
      })
  }, [companies])

  const selectedTarget = acquisitionTargets.find((t) => t.company.id === selectedId)

  // 실제 인수 비용 (프리미엄 조정)
  const actualCost = selectedTarget ? selectedTarget.company.marketCap * (1 + premium) : 0
  const canAfford = player.cash >= actualCost

  // 인수 실행
  const handleAcquire = () => {
    if (!selectedTarget || !canAfford) return
    setShowConfirm(false)
    playerAcquireCompany(selectedTarget.company.id, premium, layoffRate)
  }

  // 리스크/시너지 색상
  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getSynergyColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex h-full bg-retro-gray/5">
      {/* 좌측: 인수 대상 목록 */}
      <div className="w-1/2 border-r-2 border-retro-gray flex flex-col">
        <div className="border-b-2 border-retro-gray bg-retro-bg px-2 py-1">
          <span className="font-bold text-xs">인수 가능 기업 ({acquisitionTargets.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {acquisitionTargets.length === 0 ? (
            <div className="p-4 text-center text-xs text-retro-gray">
              현재 인수 가능한 기업이 없습니다.
              <br />
              (조건: 시총 하위 50% + 가격 20% 이상 하락)
            </div>
          ) : (
            acquisitionTargets.map((target) => {
              const isSelected = target.company.id === selectedId
              const priceDropPct =
                ((target.company.basePrice - target.company.price) / target.company.basePrice) *
                100

              return (
                <div
                  key={target.company.id}
                  className={`cursor-pointer border-b border-retro-gray/20 p-2 hover:bg-retro-gray/10 ${
                    isSelected ? 'bg-win-title-active text-white' : ''
                  }`}
                  onClick={() => setSelectedId(target.company.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">{target.company.ticker}</span>
                      <span className="text-[10px] opacity-70">{target.company.name}</span>
                    </div>
                    <span className="text-[9px] px-1 bg-red-500 text-white rounded">
                      -{priceDropPct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex gap-2 text-[9px]">
                    <span className={getRiskColor(target.riskScore)}>
                      리스크: {target.riskScore}
                    </span>
                    <span className={getSynergyColor(target.synergy)}>
                      시너지: {target.synergy}
                    </span>
                  </div>

                  <div className="text-[9px] opacity-70 mt-0.5">
                    시총: {(target.company.marketCap / 100_000_000).toFixed(0)}억
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 우측: 상세 정보 및 인수 조건 */}
      <div className="w-1/2 flex flex-col">
        {!selectedTarget ? (
          <div className="flex-1 flex items-center justify-center text-xs text-retro-gray">
            좌측에서 인수 대상을 선택하세요
          </div>
        ) : (
          <>
            {/* 기업 정보 헤더 */}
            <div className="border-b-2 border-retro-gray bg-retro-bg px-2 py-1">
              <div className="font-bold text-xs">{selectedTarget.company.name}</div>
              <div className="text-[10px] text-retro-gray">{selectedTarget.company.ticker}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* 재무 정보 */}
              <div className="border border-retro-gray p-2">
                <div className="font-bold text-[10px] mb-1 border-b border-retro-gray pb-1">
                  📊 재무 정보
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div>
                    매출:{' '}
                    <span className="font-bold">
                      {selectedTarget.company.financials.revenue.toFixed(0)}억
                    </span>
                  </div>
                  <div>
                    순이익:{' '}
                    <span
                      className={`font-bold ${selectedTarget.company.financials.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {selectedTarget.company.financials.netIncome >= 0 ? '+' : ''}
                      {selectedTarget.company.financials.netIncome.toFixed(0)}억
                    </span>
                  </div>
                  <div>
                    부채비율:{' '}
                    <span className="font-bold">
                      {selectedTarget.company.financials.debtRatio.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    성장률:{' '}
                    <span className="font-bold">
                      {(selectedTarget.company.financials.growthRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 실사 평가 */}
              <div className="border border-retro-gray p-2">
                <div className="font-bold text-[10px] mb-1 border-b border-retro-gray pb-1">
                  🔍 실사 평가 (Due Diligence)
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span>리스크 점수:</span>
                    <span className={`font-bold ${getRiskColor(selectedTarget.riskScore)}`}>
                      {selectedTarget.riskScore} / 100
                    </span>
                  </div>
                  <div className="h-1.5 bg-retro-gray/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${selectedTarget.riskScore >= 70 ? 'bg-red-500' : selectedTarget.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${selectedTarget.riskScore}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] mt-2">
                    <span>시너지 점수:</span>
                    <span className={`font-bold ${getSynergyColor(selectedTarget.synergy)}`}>
                      {selectedTarget.synergy} / 100
                    </span>
                  </div>
                  <div className="h-1.5 bg-retro-gray/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${selectedTarget.synergy >= 70 ? 'bg-green-500' : selectedTarget.synergy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${selectedTarget.synergy}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 text-[9px] text-retro-gray">
                  {selectedTarget.riskScore >= 70 && '⚠️ 고위험: 부채비율 높음, 수익성 악화'}
                  {selectedTarget.riskScore >= 40 &&
                    selectedTarget.riskScore < 70 &&
                    '⚡ 중위험: 재무 안정성 주의 필요'}
                  {selectedTarget.riskScore < 40 && '✅ 저위험: 재무 상태 양호'}
                </div>
              </div>

              {/* 인수 조건 설정 */}
              <div className="border border-retro-gray p-2">
                <div className="font-bold text-[10px] mb-2 border-b border-retro-gray pb-1">
                  ⚙️ 인수 조건 설정
                </div>

                {/* 프리미엄 슬라이더 */}
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span>인수 프리미엄:</span>
                    <span className="font-bold">{(premium * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="60"
                    step="5"
                    value={premium * 100}
                    onChange={(e) => setPremium(Number(e.target.value) / 100)}
                    className="w-full h-2 bg-retro-gray/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-retro-gray mt-0.5">
                    <span>30% (최소)</span>
                    <span>60% (최대)</span>
                  </div>
                </div>

                {/* 구조조정 계획 */}
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span>구조조정 (해고율):</span>
                    <span className="font-bold">{(layoffRate * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="10"
                    value={layoffRate * 100}
                    onChange={(e) => setLayoffRate(Number(e.target.value) / 100)}
                    className="w-full h-2 bg-retro-gray/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-retro-gray mt-0.5">
                    <span>0% (유지)</span>
                    <span>60% (대규모)</span>
                  </div>
                  <div className="text-[9px] text-retro-gray mt-1">
                    예상 해고: 약{' '}
                    {Math.round((selectedTarget.company.headcount ?? 0) * layoffRate).toLocaleString()}명
                  </div>
                </div>
              </div>

              {/* 비용 요약 */}
              <div className="border-2 border-win-title-active bg-win-title-active/5 p-2">
                <div className="font-bold text-[10px] mb-2">💰 인수 비용</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>기업 시가총액:</span>
                    <span>{(selectedTarget.company.marketCap / 100_000_000).toFixed(0)}억 원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>인수 프리미엄 ({(premium * 100).toFixed(0)}%):</span>
                    <span>
                      +{((selectedTarget.company.marketCap * premium) / 100_000_000).toFixed(0)}억 원
                    </span>
                  </div>
                  <div className="border-t border-retro-gray pt-1 flex justify-between font-bold text-[11px]">
                    <span>총 인수 비용:</span>
                    <span className={canAfford ? 'text-green-600' : 'text-red-600'}>
                      {(actualCost / 100_000_000).toFixed(0)}억 원
                    </span>
                  </div>
                  <div className="flex justify-between text-retro-gray">
                    <span>보유 현금:</span>
                    <span>{(player.cash / 100_000_000).toFixed(0)}억 원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="border-t-2 border-retro-gray p-2">
              <RetroButton
                onClick={() => setShowConfirm(true)}
                disabled={!canAfford}
                className="w-full"
              >
                {canAfford ? '🤝 인수 제안' : '💸 현금 부족'}
              </RetroButton>
            </div>
          </>
        )}
      </div>

      {/* 확인 다이얼로그 */}
      {showConfirm && selectedTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-retro-bg border-4 border-retro-gray w-96 shadow-retro">
            <div className="bg-win-title-active text-white px-2 py-1 font-bold text-xs flex justify-between items-center">
              <span>⚠️ 인수 최종 확인</span>
              <button onClick={() => setShowConfirm(false)} className="hover:bg-white/20 px-1">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs">
                <p className="font-bold mb-2">{selectedTarget.company.name} 인수를 진행하시겠습니까?</p>
                <div className="space-y-1 text-[10px] text-retro-gray">
                  <div>• 인수 비용: {(actualCost / 100_000_000).toFixed(0)}억 원</div>
                  <div>• 프리미엄: {(premium * 100).toFixed(0)}%</div>
                  <div>
                    • 예상 해고: 약{' '}
                    {Math.round((selectedTarget.company.headcount ?? 0) * layoffRate).toLocaleString()}
                    명 ({(layoffRate * 100).toFixed(0)}%)
                  </div>
                  <div className="mt-2 text-red-600">
                    ⚠️ 인수 후 되돌릴 수 없으며, 시장 반응이 부정적일 수 있습니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <RetroButton onClick={handleAcquire} className="flex-1">
                  ✅ 확정
                </RetroButton>
                <RetroButton onClick={() => setShowConfirm(false)} className="flex-1">
                  ❌ 취소
                </RetroButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
