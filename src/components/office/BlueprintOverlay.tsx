/**
 * Blueprint Overlay
 *
 * AI 제안의 미리보기를 반투명 유령 아이콘으로 표시
 */

import type { LayoutProposal } from '../../systems/aiArchitect'
import type { Employee } from '../../types'
import type { OfficeGrid } from '../../types/office'

interface BlueprintOverlayProps {
  proposal: LayoutProposal | null
  employees: Employee[]
  grid: OfficeGrid
  cellSize: number // 그리드 셀 크기 (px)
}

export function BlueprintOverlay({ proposal, employees, grid, cellSize }: BlueprintOverlayProps) {
  if (!proposal) return null

  const gridWidth = grid.size.width

  // 인덱스를 (x, y) 좌표로 변환
  const indexToCoord = (index: number) => {
    const x = index % gridWidth
    const y = Math.floor(index / gridWidth)
    return { x, y }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* 직원 이동 미리보기 */}
      {proposal.moves.map((move) => {
        const emp = employees.find((e) => e.id === move.employeeId)
        if (!emp) return null

        const fromCoord = indexToCoord(move.from)
        const toCoord = indexToCoord(move.to)

        return (
          <div key={move.employeeId}>
            {/* 이동 화살표 */}
            <svg
              className="absolute top-0 left-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            >
              <defs>
                <marker
                  id={`arrowhead-${move.employeeId}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" opacity="0.8" />
                </marker>
              </defs>
              <line
                x1={fromCoord.x * cellSize + cellSize / 2}
                y1={fromCoord.y * cellSize + cellSize / 2}
                x2={toCoord.x * cellSize + cellSize / 2}
                y2={toCoord.y * cellSize + cellSize / 2}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.6"
                markerEnd={`url(#arrowhead-${move.employeeId})`}
              />
            </svg>

            {/* 목표 위치 유령 아이콘 */}
            <div
              className="absolute flex items-center justify-center bg-blue-500/30 border-2 border-blue-400 border-dashed rounded animate-pulse"
              style={{
                left: `${toCoord.x * cellSize}px`,
                top: `${toCoord.y * cellSize}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
              }}
            >
              <span className="text-2xl opacity-60">👤</span>
            </div>

            {/* 점수 개선 라벨 */}
            {move.scoreImprovement > 0 && (
              <div
                className="absolute bg-green-500/80 text-white text-xs px-2 py-1 rounded font-bold shadow-lg"
                style={{
                  left: `${toCoord.x * cellSize + cellSize / 2}px`,
                  top: `${toCoord.y * cellSize - 24}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                +{move.scoreImprovement.toFixed(0)}
              </div>
            )}
          </div>
        )
      })}

      {/* 가구 배치 미리보기 */}
      {proposal.purchases.map((purchase, i) => {
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center bg-purple-500/30 border-2 border-purple-400 border-dashed rounded animate-pulse"
            style={{
              left: `${purchase.x * cellSize}px`,
              top: `${purchase.y * cellSize}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
          >
            <span className="text-3xl opacity-60">{getFurnitureEmoji(purchase.type)}</span>
          </div>
        )
      })}

      {/* 안내 메시지 */}
      {(proposal.moves.length > 0 || proposal.purchases.length > 0) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-xl">
          <p className="text-sm">
            💡 AI 제안 미리보기 |{' '}
            <span className="text-blue-300">{proposal.moves.length}개 이동</span>
            {proposal.purchases.length > 0 && (
              <>
                {' '}
                · <span className="text-purple-300">{proposal.purchases.length}개 가구</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function
function getFurnitureEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
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
