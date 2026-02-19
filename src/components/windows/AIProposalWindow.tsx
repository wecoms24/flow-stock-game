/**
 * AI Proposal Window
 *
 * AI 아키텍트의 배치 제안을 표시하고 승인/거부할 수 있는 창
 */

import { RetroButton } from '../ui/RetroButton'
import { evaluateProposal, type LayoutProposal } from '../../systems/aiArchitect'
import type { Employee } from '../../types'

interface AIProposalWindowProps {
  proposal: LayoutProposal | null
  employees: Employee[]
  currentCash: number
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

export function AIProposalWindow({
  proposal,
  employees,
  currentCash,
  onApprove,
  onReject,
  onClose,
}: AIProposalWindowProps) {
  if (!proposal) return null

  const totalCost = proposal.purchases.reduce((sum, p) => sum + p.cost, 0)
  const canAfford = currentCash >= totalCost
  const evaluation = evaluateProposal(proposal)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[480px] max-h-[600px] bg-gray-900 border-2 border-blue-500 rounded shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 px-3 py-2 flex items-center justify-between">
          <h2 className="text-white font-bold">🤖 AI 아키텍트의 제안</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-600 px-2 rounded"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        {/* 요약 정보 */}
        <div className="bg-blue-900/30 border border-blue-700/50 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-blue-300">📊 예상 효과</h3>
            <div
              className={`px-2 py-1 rounded text-xs font-bold ${
                evaluation.recommendation === 'highly_recommended'
                  ? 'bg-green-500 text-white'
                  : evaluation.recommendation === 'recommended'
                    ? 'bg-blue-500 text-white'
                    : evaluation.recommendation === 'optional'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-500 text-white'
              }`}
            >
              {evaluation.recommendation === 'highly_recommended'
                ? '⭐ 매우 우수'
                : evaluation.recommendation === 'recommended'
                  ? '✨ 우수'
                  : evaluation.recommendation === 'optional'
                    ? '👍 양호'
                    : '🤔 검토 필요'}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">효율성 점수:</span>
              <span className="text-white font-bold">{evaluation.efficiency}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">이동 직원:</span>
              <span className="text-blue-300">{proposal.moves.length}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">가구 구매:</span>
              <span className="text-purple-300">{proposal.purchases.length}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">예상 비용:</span>
              <span className={canAfford ? 'text-green-300' : 'text-red-400'}>
                ${totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-300 italic">{evaluation.summary}</p>
        </div>

        {/* 직원 이동 목록 */}
        {proposal.moves.length > 0 && (
          <div className="border border-gray-700 p-3 rounded">
            <h4 className="text-md font-bold text-white mb-2">
              👥 직원 재배치 ({proposal.moves.length}명)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {proposal.moves.map((move) => {
                const emp = employees.find((e) => e.id === move.employeeId)
                if (!emp) return null

                return (
                  <div
                    key={move.employeeId}
                    className="flex items-center gap-2 bg-gray-800/50 p-2 rounded text-sm"
                  >
                    <span className="text-gray-400 font-mono text-xs">
                      {move.fromCoord.x},{move.fromCoord.y}
                    </span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-400 font-mono text-xs">
                      {move.toCoord.x},{move.toCoord.y}
                    </span>
                    <span className="text-white flex-1">{emp.name}</span>
                    <span
                      className={`text-xs font-bold ${move.scoreImprovement > 0 ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {move.scoreImprovement > 0 && '+'}
                      {move.scoreImprovement.toFixed(0)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 italic">
              💡 시너지 점수가 높은 위치로 이동합니다
            </p>
          </div>
        )}

        {/* 가구 구매 목록 */}
        {proposal.purchases.length > 0 && (
          <div className="border border-gray-700 p-3 rounded">
            <h4 className="text-md font-bold text-white mb-2">
              🛋️ 가구 구매 ({proposal.purchases.length}개)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {proposal.purchases.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-800/50 p-2 rounded text-sm"
                  >
                    <span className="text-2xl">{getFurnitureEmoji(p.type)}</span>
                    <div className="flex-1">
                      <div className="text-white">{formatFurnitureName(p.type)}</div>
                      <div className="text-xs text-gray-400">{p.reason}</div>
                    </div>
                    <span className="text-green-300 font-mono text-xs">
                      ${p.cost.toLocaleString()}
                    </span>
                  </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between items-center text-xs">
              <span className="text-gray-400">총 비용:</span>
              <span className={`font-bold ${canAfford ? 'text-green-300' : 'text-red-400'}`}>
                ${totalCost.toLocaleString()}
              </span>
            </div>
            {!canAfford && (
              <p className="text-xs text-red-400 mt-1">⚠️ 자금이 부족합니다</p>
            )}
          </div>
        )}

        {/* 이유 설명 */}
        {proposal.moves.length > 0 && (
          <div className="bg-gray-800/30 border border-gray-700 p-3 rounded">
            <h4 className="text-sm font-bold text-gray-300 mb-2">📝 제안 근거</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              {proposal.moves.slice(0, 3).map((move) => (
                <li key={move.employeeId}>• {move.reason}</li>
              ))}
              {proposal.moves.length > 3 && (
                <li className="text-gray-500">... 외 {proposal.moves.length - 3}개</li>
              )}
            </ul>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-auto pt-4 border-t border-gray-700 flex gap-2">
          <RetroButton
            onClick={onApprove}
            disabled={!canAfford && proposal.purchases.length > 0}
            className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500"
          >
            ✅ 승인 및 실행
          </RetroButton>
          <RetroButton onClick={onReject} className="flex-1 bg-red-700 hover:bg-red-600">
            ❌ 거절
          </RetroButton>
        </div>

        {!canAfford && proposal.purchases.length > 0 && (
          <p className="text-xs text-center text-yellow-400">
            💡 가구 구매를 취소하고 직원 재배치만 승인할 수 있습니다
          </p>
        )}
      </div>
    </div>
    </div>
  )
}

// Helper functions
function getFurnitureEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    basic: '🪑',
    premium: '💺',
    desk: '🪑',
    premium_chair: '💺',
    plant: '🪴',
    server_rack: '🖥️',
    coffee_machine: '☕',
    trophy: '🏆',
    air_purifier: '💨',
    whiteboard: '📋',
    bookshelf: '📚',
    lounge_chair: '🛋️',
  }
  return emojiMap[type] || '🪑'
}

function formatFurnitureName(type: string): string {
  const nameMap: Record<string, string> = {
    basic: '기본 책상',
    premium: '프리미엄 책상',
    desk: '기본 책상',
    premium_chair: '고급 의자',
    plant: '대형 화분',
    server_rack: '고성능 서버',
    coffee_machine: '에스프레소 머신',
    trophy: 'CEO 트로피',
    air_purifier: '공기청정기',
    whiteboard: '화이트보드',
    bookshelf: '서가',
    lounge_chair: '휴게 소파',
  }
  return nameMap[type] || type
}
