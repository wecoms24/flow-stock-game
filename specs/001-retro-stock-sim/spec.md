# Feature Specification: Retro Stock Simulator Core Engine

**Feature Branch**: `001-retro-stock-sim`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: Sprint #1 Development Specification - Core simulation engine (GBM-based stock price calculation with Web Worker) and 90s-style multi-window manager for retro stock market simulator game

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Stock Price Simulation (Priority: P1)

As a player, I want to see stock prices update in real-time during gameplay so that I can make informed trading decisions based on current market conditions.

**Why this priority**: This is the core mechanic of the game. Without real-time price updates, there is no trading simulation. This delivers immediate value and enables all other features.

**Independent Test**: Can be fully tested by starting the game, observing 100 companies' prices updating smoothly at 60 FPS for extended periods (30+ game years), and verifying that price movements follow realistic patterns.

**Acceptance Scenarios**:

1. **Given** the game is running with 100 companies loaded, **When** the game clock advances by one tick, **Then** all stock prices update within the same frame without UI lag
2. **Given** a specific random seed is set, **When** the simulation runs for 1 game year, **Then** the exact same price sequence is reproduced on subsequent runs with the same seed
3. **Given** the game is simulating 100 companies, **When** monitoring frame rate over 60 seconds, **Then** the game maintains 60 FPS consistently
4. **Given** multiple companies in the same sector, **When** a market event affects that sector, **Then** all affected companies' price volatility adjusts accordingly

---

### User Story 2 - Persistent Game State (Priority: P2)

As a player, I want my game progress to be automatically saved so that I can continue playing from where I left off, even after closing the browser.

**Why this priority**: Without persistence, players lose all progress, making the game frustrating and unusable for longer play sessions. This is critical for user retention but depends on the core simulation working first.

**Independent Test**: Can be fully tested by playing for several game years, closing and reopening the browser, and verifying that all game state (cash, portfolio, stock prices, game time) is restored accurately within 1 second.

**Acceptance Scenarios**:

1. **Given** a game in progress, **When** a quarter ends, **Then** the complete game state is automatically saved to browser storage
2. **Given** a saved game exists, **When** the player reopens the game, **Then** all state (cash, portfolio, stock prices, current year/quarter) is restored within 1 second
3. **Given** no previous save exists, **When** the player starts a new game, **Then** the game initializes with default starting conditions
4. **Given** the browser storage is full, **When** attempting to save, **Then** the player is notified and given options to manage storage

---

### User Story 3 - Multi-Window Interface (Priority: P3)

As a player, I want to open, move, and manage multiple windows (trading, charts, portfolio) simultaneously so that I can efficiently monitor and act on market information.

**Why this priority**: Enhances user experience by allowing flexible workspace organization, but the game is playable with a single fixed layout. This is an ergonomic improvement rather than a core requirement.

**Independent Test**: Can be fully tested by opening 5+ windows, dragging them to different positions, minimizing/maximizing them, and verifying that focus management, z-ordering, and window states work correctly.

**Acceptance Scenarios**:

1. **Given** a window is open, **When** the player clicks on its title bar and drags, **Then** the window moves smoothly with the cursor with fluid, responsive motion
2. **Given** multiple windows are open, **When** the player clicks on any window, **Then** that window comes to the foreground (highest z-index) and receives focus
3. **Given** a window is open, **When** the player clicks the minimize button, **Then** the window collapses to the taskbar and can be restored
4. **Given** a window is open, **When** the player clicks the close button, **Then** the window is removed and its state is cleaned up

---

### User Story 4 - Retro Visual Style (Priority: P4)

As a player, I want the game to have an authentic 90s pixel art aesthetic with crisp pixel fonts and step-function charts so that I feel nostalgic and immersed in the retro theme.

**Why this priority**: This is a cosmetic enhancement that differentiates the game's identity but doesn't affect core gameplay. It can be polished after core mechanics are solid.

**Independent Test**: Can be fully tested by viewing the game on FHD and QHD displays, inspecting font rendering, and verifying that all UI elements maintain pixel-perfect clarity without anti-aliasing blur.

**Acceptance Scenarios**:

1. **Given** the game is rendered on an FHD (1920x1080) display, **When** viewing any text or UI element, **Then** pixel fonts remain crisp without anti-aliasing blur
2. **Given** the game is rendered on a QHD (2560x1440) display, **When** viewing any text or UI element, **Then** pixel fonts scale proportionally and remain crisp
3. **Given** a stock price chart is displayed, **When** examining the line rendering, **Then** the chart uses step-function (stairs) rendering with 1-pixel line width
4. **Given** the chart contains 500+ data points, **When** the chart updates in real-time, **Then** rendering performance remains at 60 FPS

---

### Edge Cases

- What happens when the browser's IndexedDB quota is exceeded during auto-save?
- How does the system handle corrupted save data on load?
- What happens when a player opens 20+ windows simultaneously?
- How does the simulation behave when the browser tab loses focus (should it pause or continue)?
- What happens when a player tries to buy/sell stocks during price calculation (mid-tick)?
- How does the system handle save/load if the game state schema changes in a future update?
- What happens when a player manually manipulates game state through browser console?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate stock prices using Geometric Brownian Motion (GBM) formula with configurable drift (mu) and volatility (sigma) parameters
- **FR-002**: System MUST process price updates for 100 companies simultaneously in a background thread without blocking the UI
- **FR-003**: System MUST use a seeded deterministic random number generator so that identical seeds produce identical price sequences
- **FR-004**: System MUST maintain game state including player cash, stock portfolio, current holdings, net worth, and game time (year, quarter, tick)
- **FR-005**: System MUST support buy and sell stock transactions that update player cash and portfolio in real-time
- **FR-006**: System MUST persist game state to browser storage automatically at the end of each quarter
- **FR-007**: System MUST restore saved game state within 1 second of application load
- **FR-008**: System MUST allow players to open multiple window types (trading, charts, portfolio, news, settings)
- **FR-009**: System MUST support window dragging via title bar with smooth, fluid animation
- **FR-010**: System MUST manage window z-index ordering so that clicked windows come to the foreground
- **FR-011**: System MUST support window minimize and close actions with proper state cleanup
- **FR-012**: System MUST render all UI elements with pixel-perfect clarity without anti-aliasing blur
- **FR-013**: System MUST display stock price charts using step-function (stairs) rendering with 1-pixel line width
- **FR-014**: System MUST limit chart data to 500 points maximum per series to maintain rendering performance
- **FR-015**: System MUST maintain 60 FPS performance during simultaneous price calculation of 100 companies

### Non-Functional Requirements

- **NFR-001**: Price calculation worker MUST complete a full tick cycle (100 companies) in under 16ms to maintain 60 FPS
- **NFR-002**: Game state save operation MUST complete in under 200ms to avoid blocking gameplay
- **NFR-003**: Font rendering MUST remain crisp on displays ranging from FHD (1920x1080) to QHD (2560x1440)
- **NFR-004**: Window drag operations MUST feel responsive with < 16ms latency per frame
- **NFR-005**: System MUST detect and log errors when game state is manipulated through browser console

### Key Entities

- **Company**: Represents a tradable stock with attributes including ticker symbol, company name, sector, current price, historical prices, drift (mu), volatility (sigma)
- **Player**: Represents the game player with attributes including cash balance, stock portfolio (holdings by ticker), total net worth, employee roster, office level
- **GameTime**: Represents simulation time with attributes including current year (1995-2025), quarter (1-4), day within quarter, tick within day, simulation speed multiplier
- **MarketEvent**: Represents events that affect stock prices with attributes including event type, severity, affected sectors/companies, duration, drift/volatility modifiers
- **WindowState**: Represents an open window with attributes including window type, unique instance ID, position (x, y), size (width, height), z-index, minimized status

### Assumptions

- Game uses existing difficulty settings defined in `src/data/difficulty.ts` (starting cash, volatility multipliers, event frequencies)
- Game uses existing 20 companies across 5 sectors defined in `src/data/companies.ts`
- Game ending scenarios follow existing logic in `src/stores/gameStore.ts` (billionaire, legend, retirement, survivor, bankrupt)
- New implementation replaces or enhances existing tick engine and state management
- Save data format may change, requiring migration strategy or fresh start notification for existing players
- Web Worker support is available in target browsers (all modern browsers support this)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can run a 30-year simulation (1995-2025) with 100 companies updating prices continuously without performance degradation
- **SC-002**: Frame rate remains at 60 FPS or higher during active gameplay with 100 companies and 3+ open windows
- **SC-003**: Game state save and restore operations complete in under 1 second from player perspective
- **SC-004**: Pixel font rendering is rated as "crisp and clear" by visual inspection on FHD and QHD displays
- **SC-005**: Players can reproduce identical price sequences by using the same random seed across multiple sessions
- **SC-006**: Window dragging operations feel smooth with no visible lag or stuttering
- **SC-007**: Chart rendering supports up to 500 data points per stock without frame rate drops below 60 FPS
- **SC-008**: System successfully detects and logs when game state is modified through browser console (for anti-cheat/debugging)
