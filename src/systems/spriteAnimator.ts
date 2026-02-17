/**
 * Sprite Animation System
 *
 * 직원 캐릭터의 상태별 스프라이트 애니메이션을 관리하는 시스템
 * requestAnimationFrame 기반으로 60fps 애니메이션 제공
 */

export type AnimationStateName = 'WORKING' | 'TRADING' | 'BREAK' | 'PANIC' | 'IDLE'

/**
 * 스프라이트 시트의 개별 프레임 정보
 */
export interface SpriteFrame {
  x: number // 스프라이트 시트에서의 x 좌표
  y: number // 스프라이트 시트에서의 y 좌표
  width: number // 프레임 너비 (32px)
  height: number // 프레임 높이 (32px)
}

/**
 * 애니메이션 상태 정의
 */
export interface AnimationState {
  name: AnimationStateName
  frames: SpriteFrame[] // 해당 상태의 프레임 목록
  frameRate: number // 초당 프레임 수 (fps)
  loop: boolean // 반복 재생 여부
}

/**
 * 애니메이션 상태별 설정
 *
 * 스프라이트 시트 레이아웃:
 * Row 0: WORKING (4 프레임)
 * Row 1: TRADING (4 프레임)
 * Row 2: BREAK (4 프레임)
 * Row 3: PANIC (4 프레임)
 * Row 4: IDLE (4 프레임)
 */
const ANIMATION_CONFIGS: Record<AnimationStateName, Omit<AnimationState, 'name'>> = {
  WORKING: {
    frames: [
      { x: 0, y: 0, width: 32, height: 32 },
      { x: 32, y: 0, width: 32, height: 32 },
      { x: 64, y: 0, width: 32, height: 32 },
      { x: 96, y: 0, width: 32, height: 32 },
    ],
    frameRate: 8, // 타이핑 속도감
    loop: true,
  },
  TRADING: {
    frames: [
      { x: 0, y: 32, width: 32, height: 32 },
      { x: 32, y: 32, width: 32, height: 32 },
      { x: 64, y: 32, width: 32, height: 32 },
      { x: 96, y: 32, width: 32, height: 32 },
    ],
    frameRate: 10, // 빠른 거래 느낌
    loop: true,
  },
  BREAK: {
    frames: [
      { x: 0, y: 64, width: 32, height: 32 },
      { x: 32, y: 64, width: 32, height: 32 },
      { x: 64, y: 64, width: 32, height: 32 },
      { x: 96, y: 64, width: 32, height: 32 },
    ],
    frameRate: 4, // 느긋한 휴식
    loop: true,
  },
  PANIC: {
    frames: [
      { x: 0, y: 96, width: 32, height: 32 },
      { x: 32, y: 96, width: 32, height: 32 },
      { x: 64, y: 96, width: 32, height: 32 },
      { x: 96, y: 96, width: 32, height: 32 },
    ],
    frameRate: 12, // 빠른 떨림
    loop: true,
  },
  IDLE: {
    frames: [
      { x: 0, y: 128, width: 32, height: 32 },
      { x: 32, y: 128, width: 32, height: 32 },
      { x: 64, y: 128, width: 32, height: 32 },
      { x: 96, y: 128, width: 32, height: 32 },
    ],
    frameRate: 2, // 느린 두리번거림
    loop: true,
  },
}

/**
 * 개별 스프라이트의 애니메이션을 관리하는 클래스
 */
export class SpriteAnimator {
  private currentAnimation: AnimationState
  private currentFrame: number = 0
  private lastFrameTime: number = 0
  private spriteSheet: HTMLImageElement | null = null
  private isPlaying: boolean = true

  constructor(
    initialState: AnimationStateName = 'IDLE',
    spriteSheetImage?: HTMLImageElement,
  ) {
    this.currentAnimation = this.createAnimationState(initialState)
    if (spriteSheetImage) {
      this.spriteSheet = spriteSheetImage
    }
  }

  /**
   * 애니메이션 상태 객체 생성
   */
  private createAnimationState(stateName: AnimationStateName): AnimationState {
    return {
      name: stateName,
      ...ANIMATION_CONFIGS[stateName],
    }
  }

  /**
   * 애니메이션 상태 변경
   * @param state 새로운 애니메이션 상태
   */
  setAnimation(state: AnimationStateName): void {
    if (this.currentAnimation.name === state) return

    this.currentAnimation = this.createAnimationState(state)
    this.currentFrame = 0
    this.lastFrameTime = performance.now()
  }

  /**
   * 스프라이트 시트 이미지 설정
   */
  setSpriteSheet(image: HTMLImageElement): void {
    this.spriteSheet = image
  }

  /**
   * 애니메이션 재생/일시정지
   */
  setPlaying(playing: boolean): void {
    this.isPlaying = playing
  }

  /**
   * 현재 애니메이션 상태 반환
   */
  getCurrentState(): AnimationStateName {
    return this.currentAnimation.name
  }

  /**
   * 프레임 업데이트 (게임 루프에서 호출)
   * @param currentTime 현재 타임스탬프 (performance.now())
   */
  update(currentTime: number): void {
    if (!this.isPlaying) return

    const { frameRate, frames, loop } = this.currentAnimation
    const frameDuration = 1000 / frameRate // ms per frame

    if (currentTime - this.lastFrameTime >= frameDuration) {
      this.currentFrame++

      // 프레임 루프 처리
      if (this.currentFrame >= frames.length) {
        if (loop) {
          this.currentFrame = 0
        } else {
          this.currentFrame = frames.length - 1 // 마지막 프레임 유지
          this.isPlaying = false
        }
      }

      this.lastFrameTime = currentTime
    }
  }

  /**
   * 현재 프레임을 캔버스에 렌더링
   * @param ctx Canvas 2D 렌더링 컨텍스트
   * @param x 화면상 x 좌표
   * @param y 화면상 y 좌표
   * @param scale 스케일 (기본 1.0)
   */
  render(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1): void {
    if (!this.spriteSheet || !this.spriteSheet.complete) {
      // 스프라이트 시트가 로드되지 않았으면 플레이스홀더 렌더링
      this.renderPlaceholder(ctx, x, y, scale)
      return
    }

    const frame = this.currentAnimation.frames[this.currentFrame]

    ctx.drawImage(
      this.spriteSheet,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      x,
      y,
      frame.width * scale,
      frame.height * scale,
    )
  }

  /**
   * 플레이스홀더 렌더링 (스프라이트 시트 로드 전)
   */
  private renderPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
  ): void {
    const size = 32 * scale

    // 상태별 색상
    const colorMap: Record<AnimationStateName, string> = {
      WORKING: '#3b82f6', // 파랑
      TRADING: '#22c55e', // 초록
      BREAK: '#f59e0b', // 주황
      PANIC: '#ef4444', // 빨강
      IDLE: '#6b7280', // 회색
    }

    ctx.fillStyle = colorMap[this.currentAnimation.name]
    ctx.fillRect(x, y, size, size)

    // 애니메이션 프레임 표시 (점멸 효과)
    if (this.currentFrame % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(x + 4 * scale, y + 4 * scale, size - 8 * scale, size - 8 * scale)
    }
  }

  /**
   * 현재 프레임 인덱스 반환 (디버깅용)
   */
  getCurrentFrameIndex(): number {
    return this.currentFrame
  }
}

/**
 * 스프라이트 시트 로더 (캐싱 기능 포함)
 */
class SpriteSheetLoader {
  private cache: Map<string, HTMLImageElement> = new Map()
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map()

  /**
   * 스프라이트 시트 로드 (캐싱됨)
   * @param path 이미지 경로
   * @returns HTMLImageElement Promise
   */
  async load(path: string): Promise<HTMLImageElement> {
    // 캐시에 있으면 즉시 반환
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    // 이미 로딩 중이면 해당 Promise 반환
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!
    }

    // 새로 로드
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        this.cache.set(path, img)
        this.loadingPromises.delete(path)
        resolve(img)
      }

      img.onerror = () => {
        this.loadingPromises.delete(path)
        reject(new Error(`Failed to load sprite sheet: ${path}`))
      }

      img.src = path
    })

    this.loadingPromises.set(path, loadPromise)
    return loadPromise
  }

  /**
   * 특정 스프라이트 시트 캐시 제거
   */
  unload(path: string): void {
    this.cache.delete(path)
  }

  /**
   * 모든 캐시 제거
   */
  clearCache(): void {
    this.cache.clear()
    this.loadingPromises.clear()
  }
}

// 싱글톤 인스턴스
export const spriteSheetLoader = new SpriteSheetLoader()

/**
 * 여러 스프라이트 애니메이터를 관리하는 매니저 클래스
 */
export class SpriteAnimationManager {
  private animators: Map<string, SpriteAnimator> = new Map()
  private animationFrameId: number | null = null
  private isRunning: boolean = false

  /**
   * 애니메이터 등록
   * @param id 고유 식별자 (예: 직원 ID)
   * @param animator SpriteAnimator 인스턴스
   */
  register(id: string, animator: SpriteAnimator): void {
    this.animators.set(id, animator)
  }

  /**
   * 애니메이터 제거
   */
  unregister(id: string): void {
    this.animators.delete(id)
  }

  /**
   * 애니메이터 조회
   */
  get(id: string): SpriteAnimator | undefined {
    return this.animators.get(id)
  }

  /**
   * 애니메이션 루프 시작
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    const animate = (currentTime: number) => {
      this.animators.forEach((animator) => animator.update(currentTime))

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(animate)
      }
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * 애니메이션 루프 중지
   */
  stop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 모든 애니메이터 제거 및 정리
   */
  cleanup(): void {
    this.stop()
    this.animators.clear()
  }
}

/**
 * 직원 상태를 AnimationStateName으로 매핑
 * @param employee 직원 객체
 * @returns 해당하는 애니메이션 상태
 */
export function getAnimationStateFromEmployee(employee: {
  stress: number
  stamina: number
}): AnimationStateName {
  // 스트레스 90 이상 -> PANIC
  if (employee.stress >= 90) return 'PANIC'

  // 스태미나 20 이하 -> BREAK
  if (employee.stamina <= 20) return 'BREAK'

  // TODO: 실제 거래 중 여부 확인 로직 추가 필요
  // 현재는 확률적으로 TRADING 상태 표시
  if (Math.random() < 0.1) return 'TRADING'

  // 기본: WORKING
  return 'WORKING'
}
