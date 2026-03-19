/**
 * Pixel Art Sprite Rendering System
 *
 * Canvas 2D pixel art rendering for employee avatars (32x40) and furniture (32x32).
 * Uses a 2x scale: each logical pixel = 2x2 actual pixels.
 * All coordinates are integers for crisp rendering.
 */

import type { EmployeeRole, BadgeType } from '../types'
import type { FurnitureType } from '../types/office'

type BehaviorState =
  | 'WORKING'
  | 'IDLE'
  | 'BREAK'
  | 'SOCIALIZING'
  | 'COFFEE'
  | 'MEETING'
  | 'STRESSED_OUT'
  | 'COUNSELING'
  | 'PANIC'

export interface EmployeeSpriteOptions {
  role: EmployeeRole
  badge: BadgeType
  behavior: BehaviorState
  hairStyle?: number // 0-2
  isMale?: boolean
}

// ─── Color Palette ───────────────────────────────────────────────────────────

const COLORS = {
  // Skin
  skin: '#FFE0BD',
  skinOutline: '#D4A574',
  skinShadow: '#E8C9A0',
  skinBlush: '#FFB8B8',

  // Hair
  hairBlack: '#2C2C2C',
  hairBrown: '#6B3A2A',
  hairDark: '#3D2B1F',

  // Eyes
  eyeWhite: '#FFFFFF',
  eyePupil: '#1A1A2E',

  // Mouth
  mouth: '#CC7766',

  // Badge colors
  badgeGray: '#808080',
  badgeBlue: '#0000AA',
  badgePurple: '#8B008B',
  badgeGold: '#DAA520',

  // Role-specific clothing
  analystShirt: '#4488CC',
  analystGlasses: '#333333',
  analystGlassesLens: '#88BBEE',
  traderShirt: '#336699',
  traderTie: '#CC2222',
  managerSuit: '#1B2A4A',
  managerSuitLight: '#2A3D5C',
  managerShoulder: '#141F38',
  internShirt: '#66AADD',
  internShirtLight: '#88CCEE',
  ceoShirt: '#2C2C54',
  ceoCrown: '#DAA520',
  ceoCrownGem: '#CC2222',
  hrShirt: '#558866',
  hrClipboard: '#D4A574',
  hrClipboardPaper: '#F0F0F0',

  // Pants
  pants: '#2C3E50',
  pantsLight: '#34495E',

  // Accessories
  cupBrown: '#8B4513',
  cupCoffee: '#3E2723',
  steam: '#CCCCCC',
  sweatDrop: '#66BBFF',
  speechLine: '#555555',
  motionLine: '#888888',
  exclamation: '#FF0000',
  shakeLines: '#FF4444',

  // General
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const

// ─── Helper: Draw a single 2x2 pixel ────────────────────────────────────────

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x * 2, y * 2, 2, 2)
}

// ─── Helper: Draw a horizontal line of pixels ───────────────────────────────

function pxRow(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  width: number,
  color: string,
): void {
  ctx.fillStyle = color
  for (let i = 0; i < width; i++) {
    ctx.fillRect((startX + i) * 2, y * 2, 2, 2)
  }
}

// ─── Helper: Draw a filled rectangle of pixels ─────────────────────────────

function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      ctx.fillRect((x + col) * 2, (y + row) * 2, 2, 2)
    }
  }
}

// ─── Badge Color Lookup ─────────────────────────────────────────────────────

function getBadgeColor(badge: BadgeType): string {
  switch (badge) {
    case 'gray':
      return COLORS.badgeGray
    case 'blue':
      return COLORS.badgeBlue
    case 'purple':
      return COLORS.badgePurple
    case 'gold':
      return COLORS.badgeGold
    default:
      return COLORS.badgeGray
  }
}

// ─── Role Shirt Color ───────────────────────────────────────────────────────

function getShirtColor(role: EmployeeRole): string {
  switch (role) {
    case 'analyst':
      return COLORS.analystShirt
    case 'trader':
      return COLORS.traderShirt
    case 'manager':
      return COLORS.managerSuit
    case 'intern':
      return COLORS.internShirt
    case 'ceo':
      return COLORS.ceoShirt
    case 'hr_manager':
      return COLORS.hrShirt
    default:
      return COLORS.analystShirt
  }
}

// ─── Hair Rendering ─────────────────────────────────────────────────────────

function drawHair(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  style: number,
  isMale: boolean,
): void {
  const hairColor = style === 0 ? COLORS.hairBlack : style === 1 ? COLORS.hairBrown : COLORS.hairDark

  if (!isMale && style === 2) {
    // Female long hair variant: fuller sides with bangs
    pxRow(ctx, ox + 4, oy - 1, 4, hairColor)
    pxRow(ctx, ox + 3, oy + 0, 6, hairColor)
    pxRow(ctx, ox + 2, oy + 1, 8, hairColor)
    pxRow(ctx, ox + 2, oy + 2, 8, hairColor)
    // Bangs across forehead
    pxRow(ctx, ox + 3, oy + 3, 6, hairColor)
    // Long flowing sides
    px(ctx, ox + 1, oy + 3, hairColor)
    px(ctx, ox + 1, oy + 4, hairColor)
    px(ctx, ox + 1, oy + 5, hairColor)
    px(ctx, ox + 1, oy + 6, hairColor)
    px(ctx, ox + 1, oy + 7, hairColor)
    px(ctx, ox + 1, oy + 8, hairColor)
    px(ctx, ox + 10, oy + 3, hairColor)
    px(ctx, ox + 10, oy + 4, hairColor)
    px(ctx, ox + 10, oy + 5, hairColor)
    px(ctx, ox + 10, oy + 6, hairColor)
    px(ctx, ox + 10, oy + 7, hairColor)
    px(ctx, ox + 10, oy + 8, hairColor)
    return
  }

  switch (style) {
    case 0:
      // Short hair: flat top
      pxRow(ctx, ox + 3, oy + 0, 6, hairColor)
      pxRow(ctx, ox + 2, oy + 1, 8, hairColor)
      pxRow(ctx, ox + 2, oy + 2, 8, hairColor)
      px(ctx, ox + 2, oy + 3, hairColor)
      px(ctx, ox + 9, oy + 3, hairColor)
      break
    case 1:
      // Medium hair: slightly taller, side parts
      pxRow(ctx, ox + 4, oy - 1, 4, hairColor)
      pxRow(ctx, ox + 3, oy + 0, 6, hairColor)
      pxRow(ctx, ox + 2, oy + 1, 8, hairColor)
      pxRow(ctx, ox + 2, oy + 2, 8, hairColor)
      px(ctx, ox + 2, oy + 3, hairColor)
      px(ctx, ox + 2, oy + 4, hairColor)
      px(ctx, ox + 9, oy + 3, hairColor)
      px(ctx, ox + 9, oy + 4, hairColor)
      break
    case 2:
      // Long hair: flowing down sides
      pxRow(ctx, ox + 3, oy + 0, 6, hairColor)
      pxRow(ctx, ox + 2, oy + 1, 8, hairColor)
      pxRow(ctx, ox + 2, oy + 2, 8, hairColor)
      px(ctx, ox + 2, oy + 3, hairColor)
      px(ctx, ox + 1, oy + 3, hairColor)
      px(ctx, ox + 1, oy + 4, hairColor)
      px(ctx, ox + 1, oy + 5, hairColor)
      px(ctx, ox + 1, oy + 6, hairColor)
      px(ctx, ox + 9, oy + 3, hairColor)
      px(ctx, ox + 10, oy + 3, hairColor)
      px(ctx, ox + 10, oy + 4, hairColor)
      px(ctx, ox + 10, oy + 5, hairColor)
      px(ctx, ox + 10, oy + 6, hairColor)
      break
  }
}

// ─── Face Rendering ─────────────────────────────────────────────────────────

function drawFace(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  isStressed: boolean,
): void {
  // Head outline (8x8, starting from ox+2, oy+2)
  // Top of head
  pxRow(ctx, ox + 3, oy + 2, 6, COLORS.skinOutline)
  // Sides
  px(ctx, ox + 2, oy + 3, COLORS.skinOutline)
  px(ctx, ox + 9, oy + 3, COLORS.skinOutline)
  px(ctx, ox + 2, oy + 4, COLORS.skinOutline)
  px(ctx, ox + 9, oy + 4, COLORS.skinOutline)
  px(ctx, ox + 2, oy + 5, COLORS.skinOutline)
  px(ctx, ox + 9, oy + 5, COLORS.skinOutline)
  px(ctx, ox + 2, oy + 6, COLORS.skinOutline)
  px(ctx, ox + 9, oy + 6, COLORS.skinOutline)
  px(ctx, ox + 2, oy + 7, COLORS.skinOutline)
  px(ctx, ox + 9, oy + 7, COLORS.skinOutline)
  // Chin
  px(ctx, ox + 3, oy + 8, COLORS.skinOutline)
  pxRow(ctx, ox + 4, oy + 9, 4, COLORS.skinOutline)
  px(ctx, ox + 8, oy + 8, COLORS.skinOutline)

  // Face fill
  const faceColor = isStressed ? COLORS.skinBlush : COLORS.skin
  pxRow(ctx, ox + 3, oy + 3, 6, faceColor)
  pxRow(ctx, ox + 3, oy + 4, 6, faceColor)
  pxRow(ctx, ox + 3, oy + 5, 6, faceColor)
  pxRow(ctx, ox + 3, oy + 6, 6, faceColor)
  pxRow(ctx, ox + 3, oy + 7, 6, faceColor)
  pxRow(ctx, ox + 4, oy + 8, 4, faceColor)

  // Shadow under hair
  pxRow(ctx, ox + 3, oy + 3, 6, COLORS.skinShadow)

  // Eyes (2px wide each, at row 5)
  px(ctx, ox + 4, oy + 5, COLORS.eyeWhite)
  px(ctx, ox + 5, oy + 5, COLORS.eyePupil)
  px(ctx, ox + 7, oy + 5, COLORS.eyePupil)
  px(ctx, ox + 8, oy + 5, COLORS.eyeWhite)

  // Mouth (row 7)
  px(ctx, ox + 5, oy + 7, COLORS.mouth)
  px(ctx, ox + 6, oy + 7, COLORS.mouth)
}

// ─── Body Rendering ─────────────────────────────────────────────────────────

function drawBody(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  role: EmployeeRole,
  badge: BadgeType,
): void {
  const shirtColor = getShirtColor(role)

  // Neck
  px(ctx, ox + 5, oy + 10, COLORS.skin)
  px(ctx, ox + 6, oy + 10, COLORS.skin)

  // Torso (8x10 from ox+2, oy+11)
  // Shoulders
  pxRow(ctx, ox + 1, oy + 11, 10, shirtColor)
  pxRow(ctx, ox + 1, oy + 12, 10, shirtColor)

  // Main body
  for (let row = 13; row <= 18; row++) {
    pxRow(ctx, ox + 2, oy + row, 8, shirtColor)
  }

  // Manager: shoulder pads (darker on edges)
  if (role === 'manager') {
    px(ctx, ox + 1, oy + 11, COLORS.managerShoulder)
    px(ctx, ox + 10, oy + 11, COLORS.managerShoulder)
    px(ctx, ox + 0, oy + 11, COLORS.managerShoulder)
    px(ctx, ox + 11, oy + 11, COLORS.managerShoulder)
    px(ctx, ox + 0, oy + 12, COLORS.managerSuitLight)
    px(ctx, ox + 11, oy + 12, COLORS.managerSuitLight)
  }

  // Intern: lighter t-shirt highlight stripe
  if (role === 'intern') {
    pxRow(ctx, ox + 4, oy + 13, 4, COLORS.internShirtLight)
    pxRow(ctx, ox + 4, oy + 14, 4, COLORS.internShirtLight)
  }

  // Badge diamond on chest (center of torso)
  const badgeColor = getBadgeColor(badge)
  px(ctx, ox + 6, oy + 13, badgeColor)
  px(ctx, ox + 5, oy + 14, badgeColor)
  px(ctx, ox + 7, oy + 14, badgeColor)
  px(ctx, ox + 6, oy + 15, badgeColor)

  // Arms (default position: at sides)
  // Left arm
  px(ctx, ox + 1, oy + 13, shirtColor)
  px(ctx, ox + 1, oy + 14, shirtColor)
  px(ctx, ox + 1, oy + 15, COLORS.skin)
  px(ctx, ox + 1, oy + 16, COLORS.skin)

  // Right arm
  px(ctx, ox + 10, oy + 13, shirtColor)
  px(ctx, ox + 10, oy + 14, shirtColor)
  px(ctx, ox + 10, oy + 15, COLORS.skin)
  px(ctx, ox + 10, oy + 16, COLORS.skin)

  // Pants
  pxRow(ctx, ox + 3, oy + 19, 6, COLORS.pants)
  // Legs
  pxRect(ctx, ox + 3, oy + 19, 2, 1, COLORS.pants)
  pxRect(ctx, ox + 7, oy + 19, 2, 1, COLORS.pants)
}

// ─── Role-Specific Accessories ──────────────────────────────────────────────

function drawRoleAccessories(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  role: EmployeeRole,
): void {
  switch (role) {
    case 'analyst':
      // Glasses: small rectangles on eyes
      // Left lens frame
      px(ctx, ox + 3, oy + 4, COLORS.analystGlasses)
      px(ctx, ox + 3, oy + 5, COLORS.analystGlasses)
      px(ctx, ox + 3, oy + 6, COLORS.analystGlasses)
      px(ctx, ox + 4, oy + 4, COLORS.analystGlassesLens)
      px(ctx, ox + 5, oy + 4, COLORS.analystGlasses)
      px(ctx, ox + 5, oy + 6, COLORS.analystGlasses)
      // Bridge
      px(ctx, ox + 6, oy + 5, COLORS.analystGlasses)
      // Right lens frame
      px(ctx, ox + 7, oy + 4, COLORS.analystGlasses)
      px(ctx, ox + 7, oy + 6, COLORS.analystGlasses)
      px(ctx, ox + 8, oy + 4, COLORS.analystGlassesLens)
      px(ctx, ox + 9, oy + 4, COLORS.analystGlasses)
      px(ctx, ox + 9, oy + 5, COLORS.analystGlasses)
      px(ctx, ox + 9, oy + 6, COLORS.analystGlasses)
      break

    case 'trader':
      // Red tie on body
      px(ctx, ox + 6, oy + 11, COLORS.traderTie)
      px(ctx, ox + 5, oy + 12, COLORS.traderTie)
      px(ctx, ox + 6, oy + 12, COLORS.traderTie)
      px(ctx, ox + 6, oy + 13, COLORS.traderTie)
      px(ctx, ox + 6, oy + 14, COLORS.traderTie)
      px(ctx, ox + 6, oy + 15, COLORS.traderTie)
      px(ctx, ox + 5, oy + 16, COLORS.traderTie)
      px(ctx, ox + 6, oy + 16, COLORS.traderTie)
      px(ctx, ox + 7, oy + 16, COLORS.traderTie)
      break

    case 'ceo':
      // Golden crown above head
      px(ctx, ox + 4, oy - 2, COLORS.ceoCrown)
      px(ctx, ox + 5, oy - 3, COLORS.ceoCrown)
      px(ctx, ox + 6, oy - 2, COLORS.ceoCrown)
      px(ctx, ox + 7, oy - 3, COLORS.ceoCrown)
      px(ctx, ox + 8, oy - 2, COLORS.ceoCrown)
      pxRow(ctx, ox + 4, oy - 1, 5, COLORS.ceoCrown)
      // Crown gem
      px(ctx, ox + 6, oy - 2, COLORS.ceoCrownGem)
      break

    case 'hr_manager':
      // Clipboard in left hand
      // Board
      pxRect(ctx, ox - 1, oy + 13, 2, 4, COLORS.hrClipboard)
      // Paper on board
      px(ctx, ox - 1, oy + 14, COLORS.hrClipboardPaper)
      px(ctx, ox + 0, oy + 14, COLORS.hrClipboardPaper)
      px(ctx, ox - 1, oy + 15, COLORS.hrClipboardPaper)
      px(ctx, ox + 0, oy + 15, COLORS.hrClipboardPaper)
      // Clip at top
      px(ctx, ox + 0, oy + 13, COLORS.badgeGray)
      break

    case 'manager':
      // Manager suit already handled in drawBody
      break
    case 'intern':
      // Intern casual look already handled in drawBody
      break
  }
}

// ─── Behavior State Effects ─────────────────────────────────────────────────

function drawBehaviorEffects(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  behavior: BehaviorState,
  role: EmployeeRole,
): void {
  const shirtColor = getShirtColor(role)

  switch (behavior) {
    case 'WORKING':
      // Arms bent at desk: left arm forward, right arm at keyboard
      // Override arm positions
      // Left arm bent
      px(ctx, ox + 1, oy + 13, shirtColor)
      px(ctx, ox + 0, oy + 14, shirtColor)
      px(ctx, ox + 0, oy + 15, COLORS.skin)
      // Right arm bent
      px(ctx, ox + 10, oy + 13, shirtColor)
      px(ctx, ox + 11, oy + 14, shirtColor)
      px(ctx, ox + 11, oy + 15, COLORS.skin)
      // Motion lines near hands
      px(ctx, ox + 12, oy + 14, COLORS.motionLine)
      px(ctx, ox + 13, oy + 15, COLORS.motionLine)
      px(ctx, ox - 1, oy + 14, COLORS.motionLine)
      break

    case 'IDLE':
      // Slouched: body shifted down slightly, arms limp
      // Small slouch indicator: shadow on shoulders
      pxRow(ctx, ox + 2, oy + 11, 8, COLORS.skinShadow)
      break

    case 'BREAK':
      // Holding a cup in right hand
      // Cup body (brown)
      pxRect(ctx, ox + 11, oy + 14, 2, 3, COLORS.cupBrown)
      // Cup contents
      px(ctx, ox + 11, oy + 14, COLORS.cupCoffee)
      px(ctx, ox + 12, oy + 14, COLORS.cupCoffee)
      // Hand holding cup
      px(ctx, ox + 10, oy + 15, COLORS.skin)
      break

    case 'SOCIALIZING':
      // Speech lines near mouth
      px(ctx, ox + 10, oy + 6, COLORS.speechLine)
      px(ctx, ox + 11, oy + 5, COLORS.speechLine)
      px(ctx, ox + 12, oy + 6, COLORS.speechLine)
      px(ctx, ox + 11, oy + 7, COLORS.speechLine)
      break

    case 'COFFEE':
      // Holding cup with steam
      // Cup
      pxRect(ctx, ox + 11, oy + 14, 2, 3, COLORS.cupBrown)
      px(ctx, ox + 11, oy + 14, COLORS.cupCoffee)
      px(ctx, ox + 12, oy + 14, COLORS.cupCoffee)
      px(ctx, ox + 10, oy + 15, COLORS.skin)
      // Steam: wavy lines above cup
      px(ctx, ox + 11, oy + 12, COLORS.steam)
      px(ctx, ox + 12, oy + 11, COLORS.steam)
      px(ctx, ox + 11, oy + 10, COLORS.steam)
      px(ctx, ox + 13, oy + 12, COLORS.steam)
      px(ctx, ox + 12, oy + 9, COLORS.steam)
      break

    case 'MEETING':
      // Pointing gesture: right arm extended
      px(ctx, ox + 10, oy + 13, shirtColor)
      px(ctx, ox + 11, oy + 12, shirtColor)
      px(ctx, ox + 12, oy + 11, COLORS.skin)
      px(ctx, ox + 13, oy + 11, COLORS.skin)
      px(ctx, ox + 14, oy + 11, COLORS.skin)
      // Override default right arm
      break

    case 'STRESSED_OUT':
      // Sweat drops + red face (face already colored via isStressed in drawFace)
      px(ctx, ox + 10, oy + 3, COLORS.sweatDrop)
      px(ctx, ox + 11, oy + 4, COLORS.sweatDrop)
      px(ctx, ox + 10, oy + 5, COLORS.sweatDrop)
      px(ctx, ox + 1, oy + 3, COLORS.sweatDrop)
      px(ctx, ox + 0, oy + 4, COLORS.sweatDrop)
      break

    case 'COUNSELING':
      // Hands together pose (prayer/clasped)
      // Both hands meet in front
      px(ctx, ox + 1, oy + 13, shirtColor)
      px(ctx, ox + 2, oy + 14, shirtColor)
      px(ctx, ox + 10, oy + 13, shirtColor)
      px(ctx, ox + 9, oy + 14, shirtColor)
      // Clasped hands in center
      px(ctx, ox + 4, oy + 15, COLORS.skin)
      px(ctx, ox + 5, oy + 15, COLORS.skin)
      px(ctx, ox + 6, oy + 15, COLORS.skin)
      px(ctx, ox + 7, oy + 15, COLORS.skin)
      px(ctx, ox + 5, oy + 16, COLORS.skin)
      px(ctx, ox + 6, oy + 16, COLORS.skin)
      break

    case 'PANIC':
      // Shaking lines on both sides + exclamation mark above head
      // Exclamation mark
      px(ctx, ox + 6, oy - 4, COLORS.exclamation)
      px(ctx, ox + 6, oy - 3, COLORS.exclamation)
      px(ctx, ox + 6, oy - 2, COLORS.exclamation)
      px(ctx, ox + 6, oy - 1, COLORS.transparent)
      px(ctx, ox + 6, oy + 0, COLORS.exclamation)
      // Shake lines left
      px(ctx, ox - 1, oy + 5, COLORS.shakeLines)
      px(ctx, ox - 2, oy + 6, COLORS.shakeLines)
      px(ctx, ox - 1, oy + 7, COLORS.shakeLines)
      // Shake lines right
      px(ctx, ox + 12, oy + 5, COLORS.shakeLines)
      px(ctx, ox + 13, oy + 6, COLORS.shakeLines)
      px(ctx, ox + 12, oy + 7, COLORS.shakeLines)
      // Sweat
      px(ctx, ox + 10, oy + 3, COLORS.sweatDrop)
      px(ctx, ox + 1, oy + 3, COLORS.sweatDrop)
      break
  }
}

// ─── Main Employee Sprite Renderer ──────────────────────────────────────────

/**
 * Renders a pixel art employee sprite onto the given canvas context.
 * Canvas size: 32x40 (16x20 logical pixels at 2x scale).
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - X offset in actual pixels
 * @param y - Y offset in actual pixels
 * @param options - Sprite configuration
 */
export function renderEmployeeSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: EmployeeSpriteOptions,
): void {
  const { role, badge, behavior, hairStyle = 0, isMale = true } = options
  const isStressed = behavior === 'STRESSED_OUT' || behavior === 'PANIC'

  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))

  // Offset within the 32x40 canvas to center the sprite
  // Logical grid: 16 wide x 20 tall, character centered
  const ox = 2 // horizontal offset in logical pixels

  // 1. Hair (behind face)
  drawHair(ctx, ox, 0, hairStyle, isMale)

  // 2. Face
  drawFace(ctx, ox, 0, isStressed)

  // 3. Body + arms + badge
  drawBody(ctx, ox, 0, role, badge)

  // 4. Role-specific accessories (glasses, tie, crown, clipboard)
  drawRoleAccessories(ctx, ox, 0, role)

  // 5. Behavior state effects (pose changes, particles)
  drawBehaviorEffects(ctx, ox, 0, behavior, role)

  ctx.restore()
}

// ─── Furniture Sprite Renderers ─────────────────────────────────────────────
// Each furniture is 32x32 (16x16 logical pixels at 2x scale)

function drawBasicDesk(ctx: CanvasRenderingContext2D): void {
  // Brown wooden desk surface
  pxRect(ctx, 1, 8, 14, 2, '#8B6914')
  pxRect(ctx, 1, 8, 14, 1, '#A0792A')
  // Desk edge highlight
  pxRow(ctx, 1, 8, 14, '#C4993D')
  // Desk legs
  pxRect(ctx, 2, 10, 1, 5, '#6B4F12')
  pxRect(ctx, 13, 10, 1, 5, '#6B4F12')
  // Cross bar
  pxRow(ctx, 3, 13, 10, '#6B4F12')

  // Monitor (Win95 style)
  // Monitor body (gray casing)
  pxRect(ctx, 4, 1, 8, 6, '#C0C0C0')
  // Monitor outline
  pxRow(ctx, 4, 1, 8, '#808080')
  px(ctx, 4, 2, '#808080')
  px(ctx, 11, 2, '#808080')
  px(ctx, 4, 3, '#808080')
  px(ctx, 11, 3, '#808080')
  px(ctx, 4, 4, '#808080')
  px(ctx, 11, 4, '#808080')
  px(ctx, 4, 5, '#808080')
  px(ctx, 11, 5, '#808080')
  px(ctx, 4, 6, '#808080')
  px(ctx, 11, 6, '#808080')
  // Screen (blue, Win95)
  pxRect(ctx, 5, 2, 6, 4, '#000080')
  // Title bar
  pxRow(ctx, 5, 2, 6, '#000080')
  pxRow(ctx, 5, 2, 4, '#0000AA')
  // Screen content lines
  px(ctx, 6, 3, '#FFFFFF')
  px(ctx, 7, 3, '#FFFFFF')
  px(ctx, 8, 3, '#FFFFFF')
  px(ctx, 6, 4, '#C0C0C0')
  px(ctx, 7, 4, '#C0C0C0')
  // Monitor stand
  pxRect(ctx, 7, 7, 2, 1, '#808080')

  // Keyboard
  pxRect(ctx, 4, 8, 5, 1, '#D0D0D0')
  px(ctx, 5, 8, '#E0E0E0')
  px(ctx, 7, 8, '#E0E0E0')
}

function drawPremiumDesk(ctx: CanvasRenderingContext2D): void {
  // Mahogany desk surface
  pxRect(ctx, 1, 9, 14, 2, '#4A0E0E')
  pxRow(ctx, 1, 9, 14, '#6B1A1A')
  // Highlight edge
  pxRow(ctx, 1, 9, 14, '#8B2A2A')
  // Desk legs (dark)
  pxRect(ctx, 2, 11, 1, 4, '#3A0808')
  pxRect(ctx, 13, 11, 1, 4, '#3A0808')
  // Cross bar
  pxRow(ctx, 3, 13, 10, '#3A0808')

  // Left monitor
  pxRect(ctx, 1, 1, 6, 5, '#C0C0C0')
  pxRect(ctx, 1, 1, 6, 1, '#808080')
  px(ctx, 1, 2, '#808080')
  px(ctx, 6, 2, '#808080')
  px(ctx, 1, 3, '#808080')
  px(ctx, 6, 3, '#808080')
  px(ctx, 1, 4, '#808080')
  px(ctx, 6, 4, '#808080')
  px(ctx, 1, 5, '#808080')
  px(ctx, 6, 5, '#808080')
  pxRect(ctx, 2, 2, 4, 3, '#000080')
  pxRow(ctx, 2, 2, 3, '#0000AA')
  px(ctx, 3, 3, '#FFFFFF')
  px(ctx, 4, 3, '#FFFFFF')
  // Stand
  pxRect(ctx, 3, 6, 2, 1, '#808080')
  // Right monitor
  pxRect(ctx, 9, 1, 6, 5, '#C0C0C0')
  pxRect(ctx, 9, 1, 6, 1, '#808080')
  px(ctx, 9, 2, '#808080')
  px(ctx, 14, 2, '#808080')
  px(ctx, 9, 3, '#808080')
  px(ctx, 14, 3, '#808080')
  px(ctx, 9, 4, '#808080')
  px(ctx, 14, 4, '#808080')
  px(ctx, 9, 5, '#808080')
  px(ctx, 14, 5, '#808080')
  pxRect(ctx, 10, 2, 4, 3, '#000080')
  pxRow(ctx, 10, 2, 3, '#0000AA')
  px(ctx, 11, 3, '#FFFFFF')
  px(ctx, 12, 3, '#FFFFFF')
  // Stand
  pxRect(ctx, 11, 6, 2, 1, '#808080')

  // Keyboard (center)
  pxRect(ctx, 5, 7, 6, 1, '#D0D0D0')
  px(ctx, 6, 7, '#E0E0E0')
  px(ctx, 8, 7, '#E0E0E0')
  // Mouse
  px(ctx, 12, 8, '#D0D0D0')
  px(ctx, 12, 9, '#C0C0C0')
}

function drawPlant(ctx: CanvasRenderingContext2D): void {
  // Terracotta pot
  pxRect(ctx, 5, 11, 6, 4, '#CC6633')
  pxRow(ctx, 4, 11, 8, '#CC6633')
  pxRow(ctx, 6, 15, 4, '#AA5522')
  // Pot rim
  pxRow(ctx, 4, 11, 8, '#DD7744')
  // Soil
  pxRow(ctx, 5, 12, 6, '#4A3520')

  // Plant leaves (green)
  // Center stem
  px(ctx, 7, 9, '#228B22')
  px(ctx, 8, 9, '#228B22')
  px(ctx, 7, 10, '#228B22')
  px(ctx, 8, 10, '#228B22')
  // Left leaf cluster
  px(ctx, 4, 7, '#32CD32')
  px(ctx, 5, 6, '#228B22')
  px(ctx, 5, 7, '#32CD32')
  px(ctx, 6, 7, '#228B22')
  px(ctx, 6, 8, '#32CD32')
  px(ctx, 5, 8, '#228B22')
  // Right leaf cluster
  px(ctx, 9, 7, '#32CD32')
  px(ctx, 10, 6, '#228B22')
  px(ctx, 10, 7, '#32CD32')
  px(ctx, 9, 8, '#228B22')
  px(ctx, 10, 8, '#32CD32')
  // Top leaves
  px(ctx, 7, 5, '#32CD32')
  px(ctx, 8, 5, '#228B22')
  px(ctx, 6, 6, '#32CD32')
  px(ctx, 7, 6, '#228B22')
  px(ctx, 8, 6, '#32CD32')
  px(ctx, 9, 6, '#228B22')
  // Highlight
  px(ctx, 7, 5, '#44EE44')
  px(ctx, 5, 6, '#44EE44')
}

function drawServerRack(ctx: CanvasRenderingContext2D): void {
  // Server case (dark gray)
  pxRect(ctx, 3, 1, 10, 14, '#404040')
  // Outline
  pxRow(ctx, 3, 1, 10, '#333333')
  pxRow(ctx, 3, 15, 10, '#333333')
  px(ctx, 3, 2, '#333333')
  px(ctx, 12, 2, '#333333')
  // Face plate
  pxRect(ctx, 4, 2, 8, 4, '#555555')
  pxRect(ctx, 4, 7, 8, 4, '#555555')
  pxRect(ctx, 4, 12, 8, 3, '#555555')

  // Drive bay lines
  pxRow(ctx, 5, 3, 6, '#666666')
  pxRow(ctx, 5, 5, 6, '#666666')
  pxRow(ctx, 5, 8, 6, '#666666')
  pxRow(ctx, 5, 10, 6, '#666666')
  pxRow(ctx, 5, 13, 6, '#666666')

  // Blinking LEDs (green dots)
  px(ctx, 5, 2, '#00FF00')
  px(ctx, 5, 4, '#00CC00')
  px(ctx, 5, 7, '#00FF00')
  px(ctx, 5, 9, '#00CC00')
  px(ctx, 5, 12, '#00FF00')

  // Power LED (red)
  px(ctx, 11, 2, '#FF0000')

  // Ventilation holes on right
  px(ctx, 11, 8, '#444444')
  px(ctx, 11, 9, '#444444')
  px(ctx, 11, 10, '#444444')
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D): void {
  // Base body (silver/gray)
  pxRect(ctx, 4, 4, 8, 10, '#B0B0B0')
  // Outline
  pxRow(ctx, 4, 4, 8, '#808080')
  pxRow(ctx, 4, 14, 8, '#808080')
  px(ctx, 4, 5, '#808080')
  px(ctx, 11, 5, '#808080')
  // Dark face panel
  pxRect(ctx, 5, 5, 6, 4, '#3E3E3E')

  // Water reservoir (top, transparent blue)
  pxRect(ctx, 5, 1, 6, 3, '#88BBDD')
  pxRow(ctx, 5, 1, 6, '#6699BB')
  // Water line
  pxRow(ctx, 5, 2, 6, '#AADDEE')

  // Drip spout
  px(ctx, 7, 9, '#666666')
  px(ctx, 8, 9, '#666666')

  // Cup holder area
  pxRect(ctx, 5, 10, 6, 3, '#555555')

  // Small cup underneath
  pxRect(ctx, 6, 11, 3, 2, '#F0F0F0')

  // Power light (red LED)
  px(ctx, 10, 6, '#FF0000')

  // Buttons
  px(ctx, 10, 7, '#00CC00')
  px(ctx, 10, 8, '#CCCC00')

  // Base platform
  pxRow(ctx, 3, 14, 10, '#909090')
  pxRow(ctx, 3, 15, 10, '#808080')
}

function drawTrophy(ctx: CanvasRenderingContext2D): void {
  // Wooden base
  pxRect(ctx, 4, 13, 8, 2, '#8B6914')
  pxRow(ctx, 3, 13, 10, '#A0792A')
  pxRow(ctx, 3, 15, 10, '#6B4F12')

  // Trophy stem
  pxRect(ctx, 7, 10, 2, 3, '#DAA520')

  // Trophy cup body
  pxRect(ctx, 4, 4, 8, 6, '#DAA520')
  // Cup opening (top)
  pxRow(ctx, 3, 3, 10, '#FFD700')
  pxRow(ctx, 3, 4, 1, '#FFD700')
  pxRow(ctx, 12, 4, 1, '#FFD700')
  // Cup rim
  pxRow(ctx, 3, 3, 10, '#FFC800')
  // Cup inner highlight
  pxRect(ctx, 5, 5, 2, 2, '#FFE44D')
  // Handles
  px(ctx, 2, 5, '#DAA520')
  px(ctx, 2, 6, '#DAA520')
  px(ctx, 3, 7, '#DAA520')
  px(ctx, 13, 5, '#DAA520')
  px(ctx, 13, 6, '#DAA520')
  px(ctx, 12, 7, '#DAA520')

  // Star on cup
  px(ctx, 8, 6, '#FFFFFF')
  px(ctx, 7, 7, '#FFFFFF')
  px(ctx, 8, 7, '#FFFFFF')
  px(ctx, 9, 7, '#FFFFFF')
  px(ctx, 8, 8, '#FFFFFF')
}

function drawAirPurifier(ctx: CanvasRenderingContext2D): void {
  // Main body (white/silver)
  pxRect(ctx, 4, 3, 8, 12, '#E8E8E8')
  // Outline
  pxRow(ctx, 4, 3, 8, '#C0C0C0')
  pxRow(ctx, 4, 15, 8, '#A0A0A0')
  px(ctx, 4, 4, '#C0C0C0')
  px(ctx, 11, 4, '#C0C0C0')

  // Top vent grille
  pxRow(ctx, 5, 4, 6, '#D0D0D0')
  px(ctx, 6, 4, '#B0B0B0')
  px(ctx, 8, 4, '#B0B0B0')
  px(ctx, 10, 4, '#B0B0B0')
  pxRow(ctx, 5, 5, 6, '#D0D0D0')
  px(ctx, 6, 5, '#B0B0B0')
  px(ctx, 8, 5, '#B0B0B0')
  px(ctx, 10, 5, '#B0B0B0')

  // Front panel
  pxRect(ctx, 5, 7, 6, 6, '#F0F0F0')

  // Air flow indicators (small lines)
  px(ctx, 7, 8, '#DDDDDD')
  px(ctx, 8, 8, '#DDDDDD')
  px(ctx, 7, 10, '#DDDDDD')
  px(ctx, 8, 10, '#DDDDDD')
  px(ctx, 7, 12, '#DDDDDD')
  px(ctx, 8, 12, '#DDDDDD')

  // Blue power indicator
  px(ctx, 6, 13, '#0088FF')
  px(ctx, 7, 13, '#0088FF')

  // Status LED
  px(ctx, 10, 7, '#00CC00')
}

function drawWhiteboard(ctx: CanvasRenderingContext2D): void {
  // Stand (gray metal)
  pxRect(ctx, 7, 12, 2, 3, '#808080')
  // Stand legs
  px(ctx, 5, 15, '#808080')
  px(ctx, 6, 14, '#808080')
  px(ctx, 9, 14, '#808080')
  px(ctx, 10, 15, '#808080')

  // Board frame (gray)
  pxRect(ctx, 1, 1, 14, 11, '#A0A0A0')
  // White surface
  pxRect(ctx, 2, 2, 12, 9, '#F8F8F8')

  // Written content (scribbles)
  // Red marker line
  pxRow(ctx, 3, 3, 5, '#CC0000')
  // Blue marker text
  pxRow(ctx, 3, 5, 8, '#0000CC')
  pxRow(ctx, 3, 6, 6, '#0000CC')
  // Green marker circle
  px(ctx, 10, 4, '#00AA00')
  px(ctx, 11, 3, '#00AA00')
  px(ctx, 12, 4, '#00AA00')
  px(ctx, 11, 5, '#00AA00')
  // Arrow
  px(ctx, 3, 8, '#CC0000')
  px(ctx, 4, 8, '#CC0000')
  px(ctx, 5, 8, '#CC0000')
  px(ctx, 6, 8, '#CC0000')
  px(ctx, 5, 7, '#CC0000')
  px(ctx, 5, 9, '#CC0000')

  // Marker tray at bottom
  pxRow(ctx, 2, 11, 12, '#909090')
  // Markers
  px(ctx, 3, 11, '#CC0000')
  px(ctx, 4, 11, '#CC0000')
  px(ctx, 6, 11, '#0000CC')
  px(ctx, 7, 11, '#0000CC')
  px(ctx, 9, 11, '#00AA00')
  px(ctx, 10, 11, '#00AA00')
}

function drawBookshelf(ctx: CanvasRenderingContext2D): void {
  // Shelf frame (wooden)
  pxRect(ctx, 1, 1, 14, 14, '#8B6914')
  // Shelf back
  pxRect(ctx, 2, 2, 12, 12, '#A0792A')

  // Shelf dividers (horizontal)
  pxRow(ctx, 2, 6, 12, '#8B6914')
  pxRow(ctx, 2, 10, 12, '#8B6914')
  pxRow(ctx, 1, 14, 14, '#6B4F12')

  // Top shelf books
  pxRect(ctx, 2, 2, 2, 4, '#CC2222') // red book
  pxRect(ctx, 4, 3, 2, 3, '#2222CC') // blue book (shorter)
  pxRect(ctx, 6, 2, 1, 4, '#22AA22') // green book (thin)
  pxRect(ctx, 7, 2, 2, 4, '#DDAA00') // yellow book
  pxRect(ctx, 9, 3, 2, 3, '#8822CC') // purple book
  pxRect(ctx, 11, 2, 2, 4, '#CC6600') // orange book

  // Middle shelf books
  pxRect(ctx, 2, 7, 2, 3, '#2266AA') // navy
  pxRect(ctx, 4, 7, 1, 3, '#AA2266') // magenta (thin)
  pxRect(ctx, 5, 8, 2, 2, '#228866') // teal (short)
  pxRect(ctx, 8, 7, 3, 3, '#884422') // brown (wide)
  pxRect(ctx, 11, 7, 2, 3, '#DD4444') // bright red

  // Bottom shelf: some books + small object
  pxRect(ctx, 2, 11, 2, 3, '#444488') // dark blue
  pxRect(ctx, 4, 11, 2, 3, '#448844') // dark green
  pxRect(ctx, 7, 11, 1, 3, '#888844') // olive (thin)
  // Small trophy/object
  px(ctx, 10, 13, '#DAA520')
  px(ctx, 11, 13, '#DAA520')
  px(ctx, 10, 12, '#DAA520')
  px(ctx, 11, 12, '#DAA520')
  px(ctx, 10, 11, '#FFD700')

  // Book spine highlights
  px(ctx, 2, 2, '#EE4444')
  px(ctx, 7, 2, '#FFCC22')
  px(ctx, 2, 7, '#4488CC')
}

function drawLoungeChair(ctx: CanvasRenderingContext2D): void {
  // Seat cushion (blue-gray)
  pxRect(ctx, 2, 8, 12, 4, '#5B7B9A')
  // Seat highlight
  pxRow(ctx, 3, 8, 10, '#6B8BAA')
  pxRect(ctx, 3, 9, 10, 1, '#6B8BAA')

  // Back rest
  pxRect(ctx, 2, 3, 12, 5, '#5B7B9A')
  // Back highlight
  pxRow(ctx, 3, 3, 10, '#6B8BAA')
  pxRect(ctx, 3, 4, 3, 3, '#6B8BAA')

  // Armrests
  pxRect(ctx, 1, 5, 1, 7, '#4A6A88')
  pxRect(ctx, 14, 5, 1, 7, '#4A6A88')
  // Armrest tops
  px(ctx, 1, 5, '#6B8BAA')
  px(ctx, 14, 5, '#6B8BAA')

  // Legs
  pxRect(ctx, 3, 12, 1, 3, '#333333')
  pxRect(ctx, 12, 12, 1, 3, '#333333')
  // Front legs
  pxRect(ctx, 3, 14, 1, 1, '#444444')
  pxRect(ctx, 12, 14, 1, 1, '#444444')

  // Cushion seam lines
  pxRow(ctx, 4, 6, 8, '#4A6A88')
  pxRow(ctx, 4, 10, 8, '#4A6A88')

  // Pillow/cushion detail
  px(ctx, 5, 4, '#7B9BBA')
  px(ctx, 6, 4, '#7B9BBA')
  px(ctx, 5, 5, '#7B9BBA')
}

/**
 * Renders a furniture pixel art sprite onto the given canvas context.
 * Canvas size: 32x32 (16x16 logical pixels at 2x scale).
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - X offset in actual pixels
 * @param y - Y offset in actual pixels
 * @param type - Furniture type to render
 */
export function renderFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: FurnitureType,
): void {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))

  switch (type) {
    case 'basic':
      drawBasicDesk(ctx)
      break
    case 'premium':
      drawPremiumDesk(ctx)
      break
    case 'plant':
      drawPlant(ctx)
      break
    case 'server_rack':
      drawServerRack(ctx)
      break
    case 'coffee_machine':
      drawCoffeeMachine(ctx)
      break
    case 'trophy':
      drawTrophy(ctx)
      break
    case 'air_purifier':
      drawAirPurifier(ctx)
      break
    case 'whiteboard':
      drawWhiteboard(ctx)
      break
    case 'bookshelf':
      drawBookshelf(ctx)
      break
    case 'lounge_chair':
      drawLoungeChair(ctx)
      break
    default:
      // Unknown furniture: draw a placeholder box
      pxRect(ctx, 2, 2, 12, 12, '#FF00FF')
      pxRow(ctx, 2, 2, 12, '#CC00CC')
      break
  }

  ctx.restore()
}

// ─── Caching System ─────────────────────────────────────────────────────────

interface CacheEntry {
  canvas: HTMLCanvasElement | OffscreenCanvas
  lastAccess: number
}

/**
 * LRU cache for rendered pixel art sprites.
 * Caches rendered sprites as offscreen canvases to avoid redundant pixel-by-pixel drawing.
 */
export class PixelArtCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number
  private accessCounter: number = 0

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize
  }

  /**
   * Build a cache key for an employee sprite.
   */
  private employeeKey(
    role: EmployeeRole,
    badge: BadgeType,
    behavior: BehaviorState,
    hairStyle: number = 0,
    isMale: boolean = true,
  ): string {
    return `emp:${role}:${badge}:${behavior}:${hairStyle}:${isMale ? 'm' : 'f'}`
  }

  /**
   * Build a cache key for a furniture sprite.
   */
  private furnitureKey(type: FurnitureType): string {
    return `furn:${type}`
  }

  /**
   * Create an offscreen canvas for rendering.
   * Falls back to HTMLCanvasElement if OffscreenCanvas is unavailable.
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  /**
   * Evict least recently used entries when cache exceeds max size.
   */
  private evictIfNeeded(): void {
    if (this.cache.size < this.maxSize) return

    // Find the entry with the lowest lastAccess
    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Get or render an employee sprite.
   * Returns a cached canvas if available, otherwise renders and caches.
   */
  getEmployeeSprite(
    role: EmployeeRole,
    badge: BadgeType,
    behavior: BehaviorState,
    hairStyle: number = 0,
    isMale: boolean = true,
  ): HTMLCanvasElement | OffscreenCanvas {
    const key = this.employeeKey(role, badge, behavior, hairStyle, isMale)
    const cached = this.cache.get(key)

    if (cached) {
      cached.lastAccess = ++this.accessCounter
      return cached.canvas
    }

    // Render to offscreen canvas
    // Employee sprites: 32x40
    const canvas = this.createCanvas(32, 40)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    if (!ctx) {
      return canvas
    }

    // Clear with transparency
    ctx.clearRect(0, 0, 32, 40)

    renderEmployeeSprite(ctx as CanvasRenderingContext2D, 0, 0, {
      role,
      badge,
      behavior,
      hairStyle,
      isMale,
    })

    // Cache it
    this.evictIfNeeded()
    this.cache.set(key, {
      canvas,
      lastAccess: ++this.accessCounter,
    })

    return canvas
  }

  /**
   * Get or render a furniture sprite.
   * Returns a cached canvas if available, otherwise renders and caches.
   */
  getFurnitureSprite(type: FurnitureType): HTMLCanvasElement | OffscreenCanvas {
    const key = this.furnitureKey(type)
    const cached = this.cache.get(key)

    if (cached) {
      cached.lastAccess = ++this.accessCounter
      return cached.canvas
    }

    // Render to offscreen canvas
    // Furniture sprites: 32x32
    const canvas = this.createCanvas(32, 32)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    if (!ctx) {
      return canvas
    }

    ctx.clearRect(0, 0, 32, 32)

    renderFurnitureSprite(ctx as CanvasRenderingContext2D, 0, 0, type)

    // Cache it
    this.evictIfNeeded()
    this.cache.set(key, {
      canvas,
      lastAccess: ++this.accessCounter,
    })

    return canvas
  }

  /**
   * Clear all cached sprites.
   */
  clearCache(): void {
    this.cache.clear()
    this.accessCounter = 0
  }

  /**
   * Get current cache size.
   */
  get size(): number {
    return this.cache.size
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const pixelArtCache = new PixelArtCache(200)
