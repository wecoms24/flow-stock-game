/**
 * EventChainTracker — 이벤트 체인 상세 진행 UI
 */

import { useGameStore } from '../../stores/gameStore'
import { EVENT_CHAIN_TEMPLATES } from '../../data/eventChains'
import { EventChainBadge } from '../ui/EventChainBadge'
import { getCurrentWeekModifiers } from '../../engines/eventChainEngine'
import type { EventChainState, ChainStatus } from '../../types/eventChain'

const STATUS_LABELS: Record<ChainStatus, { label: string; color: string }> = {
  active: { label: '진행 중', color: 'text-orange-600' },
  paused: { label: '일시중지', color: 'text-yellow-600' },
  completed: { label: '완료', color: 'text-green-600' },
  failed: { label: '실패', color: 'text-red-600' },
}

function ChainCard({ chain }: { chain: EventChainState }) {
  const template = EVENT_CHAIN_TEMPLATES.find((t) => t.id === chain.chainId)
  if (!template) return null

  const statusInfo = STATUS_LABELS[chain.status]
  const currentModifiers = chain.status === 'active' ? getCurrentWeekModifiers(chain) : null

  return (
    <div className="win-inset bg-white p-2 mb-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{template.icon}</span>
          <div>
            <div className="text-xs font-bold">{template.title}</div>
            <div className="text-[9px] text-retro-gray">{template.description}</div>
          </div>
        </div>
        <span className={`text-[10px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      {/* Progress Badge */}
      <div className="mb-2">
        <EventChainBadge
          currentWeek={chain.currentWeek}
          totalWeeks={chain.totalWeeks}
          size="md"
        />
      </div>

      {/* Week Timeline */}
      <div className="space-y-1 mb-2">
        {template.weeks.map((week, idx) => {
          const isCompleted = idx < chain.currentWeek
          const isCurrent = idx === chain.currentWeek && chain.status === 'active'
          const isFuture = idx > chain.currentWeek

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-1 rounded text-[10px] ${
                isCurrent
                  ? 'bg-orange-50 border border-orange-300'
                  : isCompleted
                    ? 'bg-green-50 text-green-700'
                    : isFuture
                      ? 'bg-gray-50 text-gray-400'
                      : ''
              }`}
            >
              <span className="w-4 text-center">
                {isCompleted ? '✅' : isCurrent ? '▶️' : '⬜'}
              </span>
              <span className="font-bold">{week.title}</span>
              <span className="text-retro-gray flex-1 truncate">{week.description}</span>
            </div>
          )
        })}

        {/* Branch weeks if selected */}
        {chain.selectedBranchIndex != null && (() => {
          const branch = template.branches[chain.selectedBranchIndex]
          if (!branch) return null
          return branch.nextWeeks.map((week, idx) => {
            const globalIdx = template.weeks.length + idx
            const isCompleted = globalIdx < chain.currentWeek
            const isCurrent = globalIdx === chain.currentWeek && chain.status === 'active'

            return (
              <div
                key={`branch-${idx}`}
                className={`flex items-center gap-2 p-1 rounded text-[10px] ${
                  isCurrent
                    ? 'bg-purple-50 border border-purple-300'
                    : isCompleted
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                <span className="w-4 text-center">
                  {isCompleted ? '✅' : isCurrent ? '▶️' : '⬜'}
                </span>
                <span className="font-bold">🔀 {week.title}</span>
                <span className="text-retro-gray flex-1 truncate">{week.description}</span>
              </div>
            )
          })
        })()}
      </div>

      {/* Current Week Modifiers */}
      {currentModifiers && (
        <div className="win-inset bg-yellow-50 p-1.5 text-[9px]">
          <div className="font-bold text-yellow-800 mb-0.5">현재 주차 효과:</div>
          <div className="flex gap-3">
            <span className={currentModifiers.driftModifier > 0 ? 'text-green-600' : currentModifiers.driftModifier < 0 ? 'text-red-600' : 'text-gray-600'}>
              추세: {currentModifiers.driftModifier > 0 ? '+' : ''}{(currentModifiers.driftModifier * 100).toFixed(1)}%
            </span>
            <span className="text-orange-600">
              변동성: +{(currentModifiers.volatilityModifier * 100).toFixed(1)}%
            </span>
            {currentModifiers.affectedSectors && (
              <span className="text-blue-600">
                섹터: {currentModifiers.affectedSectors.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Player Actions Log */}
      {chain.playerActions.length > 0 && (
        <div className="mt-2 text-[9px]">
          <div className="font-bold text-retro-gray mb-0.5">플레이어 행동:</div>
          <div className="flex gap-1 flex-wrap">
            {chain.playerActions.map((action, idx) => (
              <span
                key={idx}
                className={`px-1.5 py-0.5 rounded border text-[8px] ${
                  action === 'buy_affected'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : action === 'sell_affected'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : action === 'hold'
                        ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                W{idx + 1}: {action === 'buy_affected' ? '매수' : action === 'sell_affected' ? '매도' : action === 'hold' ? '보유' : '미행동'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Branch info if selected */}
      {chain.selectedBranchIndex != null && (() => {
        const branch = template.branches[chain.selectedBranchIndex]
        if (!branch) return null
        return (
          <div className="mt-2 win-inset bg-purple-50 p-1.5 text-[9px]">
            <span className="font-bold text-purple-700">🔀 분기: {branch.label}</span>
            <p className="text-purple-600 mt-0.5">{branch.outcomeDescription}</p>
          </div>
        )
      })()}
    </div>
  )
}

export function EventChainTracker() {
  const eventChains = useGameStore((s) => s.eventChains)

  const activeChains = eventChains.chains.filter((c) => c.status === 'active')
  const completedChains = eventChains.chains.filter((c) => c.status === 'completed')

  return (
    <div className="flex flex-col h-full p-2 overflow-y-auto">
      {/* Header */}
      <div className="win-inset bg-white p-2 mb-2">
        <div className="text-xs font-bold mb-1">📋 이벤트 체인 트래커</div>
        <div className="flex gap-4 text-[10px] text-retro-gray">
          <span>진행 중: <span className="font-bold text-orange-600">{activeChains.length}</span></span>
          <span>완료: <span className="font-bold text-green-600">{completedChains.length}</span></span>
          <span>총 완료: <span className="font-bold">{eventChains.completedChainIds.length}</span></span>
        </div>
      </div>

      {/* Active Chains */}
      {activeChains.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-orange-700 mb-1">🔥 진행 중</div>
          {activeChains.map((chain) => (
            <ChainCard key={chain.chainId} chain={chain} />
          ))}
        </div>
      )}

      {/* No active chains */}
      {activeChains.length === 0 && completedChains.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-retro-gray text-xs">
          <div className="text-center">
            <p className="text-2xl mb-2">📋</p>
            <p>아직 이벤트 체인이 없습니다.</p>
            <p className="text-[10px] mt-1">매월 15% 확률로 새 체인이 시작됩니다.</p>
          </div>
        </div>
      )}

      {/* Completed Chains */}
      {completedChains.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-green-700 mb-1">✅ 완료된 체인</div>
          {completedChains.map((chain) => (
            <ChainCard key={chain.chainId} chain={chain} />
          ))}
        </div>
      )}
    </div>
  )
}
