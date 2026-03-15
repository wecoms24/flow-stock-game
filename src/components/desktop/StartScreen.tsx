import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import { RetroPanel } from '../ui/RetroPanel'
import type { Difficulty, GameMode, KISCredentials } from '../../types'
import type { InvestmentStyle, CompanyProfile } from '../../types/chapter'
import { DIFFICULTY_TABLE, VICTORY_GOALS } from '../../data/difficulty'
import { AUM_CONFIG } from '../../config/aiConfig'
import type { SaveSlotInfo } from '../../systems/sqlite/types'
import { initializeDB, listSaveSlots } from '../../systems/sqlite'
import { getFeatureFlag } from '../../systems/featureFlags'
import { historicalDataService } from '../../services/historicalDataService'
import { KIS_CREDENTIALS_STORAGE_KEY } from '../../config/kisConfig'
import { validateCredentials } from '../../services/kisAuthService'
import { loadPrestige, getPrestigeStars, getPrestigeBonuses } from '../../systems/prestigeSystem'

interface StartScreenProps {
  hasSave: boolean
  onSaveLoaded: () => void
}

/* ── Boot sequence lines (retro BIOS style) ── */
const BOOT_LINES = [
  'Stock-OS 95 BIOS v1.0',
  'Copyright (c) 2026 Wecoms.co.ltd',
  '',
  'CPU: Pentium(R) Trading Processor 166MHz',
  'Memory Test: 16384K OK',
  '',
  'Detecting Hard Drives...',
  '  Primary: WD-StockData 540MB ... OK',
  '  Secondary: CD-ROM Drive ... Not Found',
  '',
  'Loading MARKET.SYS ...',
  'Loading TICKER.DRV ...',
  'Loading PORTFOLIO.EXE ...',
  '',
  'Starting Stock-OS 95...',
]

interface CompetitorSetup {
  enabled: boolean
  count: number
  aumMultiplier: number
  isCustomAum: boolean
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
}

const COMPETITOR_STYLE_LABELS = ['공격형', '안정형', '추세추종', '역발상']

export function StartScreen({ hasSave, onSaveLoaded }: StartScreenProps) {
  const startGame = useGameStore((s) => s.startGame)
  const initializeCompetitors = useGameStore((s) => s.initializeCompetitors)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)
  const [bootPhase, setBootPhase] = useState<'booting' | 'ready'>('booting')
  const [bootLineIdx, setBootLineIdx] = useState(0)
  const [competitorSetup, setCompetitorSetup] = useState<CompetitorSetup>({
    enabled: false,
    count: 3,
    aumMultiplier: AUM_CONFIG.DEFAULT_MULTIPLIERS.normal,
    isCustomAum: false,
  })
  const [showBattleConfig, setShowBattleConfig] = useState(false)
  const [selectedGoalIdx, setSelectedGoalIdx] = useState(1) // default: 억만장자 (10억)
  const [customInitialCash, setCustomInitialCash] = useState<string>('')
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([])
  const [gameMode, setGameMode] = useState<GameMode>('virtual')
  const [kospiDbLoading, setKospiDbLoading] = useState(false)
  const [kospiDbProgress, setKospiDbProgress] = useState(0)
  const [kospiDbReady, setKospiDbReady] = useState(false)
  const [kospiDbError, setKospiDbError] = useState<string | null>(null)

  // Company Profile
  const [companyName, setCompanyName] = useState('레트로 투자운용')
  const [investStyle, setInvestStyle] = useState<InvestmentStyle>('stable')
  const [companyLogo, setCompanyLogo] = useState('🏢')

  // Prestige data
  const prestige = useMemo(() => loadPrestige(), [])
  const prestigeBonuses = useMemo(() => getPrestigeBonuses(), [])

  // 실시간 모드 상태
  const [kisAppKey, setKisAppKey] = useState('')
  const [kisAppSecret, setKisAppSecret] = useState('')
  const [kisIsDemo, setKisIsDemo] = useState(true)
  const [kisValidating, setKisValidating] = useState(false)
  const [kisValid, setKisValid] = useState<boolean | null>(null)
  const [kisError, setKisError] = useState<string | null>(null)

  // Boot animation: reveal lines one by one
  useEffect(() => {
    if (bootPhase !== 'booting') return
    if (bootLineIdx >= BOOT_LINES.length) {
      const timer = setTimeout(() => setBootPhase('ready'), 600)
      return () => clearTimeout(timer)
    }
    const delay = BOOT_LINES[bootLineIdx] === '' ? 100 : 80 + Math.random() * 60
    const timer = setTimeout(() => setBootLineIdx((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [bootPhase, bootLineIdx])

  // Load save slot info
  useEffect(() => {
    const loadSlots = async () => {
      if (!getFeatureFlag('sqlite_enabled')) return
      try {
        const db = await initializeDB()
        const slots = await listSaveSlots(db)
        setSaveSlots(slots)
      } catch {
        // SQLite unavailable, ignore
      }
    }
    loadSlots()
  }, [])

  // Load saved KIS credentials from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KIS_CREDENTIALS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as KISCredentials
        setKisAppKey(parsed.appKey)
        setKisAppSecret(parsed.appSecret)
        setKisIsDemo(parsed.isDemo)
      }
    } catch { /* ignore */ }
  }, [])

  // Allow skipping boot with click/key
  const skipBoot = () => {
    setBootLineIdx(BOOT_LINES.length)
    setBootPhase('ready')
  }

  const handleContinue = async () => {
    const success = await loadSavedGame()
    if (success) {
      onSaveLoaded()
    }
  }

  const difficulties: { key: Difficulty; label: string; cash: string; desc: string }[] = [
    { key: 'easy', label: '쉬움', cash: '1억원', desc: '넉넉한 자본, 낮은 변동성' },
    { key: 'normal', label: '보통', cash: '5천만원', desc: '표준 밸런스' },
    { key: 'hard', label: '어려움', cash: '2천만원', desc: '높은 변동성, 빠른 스태미너 소모' },
  ]

  const handleKisTest = async () => {
    if (!kisAppKey.trim() || !kisAppSecret.trim()) {
      setKisError('App Key와 App Secret을 입력해주세요')
      return
    }
    setKisValidating(true)
    setKisError(null)
    setKisValid(null)
    try {
      const creds: KISCredentials = { appKey: kisAppKey.trim(), appSecret: kisAppSecret.trim(), isDemo: kisIsDemo }
      const ok = await validateCredentials(creds)
      setKisValid(ok)
      if (ok) {
        localStorage.setItem(KIS_CREDENTIALS_STORAGE_KEY, JSON.stringify(creds))
      } else {
        setKisError('인증 실패 — App Key/Secret을 확인해주세요')
      }
    } catch (err) {
      setKisError(err instanceof Error ? err.message : '연결 테스트 실패')
      setKisValid(false)
    } finally {
      setKisValidating(false)
    }
  }

  const handleGameModeChange = async (mode: GameMode) => {
    setGameMode(mode)
    setKospiDbError(null)

    if (mode === 'kospi' && !historicalDataService.isReady) {
      setKospiDbLoading(true)
      setKospiDbProgress(0)
      try {
        await historicalDataService.initialize((pct) => setKospiDbProgress(pct))
        setKospiDbReady(true)
      } catch (err) {
        setKospiDbError(err instanceof Error ? err.message : 'DB 로드 실패')
        setGameMode('virtual') // 실패 시 가상 모드로 폴백
      } finally {
        setKospiDbLoading(false)
      }
    } else if (mode === 'kospi' && historicalDataService.isReady) {
      setKospiDbReady(true)
    }
  }

  const handleStartGame = (difficulty: Difficulty) => {
    const parsedCustomCash = customInitialCash.trim()
      ? parseInt(customInitialCash.replace(/[^0-9]/g, ''), 10)
      : undefined
    const initialCash = parsedCustomCash ?? DIFFICULTY_TABLE[difficulty].initialCash

    if (competitorSetup.enabled) {
      const multiplier = competitorSetup.isCustomAum
        ? competitorSetup.aumMultiplier
        : (AUM_CONFIG.DEFAULT_MULTIPLIERS[difficulty] ?? AUM_CONFIG.DEFAULT_MULTIPLIERS.normal)
      const totalAUM = initialCash * multiplier
      const perCompetitorCash = Math.floor(totalAUM / competitorSetup.count)

      initializeCompetitors(competitorSetup.count, perCompetitorCash)
    }

    const kisCreds = gameMode === 'realtime'
      ? { appKey: kisAppKey.trim(), appSecret: kisAppSecret.trim(), isDemo: kisIsDemo }
      : undefined
    const profile: CompanyProfile = { name: companyName.trim() || '레트로 투자운용', style: investStyle, logo: companyLogo }
    startGame(difficulty, VICTORY_GOALS[selectedGoalIdx].targetAsset, parsedCustomCash, gameMode, kisCreds, profile)
  }

  const competitorNames = [
    { name: 'Warren Buffoon', icon: '🔥' },
    { name: 'Elon Musk-rat', icon: '🐢' },
    { name: 'Peter Lynch Pin', icon: '🌊' },
    { name: 'Ray Dalio-ma', icon: '🐻' },
    { name: 'George Soros-t', icon: '⚡' },
  ]

  // ── Boot Phase ──
  if (bootPhase === 'booting') {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col justify-start p-6 cursor-pointer"
        onClick={skipBoot}
        onKeyDown={skipBoot}
        role="button"
        tabIndex={0}
      >
        <div className="font-mono text-retro-green text-xs leading-relaxed">
          {BOOT_LINES.slice(0, bootLineIdx).map((line, i) => (
            <div key={i}>{line || '\u00A0'}</div>
          ))}
          {bootLineIdx < BOOT_LINES.length && <span className="animate-pulse">_</span>}
        </div>
        <div className="absolute bottom-4 right-4 text-retro-gray text-[10px]">
          클릭하여 건너뛰기
        </div>
      </div>
    )
  }

  const formatAssetShort = (n: number) => {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
    if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만원`
    return `${n.toLocaleString()}원`
  }

  // ── Ready Phase (difficulty select) ──
  return (
    <div className="fixed inset-0 bg-retro-darkblue flex items-center justify-center overflow-y-auto py-4">
      <RetroPanel className="p-1 max-w-md w-full">
        <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold mb-1">
          Retro Stock-OS 95 - 게임 설정
        </div>

        <div className="p-4 space-y-3">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-retro-darkblue">Retro Stock-OS 95</div>
            <div className="text-xs text-retro-gray">
              1995년부터 2025년까지, 30년간의 주식 투자 시뮬레이션
            </div>
            {prestige.level > 0 && (
              <div className="text-xs">
                <span className="font-bold text-purple-700">
                  {getPrestigeStars(prestige.level)} 프레스티지 Lv.{prestige.level}
                </span>
                <span className="text-retro-gray ml-1">
                  · 초기 자본 +{Math.round((prestigeBonuses.cashMultiplier - 1) * 100)}%
                  {prestigeBonuses.carryOverSkillId && ' · 스킬 이월'}
                </span>
              </div>
            )}
          </div>

          {/* Save Slot Display + Continue */}
          {hasSave && (
            <RetroPanel variant="inset" className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold mb-1">💾 저장된 게임</div>
                  {saveSlots.length > 0 ? (
                    saveSlots.map((slot) => (
                      <div key={slot.id} className="text-[10px] text-retro-gray">
                        {slot.year}년 {slot.month}월 · {DIFFICULTY_LABELS[slot.difficulty] ?? slot.difficulty} ·
                        총자산 {formatAssetShort(slot.player_total_assets)}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-retro-gray">자동 저장 데이터</div>
                  )}
                </div>
                <RetroButton variant="primary" onClick={handleContinue}>
                  이어하기
                </RetroButton>
              </div>
            </RetroPanel>
          )}

          {/* Game Mode Selection */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">📊 데이터 모드:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleGameModeChange('virtual')}
                className={`p-2 text-left text-[11px] border rounded transition-colors ${
                  gameMode === 'virtual'
                    ? 'border-win-highlight bg-win-highlight/10 font-bold'
                    : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                }`}
              >
                <div className="font-semibold">가상 주식</div>
                <div className="text-retro-gray text-[10px]">100개 가상 종목</div>
              </button>
              <button
                onClick={() => handleGameModeChange('kospi')}
                disabled={kospiDbLoading}
                className={`p-2 text-left text-[11px] border rounded transition-colors ${
                  gameMode === 'kospi'
                    ? 'border-win-highlight bg-win-highlight/10 font-bold'
                    : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                } ${kospiDbLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div className="font-semibold">KOSPI 데이터</div>
                <div className="text-retro-gray text-[10px]">실제 종목 (1995~2025)</div>
              </button>
              <button
                onClick={() => handleGameModeChange('realtime')}
                className={`p-2 text-left text-[11px] border rounded transition-colors ${
                  gameMode === 'realtime'
                    ? 'border-win-highlight bg-win-highlight/10 font-bold'
                    : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                }`}
              >
                <div className="font-semibold">실시간 시세</div>
                <div className="text-retro-gray text-[10px]">한투 API 실시간</div>
              </button>
            </div>
            {/* DB Loading Progress */}
            {kospiDbLoading && (
              <div className="space-y-1">
                <div className="text-[10px] text-retro-gray">
                  KOSPI 데이터 로딩 중... {kospiDbProgress}%
                </div>
                <div className="w-full h-2 bg-win-shadow rounded overflow-hidden">
                  <div
                    className="h-full bg-win-highlight transition-all duration-300"
                    style={{ width: `${kospiDbProgress}%` }}
                  />
                </div>
              </div>
            )}
            {kospiDbError && (
              <div className="text-[10px] text-red-600">
                DB 로드 실패: {kospiDbError}
              </div>
            )}
            {gameMode === 'kospi' && kospiDbReady && (
              <div className="text-[10px] text-stock-up font-bold">
                KOSPI DB 로드 완료 — 삼성전자, SK하이닉스 등 실제 종목으로 플레이
              </div>
            )}
            {/* 실시간 모드: API Key 입력 */}
            {gameMode === 'realtime' && (
              <div className="space-y-2 mt-2">
                <div className="space-y-1">
                  <label className="block text-[10px] text-retro-gray">App Key</label>
                  <input
                    type="text"
                    value={kisAppKey}
                    onChange={(e) => { setKisAppKey(e.target.value); setKisValid(null) }}
                    placeholder="한국투자증권 App Key"
                    className="w-full px-2 py-1 text-[11px] border-2 border-win-shadow bg-white focus:border-win-highlight outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-retro-gray">App Secret</label>
                  <input
                    type="password"
                    value={kisAppSecret}
                    onChange={(e) => { setKisAppSecret(e.target.value); setKisValid(null) }}
                    placeholder="한국투자증권 App Secret"
                    className="w-full px-2 py-1 text-[11px] border-2 border-win-shadow bg-white focus:border-win-highlight outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <input
                      type="radio"
                      name="kis-env"
                      checked={kisIsDemo}
                      onChange={() => { setKisIsDemo(true); setKisValid(null) }}
                      className="accent-win-highlight"
                    />
                    모의투자
                  </label>
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <input
                      type="radio"
                      name="kis-env"
                      checked={!kisIsDemo}
                      onChange={() => { setKisIsDemo(false); setKisValid(null) }}
                      className="accent-win-highlight"
                    />
                    실전
                  </label>
                  <RetroButton
                    variant="default"
                    onClick={handleKisTest}
                    disabled={kisValidating}
                  >
                    {kisValidating ? '테스트 중...' : '연결 테스트'}
                  </RetroButton>
                </div>
                {kisValid === true && (
                  <div className="text-[10px] text-stock-up font-bold">
                    연결 성공 — 실시간 시세 모드로 게임을 시작할 수 있습니다
                  </div>
                )}
                {kisError && (
                  <div className="text-[10px] text-red-600">{kisError}</div>
                )}
              </div>
            )}
          </RetroPanel>

          {/* Battle Mode Toggle + Summary */}
          <RetroPanel variant="inset" className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="battle-mode"
                  className="w-4 h-4 accent-win-highlight"
                  checked={competitorSetup.enabled}
                  onChange={(e) => {
                    setCompetitorSetup({ ...competitorSetup, enabled: e.target.checked })
                    if (e.target.checked) setShowBattleConfig(true)
                  }}
                />
                <label htmlFor="battle-mode" className="text-sm font-bold cursor-pointer">
                  🥊 경쟁 모드
                </label>
              </div>
              {competitorSetup.enabled && (
                <button
                  onClick={() => setShowBattleConfig(true)}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  경쟁자 {competitorSetup.count}명 | AUM x{competitorSetup.aumMultiplier} ⚙️
                </button>
              )}
            </div>
          </RetroPanel>

          {/* Victory Goal Selection */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">🎯 승리 목표:</div>
            <div className="grid grid-cols-2 gap-1">
              {VICTORY_GOALS.map((goal, idx) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalIdx(idx)}
                  className={`p-2 text-left text-[11px] border rounded transition-colors ${
                    selectedGoalIdx === idx
                      ? 'border-win-highlight bg-win-highlight/10 font-bold'
                      : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{goal.icon}</span>
                    <span>{goal.label}</span>
                  </div>
                  <div className="text-retro-gray text-[10px]">{goal.description}</div>
                </button>
              ))}
            </div>
          </RetroPanel>

          {/* Custom Initial Cash Input */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">💰 초기 자본 설정:</div>
            <div className="space-y-1">
              <label className="block text-xs text-retro-gray">
                커스텀 초기 자본 (비워두면 난이도별 기본값 사용)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customInitialCash}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setCustomInitialCash(value)
                  }}
                  placeholder="예: 50000000"
                  className="flex-1 px-2 py-1 text-sm border-2 border-win-shadow bg-white focus:border-win-highlight outline-none"
                />
                <button
                  onClick={() => setCustomInitialCash('')}
                  className="px-2 py-1 text-xs bg-win-face border border-win-shadow hover:bg-win-highlight/10"
                >
                  초기화
                </button>
              </div>
              {customInitialCash && (
                <div className="text-xs text-stock-up font-bold">
                  설정된 초기 자본: {parseInt(customInitialCash).toLocaleString()}원
                </div>
              )}
            </div>
          </RetroPanel>

          {/* Company Profile */}
          <RetroPanel variant="inset" className="p-3 space-y-2">
            <div className="text-sm font-bold">🏢 회사 프로필:</div>
            <div className="space-y-1">
              <label className="block text-[10px] text-retro-gray">회사 이름</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="레트로 투자운용"
                maxLength={20}
                className="w-full px-2 py-1 text-sm border-2 border-win-shadow bg-white focus:border-win-highlight outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-retro-gray">투자 스타일</label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { key: 'aggressive' as const, icon: '🦈', label: '공격형', desc: '초기 자금 -20%, 거래 수수료 -10%' },
                  { key: 'stable' as const, icon: '🐢', label: '안정형', desc: '초기 자금 +10%' },
                  { key: 'analytical' as const, icon: '📊', label: '분석형', desc: '애널리스트 1명 무료 제공' },
                ]).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setInvestStyle(s.key)}
                    className={`p-2 text-center text-[11px] border rounded transition-colors ${
                      investStyle === s.key
                        ? 'border-win-highlight bg-win-highlight/10 font-bold'
                        : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                    }`}
                  >
                    <div className="text-lg">{s.icon}</div>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-retro-gray text-[10px]">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-retro-gray">회사 로고</label>
              <div className="flex gap-2">
                {['🏢', '📈', '💹', '🏦', '🚀', '💎'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCompanyLogo(emoji)}
                    className={`w-8 h-8 text-lg flex items-center justify-center rounded border transition-colors ${
                      companyLogo === emoji
                        ? 'border-win-highlight bg-win-highlight/10'
                        : 'border-win-shadow bg-win-face hover:bg-win-highlight/5'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </RetroPanel>

          <div className="space-y-2">
            <div className="text-sm font-bold">새 게임 시작:</div>
            {difficulties.map((d) => {
              const effectiveCash = customInitialCash.trim()
                ? parseInt(customInitialCash)
                : DIFFICULTY_TABLE[d.key].initialCash
              return (
                <RetroPanel key={d.key} variant="inset" className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{d.label}</div>
                      <div className="text-[10px] text-retro-gray">{d.desc}</div>
                      <div className="text-[10px]">
                        초기자본:{' '}
                        <span className="text-retro-darkblue font-bold">
                          {customInitialCash.trim() ? (
                            <>
                              {effectiveCash.toLocaleString()}원{' '}
                              <span className="text-retro-gray">(커스텀)</span>
                            </>
                          ) : (
                            d.cash
                          )}
                        </span>
                        {' · '}목표:{' '}
                        <span className="text-stock-up font-bold">
                          {VICTORY_GOALS[selectedGoalIdx].description}
                        </span>
                      </div>
                    </div>
                    <RetroButton
                      variant="primary"
                      onClick={() => handleStartGame(d.key)}
                      disabled={
                        (gameMode === 'kospi' && !kospiDbReady) ||
                        (gameMode === 'realtime' && kisValid !== true)
                      }
                    >
                      {competitorSetup.enabled ? '⚔️ 대결!' : '시작'}
                    </RetroButton>
                  </div>
                </RetroPanel>
              )
            })}
          </div>

          <div className="text-[10px] text-retro-gray text-center">
            (c) 2026 Wecoms.co.ltd - Retro Stock-OS 95
          </div>
        </div>
      </RetroPanel>

      {/* Battle Config Modal */}
      {showBattleConfig && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <RetroPanel className="p-1 max-w-sm w-full mx-4">
            <div className="bg-win-title-active text-win-title-text px-2 py-1 text-sm font-bold mb-1 flex justify-between items-center">
              <span>🥊 경쟁 모드 설정</span>
              <button
                onClick={() => setShowBattleConfig(false)}
                className="text-win-title-text hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Competitor Count Slider */}
              <div>
                <label className="block text-xs mb-1">
                  경쟁자 수: <strong>{competitorSetup.count}명</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={competitorSetup.count}
                  onChange={(e) =>
                    setCompetitorSetup({ ...competitorSetup, count: Number(e.target.value) })
                  }
                  className="w-full h-1 bg-win-shadow rounded appearance-none cursor-pointer accent-win-highlight"
                />
                <div className="flex justify-between text-[10px] text-retro-gray mt-1">
                  <span>1명 (쉬움)</span>
                  <span>5명 (어려움)</span>
                </div>
              </div>

              {/* AUM Multiplier Slider */}
              <div>
                <label className="block text-xs mb-1">
                  경쟁자 자금 배율: <strong>x{competitorSetup.aumMultiplier}</strong>
                  <span className="text-retro-gray ml-1">
                    (경쟁자당{' '}
                    {(
                      (DIFFICULTY_TABLE.normal.initialCash * competitorSetup.aumMultiplier) /
                      competitorSetup.count /
                      10000
                    ).toLocaleString()}
                    만원)
                  </span>
                </label>
                <input
                  type="range"
                  min={AUM_CONFIG.MIN_MULTIPLIER}
                  max={AUM_CONFIG.MAX_MULTIPLIER}
                  step={1}
                  value={competitorSetup.aumMultiplier}
                  onChange={(e) =>
                    setCompetitorSetup({
                      ...competitorSetup,
                      aumMultiplier: Number(e.target.value),
                      isCustomAum: true,
                    })
                  }
                  className="w-full h-1 bg-win-shadow rounded appearance-none cursor-pointer accent-win-highlight"
                />
                <div className="flex justify-between text-[10px] text-retro-gray mt-1">
                  <span>x1 (동등)</span>
                  <span>x100 (압도적)</span>
                </div>
              </div>

              {/* Rival Preview */}
              <div>
                <div className="text-[10px] font-bold mb-1">참가 경쟁자:</div>
                <div className="grid grid-cols-2 gap-1">
                  {competitorNames.slice(0, competitorSetup.count).map((rival, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 p-1 bg-win-face rounded text-[10px]"
                    >
                      <span className="text-sm">{rival.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold">{rival.name}</div>
                        <div className="text-retro-gray">{COMPETITOR_STYLE_LABELS[i % 4]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <RetroButton
                variant="primary"
                className="w-full"
                onClick={() => setShowBattleConfig(false)}
              >
                설정 완료
              </RetroButton>
            </div>
          </RetroPanel>
        </div>
      )}
    </div>
  )
}
