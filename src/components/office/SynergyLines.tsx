/**
 * Synergy Connection Lines
 *
 * 선택된 직원과 시너지가 있는 다른 직원들을 연결선으로 표시
 */

import { useMemo } from 'react'
import type { Employee } from '../../types'
import type { OfficeGrid } from '../../types/office'
import { calculateSynergy } from '../../systems/aiArchitect'

interface SynergyLinesProps {
  selectedEmployee: Employee | null
  employees: Employee[]
  grid: OfficeGrid
  cellSize: number // 그리드 셀 크기 (px)
}

export function SynergyLines({ selectedEmployee, employees, grid, cellSize }: SynergyLinesProps) {
  // 선택된 직원의 시너지 계산
  const synergies = useMemo(() => {
    if (!selectedEmployee || selectedEmployee.seatIndex == null) return null

    const synergyScore = calculateSynergy(selectedEmployee, selectedEmployee.seatIndex, grid, employees)

    return synergyScore
  }, [selectedEmployee, employees, grid])

  if (!selectedEmployee || !synergies) return null

  const gridWidth = grid.size.width

  // 인덱스를 (x, y) 좌표로 변환
  const indexToCoord = (index: number) => {
    const x = index % gridWidth
    const y = Math.floor(index / gridWidth)
    return { x, y }
  }

  const selectedCoord = indexToCoord(selectedEmployee.seatIndex!)

  return (
    <svg className="absolute inset-0 pointer-events-none z-5" style={{ overflow: 'visible' }}>
      <defs>
        {/* 양방향 화살표 마커 */}
        <marker
          id="arrowhead-positive"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
        </marker>
        <marker
          id="arrowhead-negative"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>

        {/* Glow 효과 */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 시너지 연결선 */}
      {synergies.contributors.map((contrib, index) => {
        // 직원 ID인 경우에만 연결선 그리기 (trait_bonus, furniture_buff 등은 제외)
        if (!contrib.source.match(/^emp_/)) return null

        const partner = employees.find((e) => e.id === contrib.source)
        if (!partner || partner.seatIndex == null) return null

        const partnerCoord = indexToCoord(partner.seatIndex)

        const fromX = selectedCoord.x * cellSize + cellSize / 2
        const fromY = selectedCoord.y * cellSize + cellSize / 2
        const toX = partnerCoord.x * cellSize + cellSize / 2
        const toY = partnerCoord.y * cellSize + cellSize / 2

        const isPositive = contrib.bonus > 0
        const strokeColor = isPositive ? '#22c55e' : '#ef4444'
        const strokeWidth = Math.min(Math.abs(contrib.bonus) / 5 + 1, 4) // bonus 크기에 따라 선 두께 조정

        return (
          <g key={`${contrib.source}-${index}`}>
            {/* 연결선 */}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray="6 3"
              opacity="0.8"
              markerEnd={isPositive ? 'url(#arrowhead-positive)' : 'url(#arrowhead-negative)'}
              filter="url(#glow)"
            >
              {/* 애니메이션: 선이 천천히 나타남 */}
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>

            {/* 보너스 라벨 */}
            <text
              x={(fromX + toX) / 2}
              y={(fromY + toY) / 2}
              fill="white"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="black"
              strokeWidth="3"
              paintOrder="stroke"
            >
              {isPositive && '+'}
              {contrib.bonus}
            </text>

            {/* 설명 툴팁 (호버 시 표시) */}
            <title>{contrib.description}</title>
          </g>
        )
      })}

      {/* 선택된 직원 하이라이트 */}
      <circle
        cx={selectedCoord.x * cellSize + cellSize / 2}
        cy={selectedCoord.y * cellSize + cellSize / 2}
        r={cellSize / 2 + 4}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
        strokeDasharray="4 2"
        opacity="0.6"
      >
        <animate attributeName="r" from={cellSize / 2 + 2} to={cellSize / 2 + 8} dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0.4" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* 시너지 점수 표시 */}
      <g>
        <rect
          x={selectedCoord.x * cellSize + cellSize - 32}
          y={selectedCoord.y * cellSize - 28}
          width="64"
          height="24"
          fill="rgba(0, 0, 0, 0.8)"
          stroke="#3b82f6"
          strokeWidth="2"
          rx="4"
        />
        <text
          x={selectedCoord.x * cellSize + cellSize}
          y={selectedCoord.y * cellSize - 16}
          fill={synergies.value >= 70 ? '#22c55e' : synergies.value >= 50 ? '#fbbf24' : '#ef4444'}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
        >
          {synergies.value.toFixed(0)}
        </text>
      </g>
    </svg>
  )
}
