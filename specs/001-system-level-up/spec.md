# Feature Specification: System Level-Up - UX/Game Experience Enhancement

**Feature Branch**: `001-system-level-up`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "claudedocs/system_level_up.md --seq"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enhanced Game Flow with Visual Feedback (Priority: P1)

Players need immediate, satisfying visual and audio feedback when performing trading actions to feel engaged and understand the consequences of their decisions. The current static UI lacks the "game feel" that makes actions rewarding.

**Why this priority**: This is the foundation of game engagement. Without satisfying feedback loops, players won't feel connected to their actions, leading to early abandonment. This single improvement can increase player retention by making every action feel meaningful.

**Independent Test**: Can be fully tested by executing a single stock trade and observing the animation sequence (card flip → price counting → portfolio update → particle effects → sound), delivering immediate engagement value even without other features.

**Acceptance Scenarios**:

1. **Given** a player has sufficient cash, **When** they purchase stock, **Then** the system displays a 1.5-second animation sequence: card flip revealing stock name, price counting from 0 to purchase amount, portfolio value updating with number animation, particle effects (flying coins), and 8-bit purchase sound effect
2. **Given** a player sells stock at a profit, **When** the transaction completes, **Then** the system displays green particle effects with upward movement and a celebratory 8-bit sound
3. **Given** a player sells stock at a loss, **When** the transaction completes, **Then** the system displays red particle effects with downward movement and a melancholic 8-bit sound
4. **Given** the animation is playing, **When** the player clicks elsewhere, **Then** the animation completes without interruption to ensure feedback clarity

---

### User Story 2 - Unified Information Dashboard (Priority: P1)

Players struggle to find critical information scattered across multiple windows. They need a unified dashboard that presents portfolio status, quick actions, employee status, and market news in a single, well-organized view.

**Why this priority**: Information architecture is the second-most critical UX improvement. Players currently waste time opening/closing windows to understand their game state. A unified dashboard reduces cognitive load by 50% and enables faster decision-making.

**Independent Test**: Can be tested by observing whether players can answer "What's my current portfolio value?", "Who's my most stressed employee?", and "What's the latest market news?" within 3 seconds of viewing the dashboard.

**Acceptance Scenarios**:

1. **Given** a player opens the game, **When** they view the main screen, **Then** they see a 3-column dashboard: left (quick trade actions), center (portfolio health gauge + next milestone progress bar), right (employee card view + scrolling news feed)
2. **Given** a player's portfolio changes, **When** the update occurs, **Then** the center portfolio gauge animates smoothly to the new value with number counting effect
3. **Given** an employee becomes stressed (>80), **When** viewing the dashboard, **Then** the employee card displays a red border and stress warning icon
4. **Given** a market event occurs, **When** the event triggers, **Then** the news feed auto-scrolls to the new event with a brief highlight animation

---

### User Story 3 - Strategic Decision-Making through Monthly Card System (Priority: P2)

Players need meaningful monthly choices that create strategic depth and replayability. The current random event system feels passive; players want agency in shaping market conditions through card selection.

**Why this priority**: This transforms the game from a passive simulator to an active strategy game. Players gain agency and each playthrough becomes unique based on their card choices, significantly increasing replay value.

**Independent Test**: Can be tested by playing through one month, selecting from 3 news cards (choosing 2, with 1 mandatory), and verifying that stock prices reflect the chosen events, delivering strategic decision-making value independently.

**Acceptance Scenarios**:

1. **Given** the start of a new month, **When** the monthly processing occurs, **Then** the system presents 3 news cards with distinct market impacts (e.g., "Tech Stock Surge +15%", "Energy Crisis -10%", "Financial Regulations")
2. **Given** 3 news cards are presented, **When** the player selects 2 cards, **Then** the system applies both selected events' market effects and marks 1 remaining card as mandatory
3. **Given** a player ignores the card selection, **When** 10 ticks pass, **Then** the system auto-selects 2 random cards and proceeds
4. **Given** a 10% probability random event, **When** monthly cards are drawn, **Then** the system occasionally presents a "Forced Event" card that cannot be declined (e.g., "Market Crash", "Regulatory Audit")

---

### User Story 4 - Employee Personality and Growth Arc (Priority: P2)

Players want employees to feel like real people with goals, emotions, and growth trajectories rather than interchangeable stat blocks. This creates emotional investment and narrative engagement.

**Why this priority**: Emotional connection to NPCs significantly increases long-term engagement. Players will care about their employees' success, making HR management decisions more meaningful and creating memorable gameplay moments.

**Independent Test**: Can be tested by hiring one employee, clicking their card to view bio (name, age, personal goal with progress bar, personality traits, current emotion), and verifying that monthly counseling updates their stress/satisfaction, delivering character depth independently.

**Acceptance Scenarios**:

1. **Given** a player clicks an employee card, **When** the bio panel opens, **Then** it displays: name, age, current personal goal (e.g., "Save 30M KRW for home down payment"), progress bar toward goal (%), personality assessment (e.g., "Optimistic but prone to impulse spending"), current emotion (e.g., "Excited about this month's bonus")
2. **Given** an employee reaches a personal goal milestone (25%, 50%, 75%, 100%), **When** the threshold is crossed, **Then** the system displays a celebration toast notification and the employee's satisfaction increases by 10 points
3. **Given** an employee has >70 stress, **When** the HR Manager performs monthly counseling, **Then** the employee's stress decreases by 15 points and a unique dialogue bubble appears (e.g., "Thanks for the support! I feel much better now")
4. **Given** monthly processing occurs, **When** employees receive updates, **Then** each employee's personal goal progress advances based on their salary and the bio panel reflects the new progress percentage

---

### User Story 5 - Branching Skill Development Paths (Priority: P3)

Players need strategic choices in employee development. Instead of linear leveling, they want to specialize employees along different career paths (Trading vs Analysis) with distinct bonuses that synergize with their office layout.

**Why this priority**: This adds strategic depth to employee management. Players can build specialized teams (all traders for execution speed, or mixed analyst-trader pipelines for better proposals), creating diverse viable strategies.

**Independent Test**: Can be tested by training one employee, selecting between "Trading Education (+20% trade profit)" and "Analysis Education (+30% prediction accuracy)", leveling them up, and verifying the selected path's bonuses apply, delivering strategic customization independently.

**Acceptance Scenarios**:

1. **Given** an employee reaches level 5, **When** the player accesses the training menu, **Then** the system presents 2 branching skill paths: "Trading Path" (boosts trade execution profit, slippage reduction, speed) vs "Analysis Path" (boosts stock prediction accuracy, proposal confidence, risk assessment)
2. **Given** a player selects "Trading Path" for an employee, **When** the training completes, **Then** the employee gains +20% trade profit bonus and unlocks "Fast Execution" skill at level 10
3. **Given** a player selects "Analysis Path" for an employee, **When** the training completes, **Then** the employee gains +30% prediction accuracy and unlocks "Pattern Recognition" skill at level 10
4. **Given** an employee reaches level 20, **When** viewing the skill tree, **Then** the system displays advanced path options: Trading → "Fund Manager" or "Day Trader", Analysis → "Research Lead" or "Risk Consultant", each with unique bonuses

---

### User Story 6 - Multi-Week Event Chain System (Priority: P3)

Players want market events to feel like unfolding stories rather than isolated incidents. Event chains that span 3-4 weeks with branching outcomes based on player actions create narrative tension and strategic planning.

**Why this priority**: This transforms random events into a narrative layer, making the game world feel alive and responsive to player actions. Players will anticipate and plan around ongoing storylines, increasing engagement.

**Independent Test**: Can be tested by triggering one event chain (e.g., "Tech Company Crisis"), observing 3 sequential events over 3 weeks (initial news → CEO response → resolution), with branching outcomes based on whether player bought/held/sold during the crisis.

**Acceptance Scenarios**:

1. **Given** a new month starts, **When** the event system selects a chain event (15% probability), **Then** the system initiates a 3-4 week event sequence (e.g., Week 1: "Samsung Chip Division Reports Loss" → Tech stocks -10%)
2. **Given** an event chain is active (Week 1), **When** Week 2 arrives, **Then** the system presents a follow-up event based on prior week's conditions (e.g., if player sold tech stocks: "Investor Panic Deepens" -5% more, if player bought: "CEO Announces Recovery Plan" -3% only)
3. **Given** an event chain reaches Week 3, **When** the resolution event occurs, **Then** the system concludes the storyline with a significant market shift (e.g., "New Product Launch Success" → Tech stocks +15%, reversing the prior decline)
4. **Given** an event chain is active, **When** viewing the news feed, **Then** the system displays a progress indicator showing which part of the chain is active (e.g., "Tech Crisis: Part 2 of 3")

---

### User Story 7 - Dynamic Economic Pressure System (Priority: P3)

Players need ongoing challenges even after accumulating wealth. A dynamic taxation and position limit system ensures that the game remains strategically demanding at all wealth levels, preventing the "runaway winner" problem.

**Why this priority**: This ensures long-term game balance and prevents the game from becoming trivial once players reach a certain wealth threshold. Maintains challenge and forces strategic adaptation throughout the 30-year timeline.

**Independent Test**: Can be tested by accumulating 100M KRW in assets, observing monthly 0.5% asset tax deduction, and verifying that position size limits (max 20% of portfolio in single stock) are enforced, delivering ongoing challenge independently.

**Acceptance Scenarios**:

1. **Given** a player's total assets exceed 100M KRW, **When** monthly processing occurs, **Then** the system deducts 0.5% of total assets as "Wealth Tax" and displays a notification explaining the deduction
2. **Given** a player's total assets exceed 1B KRW, **When** attempting to buy stock that would exceed 20% portfolio concentration, **Then** the system blocks the trade and displays a message: "Position Limit: Maximum 20% portfolio in single stock"
3. **Given** a player consistently achieves >50% annual returns, **When** the next month begins, **Then** the system increases the frequency of negative market events by 20% to maintain challenge
4. **Given** a player experiences 3 consecutive months of >20% losses, **When** the next month begins, **Then** the system provides a "relief event" (e.g., "Central Bank Rate Cut") to prevent excessive frustration

---

### Edge Cases

- **What happens when an employee quits during an active skill training session?**
  - System cancels the training, refunds 50% of training cost, and removes employee from skill tree progression
  - Speech bubble appears: "[Employee Name] quit during training. Training costs partially refunded."

- **What happens when an event chain is interrupted by a market crash or forced event?**
  - Event chain pauses (does not advance to next week)
  - System stores chain state and resumes after forced event resolves
  - News feed displays: "Ongoing: [Chain Name] - Delayed due to [Forced Event]"

- **What happens when the animation system lags on low-performance devices?**
  - System detects frame rate drops below 30 FPS
  - Automatically reduces particle count by 50% and simplifies animations
  - Displays optional settings toggle: "Reduce animations for better performance"

- **What happens when a player tries to select the same news card twice in monthly card draw?**
  - System prevents duplicate selection (card becomes grayed out after first click)
  - Error tooltip appears: "Already selected. Choose a different card."

- **What happens when the unified dashboard becomes cluttered with too many notifications?**
  - System auto-dismisses notifications older than 5 minutes
  - Notification center caps at 10 visible items, older items moved to "History" tab
  - Priority system ensures critical alerts (bankruptcy warning, employee resignation) always visible

- **What happens when a player accumulates wealth so quickly that tax system creates negative cash flow?**
  - System calculates tax as min(0.5% assets, 90% monthly cash income) to prevent cash flow death spiral
  - Warning notification appears 1 month before tax burden exceeds income: "Tax burden rising - diversify income sources"

## Requirements *(mandatory)*

### Functional Requirements

#### Animation & Feedback System

- **FR-001**: System MUST display a 1.5-second animation sequence for all trade transactions including: card flip (0.3s), price counting (0.5s), portfolio value update (0.4s), particle effects (0.3s)
- **FR-002**: System MUST play distinct 8-bit sound effects for: trade success (coin sound), profit (celebratory fanfare), loss (melancholic tone), milestone achievement (victory jingle)
- **FR-003**: System MUST render particles at 60 FPS on standard devices, with automatic performance scaling (reducing particle count by 50%) when frame rate drops below 30 FPS
- **FR-004**: System MUST display number counting animations for all numeric value changes (cash, portfolio value, employee stats) with duration proportional to value magnitude (100-500ms)

#### Unified Dashboard

- **FR-005**: System MUST present a 3-column main dashboard layout: left (quick trade panel), center (portfolio health gauge + milestone progress), right (employee cards + news feed)
- **FR-006**: System MUST update the portfolio health gauge in real-time (every tick) with smooth animation transitions when values change
- **FR-007**: System MUST display employee cards in grid view showing: avatar, name, role, current stress level (color-coded: green <50, yellow 50-79, red ≥80), active skill icons
- **FR-008**: System MUST auto-scroll the news feed to the latest event when a new market event occurs, with a 2-second highlight animation

#### Monthly Card Draw System

- **FR-009**: System MUST present 3 news cards at the start of each month, each with: title, market impact preview (+/- percentages by sector), visual icon
- **FR-010**: System MUST allow players to select exactly 2 cards from the 3 presented, with the 3rd card marked as "mandatory" after selection
- **FR-011**: System MUST apply market effects from selected cards immediately after confirmation, updating stock prices according to drift/volatility modifiers
- **FR-012**: System MUST trigger a "Forced Event" card (unselectable, mandatory impact) with 10% probability per month, overriding normal card selection
- **FR-013**: System MUST auto-select 2 random cards if player does not make a choice within 10 ticks (2 seconds at base speed)

#### Employee Bio & Personality System

- **FR-014**: System MUST generate unique employee bios containing: name, age (25-45), personal financial goal (e.g., "Save 30M KRW for home"), personality trait (selected from 10 trait types), current emotional state
- **FR-015**: System MUST track personal goal progress as a percentage, calculated from (employee's accumulated salary / goal amount) × 100
- **FR-016**: System MUST display celebration notifications when employees reach goal milestones (25%, 50%, 75%, 100%), increasing satisfaction by 10 points per milestone
- **FR-017**: System MUST update employee emotional state based on recent events: positive emotions (+bonus, +skill level, -stress), negative emotions (+stress, -satisfaction, missed promotion)
- **FR-018**: System MUST allow HR Manager to perform monthly counseling (cost: 50K KRW), reducing target employee's stress by 15 points and triggering unique dialogue

#### Branching Skill Tree

- **FR-019**: System MUST present 2 skill path options at employee level 5: "Trading Path" (bonuses: +20% trade profit, -15% slippage, +10% execution speed) vs "Analysis Path" (bonuses: +30% prediction accuracy, +20% proposal confidence, +15% risk assessment)
- **FR-020**: System MUST unlock advanced skill choices at level 10, level 20, and level 30, each building on the previously selected path
- **FR-021**: System MUST apply skill bonuses immediately upon training completion, persisting across all future actions by that employee
- **FR-022**: System MUST display skill tree visualization showing: current path, unlocked skills (green), available skills (yellow), locked skills (gray)

#### Event Chain System

- **FR-023**: System MUST support multi-week event chains spanning 3-4 weeks, with each week's event building on the previous week's outcome
- **FR-024**: System MUST determine event chain branching based on player actions: if player bought affected stocks → "investor confidence" branch, if sold → "panic selling" branch, if held → "wait-and-see" branch
- **FR-025**: System MUST display event chain progress in news feed UI, showing current week and total chain length (e.g., "Tech Crisis: Week 2 of 4")
- **FR-026**: System MUST conclude event chains with significant market resolution events (±15-25% stock price impact) that reverse or amplify the chain's cumulative effect

#### Dynamic Economic Pressure

- **FR-027**: System MUST apply 0.5% monthly wealth tax on total assets exceeding 100M KRW, deducted during monthly processing
- **FR-028**: System MUST enforce position limits when assets exceed 1B KRW: maximum 20% of portfolio value in any single stock, blocking trades that would violate this limit
- **FR-029**: System MUST implement adaptive difficulty scaling: if player achieves >50% annual returns, increase negative event frequency by 20%; if player suffers >20% monthly losses for 3+ consecutive months, trigger relief events
- **FR-030**: System MUST calculate wealth tax as min(0.5% × total assets, 90% × monthly cash income) to prevent negative cash flow spiral

#### Progress Tracking & Milestones

- **FR-031**: System MUST display 30-year progress bar at top of dashboard, showing current year/month with visual milestone markers (5 years, 10 years, 20 years, 30 years)
- **FR-032**: System MUST automatically suggest next financial milestone when current goal is 50% complete (e.g., "Next Goal: 50M KRW (+25M from current)")
- **FR-033**: System MUST display "ACHIEVEMENT UNLOCKED" toast notifications with celebratory animation and sound when milestones are reached
- **FR-034**: System MUST track and display achievement history in a dedicated "Achievement Log" accessible from main dashboard

### Key Entities

- **AnimationSequence**: Represents a multi-step visual/audio feedback sequence for game actions (trade, level up, milestone). Attributes: duration (ms), steps (array of animation frames), sound effect ID, trigger condition, performance scaling rules
- **NewsCard**: Represents a monthly market event card presented to players for selection. Attributes: title, description, sector impacts (% changes), visual icon, rarity tier (common/uncommon/rare), exclusivity rules (which cards cannot appear together)
- **EventChain**: Represents a multi-week narrative event sequence. Attributes: chain ID, total weeks, current week, branch conditions (player actions that affect outcome), resolution event, active/paused state
- **SkillPath**: Represents an employee's career development trajectory. Attributes: path type (Trading/Analysis), current level, unlocked skills, available next skills, cumulative bonuses, training cost per level
- **EmployeeBio**: Represents employee personality and life goals. Attributes: personal goal (financial target), goal progress (%), personality trait, current emotion, recent life events, milestone history
- **EconomicPressure**: Represents dynamic difficulty scaling based on player wealth. Attributes: wealth tier (100M/1B/10B), active tax rate, position limits, event frequency modifiers, relief event eligibility

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Player Engagement Metrics

- **SC-001**: Average session length increases from baseline 15 minutes to 45 minutes within 3 weeks of Phase 1 deployment (Dashboard + Animation + Monthly Cards)
- **SC-002**: Player replay rate increases from baseline 20% to 40% within 3 weeks of Phase 1 deployment, measured by unique players starting a second game within 7 days of completing their first
- **SC-003**: 90% of players successfully complete at least one trade with full animation sequence on their first attempt, indicating clear UX and satisfying feedback

#### User Satisfaction Metrics

- **SC-004**: In-game Net Promoter Score (NPS) increases from baseline 5.0 to 6.5 within 3 weeks of Phase 1, measured via optional post-session survey: "How likely are you to recommend this game? (0-10)"
- **SC-005**: 80% of players report understanding their current game state (portfolio value, next goal, employee status) within 3 seconds of viewing the dashboard, measured via user testing observation
- **SC-006**: Player interaction with employees increases from baseline 5 times per playthrough to 30 times per playthrough after Employee Bio system deployment (Phase 2)

#### Strategic Depth Metrics

- **SC-007**: Players make monthly card selections in >95% of months (not auto-selecting), indicating active strategic engagement with the card system
- **SC-008**: Employee skill path distribution shows >30% variation (no single path dominates >70% of choices), indicating balanced strategic options
- **SC-009**: Event chain completion rate >85%, indicating players successfully navigate multi-week narrative events without confusion or frustration

#### System Performance Metrics

- **SC-010**: Animation system maintains 60 FPS on 90% of devices tested (across desktop Chrome, Safari, Firefox, mobile Chrome/Safari)
- **SC-011**: Dashboard renders complete game state in <500ms after any state change (trade, event, employee action)
- **SC-012**: Monthly card draw system processes player selections and applies market effects in <200ms

#### Long-Term Retention Metrics

- **SC-013**: Percentage of players reaching Year 10 (out of 30-year timeline) increases from baseline 30% to 55% after Phase 2 deployment (Employee Bio + Skill Tree + Event Chains)
- **SC-014**: Player-generated content (screenshots, strategy guides, social media posts) increases by 300% within 8 weeks of full deployment, indicating memorable gameplay moments
- **SC-015**: Average number of different endings discovered per player increases from 1.2 to 2.5, indicating motivation to replay with different strategies
