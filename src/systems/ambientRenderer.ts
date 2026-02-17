/**
 * Ambient Effects Renderer
 *
 * officeBackgrounds.ts에 정의된 ambient effects를 Canvas에 렌더링
 */

import type { AmbientEffect } from '../data/officeBackgrounds'

/**
 * Ambient Particle (먼지, 불꽃 등)
 */
interface AmbientParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

/**
 * Ambient Renderer 클래스
 */
export class AmbientRenderer {
  private particles: AmbientParticle[] = []
  private animationTime: number = 0
  private flickerOpacity: number = 1
  private cityscapeOffset: number = 0
  private cityscapeCache: HTMLCanvasElement | null = null // 캐싱 최적화
  private canvasWidth: number = 436
  private canvasHeight: number = 436

  /**
   * Ambient effects 초기화
   */
  initialize(effect: AmbientEffect, canvasWidth: number, canvasHeight: number): void {
    this.particles = []
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    // Particles 생성
    if (effect.particles === 'dust') {
      this.createDustParticles(canvasWidth, canvasHeight, 20)
    } else if (effect.particles === 'sparks') {
      this.createSparkParticles(canvasWidth, canvasHeight, 15)
    }
  }

  /**
   * 먼지 입자 생성 (레벨 1-2 창고)
   */
  private createDustParticles(width: number, height: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: Math.random() * 0.2 + 0.1, // 아래로 천천히
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        color: '#888888',
      })
    }
  }

  /**
   * 불꽃 입자 생성 (레벨 10 금융타워)
   */
  private createSparkParticles(width: number, height: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFA500', // 금색/주황색
      })
    }
  }

  /**
   * 애니메이션 업데이트 (매 프레임 호출)
   */
  update(deltaTime: number, effect: AmbientEffect): void {
    this.animationTime += deltaTime

    // Particles 업데이트
    this.particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy

      // 화면 밖으로 나가면 반대편에서 등장
      if (p.x < 0) p.x = this.canvasWidth
      if (p.x > this.canvasWidth) p.x = 0
      if (p.y < 0) p.y = this.canvasHeight
      if (p.y > this.canvasHeight) p.y = 0

      // 불꽃은 반짝임 효과
      if (effect.particles === 'sparks') {
        p.opacity = 0.3 + Math.sin(this.animationTime * 5 + p.x * 0.1) * 0.3
      }
    })

    // Flickering animation (깜빡임)
    if (effect.animation === 'flickering') {
      // 불규칙한 깜빡임 (0.85 ~ 1.0) - Math.random 제거하여 예측 가능하게
      this.flickerOpacity = 0.925 + Math.sin(this.animationTime * 10) * 0.075
    } else {
      this.flickerOpacity = 1
    }

    // Cityscape animation (도시 경관 스크롤)
    if (effect.animation === 'cityscape') {
      this.cityscapeOffset = (this.animationTime * 2) % this.canvasWidth
    }
  }

  /**
   * Canvas에 렌더링
   */
  render(ctx: CanvasRenderingContext2D, effect: AmbientEffect): void {
    const { width, height } = ctx.canvas

    // 1. Animation: Cityscape (배경 빌딩 실루엣)
    if (effect.animation === 'cityscape') {
      this.renderCityscape(ctx, width, height)
    }

    // 2. Lighting overlay
    this.renderLighting(ctx, effect.lighting || 'bright', width, height)

    // 3. Particles (먼지, 불꽃)
    if (effect.particles && effect.particles !== 'none') {
      this.renderParticles(ctx)
    }

    // 4. Flickering overlay
    if (effect.animation === 'flickering') {
      ctx.save()
      ctx.globalAlpha = 1 - this.flickerOpacity
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
  }

  /**
   * 도시 경관 캐시 생성 (최적화: 한 번만 그림)
   */
  private createCityscapeCache(width: number, height: number): void {
    if (this.cityscapeCache) return

    this.cityscapeCache = document.createElement('canvas')
    this.cityscapeCache.width = width * 2 // 스크롤을 위해 2배 크기
    this.cityscapeCache.height = height

    const ctx = this.cityscapeCache.getContext('2d')
    if (!ctx) return

    const buildings = [
      { x: 0, y: 300, w: 60, h: 136 },
      { x: 70, y: 250, w: 80, h: 186 },
      { x: 160, y: 280, w: 50, h: 156 },
      { x: 220, y: 220, w: 70, h: 216 },
      { x: 300, y: 260, w: 60, h: 176 },
      { x: 370, y: 240, w: 66, h: 196 },
    ]

    // 빌딩을 2번 그림 (스크롤 루프용)
    for (let i = 0; i < 2; i++) {
      buildings.forEach((building) => {
        const x = building.x + i * width
        ctx.fillStyle = '#000000'
        ctx.fillRect(x, building.y, building.w, building.h)

        // 창문 (고정 패턴)
        for (let wy = building.y + 10; wy < building.y + building.h - 10; wy += 15) {
          for (let wx = x + 8; wx < x + building.w - 8; wx += 12) {
            // 고정된 패턴 (Math.random 대신 위치 기반)
            if ((wx + wy) % 3 !== 0) {
              ctx.fillStyle = '#FFD700'
              ctx.fillRect(wx, wy, 4, 6)
            }
          }
        }
      })
    }
  }

  /**
   * 도시 경관 렌더링 (최적화: 캐시 사용 + translate)
   */
  private renderCityscape(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.cityscapeCache) {
      this.createCityscapeCache(width, height)
    }

    if (!this.cityscapeCache) return

    ctx.save()
    ctx.globalAlpha = 0.15

    // 캐시된 이미지를 스크롤하여 그림
    const offset = this.cityscapeOffset % width
    ctx.drawImage(this.cityscapeCache, -offset, 0)

    ctx.restore()
  }

  /**
   * 조명 오버레이 렌더링
   */
  private renderLighting(
    ctx: CanvasRenderingContext2D,
    lighting: 'dim' | 'bright' | 'neon',
    width: number,
    height: number
  ): void {
    ctx.save()

    if (lighting === 'dim') {
      // 어두운 조명 (반투명 검은색 오버레이)
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
    } else if (lighting === 'neon') {
      // 네온 조명 (보라색/파란색 그라데이션)
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
      gradient.addColorStop(0, 'rgba(138, 43, 226, 0.1)') // 보라
      gradient.addColorStop(0.5, 'rgba(0, 191, 255, 0.05)') // 하늘색
      gradient.addColorStop(1, 'rgba(0, 0, 139, 0.15)') // 어두운 파랑

      ctx.globalAlpha = 0.5
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // 네온 펄스 효과
      const pulse = 0.5 + Math.sin(this.animationTime * 2) * 0.2
      ctx.globalAlpha = pulse * 0.15
      ctx.fillStyle = '#00FFFF'
      ctx.fillRect(0, 0, width, height)
    }
    // bright는 추가 오버레이 없음

    ctx.restore()
  }

  /**
   * 입자 렌더링 (최적화: viewport culling + color batching)
   */
  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas

    // Viewport culling: 화면 밖 입자 필터링
    const visibleParticles = this.particles.filter(
      (p) => p.x >= -10 && p.x <= width + 10 && p.y >= -10 && p.y <= height + 10
    )

    // Color batching: 색상별 그룹화
    const colorGroups: Record<string, AmbientParticle[]> = {}
    visibleParticles.forEach((p) => {
      if (!colorGroups[p.color]) colorGroups[p.color] = []
      colorGroups[p.color].push(p)
    })

    // 색상별 일괄 렌더링
    Object.entries(colorGroups).forEach(([color, particles]) => {
      ctx.save()
      ctx.fillStyle = color
      particles.forEach((p) => {
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    })
  }

  /**
   * 모든 효과 제거
   */
  clear(): void {
    this.particles = []
    this.animationTime = 0
    this.flickerOpacity = 1
    this.cityscapeOffset = 0
    this.cityscapeCache = null // 캐시 정리
  }
}

// 싱글톤 인스턴스
export const ambientRenderer = new AmbientRenderer()
