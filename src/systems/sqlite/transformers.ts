/* ── SaveData ↔ SQLite Transformers ── */

import type { SQLiteDB } from '@subframe7536/sqlite-wasm'
import type { SaveData, Company, Employee, Competitor, MarketEvent, NewsItem } from '../../types'
import type { TradeProposal } from '../../types/trade'
import type { SaveRow, CompanyRow, EmployeeRow, CompetitorRow } from './types'

/**
 * Safely parse JSON with fallback to default value
 * Prevents crashes from corrupted or malformed JSON data
 */
function safeParseJSON<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    console.warn('[SQLite] JSON parse failed, using default:', json?.slice(0, 50))
    return defaultValue
  }
}

/**
 * Safely parse JSON that may return undefined on failure
 * Used for optional fields where undefined is a valid default
 */
function safeParseJSONOptional<T>(json: string | null | undefined): T | undefined {
  if (!json) return undefined
  try {
    return JSON.parse(json) as T
  } catch {
    console.warn('[SQLite] JSON parse failed, returning undefined:', json?.slice(0, 50))
    return undefined
  }
}

/**
 * Save complete game state to SQLite
 * @param db SQLite database instance
 * @param data Complete SaveData object
 * @param slotName Save slot name (e.g., 'autosave', 'manual_1')
 */
export async function saveDataToSQLite(
  db: SQLiteDB,
  data: SaveData,
  slotName: string = 'autosave',
): Promise<void> {
  try {
    // Start transaction for atomic save
    await db.run('BEGIN TRANSACTION;')

    const now = Date.now()

    // 1. Insert/Replace main save record
    const saveResult = await db.run(`
      INSERT INTO saves (
        slot_name, schema_version, created_at, updated_at,
        difficulty, start_year, end_year, initial_cash,
        current_tick, year, quarter, month, day, hour, speed, is_paused,
        player_cash, player_total_assets, player_monthly_expenses, player_office_level,
        player_portfolio, player_office_grid, player_office_layout,
        player_last_day_change, player_previous_day_assets,
        last_processed_month, last_mna_quarter, auto_sell_enabled, auto_sell_percent,
        market_regime, market_index_history, circuit_breaker,
        cash_flow_log, realized_trades, monthly_summaries,
        game_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slot_name) DO UPDATE SET
        updated_at = ?,
        current_tick = ?,
        year = ?, quarter = ?, month = ?, day = ?, hour = ?,
        speed = ?, is_paused = ?,
        player_cash = ?, player_total_assets = ?, player_monthly_expenses = ?, player_office_level = ?,
        player_portfolio = ?, player_office_grid = ?, player_office_layout = ?,
        player_last_day_change = ?, player_previous_day_assets = ?,
        last_processed_month = ?, last_mna_quarter = ?,
        auto_sell_enabled = ?, auto_sell_percent = ?,
        market_regime = ?, market_index_history = ?, circuit_breaker = ?,
        cash_flow_log = ?, realized_trades = ?, monthly_summaries = ?,
        game_mode = ?
      RETURNING id;
    `, [
      slotName,
      data.version,
      now,
      now,
      data.config.difficulty,
      data.config.startYear,
      data.config.endYear,
      data.config.initialCash,
      data.currentTick ?? 0,
      data.time.year,
      data.time.quarter,
      data.time.month,
      data.time.day,
      data.time.hour,
      data.time.speed,
      data.time.isPaused ? 1 : 0,
      data.player.cash,
      data.player.totalAssetValue,
      data.player.monthlyExpenses,
      data.player.officeLevel,
      JSON.stringify(data.player.portfolio),
      data.player.officeGrid ? JSON.stringify(data.player.officeGrid) : null,
      data.player.officeLayout ? JSON.stringify(data.player.officeLayout) : null,
      data.player.lastDayChange,
      data.player.previousDayAssets,
      data.lastProcessedMonth ?? 0,
      data.lastMnaQuarter ?? 0,
      data.autoSellEnabled ? 1 : 0,
      data.autoSellPercent ?? null,
      data.marketRegime ? JSON.stringify(data.marketRegime) : null,
      data.marketIndexHistory ? JSON.stringify(data.marketIndexHistory) : null,
      data.circuitBreaker ? JSON.stringify(data.circuitBreaker) : null,
      data.cashFlowLog ? JSON.stringify(data.cashFlowLog) : null,
      data.realizedTrades ? JSON.stringify(data.realizedTrades) : null,
      data.monthlyCashFlowSummaries ? JSON.stringify(data.monthlyCashFlowSummaries) : null,
      (data.config as any).gameMode ?? 'virtual',
      // ON CONFLICT UPDATE parameters
      now,
      data.currentTick ?? 0,
      data.time.year,
      data.time.quarter,
      data.time.month,
      data.time.day,
      data.time.hour,
      data.time.speed,
      data.time.isPaused ? 1 : 0,
      data.player.cash,
      data.player.totalAssetValue,
      data.player.monthlyExpenses,
      data.player.officeLevel,
      JSON.stringify(data.player.portfolio),
      data.player.officeGrid ? JSON.stringify(data.player.officeGrid) : null,
      data.player.officeLayout ? JSON.stringify(data.player.officeLayout) : null,
      data.player.lastDayChange,
      data.player.previousDayAssets,
      data.lastProcessedMonth ?? 0,
      data.lastMnaQuarter ?? 0,
      data.autoSellEnabled ? 1 : 0,
      data.autoSellPercent ?? null,
      data.marketRegime ? JSON.stringify(data.marketRegime) : null,
      data.marketIndexHistory ? JSON.stringify(data.marketIndexHistory) : null,
      data.circuitBreaker ? JSON.stringify(data.circuitBreaker) : null,
      data.cashFlowLog ? JSON.stringify(data.cashFlowLog) : null,
      data.realizedTrades ? JSON.stringify(data.realizedTrades) : null,
      data.monthlyCashFlowSummaries ? JSON.stringify(data.monthlyCashFlowSummaries) : null,
      (data.config as any).gameMode ?? 'virtual',
    ])

    const saveId = (saveResult[0] as SaveRow).id

    // 2. Delete existing related data (CASCADE handles this, but explicit for clarity)
    await db.run('DELETE FROM companies WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM employees WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM competitors WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM market_events WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM news_items WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM trade_proposals WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM institutions WHERE save_id = ?;', [saveId])
    await db.run('DELETE FROM pending_ipos WHERE save_id = ?;', [saveId])

    // 3. Insert companies (20개 회사) - full Company objects
    for (const company of data.companies) {
      const c = company as Company
      await db.run(
        `
        INSERT INTO companies (
          save_id, company_id, name, ticker, sector,
          price, previous_price, base_price, session_open_price,
          volatility, drift, market_cap, description,
          status, parent_company_id, acquired_at_tick, headcount, layoff_rate_on_acquisition,
          price_history, financials, institution_flow, institution_flow_history,
          accumulated_institutional_shares, regime_volatilities, event_sensitivity, mna_history,
          vi_triggered, vi_cooldown, vi_recent_prices,
          historical_ticker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          saveId,
          c.id,
          c.name ?? '',
          c.ticker ?? '',
          c.sector ?? '',
          c.price,
          c.previousPrice,
          c.basePrice ?? c.price,
          c.sessionOpenPrice ?? c.price,
          c.volatility ?? 0.2,
          c.drift ?? 0.0,
          c.marketCap ?? 1_000_000_000,
          c.description ?? '',
          c.status ?? 'active',
          c.parentCompanyId ?? null,
          c.acquiredAtTick ?? null,
          c.headcount ?? 0,
          c.layoffRateOnAcquisition ?? 0,
          JSON.stringify(c.priceHistory ?? []),
          c.financials ? JSON.stringify(c.financials) : JSON.stringify({ revenue: 0, netIncome: 0, debtRatio: 1, growthRate: 0, eps: 0 }),
          c.institutionFlow ? JSON.stringify(c.institutionFlow) : JSON.stringify({ netBuyVolume: 0, topBuyers: [], topSellers: [], institutionalOwnership: 0 }),
          c.institutionFlowHistory ? JSON.stringify(c.institutionFlowHistory) : null,
          c.accumulatedInstitutionalShares ?? null,
          c.regimeVolatilities ? JSON.stringify(c.regimeVolatilities) : null,
          c.eventSensitivity ? JSON.stringify(c.eventSensitivity) : null,
          c.mnaHistory ? JSON.stringify(c.mnaHistory) : JSON.stringify([]),
          c.viTriggered ? 1 : 0,
          c.viCooldown ?? 0,
          c.viRecentPrices ? JSON.stringify(c.viRecentPrices) : null,
          c.historicalTicker ?? null,
        ],
      )
    }

    // 4. Insert employees (직원)
    for (const employee of data.player.employees) {
      await db.run(`
        INSERT INTO employees (
          save_id, employee_id, name, role, salary, stamina, max_stamina, sprite, hired_month,
          stress, satisfaction, level, xp, xp_to_next_level, title, badge,
          seat_index, desk_id, praise_cooldown, scold_cooldown, mood,
          bonus, traits, skills, badges, assigned_sectors, growth_log, progression, unlocked_skills
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        saveId,
        employee.id,
        employee.name,
        employee.role,
        employee.salary,
        employee.stamina,
        employee.maxStamina,
        employee.sprite,
        employee.hiredMonth,
        employee.stress ?? 0,
        employee.satisfaction ?? 50,
        employee.level ?? 1,
        employee.xp ?? 0,
        employee.xpToNextLevel ?? 100,
        employee.title ?? 'intern',
        employee.badge ?? 'gray',
        employee.seatIndex ?? null,
        employee.deskId ?? null,
        employee.praiseCooldown ?? null,
        employee.scoldCooldown ?? null,
        employee.mood ?? 50,
        JSON.stringify(employee.bonus),
        employee.traits ? JSON.stringify(employee.traits) : null,
        JSON.stringify(employee.skills ?? { analysis: 0, trading: 0, research: 0 }),
        employee.badges ? JSON.stringify(employee.badges) : null,
        employee.assignedSectors ? JSON.stringify(employee.assignedSectors) : null,
        employee.growthLog ? JSON.stringify(employee.growthLog) : null,
        employee.progression ? JSON.stringify(employee.progression) : null,
        employee.unlockedSkills ? JSON.stringify(employee.unlockedSkills) : null,
      ])
    }

    // 5. Insert competitors (AI 경쟁자)
    if (data.competitors && data.competitors.length > 0) {
      for (const competitor of data.competitors) {
        await db.run(`
          INSERT INTO competitors (
            save_id, competitor_id, name, avatar, style, cash, total_asset_value,
            roi, initial_assets, last_day_change, panic_sell_cooldown, is_mirror_rival, portfolio
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          saveId,
          competitor.id,
          competitor.name,
          competitor.avatar,
          competitor.style,
          competitor.cash,
          competitor.totalAssetValue,
          competitor.roi,
          competitor.initialAssets,
          competitor.lastDayChange,
          competitor.panicSellCooldown,
          competitor.isMirrorRival ? 1 : 0,
          JSON.stringify(competitor.portfolio),
        ])
      }
    }

    // 6. Insert market events (이벤트)
    if (data.events && data.events.length > 0) {
      for (const event of data.events) {
        await db.run(`
          INSERT INTO market_events (
            save_id, event_id, title, description, type, event_type,
            duration, remaining_ticks, source, chain_parent_id, historical_year, propagation_phase,
            impact, affected_sectors, affected_companies, start_timestamp, price_impact_snapshot
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          saveId,
          event.id,
          event.title,
          event.description,
          event.type,
          event.eventType ?? null,
          event.duration,
          event.remainingTicks,
          event.source ?? null,
          event.chainParentId ?? null,
          event.historicalYear ?? null,
          event.propagationPhase ?? null,
          JSON.stringify(event.impact),
          event.affectedSectors ? JSON.stringify(event.affectedSectors) : null,
          event.affectedCompanies ? JSON.stringify(event.affectedCompanies) : null,
          JSON.stringify(event.startTimestamp),
          event.priceImpactSnapshot ? JSON.stringify(event.priceImpactSnapshot) : null,
        ])
      }
    }

    // 7. Insert news items (뉴스)
    if (data.news && data.news.length > 0) {
      for (const news of data.news) {
        await db.run(`
          INSERT INTO news_items (
            save_id, news_id, headline, body, event_id, is_breaking, sentiment,
            timestamp, related_companies, impact_summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          saveId,
          news.id,
          news.headline,
          news.body,
          news.eventId ?? null,
          news.isBreaking ? 1 : 0,
          news.sentiment,
          JSON.stringify(news.timestamp),
          news.relatedCompanies ? JSON.stringify(news.relatedCompanies) : null,
          news.impactSummary ?? null,
        ])
      }
    }

    // 8. Insert trade proposals (거래 제안) - need to resolve FKs
    if (data.proposals && data.proposals.length > 0) {
      // Build company_id and employee_id lookup maps
      const companyIdMap = new Map<string, number>()
      const companyRows = await db.run('SELECT id, company_id FROM companies WHERE save_id = ?;', [
        saveId,
      ]) as CompanyRow[]
      for (const row of companyRows) {
        companyIdMap.set(row.company_id, row.id)
      }

      const employeeIdMap = new Map<string, number>()
      const employeeRows = await db.run('SELECT id, employee_id FROM employees WHERE save_id = ?;', [
        saveId,
      ]) as EmployeeRow[]
      for (const row of employeeRows) {
        employeeIdMap.set(row.employee_id, row.id)
      }

      for (const proposal of data.proposals) {
        await db.run(`
          INSERT INTO trade_proposals (
            save_id, proposal_id, company_id, ticker, direction, quantity, target_price, confidence,
            created_by_employee_id, reviewed_by_employee_id, executed_by_employee_id,
            status, created_at, reviewed_at, executed_at, executed_price, slippage,
            is_mistake, reject_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          saveId,
          proposal.id,
          companyIdMap.get(proposal.companyId) ?? null,
          proposal.ticker,
          proposal.direction,
          proposal.quantity,
          proposal.targetPrice,
          proposal.confidence,
          proposal.createdByEmployeeId
            ? employeeIdMap.get(proposal.createdByEmployeeId) ?? null
            : null,
          proposal.reviewedByEmployeeId
            ? employeeIdMap.get(proposal.reviewedByEmployeeId) ?? null
            : null,
          proposal.executedByEmployeeId
            ? employeeIdMap.get(proposal.executedByEmployeeId) ?? null
            : null,
          proposal.status,
          proposal.createdAt,
          proposal.reviewedAt ?? null,
          proposal.executedAt ?? null,
          proposal.executedPrice ?? null,
          proposal.slippage ?? null,
          proposal.isMistake ? 1 : 0,
          proposal.rejectReason ?? null,
        ])
      }
    }

    // 9. Insert institutions (기관 투자자)
    if (data.institutions && data.institutions.length > 0) {
      for (const institution of data.institutions) {
        await db.run(`
          INSERT INTO institutions (
            save_id, institution_id, name, type, risk_appetite, capital, algo_strategy, trade_cooldowns
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          saveId,
          institution.id,
          institution.name,
          institution.type,
          institution.riskAppetite,
          institution.capital,
          institution.algoStrategy ?? null,
          institution.tradeCooldowns ? JSON.stringify(institution.tradeCooldowns) : null,
        ])
      }
    }

    // 10. Insert pending IPOs (예정된 IPO)
    if (data.pendingIPOs && data.pendingIPOs.length > 0) {
      for (const ipo of data.pendingIPOs) {
        await db.run(`
          INSERT INTO pending_ipos (save_id, slot_index, spawn_tick, new_company)
          VALUES (?, ?, ?, ?);
        `, [saveId, ipo.slotIndex, ipo.spawnTick, JSON.stringify(ipo.newCompany)])
      }
    }

    // Commit transaction
    await db.run('COMMIT;')

    console.log(`[SQLite] Saved game to slot '${slotName}' (save_id: ${saveId})`)
  } catch (error) {
    // Rollback on error
    await db.run('ROLLBACK;')
    console.error('[SQLite] Failed to save game:', error)
    throw error
  }
}

/**
 * Load complete game state from SQLite
 * @param db SQLite database instance
 * @param slotName Save slot name (e.g., 'autosave', 'manual_1')
 * @returns SaveData object or null if not found
 */
export async function sqliteToSaveData(
  db: SQLiteDB,
  slotName: string = 'autosave',
): Promise<SaveData | null> {
  try {
    // 1. Load main save record
    const saveRows = await db.run('SELECT * FROM saves WHERE slot_name = ?;', [slotName]) as SaveRow[]

    if (!saveRows || saveRows.length === 0) {
      console.warn(`[SQLite] Save slot '${slotName}' not found`)
      return null
    }

    const save = saveRows[0]
    const saveId = save.id

    // 2. Load companies (full Company objects)
    const companyRows = await db.run('SELECT * FROM companies WHERE save_id = ? ORDER BY id;', [
      saveId,
    ]) as CompanyRow[]

    const companies: Company[] = companyRows.map((row) => ({
      id: row.company_id,
      name: row.name,
      ticker: row.ticker,
      sector: row.sector as Company['sector'],
      price: row.price,
      previousPrice: row.previous_price,
      basePrice: row.base_price,
      sessionOpenPrice: row.session_open_price,
      volatility: row.volatility,
      drift: row.drift,
      marketCap: row.market_cap,
      description: row.description,
      priceHistory: safeParseJSON<number[]>(row.price_history, []),
      financials: safeParseJSON(row.financials, { revenue: 0, netIncome: 0, debtRatio: 1, growthRate: 0, eps: 0 }),
      institutionFlow: safeParseJSON(row.institution_flow, { netBuyVolume: 0, topBuyers: [], topSellers: [], institutionalOwnership: 0 }),
      institutionFlowHistory: safeParseJSONOptional<number[]>(row.institution_flow_history),
      accumulatedInstitutionalShares: row.accumulated_institutional_shares ?? undefined,
      regimeVolatilities: safeParseJSONOptional(row.regime_volatilities),
      eventSensitivity: safeParseJSONOptional<Record<string, number>>(row.event_sensitivity),
      status: row.status as Company['status'],
      parentCompanyId: row.parent_company_id ?? undefined,
      acquiredAtTick: row.acquired_at_tick ?? undefined,
      headcount: row.headcount,
      layoffRateOnAcquisition: row.layoff_rate_on_acquisition,
      mnaHistory: safeParseJSON(row.mna_history, []),
      viTriggered: row.vi_triggered === 1,
      viCooldown: row.vi_cooldown,
      viRecentPrices: safeParseJSONOptional<number[]>(row.vi_recent_prices),
      historicalTicker: (row as any).historical_ticker ?? undefined,
    }))

    // 3. Load employees
    const employeeRows = await db.run('SELECT * FROM employees WHERE save_id = ? ORDER BY id;', [
      saveId,
    ]) as EmployeeRow[]

    const employees: Employee[] = employeeRows.map((row) => ({
      id: row.employee_id,
      name: row.name,
      role: row.role as Employee['role'],
      salary: row.salary,
      stamina: row.stamina,
      maxStamina: row.max_stamina,
      sprite: row.sprite as Employee['sprite'],
      hiredMonth: row.hired_month,
      bonus: safeParseJSON(row.bonus, { driftBoost: 0, volatilityReduction: 0, tradingDiscount: 0, staminaRecovery: 0 }),
      traits: safeParseJSONOptional(row.traits),
      seatIndex: row.seat_index ?? undefined,
      deskId: row.desk_id ?? undefined,
      stress: row.stress,
      satisfaction: row.satisfaction,
      skills: safeParseJSON(row.skills, { analysis: 0, trading: 0, research: 0 }),
      badges: safeParseJSONOptional(row.badges),
      assignedSectors: safeParseJSONOptional(row.assigned_sectors),
      level: row.level,
      xp: row.xp,
      xpToNextLevel: row.xp_to_next_level,
      title: row.title as Employee['title'],
      badge: row.badge as Employee['badge'],
      growthLog: safeParseJSONOptional(row.growth_log),
      praiseCooldown: row.praise_cooldown ?? undefined,
      scoldCooldown: row.scold_cooldown ?? undefined,
      mood: row.mood,
      progression: safeParseJSONOptional(row.progression),
      unlockedSkills: safeParseJSONOptional(row.unlocked_skills),
    }))

    // 4. Load competitors
    const competitorRows = await db.run('SELECT * FROM competitors WHERE save_id = ? ORDER BY id;', [
      saveId,
    ]) as CompetitorRow[]

    const competitors: Competitor[] = competitorRows.map((row) => ({
      id: row.competitor_id,
      name: row.name,
      avatar: row.avatar,
      style: row.style as Competitor['style'],
      cash: row.cash,
      portfolio: safeParseJSON(row.portfolio, {} as Record<string, import('../../types').PortfolioPosition>),
      totalAssetValue: row.total_asset_value,
      roi: row.roi,
      initialAssets: row.initial_assets,
      lastDayChange: row.last_day_change,
      panicSellCooldown: row.panic_sell_cooldown,
      isMirrorRival: row.is_mirror_rival === 1,
    }))

    // 5. Load market events
    const eventRows = await db.run('SELECT * FROM market_events WHERE save_id = ? ORDER BY id;', [
      saveId,
    ])

    const events: MarketEvent[] = (eventRows as unknown[]).map((row: unknown) => {
      const r = row as {
        event_id: string
        title: string
        description: string
        type: string
        event_type: string | null
        duration: number
        remaining_ticks: number
        impact: string
        affected_sectors: string | null
        affected_companies: string | null
        start_timestamp: string
        price_impact_snapshot: string | null
        source: string | null
        chain_parent_id: string | null
        historical_year: number | null
        propagation_phase: number | null
      }
      return {
        id: r.event_id,
        title: r.title,
        description: r.description,
        type: r.type as MarketEvent['type'],
        eventType: r.event_type as MarketEvent['eventType'],
        duration: r.duration,
        remainingTicks: r.remaining_ticks,
        impact: safeParseJSON(r.impact, { driftModifier: 0, volatilityModifier: 0, severity: 'low' as const }),
        affectedSectors: safeParseJSONOptional(r.affected_sectors),
        affectedCompanies: safeParseJSONOptional(r.affected_companies),
        startTimestamp: safeParseJSON(r.start_timestamp, { year: 1995, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: false }),
        priceImpactSnapshot: safeParseJSONOptional(r.price_impact_snapshot),
        source: r.source as MarketEvent['source'],
        chainParentId: r.chain_parent_id ?? undefined,
        historicalYear: r.historical_year ?? undefined,
        propagationPhase: r.propagation_phase ?? undefined,
      }
    })

    // 6. Load news items
    const newsRows = await db.run('SELECT * FROM news_items WHERE save_id = ? ORDER BY id;', [saveId])

    const news: NewsItem[] = (newsRows as unknown[]).map((row: unknown) => {
      const r = row as {
        news_id: string
        headline: string
        body: string
        event_id: string | null
        is_breaking: number
        sentiment: string
        timestamp: string
        related_companies: string | null
        impact_summary: string | null
      }
      return {
        id: r.news_id,
        timestamp: safeParseJSON(r.timestamp, { year: 1995, quarter: 1, month: 1, day: 1, hour: 9, speed: 1, isPaused: false }),
        headline: r.headline,
        body: r.body,
        eventId: r.event_id ?? undefined,
        isBreaking: r.is_breaking === 1,
        sentiment: r.sentiment as NewsItem['sentiment'],
        relatedCompanies: safeParseJSONOptional(r.related_companies),
        impactSummary: r.impact_summary ?? undefined,
      }
    })

    // 7. Load trade proposals (need to reverse FK resolution)
    const proposalRows = await db.run(
      'SELECT * FROM trade_proposals WHERE save_id = ? ORDER BY id;',
      [saveId],
    )

    // Build reverse lookup maps
    const idToCompanyId = new Map<number, string>()
    for (const row of companyRows) {
      idToCompanyId.set(row.id, row.company_id)
    }

    const idToEmployeeId = new Map<number, string>()
    for (const row of employeeRows) {
      idToEmployeeId.set(row.id, row.employee_id)
    }

    const proposals: TradeProposal[] = (proposalRows as unknown[]).map((row: unknown) => {
      const r = row as {
        proposal_id: string
        company_id: number | null
        ticker: string
        direction: string
        quantity: number
        target_price: number
        confidence: number
        created_by_employee_id: number | null
        reviewed_by_employee_id: number | null
        executed_by_employee_id: number | null
        status: string
        created_at: number
        reviewed_at: number | null
        executed_at: number | null
        executed_price: number | null
        slippage: number | null
        is_mistake: number
        reject_reason: string | null
      }
      return {
        id: r.proposal_id,
        companyId: r.company_id ? idToCompanyId.get(r.company_id)! : '',
        ticker: r.ticker,
        direction: r.direction as TradeProposal['direction'],
        quantity: r.quantity,
        targetPrice: r.target_price,
        confidence: r.confidence,
        createdByEmployeeId: r.created_by_employee_id
          ? idToEmployeeId.get(r.created_by_employee_id) ?? ''
          : '',
        reviewedByEmployeeId: r.reviewed_by_employee_id
          ? idToEmployeeId.get(r.reviewed_by_employee_id) ?? null
          : null,
        executedByEmployeeId: r.executed_by_employee_id
          ? idToEmployeeId.get(r.executed_by_employee_id) ?? null
          : null,
        status: r.status as TradeProposal['status'],
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at ?? null,
        executedAt: r.executed_at ?? null,
        executedPrice: r.executed_price ?? null,
        slippage: r.slippage ?? null,
        isMistake: r.is_mistake === 1,
        rejectReason: r.reject_reason ?? null,
      }
    })

    // 8. Load institutions
    const institutionRows = await db.run('SELECT * FROM institutions WHERE save_id = ? ORDER BY id;', [
      saveId,
    ])

    const institutions = (institutionRows as unknown[]).map((row: unknown) => {
      const r = row as {
        institution_id: string
        name: string
        type: string
        risk_appetite: number
        capital: number
        algo_strategy: string | null
        trade_cooldowns: string | null
      }
      return {
        id: r.institution_id,
        name: r.name,
        type: r.type as 'HedgeFund' | 'Pension' | 'Bank' | 'Algorithm',
        riskAppetite: r.risk_appetite,
        capital: r.capital,
        algoStrategy: r.algo_strategy as 'momentum' | 'meanReversion' | 'volatility' | undefined,
        tradeCooldowns: safeParseJSONOptional<Record<string, number>>(r.trade_cooldowns),
      }
    })

    // 9. Load pending IPOs
    const ipoRows = await db.run('SELECT * FROM pending_ipos WHERE save_id = ? ORDER BY id;', [saveId])

    const pendingIPOs = (ipoRows as unknown[]).map((row: unknown) => {
      const r = row as {
        slot_index: number
        spawn_tick: number
        new_company: string
      }
      return {
        slotIndex: r.slot_index,
        spawnTick: r.spawn_tick,
        newCompany: safeParseJSON(r.new_company, {} as Company),
      }
    })

    // 10. Reconstruct SaveData
    const saveData: SaveData = {
      version: save.schema_version,
      timestamp: save.updated_at,
      config: {
        difficulty: save.difficulty,
        startYear: save.start_year,
        endYear: save.end_year,
        initialCash: save.initial_cash,
        maxCompanies: 20, // Fixed for now
        targetAsset: 1_000_000_000_000, // Fixed for now
        gameMode: ((save as any).game_mode ?? 'virtual') as 'virtual' | 'kospi',
      },
      time: {
        year: save.year,
        quarter: save.quarter as 1 | 2 | 3 | 4,
        month: save.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
        day: save.day as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
        hour: save.hour as 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
        speed: save.speed,
        isPaused: save.is_paused === 1,
      },
      currentTick: save.current_tick,
      player: {
        cash: save.player_cash,
        totalAssetValue: save.player_total_assets,
        portfolio: safeParseJSON(save.player_portfolio, {}),
        monthlyExpenses: save.player_monthly_expenses,
        employees,
        officeLevel: save.player_office_level,
        officeGrid: safeParseJSONOptional(save.player_office_grid),
        officeLayout: safeParseJSONOptional(save.player_office_layout),
        lastDayChange: save.player_last_day_change,
        previousDayAssets: save.player_previous_day_assets,
        lastDailyTradeResetDay: 0,
        dailyTradeCount: 0,
      },
      companies,
      events,
      news,
      competitors: competitors.length > 0 ? competitors : undefined,
      competitorCount: competitors.length,
      proposals: proposals.length > 0 ? proposals : undefined,
      lastProcessedMonth: save.last_processed_month,
      institutions: institutions.length > 0 ? institutions : undefined,
      marketRegime: safeParseJSONOptional(save.market_regime),
      marketIndexHistory: safeParseJSONOptional<number[]>(save.market_index_history),
      circuitBreaker: safeParseJSONOptional(save.circuit_breaker),
      lastMnaQuarter: save.last_mna_quarter,
      pendingIPOs: pendingIPOs.length > 0 ? pendingIPOs : undefined,
      autoSellEnabled: save.auto_sell_enabled === 1,
      autoSellPercent: save.auto_sell_percent ?? undefined,
      cashFlowLog: safeParseJSONOptional(save.cash_flow_log),
      realizedTrades: safeParseJSONOptional(save.realized_trades),
      monthlyCashFlowSummaries: safeParseJSONOptional(save.monthly_summaries),
    }

    console.log(`[SQLite] Loaded game from slot '${slotName}' (save_id: ${saveId})`)
    return saveData
  } catch (error) {
    console.error('[SQLite] Failed to load game:', error)
    throw error
  }
}
