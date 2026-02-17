/**
 * Week 1 Demo Component
 *
 * 스프라이트 애니메이션, 감정 오라, 배경 진화 시스템의 데모
 */

import { useEffect, useRef, useState } from 'react'
import {
  SpriteAnimator,
  type AnimationStateName,
} from '../../systems/spriteAnimator'
import {
  EmotionAuraRenderer,
  type EmotionType,
  EMOTION_PRESETS,
} from '../../systems/emotionRenderer'
import { placeholderAssets } from '../../systems/spritePlaceholder'
import {
  getBackgroundForLevel,
  getNextBackground,
} from '../../data/officeBackgrounds'

export function Week1Demo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentState, setCurrentState] = useState<AnimationStateName>('WORKING')
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('focused')
  const [officeLevel, setOfficeLevel] = useState<number>(1)
  const [showAura, setShowAura] = useState<boolean>(true)

  // Animation System Setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const animator = new SpriteAnimator('IDLE')
    const auraRenderer = new EmotionAuraRenderer()

    // 플레이스홀더 스프라이트 로드
    const placeholder = placeholderAssets.get('employee_base')
    if (placeholder) {
      animator.setSpriteSheet(placeholder)
    }

    // 애니메이션 루프
    let animationId: number
    const animate = (time: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 배경 그리기
      const bg = getBackgroundForLevel(officeLevel)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

      // CSS gradient를 Canvas gradient로 변환 (간단한 버전)
      if (bg.backgroundImage.includes('gradient')) {
        gradient.addColorStop(0, bg.wallColor)
        gradient.addColorStop(1, bg.floorColor)
      } else {
        gradient.addColorStop(0, '#2a2a2a')
        gradient.addColorStop(1, '#1a1a1a')
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 레벨 정보 표시
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Office Level: ${officeLevel} - ${bg.displayName}`, 10, 20)

      // 감정 오라 렌더링 (스프라이트 뒤에)
      if (showAura) {
        const aura = EMOTION_PRESETS[
          currentEmotion === 'happy'
            ? 'HAPPY'
            : currentEmotion === 'stressed'
              ? 'STRESSED'
              : 'FOCUSED'
        ]
        auraRenderer.render(ctx, canvas.width / 2, canvas.height / 2, aura, time)
      }

      // 스프라이트 애니메이션 업데이트 및 렌더링
      animator.update(time)
      animator.render(ctx, canvas.width / 2 - 32, canvas.height / 2 - 32, 2) // 2배 스케일

      // 상태 정보 표시
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(
        `Animation: ${currentState} (Frame ${animator.getCurrentFrameIndex()})`,
        canvas.width / 2,
        canvas.height - 40,
      )
      ctx.fillText(`Emotion: ${currentEmotion}`, canvas.width / 2, canvas.height - 20)

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [currentState, currentEmotion, officeLevel, showAura])

  // 애니메이션 상태 변경 핸들러
  const handleStateChange = (state: AnimationStateName) => {
    setCurrentState(state)
    const canvas = canvasRef.current
    if (!canvas) return

    // 새 animator 생성 및 설정
    const animator = new SpriteAnimator(state)
    const placeholder = placeholderAssets.get('employee_base')
    if (placeholder) {
      animator.setSpriteSheet(placeholder)
    }
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Week 1: Visual Foundation Demo</h2>

      {/* Canvas */}
      <div className="mb-4 border-4 border-gray-800 bg-black">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="block"
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-4">
        {/* Animation State */}
        <div>
          <h3 className="font-bold mb-2 text-sm">Animation State</h3>
          <div className="space-y-1">
            {(['WORKING', 'TRADING', 'BREAK', 'PANIC', 'IDLE'] as AnimationStateName[]).map(
              (state) => (
                <button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    currentState === state
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                >
                  {state}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Emotion Type */}
        <div>
          <h3 className="font-bold mb-2 text-sm">Emotion Aura</h3>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showAura}
                onChange={(e) => setShowAura(e.target.checked)}
              />
              Show Aura
            </label>
            {(['happy', 'stressed', 'focused'] as EmotionType[]).map((emotion) => (
              <button
                key={emotion}
                onClick={() => setCurrentEmotion(emotion)}
                className={`w-full px-2 py-1 text-xs rounded ${
                  currentEmotion === emotion
                    ? emotion === 'happy'
                      ? 'bg-green-500 text-white'
                      : emotion === 'stressed'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                {emotion.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Office Level */}
        <div>
          <h3 className="font-bold mb-2 text-sm">Office Background</h3>
          <div className="space-y-1">
            <div className="text-xs mb-2">
              <div>Level: {officeLevel}</div>
              <div className="text-gray-600">
                {getBackgroundForLevel(officeLevel).displayName}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={officeLevel}
              onChange={(e) => setOfficeLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-600">
              {getNextBackground(officeLevel)?.displayName || 'Max Level'}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <h4 className="font-bold mb-1">Week 1 Checklist:</h4>
        <ul className="space-y-1">
          <li>✅ Sprite Animation Engine (5 states, 60fps)</li>
          <li>✅ Emotion Aura System (3 colors, radial gradient)</li>
          <li>✅ Office Background Evolution (10 levels)</li>
          <li>✅ Placeholder Assets (runtime generation)</li>
        </ul>
      </div>
    </div>
  )
}
