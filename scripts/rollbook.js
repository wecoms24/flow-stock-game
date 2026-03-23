/**
 * Retro Stock-OS 95 — AI 시뮬레이션 롤북
 *
 * 브라우저 콘솔에서 실행:
 *   fetch('/scripts/rollbook.js').then(r=>r.text()).then(eval)
 *
 * 30분 내 30게임년(1995-2025) 자동 플레이.
 * 모든 시스템 테스트 + 월별 360개 스냅샷 + QA 리포트 생성.
 */
;(async () => {
  'use strict'

  /* ══════════════════════════════════════
   * 0. 글로벌 변수
   * ══════════════════════════════════════ */
  window.__ROLLBOOK_METRICS = []
  window.__ROLLBOOK_ERRORS = []
  window.__ROLLBOOK_DECISIONS = []
  window.__ROLLBOOK_REPORT = null

  const LOOP_MS = 30_000 // 30초마다 의사결정
  const CRISIS_CALENDAR = [
    { label: 'IMF', sellBy: [1996, 7], buyBack: [1998, 6] },
    { label: '닷컴', sellBy: [1999, 9], buyBack: [2001, 6] },
    { label: '금융위기', sellBy: [2008, 3], buyBack: [2009, 6] },
    { label: '코로나', sellBy: [2019, 9], buyBack: [2020, 6] },
  ]
  const SKILL_ORDER = [
    'stop_loss_policy', 'diversification_rule', 'basic_chart_tools', 'news_terminal',
    'position_sizing_system', 'advanced_stop_loss', 'algorithm_trading_bot',
  ]

  let store, loopId, popupId, lastMetricKey = -1
  let cumulativeResigns = 0, prevEmpCount = 0
  let systemsUsed = new Set()

  /* ══════════════════════════════════════
   * 1. init — 초기화
   * ══════════════════════════════════════ */
  async function init() {
    const mod = await import('/src/stores/gameStore.ts')
    store = mod.useGameStore
    log('🎮 롤북 초기화 완료. store 연결됨.')

    // 자동 팝업 해제 (2초마다)
    if (popupId) clearInterval(popupId)
    popupId = setInterval(() => {
      try { handleInterrupts() } catch (e) { pushError('popup', e) }
    }, 2000)

    // 게임이 이미 실행 중이면 재개
    const s = store.getState()
    if (s.time && s.time.year >= 1995) {
      if (s.time.isPaused) s.togglePause()
      s.setSpeed(16)
      log(`▶️ 기존 게임 재개: ${s.time.year}.${s.time.month}.${s.time.day}`)
      prevEmpCount = s.player?.employees?.length ?? 0
    }
  }

  /* ══════════════════════════════════════
   * 2. handleInterrupts — 인터럽트 처리
   * ══════════════════════════════════════ */
  function handleInterrupts() {
    const s = store.getState()
    if (!s.time) return

    // 연봉 협상 자동 승인 (50%)
    if (s.activeNegotiation && s.activeNegotiation.phase === 'intro') {
      const raise = (s.activeNegotiation.demandedRaise || 0.05) * 0.5
      s.updateNegotiation({ phase: 'result', result: 'partial', finalRaise: raise, score: 65 })
      setTimeout(() => store.getState().completeNegotiation(), 100)
      decide('negotiation', `자동 승인 50%: ${s.activeNegotiation.employeeName}`)
    }

    // 레벨업 / 세레모니 해제
    if (s.pendingLevelUps?.length > 0) s.dismissLevelUp?.()
    if (s.pendingCeremony) s.dismissCeremony?.()

    // 마일스톤 알림 해제
    while (store.getState().milestoneNotifications?.length > 0) {
      store.getState().dismissMilestoneNotification?.(0)
    }

    // 월간 카드 자동 선택 (그냥 적용)
    const mc = s.monthlyCards
    if (mc?.isDrawn && !mc?.isSelectionComplete && mc?.availableCards?.length > 0) {
      const sorted = [...mc.availableCards].sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0))
      sorted.slice(0, 2).forEach(c => store.getState().selectCard?.(c.id))
      store.getState().applyCardEffects?.()
      systemsUsed.add('cards')
    }

    // 자동 재개
    if (s.time.isPaused && !s.isGameOver) s.togglePause()
  }

  /* ══════════════════════════════════════
   * 3. makeDecisions — 전략 엔진
   * ══════════════════════════════════════ */
  function makeDecisions() {
    const s = store.getState()
    if (!s.player || s.isGameOver) return

    manageCash(s)
    executeTrades(s)
    manageEmployees(s)
    manageOffice(s)
    manageSkills(s)
    manageSpy(s)
  }

  // 3A. 현금 관리
  function manageCash(s) {
    const cash = s.player.cash
    const total = s.player.totalAssetValue || cash
    const expenses = s.player.employees.reduce((sum, e) => sum + (e.salary || 0), 0)
    const runway = expenses > 0 ? Math.floor(cash / expenses) : 999

    if (runway < 3 && Object.keys(s.player.portfolio).length > 0) {
      // 긴급: 최악 종목 매도
      const worst = findWorstStock(s)
      if (worst) {
        s.sellStock(worst.id, worst.shares)
        decide('cash', `긴급 매도: ${worst.ticker} ${worst.shares}주 (런웨이 ${runway}개월)`)
      }
    }
  }

  // 3B. 매매 전략
  function executeTrades(s) {
    const { year, month } = s.time
    const cash = s.player.cash
    const total = s.player.totalAssetValue || cash
    const cashRatio = total > 0 ? cash / total : 1
    const regime = s.marketRegime?.current || 'CALM'
    const companies = s.companies.filter(c => c.status !== 'acquired' && c.price > 0)

    // 위기 달력 체크
    const crisisAction = getCrisisAction(year, month)

    if (crisisAction === 'sell') {
      // 위기 전 전량 매도
      sellAll(s, `위기 대비 매도 (${year}.${month})`)
      return
    }

    if (regime === 'CRISIS') {
      sellAll(s, `CRISIS 레짐 전량 매도`)
      return
    }

    if (regime === 'VOLATILE') {
      // 30% 축소
      for (const [id, pos] of Object.entries(s.player.portfolio)) {
        if (pos.shares > 0) {
          const sellShares = Math.floor(pos.shares * 0.3)
          if (sellShares > 0) s.sellStock(id, sellShares)
        }
      }
      decide('trade', 'VOLATILE: 포지션 30% 축소')
      return
    }

    // CALM + 매수 조건
    if (cashRatio > 0.5 && crisisAction !== 'wait' && companies.length > 0) {
      const investTotal = cash * 0.4
      const perStock = investTotal / 5

      // 모멘텀 상위 5종목
      const withMomentum = companies
        .filter(c => c.priceHistory?.length >= 5)
        .map(c => ({
          ...c,
          momentum: (c.price - c.priceHistory[0]) / c.priceHistory[0],
        }))
        .sort((a, b) => b.momentum - a.momentum)

      const targets = withMomentum.slice(0, 5)
      const bought = []
      for (const c of targets) {
        const shares = Math.floor(perStock / c.price)
        if (shares > 0 && cash > shares * c.price) {
          store.getState().buyStock(c.id, shares)
          bought.push(`${c.ticker}:${shares}주`)
          systemsUsed.add('trading')
        }
      }
      if (bought.length > 0) decide('trade', `매수: ${bought.join(', ')}`)
    }

    // 위기 후 공격적 매수
    if (crisisAction === 'buy' && cashRatio > 0.4) {
      const investTotal = cash * 0.6
      const perStock = investTotal / 5
      const cheapest = [...companies].sort((a, b) => (a.price / a.basePrice) - (b.price / b.basePrice)).slice(0, 5)
      const bought = []
      for (const c of cheapest) {
        const shares = Math.floor(perStock / c.price)
        if (shares > 0) {
          store.getState().buyStock(c.id, shares)
          bought.push(`${c.ticker}:${shares}주`)
        }
      }
      if (bought.length > 0) decide('trade', `위기 후 저점매수: ${bought.join(', ')}`)
    }
  }

  // 3C. 직원 관리
  function manageEmployees(s) {
    const ch = getChapter(s.time.year)
    const emps = s.player.employees
    const cash = s.player.cash

    // 퇴직 감지
    if (emps.length < prevEmpCount) {
      cumulativeResigns += prevEmpCount - emps.length
      decide('employee', `직원 퇴직 감지 (${prevEmpCount}→${emps.length})`)
    }
    prevEmpCount = emps.length

    // 챕터별 채용 계획
    const analysts = emps.filter(e => e.role === 'analyst').length
    const traders = emps.filter(e => e.role === 'trader').length
    const managers = emps.filter(e => e.role === 'manager').length

    if (ch >= 1 && analysts === 0 && cash > 3_000_000) {
      if (store.getState().hireAndSetup?.('analyst')) {
        decide('employee', '애널리스트 채용')
        systemsUsed.add('employee')
      }
    }
    if (ch >= 1 && traders === 0 && analysts > 0 && cash > 4_000_000) {
      if (store.getState().hireAndSetup?.('trader')) decide('employee', '트레이더 채용')
    }
    if (ch >= 2 && managers === 0 && cash > 6_000_000) {
      if (store.getState().hireAndSetup?.('manager')) decide('employee', '매니저 채용')
    }
    if (ch >= 3 && emps.length < 5 && cash > 5_000_000) {
      const role = analysts <= traders ? 'analyst' : 'trader'
      if (store.getState().hireAndSetup?.(role)) decide('employee', `${role} 추가 채용 (5명 목표)`)
    }

    // 칭찬/관리
    for (const emp of emps) {
      if ((emp.satisfaction ?? 80) < 70 && !(emp.praiseCooldown > 0)) {
        store.getState().praiseEmployee?.(emp.id)
      }
    }
  }

  // 3D. 사무실 관리
  function manageOffice(s) {
    const ch = getChapter(s.time.year)
    const cash = s.player.cash
    const level = s.player.officeLevel ?? 1

    // Ch4 사무실 업그레이드
    if (ch >= 4 && level < 2 && cash > 15_000_000) {
      store.getState().upgradeOffice?.()
      decide('office', '사무실 Lv2 업그레이드')
      systemsUsed.add('office')
    }
  }

  // 3E. 기업 스킬
  function manageSkills(s) {
    const ch = getChapter(s.time.year)
    if (ch < 2) return

    const unlocked = s.corporateSkills?.unlockedIds || []
    for (const skillId of SKILL_ORDER) {
      if (unlocked.includes(skillId)) continue
      const result = store.getState().unlockCorporateSkill?.(skillId)
      if (result?.success) {
        decide('skill', `기업 스킬 해금: ${skillId}`)
        systemsUsed.add('skills')
        break // 한 루프에 1개만
      }
      break // 첫 실패 시 중단 (prerequisites)
    }
  }

  // 3F. 스파이
  function manageSpy(s) {
    const ch = getChapter(s.time.year)
    if (ch < 3 || !s.competitors?.length) return
    if ((s.spyMissions?.filter(m => m.status === 'in_progress')?.length ?? 0) >= 2) return

    const topComp = [...(s.competitors || [])].sort((a, b) => (b.totalAssets ?? 0) - (a.totalAssets ?? 0))[0]
    if (topComp && s.player.cash > 1_000_000) {
      store.getState().startSpyMission?.(topComp.id, 'basic')
      decide('spy', `스파이 발송: ${topComp.name} (basic)`)
      systemsUsed.add('spy')
    }
  }

  /* ══════════════════════════════════════
   * 4. adjustSpeed — 속도 제어
   * ══════════════════════════════════════ */
  function adjustSpeed() {
    const s = store.getState()
    if (!s.time) return

    const { year, month } = s.time
    const crisisAction = getCrisisAction(year, month)
    const regime = s.marketRegime?.current || 'CALM'

    if (crisisAction === 'sell' || crisisAction === 'buy' || regime === 'CRISIS') {
      s.setSpeed(4)
    } else if (regime === 'VOLATILE') {
      s.setSpeed(8)
    } else {
      s.setSpeed(16)
    }
  }

  /* ══════════════════════════════════════
   * 5. collectMetrics — 월별 스냅샷
   * ══════════════════════════════════════ */
  function collectMetrics() {
    const s = store.getState()
    if (!s.time || !s.player) return

    const key = s.time.year * 100 + s.time.month
    if (key === lastMetricKey) return
    lastMetricKey = key

    const emps = s.player.employees || []
    const avg = (arr, fn) => arr.length ? arr.reduce((s2, x) => s2 + fn(x), 0) / arr.length : 0
    const proposals = s.proposals || []
    const initial = s.config?.initialCash ?? 70_000_000
    const total = s.player.totalAssetValue ?? s.player.cash

    const snapshot = {
      year: s.time.year, month: s.time.month, chapter: getChapter(s.time.year),
      cash: Math.round(s.player.cash), totalAssets: Math.round(total),
      roi: +((total / initial - 1) * 100).toFixed(1),
      portfolioCount: Object.keys(s.player.portfolio || {}).length,
      cashRatio: +(s.player.cash / Math.max(total, 1)).toFixed(2),
      employeeCount: emps.length,
      avgLevel: +avg(emps, e => e.level ?? 1).toFixed(1),
      avgStress: +avg(emps, e => e.stress ?? 0).toFixed(1),
      avgSatisfaction: +avg(emps, e => e.satisfaction ?? 80).toFixed(1),
      burnoutCount: emps.filter(e => (e.burnoutTicks ?? 0) > 0).length,
      proposalCount: proposals.length,
      executedCount: proposals.filter(p => p.status === 'EXECUTED').length,
      playerRank: getPlayerRank(s),
      regime: s.marketRegime?.current || 'CALM',
      circuitBreaker: s.circuitBreaker?.level ?? 0,
      officeLevel: s.player.officeLevel ?? 1,
      skillsUnlocked: s.corporateSkills?.unlockedIds?.length ?? 0,
      activeSpyMissions: (s.spyMissions || []).filter(m => m.status === 'in_progress').length,
      cashCrisis: s.player.cash < (emps.reduce((sum, e) => sum + (e.salary || 0), 0) || 1),
      nearBankrupt: total < initial * 0.1,
      anyBurnout: emps.some(e => (e.burnoutTicks ?? 0) > 0),
    }

    window.__ROLLBOOK_METRICS.push(snapshot)
  }

  /* ══════════════════════════════════════
   * 6. detectErrors — 에러 탐지
   * ══════════════════════════════════════ */
  function detectErrors() {
    try {
      const s = store.getState()
      if (!s.player) return

      if (s.player.cash < 0) pushError('critical', 'cash < 0')
      if ((s.player.totalAssetValue ?? 0) < 0) pushError('critical', 'totalAssets < 0')

      for (const emp of (s.player.employees || [])) {
        if ((emp.stress ?? 0) > 100) pushError('bounds', `stress > 100: ${emp.name}`)
        if ((emp.stamina ?? 0) > (emp.maxStamina ?? 100)) pushError('bounds', `stamina > max: ${emp.name}`)
      }

      for (const c of (s.companies || [])) {
        if (c.status === 'active' && c.price <= 0) pushError('critical', `price ≤ 0: ${c.ticker}`)
        if (c.price > (c.basePrice ?? c.price) * 200) pushError('anomaly', `price 200x base: ${c.ticker}`)
      }
    } catch (e) {
      pushError('npe', e.message)
    }
  }

  /* ══════════════════════════════════════
   * 7. generateReport — QA 리포트
   * ══════════════════════════════════════ */
  function generateReport() {
    const metrics = window.__ROLLBOOK_METRICS
    if (!metrics.length) return

    const s = store.getState()
    const initial = s.config?.initialCash ?? 70_000_000
    const final = s.player?.totalAssetValue ?? s.player?.cash ?? 0

    // Fun Score
    const positiveMonths = metrics.filter(m => m.roi > (metrics[Math.max(0, metrics.indexOf(m) - 1)]?.roi ?? 0)).length
    const positiveRatio = positiveMonths / metrics.length
    const maxRank1 = metrics.some(m => m.playerRank === 1) ? 1 : 0
    const chapterGoals = countChapterGoals(metrics)
    const funScore = Math.round(
      positiveRatio * 25 + (chapterGoals / 12) * 25 + maxRank1 * 15 +
      Math.min(metrics.filter(m => m.skillsUnlocked > 0).length / metrics.length, 1) * 20 +
      Math.min((metrics.at(-1)?.avgLevel ?? 1) / 10, 1) * 15
    )

    // Anxiety Score
    const cashCrisisMonths = metrics.filter(m => m.cashCrisis).length
    const burnoutMonths = metrics.filter(m => m.anyBurnout).length
    const cbMonths = metrics.filter(m => m.circuitBreaker > 0).length
    const nearBankruptMonths = metrics.filter(m => m.nearBankrupt).length
    const anxietyScore = Math.round(
      Math.min(cashCrisisMonths / 12, 1) * 30 +
      Math.min(burnoutMonths / 12, 1) * 20 +
      Math.min(cbMonths / 6, 1) * 15 +
      Math.min(nearBankruptMonths / 6, 1) * 20 +
      Math.min(cumulativeResigns / 5, 1) * 15
    )

    // Immersion Score
    const immersionScore = Math.round(
      Math.min(metrics.filter(m => m.regime !== 'CALM').length / 36, 1) * 25 +
      Math.min((metrics.at(-1)?.avgLevel ?? 1) / 15, 1) * 20 +
      (systemsUsed.size / 6) * 25 +
      Math.min(metrics.filter(m => m.proposalCount > 0).length / metrics.length, 1) * 15 +
      (chapterGoals / 12) * 15
    )

    // Ending
    let ending = 'unknown'
    if (final >= (s.config?.targetAsset ?? 1_000_000_000)) ending = 'billionaire'
    else if (final >= initial * 50) ending = 'legend'
    else if (final >= initial) ending = 'retirement'
    else if (final > 0) ending = 'survivor'
    else ending = 'bankrupt'

    const report = {
      version: 'v6.1',
      date: new Date().toISOString(),
      gameDate: `${s.time?.year}.${s.time?.month}.${s.time?.day}`,
      ending,
      finalAssets: Math.round(final),
      finalROI: +((final / initial - 1) * 100).toFixed(1),
      initialCash: initial,
      playerRank: getPlayerRank(s),
      totalMonths: metrics.length,
      scores: { fun: funScore, anxiety: anxietyScore, immersion: immersionScore },
      employees: {
        finalCount: s.player?.employees?.length ?? 0,
        totalHired: prevEmpCount + cumulativeResigns,
        totalResigned: cumulativeResigns,
        avgFinalLevel: +(metrics.at(-1)?.avgLevel ?? 0).toFixed(1),
      },
      systems: [...systemsUsed],
      chapterGoals,
      errors: {
        critical: window.__ROLLBOOK_ERRORS.filter(e => e.severity === 'critical').length,
        bounds: window.__ROLLBOOK_ERRORS.filter(e => e.severity === 'bounds').length,
        anomaly: window.__ROLLBOOK_ERRORS.filter(e => e.severity === 'anomaly').length,
        npe: window.__ROLLBOOK_ERRORS.filter(e => e.severity === 'npe').length,
        total: window.__ROLLBOOK_ERRORS.length,
      },
      decisionsCount: window.__ROLLBOOK_DECISIONS.length,
      cashCrisisMonths,
      burnoutMonths,
      metrics: metrics, // full data
    }

    window.__ROLLBOOK_REPORT = report
    log('📊 QA 리포트 생성 완료. window.__ROLLBOOK_REPORT')
    log(`   🎮 엔딩: ${ending} | ROI: ${report.finalROI}% | 순위: ${report.playerRank}위`)
    log(`   😄 Fun: ${funScore} | 😰 Anxiety: ${anxietyScore} | 🌊 Immersion: ${immersionScore}`)
    log(`   🐛 에러: ${report.errors.total}건`)

    return report
  }

  /* ══════════════════════════════════════
   * 8. 실행 루프
   * ══════════════════════════════════════ */
  function startLoop() {
    if (loopId) clearInterval(loopId)
    log('🔄 메인 루프 시작 (30초 간격)')

    loopId = setInterval(() => {
      try {
        const s = store.getState()
        if (!s.time) return

        // 게임 종료 체크
        if (s.isGameOver || s.time.year > 2025) {
          clearInterval(loopId)
          clearInterval(popupId)
          collectMetrics()
          const report = generateReport()
          window.generateMarkdownReport = () => markdownExport(report)
          log('🏁 게임 완료! generateMarkdownReport() 호출로 마크다운 내보내기')
          return
        }

        handleInterrupts()
        collectMetrics()
        makeDecisions()
        adjustSpeed()
        detectErrors()

        // 상태 로그 (5분마다)
        if (Date.now() % 300_000 < LOOP_MS) {
          const total = s.player?.totalAssetValue ?? s.player?.cash ?? 0
          const initial = s.config?.initialCash ?? 70_000_000
          log(`📈 ${s.time.year}.${String(s.time.month).padStart(2,'0')} | ${Math.round(total/10000)}만원 (${((total/initial-1)*100).toFixed(0)}%) | 직원:${s.player?.employees?.length} | 순위:${getPlayerRank(s)}위 | ${s.marketRegime?.current || '?'}`)
        }
      } catch (err) {
        pushError('loop', err.message)
      }
    }, LOOP_MS)
  }

  /* ══════════════════════════════════════
   * 유틸리티 함수
   * ══════════════════════════════════════ */
  function getChapter(year) {
    if (year < 2000) return 1
    if (year < 2005) return 2
    if (year < 2010) return 3
    if (year < 2015) return 4
    if (year < 2020) return 5
    return 6
  }

  function getCrisisAction(year, month) {
    const ym = year * 100 + month
    for (const c of CRISIS_CALENDAR) {
      const sellYM = c.sellBy[0] * 100 + c.sellBy[1]
      const buyYM = c.buyBack[0] * 100 + c.buyBack[1]
      if (ym >= sellYM && ym < buyYM) return ym < sellYM + 6 ? 'sell' : 'wait'
      if (ym >= buyYM && ym < buyYM + 6) return 'buy'
    }
    return 'none'
  }

  function sellAll(s, reason) {
    let sold = 0
    for (const [id, pos] of Object.entries(s.player.portfolio || {})) {
      if (pos.shares > 0) {
        store.getState().sellStock(id, pos.shares)
        sold++
      }
    }
    if (sold > 0) decide('trade', `${reason} (${sold}종목)`)
  }

  function findWorstStock(s) {
    let worst = null, worstPnl = Infinity
    for (const [id, pos] of Object.entries(s.player.portfolio || {})) {
      if (!pos.shares) continue
      const c = s.companies.find(cc => cc.id === id)
      if (!c) continue
      const pnl = (c.price / pos.avgBuyPrice) - 1
      if (pnl < worstPnl) { worstPnl = pnl; worst = { id, shares: pos.shares, ticker: c.ticker, pnl } }
    }
    return worst
  }

  function getPlayerRank(s) {
    if (!s.competitors?.length) return 1
    const initial = s.config?.initialCash ?? 70_000_000
    const myROI = ((s.player?.totalAssetValue ?? s.player?.cash ?? 0) / initial - 1)
    let rank = 1
    for (const c of s.competitors) {
      const cROI = ((c.totalAssets ?? c.cash ?? 0) / (c.initialCash ?? initial) - 1)
      if (cROI > myROI) rank++
    }
    return rank
  }

  function countChapterGoals(metrics) {
    let goals = 0
    // Ch1: survive + 2 emp
    if (metrics.some(m => m.chapter >= 2)) goals += 2
    // Ch2: 200M + profit year
    if (metrics.some(m => m.totalAssets >= 200_000_000)) goals++
    if (metrics.some((m, i) => i > 12 && m.roi > (metrics[i - 12]?.roi ?? -999))) goals++
    // Ch3: 5 emp
    if (metrics.some(m => m.employeeCount >= 5)) goals++
    // Ch4: rank, office
    if (metrics.some(m => m.playerRank <= 3)) goals++
    if (metrics.some(m => m.officeLevel >= 2)) goals++
    // Ch5: skills
    if (metrics.some(m => m.skillsUnlocked >= 3)) goals++
    return goals
  }

  function log(msg) { console.log(`[ROLLBOOK] ${msg}`) }
  function decide(type, detail) {
    const s = store.getState()
    const entry = { time: `${s.time?.year}.${s.time?.month}`, type, detail }
    window.__ROLLBOOK_DECISIONS.push(entry)
    log(`  💡 [${type}] ${detail}`)
  }
  function pushError(severity, msg) {
    window.__ROLLBOOK_ERRORS.push({ severity, msg, time: store?.getState()?.time?.year })
  }

  function markdownExport(report) {
    if (!report) return 'No report'
    const m = report.metrics
    const r = report
    return `# Retro Stock-OS 95 — AI 시뮬레이션 QA 리포트

## 요약
| 항목 | 결과 |
|------|------|
| 엔딩 | ${r.ending} |
| 최종 자산 | ${(r.finalAssets/10000).toFixed(0)}만원 |
| 수익률 | ${r.finalROI}% |
| 최종 순위 | ${r.playerRank}위 |
| 플레이 월수 | ${r.totalMonths}개월 |

## 점수
| 카테고리 | 점수 | 해석 |
|----------|------|------|
| Fun | ${r.scores.fun}/100 | ${r.scores.fun >= 70 ? '😄 좋음' : r.scores.fun >= 40 ? '😐 보통' : '😞 부족'} |
| Anxiety | ${r.scores.anxiety}/100 | ${r.scores.anxiety <= 30 ? '😌 적절' : r.scores.anxiety <= 60 ? '😰 높음' : '🚨 과도'} |
| Immersion | ${r.scores.immersion}/100 | ${r.scores.immersion >= 70 ? '🌊 깊음' : r.scores.immersion >= 40 ? '🏊 보통' : '🏖️ 얕음'} |

## 직원
- 최종: ${r.employees.finalCount}명 (총 ${r.employees.totalHired}명 채용, ${r.employees.totalResigned}명 퇴직)
- 평균 레벨: ${r.employees.avgFinalLevel}

## 시스템 활용
${r.systems.map(s => `- ✅ ${s}`).join('\n')}

## 에러
- Critical: ${r.errors.critical}, Bounds: ${r.errors.bounds}, Anomaly: ${r.errors.anomaly}, NPE: ${r.errors.npe}

## 월별 추이 (분기별 샘플)
| 날짜 | 자산(만) | ROI | 직원 | 순위 | 레짐 |
|------|---------|-----|------|------|------|
${m.filter((_, i) => i % 3 === 0).map(s => `| ${s.year}.${String(s.month).padStart(2,'0')} | ${(s.totalAssets/10000).toFixed(0)} | ${s.roi}% | ${s.employeeCount} | ${s.playerRank} | ${s.regime} |`).join('\n')}

## 의사결정 로그 (최근 20건)
${window.__ROLLBOOK_DECISIONS.slice(-20).map(d => `- [${d.time}] **${d.type}**: ${d.detail}`).join('\n')}
`
  }

  /* ══════════════════════════════════════
   * 실행!
   * ══════════════════════════════════════ */
  await init()
  startLoop()
  log('🚀 AI 시뮬레이션 롤북 실행 중! 30분 후 window.__ROLLBOOK_REPORT 확인')
  log('   중지: clearInterval(window.__ROLLBOOK_LOOP_ID)')
  window.__ROLLBOOK_LOOP_ID = loopId

})()
