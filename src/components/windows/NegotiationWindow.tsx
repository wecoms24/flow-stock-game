import { useRef, useEffect, useCallback, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { NEGOTIATION_CONFIG } from '../../config/negotiationConfig'
import { judgeHit, calculateScore, determineResult } from '../../engines/negotiationEngine'
import type { RhythmNote } from '../../types/negotiation'

/* ── Constants ── */
const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 400
const LANE_WIDTH = 80
const JUDGE_LINE_Y = 360
const NOTE_SIZE = 32
const LANE_LABELS = ['←', '↑', '↓', '→'] as const
const KEY_MAP: Record<string, number> = {
  ArrowLeft: 0,
  ArrowUp: 1,
  ArrowDown: 2,
  ArrowRight: 3,
}

/* ── Neon Colors ── */
const LANE_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#00ff88']
const PERFECT_COLOR = '#ffd700'
const GOOD_COLOR = '#00bfff'
const MISS_COLOR = '#ff4444'
const BG_COLOR = '#0a0a1a'
const GRID_COLOR = '#1a1a3a'

/* ── Judgment Flash State ── */
interface JudgmentFlash {
  text: string
  color: string
  lane: number
  time: number
}

export function NegotiationWindow() {
  const negotiation = useGameStore((s) => s.activeNegotiation)
  const updateNegotiation = useGameStore((s) => s.updateNegotiation)
  const completeNegotiation = useGameStore((s) => s.completeNegotiation)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const notesRef = useRef<RhythmNote[]>([])
  const startTimeRef = useRef<number>(0)
  const flashesRef = useRef<JudgmentFlash[]>([])
  const [liveScore, setLiveScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(NEGOTIATION_CONFIG.RHYTHM_DURATION_MS / 1000)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)

  /* ── Phase: Intro ── */
  const handleStartRhythm = useCallback(() => {
    if (!negotiation) return
    updateNegotiation({ phase: 'rhythm', startTime: performance.now() })
  }, [negotiation, updateNegotiation])

  /* ── Phase: Rhythm - Keyboard Input ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!negotiation || negotiation.phase !== 'rhythm') return

      const laneIndex = KEY_MAP[e.key]
      if (laneIndex == null) return

      e.preventDefault()
      const elapsed = performance.now() - startTimeRef.current

      // 아직 판정되지 않은 해당 레인 노트 중 가장 가까운 것 찾기
      let closestIdx = -1
      let closestDiff = Infinity

      for (let i = 0; i < notesRef.current.length; i++) {
        const note = notesRef.current[i]
        if (note.hit != null) continue
        if (note.lane !== laneIndex) continue

        const diff = Math.abs(note.time - elapsed)
        if (diff < closestDiff && diff <= NEGOTIATION_CONFIG.HIT_WINDOW_GOOD) {
          closestDiff = diff
          closestIdx = i
        }
      }

      if (closestIdx >= 0) {
        const judgment = judgeHit(notesRef.current[closestIdx], elapsed)
        notesRef.current[closestIdx] = { ...notesRef.current[closestIdx], hit: judgment }

        // Flash effect
        const flashColor =
          judgment === 'perfect' ? PERFECT_COLOR : judgment === 'good' ? GOOD_COLOR : MISS_COLOR
        const flashText =
          judgment === 'perfect' ? 'PERFECT!' : judgment === 'good' ? 'GOOD' : 'MISS'

        flashesRef.current.push({
          text: flashText,
          color: flashColor,
          lane: laneIndex,
          time: performance.now(),
        })

        // Combo tracking
        if (judgment === 'miss') {
          setCombo(0)
        } else {
          setCombo((prev) => {
            const next = prev + 1
            setMaxCombo((prevMax) => Math.max(prevMax, next))
            return next
          })
        }

        // Score update
        const score = calculateScore(notesRef.current)
        setLiveScore(score)
      }
    },
    [negotiation],
  )

  /* ── Phase: Rhythm - Start ── */
  useEffect(() => {
    if (!negotiation || negotiation.phase !== 'rhythm') return

    // 키보드 이벤트 등록
    window.addEventListener('keydown', handleKeyDown)

    // 노트 초기화
    notesRef.current = negotiation.rhythmNotes.map((n) => ({ ...n }))
    startTimeRef.current = performance.now()
    setLiveScore(0)
    setCombo(0)
    setMaxCombo(0)

    // 게임 루프
    const gameLoop = () => {
      const elapsed = performance.now() - startTimeRef.current
      const remaining = Math.max(0, (NEGOTIATION_CONFIG.RHYTHM_DURATION_MS - elapsed) / 1000)
      setTimeLeft(Math.ceil(remaining))

      // Miss 처리: 판정라인을 크게 지나친 노트
      for (let i = 0; i < notesRef.current.length; i++) {
        const note = notesRef.current[i]
        if (note.hit != null) continue
        if (elapsed - note.time > NEGOTIATION_CONFIG.HIT_WINDOW_GOOD + 50) {
          notesRef.current[i] = { ...note, hit: 'miss' }

          flashesRef.current.push({
            text: 'MISS',
            color: MISS_COLOR,
            lane: note.lane,
            time: performance.now(),
          })
          setCombo(0)
        }
      }

      // Canvas 렌더링
      renderCanvas(elapsed)

      // 게임 종료 확인
      if (elapsed >= NEGOTIATION_CONFIG.RHYTHM_DURATION_MS) {
        // 미판정 노트 → miss 처리
        for (let i = 0; i < notesRef.current.length; i++) {
          if (notesRef.current[i].hit == null) {
            notesRef.current[i] = { ...notesRef.current[i], hit: 'miss' }
          }
        }

        const finalScore = calculateScore(notesRef.current)
        const { result, finalRaise } = determineResult(finalScore, negotiation.demandedRaise)

        updateNegotiation({
          phase: 'result',
          score: finalScore,
          rhythmNotes: [...notesRef.current],
          result,
          finalRaise,
        })
        return
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [negotiation?.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Canvas Rendering ── */
  const renderCanvas = useCallback((elapsed: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 배경
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 레인 구분선 (그리드)
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(i * LANE_WIDTH, 0)
      ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT)
      ctx.stroke()
    }

    // 판정라인
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, JUDGE_LINE_Y)
    ctx.lineTo(CANVAS_WIDTH, JUDGE_LINE_Y)
    ctx.stroke()

    // 하단 레인 레이블
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = LANE_COLORS[i]
      ctx.globalAlpha = 0.3
      ctx.fillRect(i * LANE_WIDTH, JUDGE_LINE_Y - 18, LANE_WIDTH, 36)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = LANE_COLORS[i]
      ctx.fillText(LANE_LABELS[i], i * LANE_WIDTH + LANE_WIDTH / 2, JUDGE_LINE_Y + 6)
    }

    // 노트 렌더링
    const { NOTE_SPEED } = NEGOTIATION_CONFIG
    for (const note of notesRef.current) {
      if (note.hit != null) continue

      // 노트 위치: 시간 기반 (판정라인에 note.time 때 도달)
      const timeDiff = note.time - elapsed
      const y = JUDGE_LINE_Y - (timeDiff / 1000) * NOTE_SPEED

      // 화면 밖이면 스킵
      if (y < -NOTE_SIZE || y > CANVAS_HEIGHT + NOTE_SIZE) continue

      const x = note.lane * LANE_WIDTH + (LANE_WIDTH - NOTE_SIZE) / 2
      const color = LANE_COLORS[note.lane]

      // 노트 그리기 (레트로 픽셀 느낌)
      ctx.fillStyle = color
      ctx.fillRect(x, y, NOTE_SIZE, NOTE_SIZE)

      // 내부 하이라이트
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.3
      ctx.fillRect(x + 4, y + 4, NOTE_SIZE - 8, NOTE_SIZE - 8)
      ctx.globalAlpha = 1.0

      // 외곽선
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, NOTE_SIZE - 1, NOTE_SIZE - 1)
    }

    // 판정 플래시 표시
    const now = performance.now()
    flashesRef.current = flashesRef.current.filter((f) => now - f.time < 500)
    for (const flash of flashesRef.current) {
      const age = now - flash.time
      const alpha = 1 - age / 500
      const offsetY = -(age / 500) * 30

      ctx.globalAlpha = alpha
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = flash.color
      ctx.fillText(
        flash.text,
        flash.lane * LANE_WIDTH + LANE_WIDTH / 2,
        JUDGE_LINE_Y - 30 + offsetY,
      )
      ctx.globalAlpha = 1.0
    }

    // 진행 바
    const progress = elapsed / NEGOTIATION_CONFIG.RHYTHM_DURATION_MS
    ctx.fillStyle = '#333'
    ctx.fillRect(0, CANVAS_HEIGHT - 6, CANVAS_WIDTH, 6)
    ctx.fillStyle = '#00ff88'
    ctx.fillRect(0, CANVAS_HEIGHT - 6, CANVAS_WIDTH * Math.min(progress, 1), 6)
  }, [])

  /* ── Phase: Result - Complete ── */
  const handleComplete = useCallback(() => {
    completeNegotiation()
  }, [completeNegotiation])

  /* ── Render ── */
  if (!negotiation) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-retro-gray">
        협상 데이터 없음
      </div>
    )
  }

  const { phase } = negotiation

  return (
    <div className="flex flex-col h-full bg-[#0a0a1a] text-white p-3 select-none">
      {/* Phase 1: Intro */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          {/* 직원 정보 카드 */}
          <div className="border-2 border-[#00ffff] bg-[#0f0f2f] p-4 w-[280px]">
            <div className="text-center mb-3">
              <div className="text-[#ff00ff] text-lg font-bold pixel-font">연봉 협상</div>
              <div className="text-[#00ffff] text-xs mt-1">SALARY NEGOTIATION</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#1a1a3a] pb-1">
                <span className="text-[#888]">직원명</span>
                <span className="text-white font-bold">{negotiation.employeeName}</span>
              </div>
              <div className="flex justify-between border-b border-[#1a1a3a] pb-1">
                <span className="text-[#888]">현재 연봉</span>
                <span className="text-[#00ff88]">
                  {(negotiation.currentSalary * 12).toLocaleString()}원/년
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1a1a3a] pb-1">
                <span className="text-[#888]">요구 인상률</span>
                <span className="text-[#ffff00] font-bold">
                  +{(negotiation.demandedRaise * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">인상 후 연봉</span>
                <span className="text-[#ff00ff]">
                  {Math.round(
                    negotiation.currentSalary * (1 + negotiation.demandedRaise) * 12,
                  ).toLocaleString()}
                  원/년
                </span>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="text-[10px] text-[#888] text-center max-w-[280px] leading-relaxed">
            리듬 게임으로 협상 실력을 증명하세요!
            <br />
            방향키(← ↑ ↓ →)로 노트를 맞추면 됩니다.
            <br />
            <span className="text-[#ffd700]">80점 이상</span> = 전액 승인,{' '}
            <span className="text-[#00bfff]">50~79점</span> = 절충,{' '}
            <span className="text-[#ff4444]">49점 이하</span> = 거절
          </div>

          <RetroButton variant="primary" onClick={handleStartRhythm}>
            협상 시작
          </RetroButton>
        </div>
      )}

      {/* Phase 2: Rhythm Game */}
      {phase === 'rhythm' && (
        <div className="flex flex-col items-center flex-1 gap-1">
          {/* 점수 표시 */}
          <div className="flex items-center justify-between w-[320px] mb-1">
            <div className="text-xs">
              <span className="text-[#888]">SCORE </span>
              <span className="text-[#00ff88] font-bold text-sm">{liveScore}</span>
            </div>
            <div className="text-xs">
              <span className="text-[#888]">COMBO </span>
              <span className="text-[#ffff00] font-bold text-sm">{combo}</span>
            </div>
            <div className="text-xs">
              <span className="text-[#888]">TIME </span>
              <span className="text-[#ff00ff] font-bold text-sm">{timeLeft}s</span>
            </div>
          </div>

          {/* 캔버스 */}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-[#333]"
            style={{
              imageRendering: 'pixelated',
            }}
          />

          {/* 키 안내 */}
          <div className="flex gap-4 mt-1">
            {LANE_LABELS.map((label, i) => (
              <div
                key={i}
                className="w-10 h-8 flex items-center justify-center border text-sm font-bold"
                style={{
                  borderColor: LANE_COLORS[i],
                  color: LANE_COLORS[i],
                  textShadow: `0 0 8px ${LANE_COLORS[i]}`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Result */}
      {phase === 'result' && negotiation.result && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          {/* 결과 헤더 */}
          <div
            className="text-2xl font-bold pixel-font"
            style={{
              color:
                negotiation.result === 'full'
                  ? PERFECT_COLOR
                  : negotiation.result === 'partial'
                    ? GOOD_COLOR
                    : MISS_COLOR,
              textShadow: `0 0 12px ${
                negotiation.result === 'full'
                  ? PERFECT_COLOR
                  : negotiation.result === 'partial'
                    ? GOOD_COLOR
                    : MISS_COLOR
              }`,
            }}
          >
            {negotiation.result === 'full'
              ? '전액 승인!'
              : negotiation.result === 'partial'
                ? '절충 합의'
                : '거절됨'}
          </div>

          {/* 결과 카드 */}
          <div className="border-2 border-[#333] bg-[#0f0f2f] p-4 w-[280px] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#888]">최종 점수</span>
              <span className="text-[#00ff88] font-bold text-base">{negotiation.score}점</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#888]">최대 콤보</span>
              <span className="text-[#ffff00]">{maxCombo}</span>
            </div>

            {/* 노트 통계 */}
            <div className="flex justify-center gap-3 py-1">
              <div className="text-center">
                <div className="text-[#ffd700] font-bold">
                  {negotiation.rhythmNotes.filter((n) => n.hit === 'perfect').length}
                </div>
                <div className="text-[9px] text-[#888]">PERFECT</div>
              </div>
              <div className="text-center">
                <div className="text-[#00bfff] font-bold">
                  {negotiation.rhythmNotes.filter((n) => n.hit === 'good').length}
                </div>
                <div className="text-[9px] text-[#888]">GOOD</div>
              </div>
              <div className="text-center">
                <div className="text-[#ff4444] font-bold">
                  {negotiation.rhythmNotes.filter((n) => n.hit === 'miss').length}
                </div>
                <div className="text-[9px] text-[#888]">MISS</div>
              </div>
            </div>

            <div className="border-t border-[#1a1a3a] pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-[#888]">요구 인상률</span>
                <span className="text-white">
                  +{(negotiation.demandedRaise * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">최종 인상률</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      negotiation.result === 'full'
                        ? PERFECT_COLOR
                        : negotiation.result === 'partial'
                          ? GOOD_COLOR
                          : MISS_COLOR,
                  }}
                >
                  +{((negotiation.finalRaise ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">새 월급</span>
                <span className="text-[#00ff88]">
                  {Math.round(
                    negotiation.currentSalary * (1 + (negotiation.finalRaise ?? 0)),
                  ).toLocaleString()}
                  원/월
                </span>
              </div>
            </div>

            {/* 만족도 변화 */}
            <div className="border-t border-[#1a1a3a] pt-2">
              <div className="flex justify-between">
                <span className="text-[#888]">만족도 변화</span>
                <span
                  style={{
                    color:
                      negotiation.result === 'full'
                        ? '#00ff88'
                        : negotiation.result === 'rejected'
                          ? '#ff4444'
                          : '#ffff00',
                  }}
                >
                  {negotiation.result === 'full'
                    ? `+${NEGOTIATION_CONFIG.FULL_APPROVE_SATISFACTION_BONUS}`
                    : negotiation.result === 'rejected'
                      ? NEGOTIATION_CONFIG.REJECTION_SATISFACTION_PENALTY.toString()
                      : '+0'}
                </span>
              </div>
            </div>
          </div>

          <RetroButton variant="primary" onClick={handleComplete}>
            확인
          </RetroButton>
        </div>
      )}
    </div>
  )
}
