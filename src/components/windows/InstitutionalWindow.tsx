import React, { useMemo, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { checkInstitutionalPanicSell } from '../../engines/institutionEngine'
import { calculateMarketSentiment } from '../../engines/tickEngine'

interface Props {
  companyId: string // 선택된 종목 ID
}

// 기관 타입별 아이콘 및 색상
const getInstitutionBadge = (name: string) => {
  if (name.includes('HedgeFund')) return { icon: '🦈', label: '헤지펀드', color: 'bg-orange-100 text-orange-800 border-orange-300' }
  if (name.includes('Pension')) return { icon: '🏛️', label: '연기금', color: 'bg-blue-100 text-blue-800 border-blue-300' }
  if (name.includes('Bank')) return { icon: '🏦', label: '은행', color: 'bg-green-100 text-green-800 border-green-300' }
  if (name.includes('Algorithm')) return { icon: '🤖', label: '알고리즘', color: 'bg-purple-100 text-purple-800 border-purple-300' }
  return { icon: '💼', label: '기관', color: 'bg-gray-100 text-gray-800 border-gray-300' }
}

export const InstitutionalWindow: React.FC<Props> = ({ companyId }) => {
  const company = useGameStore((s) => s.companies.find((c) => c.id === companyId))
  const allCompanies = useGameStore((s) => s.companies)
  const events = useGameStore((s) => s.events)
  const [showAllList, setShowAllList] = useState(false)

  if (!company) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200 font-pixel">
        <p className="text-gray-600">종목을 선택해주세요</p>
      </div>
    )
  }

  const { institutionFlow, financials, institutionFlowHistory } = company
  const isBuyPressure = institutionFlow?.netBuyVolume > 0

  // 패닉 셀 체크 (useMemo로 최적화)
  const marketSentiment = useMemo(() => calculateMarketSentiment(events), [events])
  const isPanicSell = useMemo(
    () => checkInstitutionalPanicSell(company, marketSentiment),
    [company, marketSentiment],
  )

  return (
    <div className="w-full h-full bg-gray-200 border-2 border-white border-r-gray-600 border-b-gray-600 p-3 font-pixel overflow-auto">
      {/* 패닉 셀 경고 배너 */}
      {isPanicSell && (
        <div className="bg-red-600 text-white p-3 mb-3 animate-pulse border-2 border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-lg">기관 투매 경보 발령!</p>
              <p className="text-sm">고부채 + 대규모 적자 + 약세장 → 연기금/은행 대량 매도 중</p>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - 강조된 종목명 */}
      <div className="bg-gradient-to-r from-navy-900 to-blue-900 text-white p-3 mb-3 border-2 border-blue-500 relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-wide">
              {company.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">{company.ticker}</span>
              <span className="text-xs text-gray-300">
                현재가: <span className="font-bold text-yellow-300">{company.price.toLocaleString()}원</span>
              </span>
            </div>
          </div>
          {/* 목록 보기 버튼 */}
          <button
            onClick={() => setShowAllList(!showAllList)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
            title="전체 종목 기관 매매 현황"
          >
            📋 목록
          </button>
        </div>
        <p className="text-xs text-gray-300 border-t border-blue-700 pt-1 mt-1">
          💼 기관 투자자 매매 동향 분석
        </p>
      </div>

      {/* 전체 종목 목록 (조건부) */}
      {showAllList && (
        <div className="bg-white border-2 border-blue-400 p-2 mb-3 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-300">
            <span className="font-bold text-sm">📊 전체 종목 기관 매매 현황</span>
            <button
              onClick={() => setShowAllList(false)}
              className="px-1.5 py-0.5 bg-gray-300 hover:bg-gray-400 rounded text-xs"
            >
              닫기
            </button>
          </div>
          <div className="space-y-2">
            {allCompanies.map((c) => {
              const flow = c.institutionFlow
              const netBuy = flow?.netBuyVolume || 0
              const isBuy = netBuy > 0
              const topInst = isBuy ? flow?.topBuyers?.[0] : flow?.topSellers?.[0]
              const badge = topInst ? getInstitutionBadge(topInst) : null

              return (
                <div
                  key={c.id}
                  className={`p-2 border rounded ${c.id === companyId ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'} hover:bg-gray-100 cursor-pointer`}
                  onClick={() => {
                    setShowAllList(false)
                    // 선택된 종목 변경 (WindowManager를 통해)
                    useGameStore.getState().updateWindowProps('institutional', { companyId: c.id })
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold">{c.ticker}</span>
                      <span className="text-[10px] text-gray-600 truncate max-w-20">{c.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{c.price.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      {badge && (
                        <>
                          <span>{badge.icon}</span>
                          <span className="text-gray-600">{badge.label}</span>
                        </>
                      )}
                    </div>
                    <span
                      className={`font-bold ${isBuy ? 'text-red-600' : 'text-blue-600'}`}
                    >
                      {isBuy ? '+' : ''}
                      {netBuy.toLocaleString()}주
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 한눈에 보는 요약 */}
      <div className="bg-yellow-50 border-2 border-yellow-400 p-3 mb-3 rounded">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💡</span>
          <span className="font-bold text-sm">한눈에 보는 기관 투자 요약</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded border border-yellow-300">
            <div className="text-gray-600 mb-1">기관 심리</div>
            <div className={`font-bold text-lg ${isBuyPressure ? 'text-red-600' : 'text-blue-600'}`}>
              {isBuyPressure ? '🔥 매수 우세' : '❄️ 매도 우세'}
            </div>
          </div>
          <div className="bg-white p-2 rounded border border-yellow-300">
            <div className="text-gray-600 mb-1">주도 기관</div>
            <div className="font-bold text-sm">
              {(() => {
                const topBuyer = institutionFlow?.topBuyers?.[0]
                const topSeller = institutionFlow?.topSellers?.[0]

                if (topBuyer) {
                  const badge = getInstitutionBadge(topBuyer)
                  return `${badge.icon} ${badge.label}`
                }
                if (topSeller) {
                  const badge = getInstitutionBadge(topSeller)
                  return `${badge.icon} ${badge.label}`
                }
                return '⚪ 중립'
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 순매수 잠정치 */}
      <div className="bg-white border-2 border-gray-400 p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">기관 순매수 (추정)</span>
          <span
            className={`text-xl font-bold ${isBuyPressure ? 'text-red-600' : 'text-blue-600'}`}
          >
            {isBuyPressure ? '+' : ''}
            {institutionFlow.netBuyVolume.toLocaleString()}주
          </span>
        </div>
        <div className="w-full bg-gray-300 h-2 rounded">
          <div
            className={`h-full ${isBuyPressure ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, Math.abs(institutionFlow.netBuyVolume) / 1000)}%` }}
          />
        </div>
      </div>

      {/* 기관 보유 비중 */}
      <div className="bg-white border-2 border-gray-400 p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">기관 보유 비중 (추정)</span>
          <span className="text-lg font-bold text-purple-700">
            {(institutionFlow.institutionalOwnership * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-300 h-5 rounded border border-gray-400">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded transition-all"
              style={{ width: `${institutionFlow.institutionalOwnership * 100}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {institutionFlow.institutionalOwnership > 0.5
            ? '⚠️ 높은 보유 비중 - 기관 매도 시 변동성 증가'
            : institutionFlow.institutionalOwnership > 0.3
              ? '📊 적정 수준 - 안정적 거래'
              : '💡 낮은 비중 - 개인 투자자 주도'}
        </p>
      </div>

      {/* 10일 수급 트렌드 (조건부) */}
      {institutionFlowHistory && institutionFlowHistory.length > 0 && (
        <div className="bg-white border-2 border-gray-400 p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">최근 10일 수급 추이</span>
            <span className="text-xs text-gray-600">
              {institutionFlowHistory.filter((v) => v > 0).length > 5 ? '📈 매수 우세' : '📉 매도 우세'}
            </span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {institutionFlowHistory.map((vol, i) => {
              const maxAbsVol = Math.max(...institutionFlowHistory.map(Math.abs), 1)
              const heightPercent = (Math.abs(vol) / maxAbsVol) * 100
              const isPositive = vol >= 0

              return (
                <div key={i} className="flex-1 flex flex-col justify-end items-center">
                  <div
                    className={`w-full ${isPositive ? 'bg-red-500' : 'bg-blue-500'} border border-gray-600`}
                    style={{ height: `${heightPercent}%` }}
                    title={`${i + 1}일 전: ${vol > 0 ? '+' : ''}${vol.toLocaleString()}`}
                  />
                  <span className="text-[8px] text-gray-500 mt-1">{i + 1}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>📉 매도</span>
            <span>📈 매수</span>
          </div>
        </div>
      )}

      {/* 매매 주체 리스트 - 개선된 UI */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 매수 기관 */}
        <div className="bg-white border-2 border-red-400 p-3 rounded shadow-sm">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-center font-bold mb-2 py-2 rounded shadow">
            📈 주요 매수 기관
          </div>
          {institutionFlow?.topBuyers && institutionFlow.topBuyers.length > 0 ? (
            <div className="space-y-2">
              {institutionFlow.topBuyers.map((name, i) => {
                const badge = getInstitutionBadge(name)
                const cleanName = name.split(' ').slice(0, 2).join(' ') // "Goldman 1" 부분만
                return (
                  <div
                    key={i}
                    className={`p-2 rounded border ${badge.color} flex items-center gap-2`}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">{cleanName}</div>
                      <div className="text-[10px] opacity-75">{badge.label}</div>
                    </div>
                    <span className="text-xs font-bold">#{i + 1}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4 text-sm">
              매수 기관 없음
            </div>
          )}
        </div>

        {/* 매도 기관 */}
        <div className="bg-white border-2 border-blue-400 p-3 rounded shadow-sm">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center font-bold mb-2 py-2 rounded shadow">
            📉 주요 매도 기관
          </div>
          {institutionFlow?.topSellers && institutionFlow.topSellers.length > 0 ? (
            <div className="space-y-2">
              {institutionFlow.topSellers.map((name, i) => {
                const badge = getInstitutionBadge(name)
                const cleanName = name.split(' ').slice(0, 2).join(' ')
                return (
                  <div
                    key={i}
                    className={`p-2 rounded border ${badge.color} flex items-center gap-2`}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">{cleanName}</div>
                      <div className="text-[10px] opacity-75">{badge.label}</div>
                    </div>
                    <span className="text-xs font-bold">#{i + 1}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4 text-sm">
              매도 기관 없음
            </div>
          )}
        </div>
      </div>

      {/* 재무 리스크 경고 */}
      <div className="bg-yellow-100 border-2 border-yellow-600 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📊</span>
          <span className="font-bold">애널리스트 코멘트</span>
        </div>
        <div className="text-sm space-y-1">
          {financials.debtRatio > 1.8 && (
            <p className="text-red-700">
              ⚠️ 높은 부채비율({financials.debtRatio.toFixed(1)}) - 기관 투매 리스크
            </p>
          )}
          {financials.debtRatio <= 1.0 && (
            <p className="text-green-700">✅ 건전한 재무구조 - 안정적 기관 매수세</p>
          )}
          {financials.growthRate > 0.1 && (
            <p className="text-blue-700">📈 고성장 기업 - 헤지펀드 관심 증가</p>
          )}
          {financials.netIncome < 0 && (
            <p className="text-red-700">🔴 적자 기업 - 연기금 매도 압력</p>
          )}
        </div>
      </div>

      {/* 재무 상세 */}
      <div className="mt-3 bg-white border-2 border-gray-400 p-2">
        <h3 className="font-bold mb-2 border-b border-gray-300 pb-1">재무 정보</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1">매출액</td>
              <td className="text-right font-bold">{financials.revenue.toFixed(0)}억</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1">순이익</td>
              <td
                className={`text-right font-bold ${financials.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {financials.netIncome >= 0 ? '+' : ''}
                {financials.netIncome.toFixed(0)}억
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1">부채비율</td>
              <td className="text-right font-bold">{(financials.debtRatio * 100).toFixed(0)}%</td>
            </tr>
            <tr>
              <td className="py-1">성장률</td>
              <td
                className={`text-right font-bold ${financials.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {financials.growthRate >= 0 ? '+' : ''}
                {(financials.growthRate * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
