import { useMemo } from 'react'
import type { Employee } from '../../types'

/* ── SVG Furniture Sprites (isometric style, 32×32 viewBox) ── */

const DESK_SVG = `
  <polygon points="4,20 16,14 28,20 16,26" fill="#C69C6D" stroke="#8B6914" stroke-width="0.5"/>
  <rect x="5" y="20" width="2" height="6" fill="#8B6914"/>
  <rect x="25" y="20" width="2" height="6" fill="#8B6914"/>
  <rect x="8" y="15" width="8" height="5" fill="#D4D4D4" stroke="#808080" stroke-width="0.5"/>
  <rect x="9" y="16" width="6" height="3" fill="#000080"/>
`

const CHAIR_SVG = `
  <rect x="10" y="22" width="12" height="3" rx="1" fill="#404040"/>
  <rect x="14" y="14" width="4" height="8" fill="#606060"/>
  <rect x="10" y="12" width="12" height="3" rx="1" fill="#404040"/>
  <rect x="12" y="25" width="2" height="4" fill="#303030"/>
  <rect x="18" y="25" width="2" height="4" fill="#303030"/>
`

const PLANT_SVG = `
  <rect x="13" y="22" width="6" height="6" fill="#8B4513" stroke="#5C2D06" stroke-width="0.5"/>
  <ellipse cx="16" cy="20" rx="5" ry="4" fill="#228B22"/>
  <ellipse cx="14" cy="18" rx="3" ry="3" fill="#32CD32"/>
  <ellipse cx="18" cy="17" rx="3" ry="3" fill="#2E8B57"/>
`

const WATER_COOLER_SVG = `
  <rect x="12" y="12" width="8" height="16" fill="#E0E0E0" stroke="#808080" stroke-width="0.5"/>
  <rect x="13" y="8" width="6" height="5" rx="1" fill="#87CEEB" stroke="#4682B4" stroke-width="0.5"/>
  <rect x="14" y="20" width="4" height="2" fill="#808080"/>
`

/* ── Tile position helpers (isometric projection) ── */
const TILE_W = 48
const TILE_H = 24
const ORIGIN_X = 160
const ORIGIN_Y = 20

function isoPos(col: number, row: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * (TILE_H / 2),
  }
}

/* ── Employee sprite (isometric person) ── */
function EmployeeSprite({ emp, x, y }: { emp: Employee; x: number; y: number }) {
  const headColor = emp.stamina > 20 ? '#FFE0BD' : '#CCCCCC'
  const bodyColor = emp.stamina > 60 ? '#000080' : emp.stamina > 20 ? '#808000' : '#800000'
  const statusEmoji = emp.stamina <= 20 ? 'zzZ' : ''

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Body */}
      <rect x="11" y="14" width="10" height="10" fill={bodyColor} rx="1" />
      {/* Head */}
      <circle cx="16" cy="10" r="5" fill={headColor} stroke="#000" strokeWidth="0.3" />
      {/* Eyes */}
      {emp.stamina > 20 ? (
        <>
          <circle cx="14" cy="9" r="1" fill="#000" />
          <circle cx="18" cy="9" r="1" fill="#000" />
        </>
      ) : (
        <>
          <line x1="13" y1="9" x2="15" y2="9" stroke="#000" strokeWidth="0.8" />
          <line x1="17" y1="9" x2="19" y2="9" stroke="#000" strokeWidth="0.8" />
        </>
      )}
      {/* Status */}
      {statusEmoji && (
        <text x="22" y="6" fontSize="6" fill="#808080">
          {statusEmoji}
        </text>
      )}
      {/* Name tag */}
      <text x="16" y="30" textAnchor="middle" fontSize="5" fill="#333">
        {emp.name.slice(0, 3)}
      </text>
    </g>
  )
}

/* ── Floor tile ── */
function FloorTile({ col, row, highlight }: { col: number; row: number; highlight?: boolean }) {
  const { x, y } = isoPos(col, row)
  const fill = highlight ? '#D4E6B5' : (col + row) % 2 === 0 ? '#E8DCC8' : '#DDD0B8'
  return (
    <polygon
      points={`${x},${y + TILE_H / 2} ${x + TILE_W / 2},${y} ${x + TILE_W},${y + TILE_H / 2} ${x + TILE_W / 2},${y + TILE_H}`}
      fill={fill}
      stroke="#C0B090"
      strokeWidth="0.5"
    />
  )
}

/* ── Furniture item placed on the grid ── */
function FurnitureItem({ col, row, svg }: { col: number; row: number; svg: string }) {
  const { x, y } = isoPos(col, row)
  return (
    <svg
      x={x + 8}
      y={y - 12}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      style={{ imageRendering: 'pixelated' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/* ── Main isometric office component ── */
interface IsometricOfficeProps {
  employees: Employee[]
}

export function IsometricOffice({ employees }: IsometricOfficeProps) {
  const GRID_SIZE = 6

  // Pre-compute desk positions for employees
  const deskPositions = useMemo(() => {
    const positions: { col: number; row: number }[] = []
    for (let r = 1; r < GRID_SIZE - 1; r++) {
      for (let c = 1; c < GRID_SIZE - 1; c++) {
        if ((r + c) % 2 === 0) positions.push({ col: c, row: r })
      }
    }
    return positions
  }, [])

  return (
    <svg viewBox="0 0 340 200" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Floor tiles */}
      {Array.from({ length: GRID_SIZE }, (_, row) =>
        Array.from({ length: GRID_SIZE }, (_, col) => (
          <FloorTile key={`${col}-${row}`} col={col} row={row} />
        )),
      )}

      {/* Static furniture: plants in corners, water cooler */}
      <FurnitureItem col={0} row={0} svg={PLANT_SVG} />
      <FurnitureItem col={GRID_SIZE - 1} row={0} svg={PLANT_SVG} />
      <FurnitureItem col={0} row={GRID_SIZE - 1} svg={PLANT_SVG} />
      <FurnitureItem col={GRID_SIZE - 1} row={GRID_SIZE - 1} svg={WATER_COOLER_SVG} />

      {/* Desks + employees */}
      {deskPositions.map((pos, i) => {
        const emp = employees[i]
        const { x, y } = isoPos(pos.col, pos.row)
        return (
          <g key={`desk-${i}`}>
            <FurnitureItem col={pos.col} row={pos.row} svg={DESK_SVG} />
            {emp && (
              <>
                <FurnitureItem col={pos.col} row={pos.row} svg={CHAIR_SVG} />
                <EmployeeSprite emp={emp} x={x + 8} y={y - 16} />
              </>
            )}
          </g>
        )
      })}

      {/* Empty state text */}
      {employees.length === 0 && (
        <text x="170" y="110" textAnchor="middle" fontSize="8" fill="#808080">
          직원을 고용하면 사무실에 배치됩니다
        </text>
      )}
    </svg>
  )
}
