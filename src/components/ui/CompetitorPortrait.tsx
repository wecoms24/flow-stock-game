/* ── [Design Track] SVG 16×16 Pixel Art Portraits for AI Competitors ── */
/* Each portrait uses a 16×16 grid; every "pixel" is a 3×3 SVG rect (48×48 actual). */
/* Mood changes swap the face region (rows 4–10) while body/hair remain constant.  */

import { memo, useMemo } from 'react'

/* ── Win95-era palette ── */
const _ = null // transparent
const SKIN = '#FFE0BD'
const SKIN_S = '#D4A574' // skin shadow
const HAIR_D = '#2C1810' // dark hair
const HAIR_L = '#C4A35A' // light/blonde hair
const HAIR_G = '#B0B0B0' // gray hair
const NAVY = '#000080'
const NAVY_D = '#00006B'
const GREEN = '#228B22'
const GREEN_D = '#006400'
const BROWN = '#8B4513'
const BROWN_D = '#5C2D06'
const WHITE = '#FFFFFF'
const WHITE_S = '#E0E0E0' // shirt shadow
const GLASS = '#404040'
const GLASS_L = '#808080'
const RED = '#CC0000'
// palette reserved: RED_L = '#FF4444'
const BLUE = '#4488FF'
const ORANGE = '#FF8800'
const YELLOW = '#FFCC00'
const BLACK = '#000000'
const MOUTH = '#CC4444'
const TEETH = '#FFFFEE'
const PINK = '#FFB0B0'
// palette reserved: TAN = '#D2B48C'
const FUR = '#A0522D'

/* ── Type for a 16×16 pixel grid (null = transparent) ── */
type PixelRow = (string | null)[]
type PixelGrid = PixelRow[]

/* ── Shark (aggressive) ── */

const SHARK_BASE_TOP: PixelGrid = [
  //0     1       2       3       4       5       6       7       8       9       10      11      12      13      14      15
  [_, _, _, _, _, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, _, _, _, _, _],
  [_, _, _, _, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, _, _, _, _],
  [_, _, _, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, HAIR_D, _, _, _, _],
  [_, _, _, HAIR_D, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, HAIR_D, _, _, _],
]

const SHARK_BASE_BOTTOM: PixelGrid = [
  // row 10 (chin)
  [_, _, _, _, _, SKIN_S, SKIN_S, SKIN_S, SKIN_S, SKIN_S, SKIN_S, _, _, _, _, _],
  // row 11 (neck + collar)
  [_, _, _, _, _, _, WHITE, WHITE, WHITE, WHITE, _, _, _, _, _, _],
  // row 12 (suit top + tie)
  [_, _, _, _, NAVY, WHITE, WHITE, RED, RED, WHITE, WHITE, NAVY, _, _, _, _],
  // row 13 (suit)
  [_, _, _, NAVY, NAVY, NAVY, NAVY_D, RED, RED, NAVY_D, NAVY, NAVY, NAVY, _, _, _],
  // row 14 (suit)
  [_, _, NAVY, NAVY, NAVY, NAVY, NAVY_D, NAVY_D, NAVY_D, NAVY_D, NAVY, NAVY, NAVY, NAVY, _, _],
  // row 15 (suit)
  [_, _, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, _, _],
]

const SHARK_FACE_NORMAL: PixelGrid = [
  // row 4
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 5 (eyes)
  [_, _, _, SKIN, SKIN, NAVY_D, NAVY_D, SKIN, SKIN, NAVY_D, NAVY_D, SKIN, SKIN, _, _, _],
  // row 6
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 7 (nose)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  // row 8 (mouth - smirk)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _],
  // row 9 (jaw)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const SHARK_FACE_WINNING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, NAVY_D, NAVY_D, SKIN, SKIN, NAVY_D, NAVY_D, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, TEETH, TEETH, MOUTH, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, MOUTH, MOUTH, SKIN, SKIN, SKIN, _, _, _, _],
]

const SHARK_FACE_LOSING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN_S, NAVY_D, NAVY_D, SKIN, SKIN, NAVY_D, NAVY_D, SKIN_S, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, MOUTH, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN_S, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN, _, _, _, _],
]

const SHARK_FACE_PANIC: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, WHITE, NAVY_D, NAVY_D, SKIN, SKIN, NAVY_D, NAVY_D, WHITE, SKIN, _, _, _],
  [_, _, _, SKIN, WHITE, NAVY_D, SKIN, SKIN, SKIN, SKIN, NAVY_D, WHITE, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, MOUTH, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, MOUTH, MOUTH, BLACK, BLACK, MOUTH, MOUTH, SKIN, _, _, _, _],
]

/* ── Turtle (conservative) ── */

const TURTLE_BASE_TOP: PixelGrid = [
  [_, _, _, _, _, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, _, _, _, _, _],
  [_, _, _, _, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, HAIR_G, _, _, _, _],
  [_, _, _, HAIR_G, HAIR_G, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, HAIR_G, HAIR_G, _, _, _],
  [_, _, _, HAIR_G, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, HAIR_G, _, _, _],
]

const TURTLE_BASE_BOTTOM: PixelGrid = [
  // row 10 (chin, round)
  [_, _, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  // row 11 (bow tie + collar)
  [_, _, _, _, _, WHITE, GREEN_D, GREEN_D, GREEN_D, WHITE, _, _, _, _, _, _],
  // row 12 (vest)
  [_, _, _, _, GREEN, WHITE, GREEN, GREEN, GREEN, WHITE, GREEN, _, _, _, _, _],
  // row 13 (vest)
  [_, _, _, GREEN, GREEN, WHITE_S, GREEN, GREEN, GREEN, WHITE_S, GREEN, GREEN, _, _, _, _],
  // row 14 (vest)
  [_, _, _, GREEN, GREEN, WHITE_S, GREEN, GREEN, GREEN, WHITE_S, GREEN, GREEN, _, _, _, _],
  // row 15 (vest)
  [_, _, _, GREEN, GREEN, WHITE, GREEN, GREEN, GREEN, WHITE, GREEN, GREEN, _, _, _, _],
]

const TURTLE_FACE_NORMAL: PixelGrid = [
  // row 4
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 5 (eyes with glasses)
  [_, _, GLASS, GLASS, GLASS, BROWN, GLASS, SKIN, GLASS, BROWN, GLASS, GLASS, GLASS, _, _, _],
  // row 6 (glasses bottom)
  [_, _, _, GLASS, GLASS, GLASS, GLASS, SKIN, GLASS, GLASS, GLASS, GLASS, _, _, _, _],
  // row 7 (nose)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  // row 8 (gentle smile)
  [_, _, _, _, SKIN, SKIN, SKIN, PINK, PINK, SKIN, SKIN, SKIN, _, _, _, _],
  // row 9 (round jaw)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const TURTLE_FACE_WINNING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, GLASS, GLASS, SKIN_S, BROWN, GLASS, SKIN, GLASS, BROWN, SKIN_S, GLASS, GLASS, _, _, _],
  [_, _, _, GLASS, GLASS, GLASS, GLASS, SKIN, GLASS, GLASS, GLASS, GLASS, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, PINK, PINK, PINK, PINK, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const TURTLE_FACE_LOSING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, GLASS, GLASS, GLASS, BROWN, GLASS, SKIN, GLASS, BROWN, GLASS, GLASS, GLASS, _, _, _],
  [_, _, _, GLASS, GLASS, GLASS, GLASS, SKIN, GLASS, GLASS, GLASS, GLASS, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const TURTLE_FACE_PANIC: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, GLASS, GLASS, BROWN, GLASS, SKIN, GLASS, BROWN, GLASS, GLASS, GLASS_L, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, SKIN, GLASS, GLASS, GLASS, SKIN, GLASS_L, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, MOUTH, MOUTH, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, BLACK, BLACK, MOUTH, SKIN, SKIN, _, _, _, _],
]

/* ── Surfer (trend-follower) ── */

const SURFER_BASE_TOP: PixelGrid = [
  [_, _, _, _, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, _, _, _, _, _],
  [_, _, _, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, _, _, _, _],
  [_, _, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, HAIR_L, _, _, _],
  [_, _, HAIR_L, HAIR_L, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, HAIR_L, _, _, _],
]

const SURFER_BASE_BOTTOM: PixelGrid = [
  // row 10 (chin)
  [_, _, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  // row 11 (neck)
  [_, _, _, _, _, _, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _, _],
  // row 12 (open shirt collar + t-shirt)
  [_, _, _, _, ORANGE, BLUE, WHITE, WHITE, WHITE, WHITE, BLUE, ORANGE, _, _, _, _],
  // row 13 (hawaiian shirt)
  [_, _, _, ORANGE, BLUE, ORANGE, WHITE, WHITE, WHITE, WHITE, ORANGE, BLUE, ORANGE, _, _, _],
  // row 14 (shirt pattern)
  [_, _, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, _, _],
  // row 15 (shirt)
  [_, _, ORANGE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, BLUE, ORANGE, ORANGE, ORANGE, _, _],
]

const SURFER_FACE_NORMAL: PixelGrid = [
  // row 4
  [_, _, HAIR_L, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 5 (sunglasses)
  [_, _, _, SKIN, BLUE, BLUE, BLUE, GLASS, ORANGE, ORANGE, ORANGE, SKIN, SKIN, _, _, _],
  // row 6 (sunglasses bottom)
  [_, _, _, SKIN, BLUE, BLUE, BLUE, GLASS, ORANGE, ORANGE, ORANGE, SKIN, SKIN, _, _, _],
  // row 7 (nose)
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  // row 8 (relaxed smile)
  [_, _, _, _, SKIN, SKIN, SKIN, PINK, PINK, SKIN, SKIN, SKIN, _, _, _, _],
  // row 9
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const SURFER_FACE_WINNING: PixelGrid = [
  [_, _, HAIR_L, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, BLUE, BLUE, BLUE, GLASS, ORANGE, ORANGE, ORANGE, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, BLUE, BLUE, BLUE, GLASS, ORANGE, ORANGE, ORANGE, SKIN, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, MOUTH, TEETH, TEETH, TEETH, TEETH, MOUTH, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const SURFER_FACE_LOSING: PixelGrid = [
  [_, _, HAIR_L, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, BLUE, BLUE, GLASS, ORANGE, ORANGE, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

const SURFER_FACE_PANIC: PixelGrid = [
  [_, _, HAIR_L, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, WHITE, BLACK, BLACK, SKIN, WHITE, BLACK, BLACK, SKIN, SKIN, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, BLACK, BLACK, MOUTH, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
]

/* ── Bear (contrarian) ── */

const BEAR_BASE_TOP: PixelGrid = [
  [_, _, _, _, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, _, _, _, _],
  [_, _, _, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, _, _, _],
  [_, _, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, _, _, _],
  [_, _, BROWN, BROWN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, BROWN, BROWN, _, _],
]

const BEAR_BASE_BOTTOM: PixelGrid = [
  // row 10 (beard lower)
  [_, _, _, _, BROWN, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN, _, _, _, _],
  // row 11 (beard tip + collar)
  [_, _, _, _, _, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, _, _, _, _, _, _],
  // row 12 (coat collar with fur)
  [_, _, _, BROWN_D, FUR, FUR, BROWN_D, BROWN_D, BROWN_D, FUR, FUR, BROWN_D, _, _, _, _],
  // row 13 (coat)
  [_, _, _, BROWN, BROWN, FUR, BROWN, BROWN, BROWN, FUR, BROWN, BROWN, _, _, _, _],
  // row 14 (coat)
  [_, _, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, _, _, _],
  // row 15 (coat)
  [_, _, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, BROWN, _, _, _],
]

const BEAR_FACE_NORMAL: PixelGrid = [
  // row 4
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 5 (small deep-set eyes)
  [_, _, _, SKIN, SKIN_S, BLACK, SKIN, SKIN, SKIN, BLACK, SKIN_S, SKIN, SKIN, _, _, _],
  // row 6
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  // row 7 (nose)
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, SKIN, YELLOW, _, _],
  // row 8 (beard top + neutral mouth)
  [_, _, _, BROWN, BROWN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, BROWN, BROWN, _, _, _],
  // row 9 (beard)
  [_, _, _, _, BROWN, BROWN_D, BROWN_D, SKIN_S, SKIN_S, BROWN_D, BROWN_D, BROWN, _, _, _, _],
]

const BEAR_FACE_WINNING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN_S, BLACK, SKIN, SKIN, SKIN, BLACK, SKIN_S, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, SKIN, YELLOW, _, _],
  [_, _, _, BROWN, BROWN, SKIN, SKIN, PINK, PINK, SKIN, SKIN, BROWN, BROWN, _, _, _],
  [_, _, _, _, BROWN, BROWN_D, BROWN_D, SKIN_S, SKIN_S, BROWN_D, BROWN_D, BROWN, _, _, _, _],
]

const BEAR_FACE_LOSING: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN_S, BLACK, SKIN_S, SKIN, SKIN_S, BLACK, SKIN_S, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, SKIN, YELLOW, _, _],
  [_, _, _, BROWN, BROWN, SKIN_S, SKIN_S, SKIN_S, SKIN_S, SKIN_S, SKIN_S, BROWN, BROWN, _, _, _],
  [_, _, _, _, BROWN, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN, _, _, _, _],
]

const BEAR_FACE_PANIC: PixelGrid = [
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, WHITE, BLACK, WHITE, SKIN, WHITE, BLACK, WHITE, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN_S, SKIN, SKIN, SKIN, SKIN, _, _, _],
  [_, _, _, BROWN, BROWN, SKIN, MOUTH, BLACK, BLACK, MOUTH, SKIN, BROWN, BROWN, _, _, _],
  [_, _, _, _, BROWN, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN_D, BROWN, _, _, _, _],
]

/* ── Grid assembly lookup ── */

type Mood = 'normal' | 'winning' | 'losing' | 'panic'
type Style = 'aggressive' | 'conservative' | 'trend-follower' | 'contrarian'

interface CharacterData {
  top: PixelGrid
  bottom: PixelGrid
  faces: Record<Mood, PixelGrid>
}

const CHARACTERS: Record<Style, CharacterData> = {
  aggressive: {
    top: SHARK_BASE_TOP,
    bottom: SHARK_BASE_BOTTOM,
    faces: {
      normal: SHARK_FACE_NORMAL,
      winning: SHARK_FACE_WINNING,
      losing: SHARK_FACE_LOSING,
      panic: SHARK_FACE_PANIC,
    },
  },
  conservative: {
    top: TURTLE_BASE_TOP,
    bottom: TURTLE_BASE_BOTTOM,
    faces: {
      normal: TURTLE_FACE_NORMAL,
      winning: TURTLE_FACE_WINNING,
      losing: TURTLE_FACE_LOSING,
      panic: TURTLE_FACE_PANIC,
    },
  },
  'trend-follower': {
    top: SURFER_BASE_TOP,
    bottom: SURFER_BASE_BOTTOM,
    faces: {
      normal: SURFER_FACE_NORMAL,
      winning: SURFER_FACE_WINNING,
      losing: SURFER_FACE_LOSING,
      panic: SURFER_FACE_PANIC,
    },
  },
  contrarian: {
    top: BEAR_BASE_TOP,
    bottom: BEAR_BASE_BOTTOM,
    faces: {
      normal: BEAR_FACE_NORMAL,
      winning: BEAR_FACE_WINNING,
      losing: BEAR_FACE_LOSING,
      panic: BEAR_FACE_PANIC,
    },
  },
}

/* ── Rendering helper: converts a 16×16 grid into <rect> elements ── */

function buildRects(grid: PixelGrid): React.ReactElement[] {
  const rects: React.ReactElement[] = []
  for (let row = 0; row < grid.length; row++) {
    const cols = grid[row]
    for (let col = 0; col < cols.length; col++) {
      const color = cols[col]
      if (color !== null) {
        rects.push(
          <rect
            key={`${row}-${col}`}
            x={col * 3}
            y={row * 3}
            width={3}
            height={3}
            fill={color}
          />,
        )
      }
    }
  }
  return rects
}

/* ── Component ── */

interface CompetitorPortraitProps {
  style: Style
  mood?: Mood
  size?: number
  className?: string
}

export const CompetitorPortrait = memo(function CompetitorPortrait({
  style,
  mood = 'normal',
  size = 48,
  className,
}: CompetitorPortraitProps) {
  const character = CHARACTERS[style]

  const topRects = useMemo(() => buildRects(character.top), [character.top])

  const faceGrid = character.faces[mood]
  const faceRects = useMemo(() => {
    // Face rows start at row 4 in the full 16×16 grid
    const rects: React.ReactElement[] = []
    for (let row = 0; row < faceGrid.length; row++) {
      const cols = faceGrid[row]
      for (let col = 0; col < cols.length; col++) {
        const color = cols[col]
        if (color !== null) {
          rects.push(
            <rect
              key={`f${row}-${col}`}
              x={col * 3}
              y={(row + 4) * 3}
              width={3}
              height={3}
              fill={color}
            />,
          )
        }
      }
    }
    return rects
  }, [faceGrid])

  const bottomRects = useMemo(() => {
    // Bottom rows start at row 10 in the full 16×16 grid
    const rects: React.ReactElement[] = []
    const grid = character.bottom
    for (let row = 0; row < grid.length; row++) {
      const cols = grid[row]
      for (let col = 0; col < cols.length; col++) {
        const color = cols[col]
        if (color !== null) {
          rects.push(
            <rect
              key={`b${row}-${col}`}
              x={col * 3}
              y={(row + 10) * 3}
              width={3}
              height={3}
              fill={color}
            />,
          )
        }
      }
    }
    return rects
  }, [character.bottom])

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-label={`${style} competitor (${mood})`}
    >
      {topRects}
      {faceRects}
      {bottomRects}
    </svg>
  )
})
