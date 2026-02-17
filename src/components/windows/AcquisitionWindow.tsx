import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { AcquisitionTarget } from '../../types'

type MnaStep = 'screening' | 'valuation' | 'diligence' | 'negotiation' | 'integration'

interface ValuationMethod {
  name: string
  value: number
  description: string
}

export function AcquisitionWindow() {
  const companies = useGameStore((s) => s.companies)
  const player = useGameStore((s) => s.player)
  const playerAcquireCompany = useGameStore((s) => s.playerAcquireCompany)

  const [currentStep, setCurrentStep] = useState<MnaStep>('screening')
  const [selectedId, setSelectedId] = useState<string>('')
  const [premium, setPremium] = useState(0.3)
  const [layoffRate, setLayoffRate] = useState(0.3)
  const [showConfirm, setShowConfirm] = useState(false)

  // 인수 가능 회사 목록 계산
  const acquisitionTargets = useMemo<AcquisitionTarget[]>(() => {
    const activeCompanies = companies.filter((c) => c.status === 'active')
    if (activeCompanies.length < 2) return []

    const sorted = [...activeCompanies].sort((a, b) => b.marketCap - a.marketCap)
    const medianIndex = Math.floor(sorted.length * 0.5)

    return sorted
      .slice(medianIndex)
      .filter((c) => {
        const priceDropRatio = 1 - c.price / c.basePrice
        return priceDropRatio >= 0.2
      })
      .map((company) => {
        const minPremium = 0.3
        const totalCost = company.marketCap * (1 + minPremium)

        // 리스크 점수 계산
        const debtRisk = Math.min(100, (company.financials.debtRatio / 3.0) * 50)
        const profitRisk = company.financials.netIncome < 0 ? 30 : 0
        const volatilityRisk = Math.min(20, company.volatility * 100)
        const riskScore = Math.round(debtRisk + profitRisk + volatilityRisk)

        // 시너지 점수 계산
        const growthSynergy = Math.min(50, company.financials.growthRate * 100)
        const sectorSynergy = 30
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
  const actualCost = selectedTarget ? selectedTarget.company.marketCap * (1 + premium) : 0
  const canAfford = player.cash >= actualCost

  // 가치평가 방법론들
  const valuationMethods = useMemo<ValuationMethod[]>(() => {
    if (!selectedTarget) return []

    const company = selectedTarget.company
    const marketCap = company.marketCap

    // DCF (현금흐름할인법)
    const dcfValue = company.financials.netIncome * 15 * 100_000_000 // 간단한 추정

    // P/E 멀티플
    const peValue = company.financials.eps * 5_000_000 * 12 // 업종 평균 PER 12 가정

    // 장부가치
    const bookValue = marketCap * 0.8 // 간단한 추정

    return [
      {
        name: 'DCF (현금흐름할인)',
        value: dcfValue,
        description: '미래 현금흐름의 현재가치',
      },
      {
        name: 'P/E 멀티플',
        value: peValue,
        description: '업종 평균 PER 적용',
      },
      {
        name: '장부가치',
        value: bookValue,
        description: '순자산 기준 평가',
      },
      {
        name: '시가총액',
        value: marketCap,
        description: '현재 시장가격',
      },
    ]
  }, [selectedTarget])

  const handleAcquire = () => {
    if (!selectedTarget || !canAfford) return
    setShowConfirm(false)
    playerAcquireCompany(selectedTarget.company.id, premium, layoffRate)
  }

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

  const steps: { id: MnaStep; label: string; icon: string }[] = [
    { id: 'screening', label: '타깃 스크리닝', icon: '🔍' },
    { id: 'valuation', label: '가치 평가', icon: '💰' },
    { id: 'diligence', label: '실사 (DD)', icon: '📊' },
    { id: 'negotiation', label: '협상', icon: '🤝' },
    { id: 'integration', label: '통합 계획', icon: '🏗️' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex flex-col h-full bg-retro-gray/5">
      {/* 상단 진행 단계 */}
      <div className="border-b-2 border-retro-gray bg-retro-bg">
        <div className="flex">
          {steps.map((step, idx) => {
            const isActive = step.id === currentStep
            const isCompleted = idx < currentStepIndex
            const isDisabled = !selectedTarget && step.id !== 'screening'

            return (
              <button
                key={step.id}
                onClick={() => !isDisabled && setCurrentStep(step.id)}
                disabled={isDisabled}
                className={`flex-1 px-2 py-1.5 text-[10px] border-r border-retro-gray transition-colors ${
                  isActive
                    ? 'bg-win-title-active text-white font-bold'
                    : isCompleted
                      ? 'bg-green-600/20 hover:bg-green-600/30'
                      : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-retro-gray/10'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm">{step.icon}</span>
                  <span>{step.label}</span>
                  {isCompleted && <span className="text-green-600">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-hidden">
        {/* 1단계: 타깃 스크리닝 */}
        {currentStep === 'screening' && (
          <div className="flex h-full">
            <div className="w-1/2 border-r-2 border-retro-gray flex flex-col">
              <div className="border-b-2 border-retro-gray bg-retro-bg px-2 py-1">
                <span className="font-bold text-xs">
                  📋 인수 후보 기업 ({acquisitionTargets.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {acquisitionTargets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-retro-gray">
                    현재 인수 가능한 기업이 없습니다.
                    <br />
                    <span className="text-[10px]">
                      (조건: 시총 하위 50% + 가격 20% 이상 하락)
                    </span>
                  </div>
                ) : (
                  acquisitionTargets.map((target) => {
                    const isSelected = target.company.id === selectedId
                    const priceDropPct =
                      ((target.company.basePrice - target.company.price) /
                        target.company.basePrice) *
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

            <div className="w-1/2 flex flex-col">
              {!selectedTarget ? (
                <div className="flex-1 flex items-center justify-center text-xs text-retro-gray">
                  좌측에서 인수 후보를 선택하세요
                </div>
              ) : (
                <>
                  <div className="border-b-2 border-retro-gray bg-retro-bg px-2 py-1">
                    <div className="font-bold text-xs">{selectedTarget.company.name}</div>
                    <div className="text-[10px] text-retro-gray">
                      {selectedTarget.company.ticker} · {selectedTarget.company.sector}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* 기업 개요 */}
                    <div className="border border-retro-gray p-2">
                      <div className="font-bold text-[10px] mb-2">🏢 기업 개요</div>
                      <div className="space-y-1 text-[9px]">
                        <div className="flex justify-between">
                          <span>현재 주가:</span>
                          <span className="font-bold">
                            {selectedTarget.company.price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>52주 최고가:</span>
                          <span>{selectedTarget.company.basePrice.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span>하락률:</span>
                          <span className="text-red-600 font-bold">
                            -
                            {(
                              ((selectedTarget.company.basePrice - selectedTarget.company.price) /
                                selectedTarget.company.basePrice) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>시가총액:</span>
                          <span className="font-bold">
                            {(selectedTarget.company.marketCap / 100_000_000).toFixed(0)}억 원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>직원 수:</span>
                          <span>{selectedTarget.company.headcount?.toLocaleString()}명</span>
                        </div>
                      </div>
                    </div>

                    {/* 주요 재무지표 */}
                    <div className="border border-retro-gray p-2">
                      <div className="font-bold text-[10px] mb-2">💵 주요 재무지표</div>
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div>
                          <div className="text-retro-gray mb-0.5">연간 매출</div>
                          <div className="font-bold">
                            {selectedTarget.company.financials.revenue.toFixed(0)}억
                          </div>
                        </div>
                        <div>
                          <div className="text-retro-gray mb-0.5">순이익</div>
                          <div
                            className={`font-bold ${selectedTarget.company.financials.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {selectedTarget.company.financials.netIncome >= 0 ? '+' : ''}
                            {selectedTarget.company.financials.netIncome.toFixed(0)}억
                          </div>
                        </div>
                        <div>
                          <div className="text-retro-gray mb-0.5">부채비율</div>
                          <div className="font-bold">
                            {selectedTarget.company.financials.debtRatio.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-retro-gray mb-0.5">성장률</div>
                          <div className="font-bold">
                            {(selectedTarget.company.financials.growthRate * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 초기 분석 */}
                    <div className="border border-retro-gray p-2">
                      <div className="font-bold text-[10px] mb-2">🎯 초기 분석</div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[9px] mb-1">
                            <span>인수 매력도:</span>
                            <span className={`font-bold ${getSynergyColor(selectedTarget.synergy)}`}>
                              {selectedTarget.synergy}/100
                            </span>
                          </div>
                          <div className="h-2 bg-retro-gray/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${selectedTarget.synergy >= 70 ? 'bg-green-500' : selectedTarget.synergy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${selectedTarget.synergy}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-[9px] text-retro-gray bg-retro-gray/10 p-2 rounded">
                          {selectedTarget.synergy >= 70
                            ? '✅ 높은 시너지 잠재력. 적극 검토 권장.'
                            : selectedTarget.synergy >= 40
                              ? '⚡ 중간 수준. 추가 실사 필요.'
                              : '⚠️ 낮은 시너지. 신중한 접근 필요.'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-retro-gray p-2">
                    <RetroButton onClick={() => setCurrentStep('valuation')} className="w-full">
                      다음 단계: 가치 평가 →
                    </RetroButton>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 2단계: 가치 평가 */}
        {currentStep === 'valuation' && selectedTarget && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="border border-retro-gray p-2">
              <div className="font-bold text-xs mb-2">
                💰 기업가치 평가 - {selectedTarget.company.name}
              </div>
              <div className="text-[10px] text-retro-gray mb-3">
                다양한 평가 방법론을 통해 적정 인수가를 산정합니다.
              </div>

              <div className="space-y-2">
                {valuationMethods.map((method, idx) => (
                  <div key={idx} className="border border-retro-gray/30 p-2 bg-retro-bg/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[10px]">{method.name}</span>
                      <span className="text-xs font-bold text-green-600">
                        {(method.value / 100_000_000).toFixed(0)}억 원
                      </span>
                    </div>
                    <div className="text-[9px] text-retro-gray">{method.description}</div>
                    <div className="mt-1 h-1.5 bg-retro-gray/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, (method.value / (selectedTarget.company.marketCap * 1.5)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t-2 border-retro-gray pt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-bold">평가 평균값:</span>
                  <span className="font-bold text-blue-600">
                    {(
                      valuationMethods.reduce((sum, m) => sum + m.value, 0) /
                      valuationMethods.length /
                      100_000_000
                    ).toFixed(0)}
                    억 원
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>현재 시가총액:</span>
                  <span>{(selectedTarget.company.marketCap / 100_000_000).toFixed(0)}억 원</span>
                </div>
              </div>
            </div>

            {/* 밸류에이션 레인지 */}
            <div className="border border-retro-gray p-2">
              <div className="font-bold text-[10px] mb-2">📊 적정 인수가 범위</div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px]">
                  <span>보수적 평가 (Low):</span>
                  <span className="font-bold">
                    {(selectedTarget.company.marketCap * 1.0) / 100_000_000}억 원
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>중간 평가 (Mid):</span>
                  <span className="font-bold text-blue-600">
                    {(selectedTarget.company.marketCap * 1.3) / 100_000_000}억 원
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>공격적 평가 (High):</span>
                  <span className="font-bold">
                    {(selectedTarget.company.marketCap * 1.6) / 100_000_000}억 원
                  </span>
                </div>
              </div>
              <div className="mt-2 text-[9px] text-retro-gray bg-blue-500/10 p-2 rounded">
                💡 권장: 프리미엄 30-40% 수준에서 협상 시작
              </div>
            </div>

            <div className="flex gap-2">
              <RetroButton onClick={() => setCurrentStep('screening')} className="flex-1">
                ← 이전
              </RetroButton>
              <RetroButton onClick={() => setCurrentStep('diligence')} className="flex-1">
                다음: 실사 →
              </RetroButton>
            </div>
          </div>
        )}

        {/* 3단계: 실사 (Due Diligence) */}
        {currentStep === 'diligence' && selectedTarget && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="border border-retro-gray p-2">
              <div className="font-bold text-xs mb-2">🔍 실사 (Due Diligence)</div>
              <div className="text-[10px] text-retro-gray mb-3">
                재무, 법무, 운영 실사를 통해 리스크를 파악합니다.
              </div>

              {/* 재무 실사 */}
              <div className="mb-3 border border-retro-gray/30 p-2">
                <div className="font-bold text-[10px] mb-2 text-blue-600">💵 재무 실사</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${selectedTarget.company.financials.netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span>수익성:</span>
                    <span className="flex-1 text-right">
                      {selectedTarget.company.financials.netIncome >= 0 ? '양호' : '적자'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${selectedTarget.company.financials.debtRatio < 2.0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span>부채 수준:</span>
                    <span className="flex-1 text-right">
                      {selectedTarget.company.financials.debtRatio < 2.0 ? '안정적' : '주의 필요'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${selectedTarget.company.financials.growthRate > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span>성장성:</span>
                    <span className="flex-1 text-right">
                      {(selectedTarget.company.financials.growthRate * 100).toFixed(1)}% YoY
                    </span>
                  </div>
                </div>
              </div>

              {/* 운영 실사 */}
              <div className="mb-3 border border-retro-gray/30 p-2">
                <div className="font-bold text-[10px] mb-2 text-purple-600">🏢 운영 실사</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>조직 규모:</span>
                    <span className="flex-1 text-right">
                      {selectedTarget.company.headcount?.toLocaleString()}명
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${selectedTarget.company.volatility < 0.2 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span>사업 안정성:</span>
                    <span className="flex-1 text-right">
                      {selectedTarget.company.volatility < 0.2 ? '안정적' : '변동성 있음'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>산업 섹터:</span>
                    <span className="flex-1 text-right">{selectedTarget.company.sector}</span>
                  </div>
                </div>
              </div>

              {/* 종합 리스크 평가 */}
              <div className="border-2 border-red-500/30 p-2 bg-red-500/5">
                <div className="font-bold text-[10px] mb-2 text-red-600">⚠️ 종합 리스크 평가</div>
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span>리스크 점수:</span>
                    <span className={`font-bold ${getRiskColor(selectedTarget.riskScore)}`}>
                      {selectedTarget.riskScore} / 100
                    </span>
                  </div>
                  <div className="h-2 bg-retro-gray/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${selectedTarget.riskScore >= 70 ? 'bg-red-500' : selectedTarget.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${selectedTarget.riskScore}%` }}
                    />
                  </div>
                </div>
                <div className="text-[9px] text-retro-gray">
                  {selectedTarget.riskScore >= 70 && (
                    <div className="text-red-600">
                      ⛔ 고위험: 인수 후 재무구조 개선 및 구조조정 필수
                    </div>
                  )}
                  {selectedTarget.riskScore >= 40 && selectedTarget.riskScore < 70 && (
                    <div className="text-yellow-600">
                      ⚡ 중위험: 통합 과정에서 리스크 관리 필요
                    </div>
                  )}
                  {selectedTarget.riskScore < 40 && (
                    <div className="text-green-600">✅ 저위험: 안정적인 인수 대상</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <RetroButton onClick={() => setCurrentStep('valuation')} className="flex-1">
                ← 이전
              </RetroButton>
              <RetroButton onClick={() => setCurrentStep('negotiation')} className="flex-1">
                다음: 협상 →
              </RetroButton>
            </div>
          </div>
        )}

        {/* 4단계: 협상 */}
        {currentStep === 'negotiation' && selectedTarget && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="border border-retro-gray p-2">
              <div className="font-bold text-xs mb-2">🤝 인수 협상</div>
              <div className="text-[10px] text-retro-gray mb-3">
                인수 조건을 설정하고 협상을 진행합니다.
              </div>

              {/* 프리미엄 설정 */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-bold">💰 인수 프리미엄</span>
                  <span className="font-bold text-blue-600">{(premium * 100).toFixed(0)}%</span>
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
                  <span>45% (권장)</span>
                  <span>60% (최대)</span>
                </div>
                <div className="mt-2 text-[9px] text-retro-gray bg-retro-gray/10 p-2 rounded">
                  {premium <= 0.35 && '⚠️ 낮은 프리미엄 - 협상 결렬 위험'}
                  {premium > 0.35 && premium <= 0.45 && '✅ 적정 수준 - 협상 성공 가능성 높음'}
                  {premium > 0.45 && '💸 높은 프리미엄 - 과도한 비용 지불'}
                </div>
              </div>

              {/* 구조조정 계획 */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-bold">🏢 구조조정 (해고율)</span>
                  <span className="font-bold text-red-600">{(layoffRate * 100).toFixed(0)}%</span>
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
                  <span>30% (일반)</span>
                  <span>60% (대규모)</span>
                </div>
                <div className="mt-1 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-retro-gray">예상 해고 인원:</span>
                    <span className="font-bold text-red-600">
                      약 {Math.round((selectedTarget.company.headcount ?? 0) * layoffRate).toLocaleString()}명
                    </span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-retro-gray">잔여 인원:</span>
                    <span className="font-bold">
                      약{' '}
                      {Math.round(
                        (selectedTarget.company.headcount ?? 0) * (1 - layoffRate),
                      ).toLocaleString()}
                      명
                    </span>
                  </div>
                </div>
              </div>

              {/* 총 인수 비용 */}
              <div className="border-2 border-blue-500/30 p-2 bg-blue-500/5">
                <div className="font-bold text-[10px] mb-2">💵 인수 비용 산정</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>기업 시가총액:</span>
                    <span>{(selectedTarget.company.marketCap / 100_000_000).toFixed(0)}억 원</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>프리미엄 ({(premium * 100).toFixed(0)}%):</span>
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
                  {!canAfford && (
                    <div className="text-red-600 mt-1">⚠️ 현금이 부족합니다!</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <RetroButton onClick={() => setCurrentStep('diligence')} className="flex-1">
                ← 이전
              </RetroButton>
              <RetroButton
                onClick={() => setCurrentStep('integration')}
                disabled={!canAfford}
                className="flex-1"
              >
                다음: 통합계획 →
              </RetroButton>
            </div>
          </div>
        )}

        {/* 5단계: 통합 계획 (PMI) */}
        {currentStep === 'integration' && selectedTarget && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="border border-retro-gray p-2">
              <div className="font-bold text-xs mb-2">🏗️ 인수 후 통합 계획 (PMI)</div>
              <div className="text-[10px] text-retro-gray mb-3">
                Post-Merger Integration: 인수 완료 후 예상 시나리오
              </div>

              {/* 시너지 효과 예측 */}
              <div className="mb-3 border border-green-500/30 p-2 bg-green-500/5">
                <div className="font-bold text-[10px] mb-2 text-green-600">
                  ✅ 예상 시너지 효과
                </div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      비용 절감: 중복 인력 해고로 연간 약{' '}
                      {Math.round(
                        (selectedTarget.company.headcount ?? 0) * layoffRate * 0.5,
                      ).toLocaleString()}
                      억 원 절감 예상
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <span>시장 점유율 확대: {selectedTarget.company.sector} 섹터 경쟁력 강화</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      매출 시너지: 크로스셀링으로{' '}
                      {(selectedTarget.company.financials.revenue * 0.1).toFixed(0)}억 원 추가 매출 기대
                    </span>
                  </div>
                </div>
              </div>

              {/* 리스크 및 과제 */}
              <div className="mb-3 border border-yellow-500/30 p-2 bg-yellow-500/5">
                <div className="font-bold text-[10px] mb-2 text-yellow-600">⚠️ 리스크 및 과제</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <span>조직 문화 통합: 구성원 간 갈등 관리 필요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      대규모 해고 ({(layoffRate * 100).toFixed(0)}%): 여론 악화 및 노동 분쟁 위험
                    </span>
                  </div>
                  {selectedTarget.company.financials.netIncome < 0 && (
                    <div className="flex items-start gap-2">
                      <span>•</span>
                      <span>적자 기업 인수: 흑자 전환까지 추가 투자 필요</span>
                    </div>
                  )}
                  {selectedTarget.company.financials.debtRatio > 2.0 && (
                    <div className="flex items-start gap-2">
                      <span>•</span>
                      <span>높은 부채: 재무구조 개선 우선 필요</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 통합 일정 */}
              <div className="mb-3 border border-retro-gray/30 p-2">
                <div className="font-bold text-[10px] mb-2">📅 통합 일정 (예상)</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>Day 1-30:</span>
                    <span className="text-retro-gray">경영진 통합, 시스템 연계</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Day 31-90:</span>
                    <span className="text-retro-gray">조직 재편, 구조조정 실행</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Day 91-180:</span>
                    <span className="text-retro-gray">사업 통합, 시너지 실현</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Day 180+:</span>
                    <span className="text-retro-gray">성과 모니터링, 추가 개선</span>
                  </div>
                </div>
              </div>

              {/* 최종 의사결정 요약 */}
              <div className="border-2 border-blue-500 p-2 bg-blue-500/10">
                <div className="font-bold text-[10px] mb-2">📋 의사결정 요약</div>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>대상 기업:</span>
                    <span className="font-bold">{selectedTarget.company.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>인수 비용:</span>
                    <span className="font-bold text-blue-600">
                      {(actualCost / 100_000_000).toFixed(0)}억 원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>프리미엄:</span>
                    <span>{(premium * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>구조조정:</span>
                    <span className="text-red-600">{(layoffRate * 100).toFixed(0)}% 해고</span>
                  </div>
                  <div className="flex justify-between">
                    <span>종합 평가:</span>
                    <span className={getSynergyColor(selectedTarget.synergy)}>
                      {selectedTarget.synergy >= 70
                        ? '추천'
                        : selectedTarget.synergy >= 40
                          ? '보통'
                          : '비추천'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <RetroButton onClick={() => setCurrentStep('negotiation')} className="flex-1">
                ← 이전
              </RetroButton>
              <RetroButton
                onClick={() => setShowConfirm(true)}
                disabled={!canAfford}
                className="flex-1"
              >
                {canAfford ? '🤝 인수 제안 확정' : '💸 현금 부족'}
              </RetroButton>
            </div>
          </div>
        )}
      </div>

      {/* 최종 확인 다이얼로그 */}
      {showConfirm && selectedTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-retro-bg border-4 border-retro-gray w-96 shadow-retro">
            <div className="bg-win-title-active text-white px-2 py-1 font-bold text-xs flex justify-between items-center">
              <span>⚠️ 인수 최종 승인</span>
              <button onClick={() => setShowConfirm(false)} className="hover:bg-white/20 px-1">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs">
                <p className="font-bold mb-2">
                  {selectedTarget.company.name} ({selectedTarget.company.ticker}) 인수를
                  최종 승인하시겠습니까?
                </p>
                <div className="border border-retro-gray p-2 bg-retro-gray/5 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>인수 비용:</span>
                    <span className="font-bold text-blue-600">
                      {(actualCost / 100_000_000).toFixed(0)}억 원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>프리미엄:</span>
                    <span>{(premium * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>예상 해고:</span>
                    <span className="text-red-600">
                      약 {Math.round((selectedTarget.company.headcount ?? 0) * layoffRate).toLocaleString()}명
                      ({(layoffRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>리스크:</span>
                    <span className={getRiskColor(selectedTarget.riskScore)}>
                      {selectedTarget.riskScore}/100
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-red-600 bg-red-500/10 p-2 rounded">
                  ⚠️ 경고: 인수 후 되돌릴 수 없으며, 시장 및 여론 반응이 부정적일 수 있습니다.
                  {layoffRate > 0.4 && ' 대규모 해고로 인한 사회적 비난이 예상됩니다.'}
                </div>
              </div>

              <div className="flex gap-2">
                <RetroButton onClick={handleAcquire} className="flex-1">
                  ✅ 최종 승인
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
