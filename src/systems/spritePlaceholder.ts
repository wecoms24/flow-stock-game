/**
 * Runtime Sprite Placeholder Generator
 *
 * 개발 중 실제 픽셀 아트가 없을 때 사용할 플레이스홀더 스프라이트를
 * Canvas를 이용해 동적으로 생성합니다.
 */

import type { AnimationStateName } from './spriteAnimator'

/**
 * 플레이스홀더 스프라이트 시트를 Canvas로 생성
 * @returns HTMLImageElement (data URL 기반)
 */
export function generatePlaceholderSpriteSheet(): HTMLImageElement {
  const canvas = document.createElement('canvas')
  canvas.width = 128 // 4 columns × 32px
  canvas.height = 160 // 5 rows × 32px
  const ctx = canvas.getContext('2d')!

  // 배경 투명
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 상태별 색상 및 레이블
  const states: Array<{ name: AnimationStateName; color: string; y: number }> = [
    { name: 'WORKING', color: '#3b82f6', y: 0 },
    { name: 'TRADING', color: '#22c55e', y: 32 },
    { name: 'BREAK', color: '#f59e0b', y: 64 },
    { name: 'PANIC', color: '#ef4444', y: 96 },
    { name: 'IDLE', color: '#6b7280', y: 128 },
  ]

  states.forEach(({ color, y }) => {
    // 각 상태당 4 프레임
    for (let frame = 0; frame < 4; frame++) {
      const x = frame * 32

      // 메인 박스
      ctx.fillStyle = color
      ctx.fillRect(x, y, 32, 32)

      // 테두리
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, 32, 32)

      // 프레임 애니메이션 표시 (밝기 변화)
      const brightness = 0.2 + (frame * 0.2)
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
      ctx.fillRect(x + 4, y + 4, 24, 24)

      // 프레임 번호 표시
      ctx.fillStyle = '#000000'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${frame}`, x + 16, y + 16)
    }
  })

  // Canvas를 이미지로 변환
  const img = new Image()
  img.src = canvas.toDataURL('image/png')

  return img
}

/**
 * 감정 오라 플레이스홀더 생성
 * @returns HTMLImageElement
 */
export function generateEmotionAuraPlaceholder(): HTMLImageElement {
  const canvas = document.createElement('canvas')
  canvas.width = 48 // 3 emotions × 16px
  canvas.height = 16
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const emotions = [
    { name: 'happy', color: '#22c55e', x: 0 },
    { name: 'stressed', color: '#ef4444', x: 16 },
    { name: 'focused', color: '#3b82f6', x: 32 },
  ]

  emotions.forEach(({ color, x }) => {
    // Radial gradient 효과 시뮬레이션
    for (let r = 8; r > 0; r--) {
      const alpha = (8 - r) / 8
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
      ctx.beginPath()
      ctx.arc(x + 8, 8, r, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  const img = new Image()
  img.src = canvas.toDataURL('image/png')

  return img
}

/**
 * 모든 플레이스홀더 에셋을 생성하고 캐싱
 */
export class PlaceholderAssetManager {
  private assets: Map<string, HTMLImageElement> = new Map()

  constructor() {
    this.generateAll()
  }

  /**
   * 모든 플레이스홀더 생성
   */
  private generateAll(): void {
    this.assets.set('employee_base', generatePlaceholderSpriteSheet())
    this.assets.set('emotions', generateEmotionAuraPlaceholder())
  }

  /**
   * 에셋 조회
   * @param name 'employee_base' | 'emotions'
   */
  get(name: string): HTMLImageElement | undefined {
    return this.assets.get(name)
  }

  /**
   * 모든 플레이스홀더 재생성
   */
  regenerate(): void {
    this.assets.clear()
    this.generateAll()
  }
}

// 싱글톤 인스턴스
export const placeholderAssets = new PlaceholderAssetManager()
