/**
 * Zustand Store Action Contracts
 * Feature: 001-retro-stock-sim
 * Date: 2026-02-14
 *
 * This file defines the type-safe contracts for all Zustand store actions.
 * These actions serve as the "API" for game state mutations.
 */

// ============================================================================
// GAME LIFECYCLE ACTIONS
// ============================================================================

/**
 * Start a new game with specified difficulty
 *
 * @param difficulty - Game difficulty setting (Easy | Normal | Hard)
 * @returns void
 *
 * Side effects:
 * - Resets all game state to initial values
 * - Initializes player with starting cash from difficulty
 * - Loads company data from src/data/companies.ts
 * - Sets game time to {year: 1995, quarter: 1, day: 0, tick: 0}
 * - Clears all windows
 * - Initializes Web Worker with random seed
 *
 * Validation:
 * - Difficulty must be valid enum value
 *
 * Example:
 * ```typescript
 * startGame('Normal');
 * ```
 */
export interface StartGameAction {
  (difficulty: 'Easy' | 'Normal' | 'Hard'): void;
}

/**
 * End the current game and trigger ending evaluation
 *
 * @returns void
 *
 * Side effects:
 * - Pauses game clock
 * - Evaluates ending scenario based on player net worth and game time
 * - Opens ending screen window
 * - Triggers final auto-save
 *
 * Validation:
 * - Game must be started (isGameStarted === true)
 *
 * Example:
 * ```typescript
 * endGame();
 * ```
 */
export interface EndGameAction {
  (): void;
}

/**
 * Load saved game state from IndexedDB
 *
 * @returns Promise<boolean> - True if load successful, false if no save found
 *
 * Side effects:
 * - Restores all game state from most recent save
 * - Reinitializes Web Worker with saved seed
 * - Opens windows that were open at save time
 *
 * Validation:
 * - Save data schema version must match or be migratable
 *
 * Example:
 * ```typescript
 * await loadGame();
 * ```
 */
export interface LoadGameAction {
  (): Promise<boolean>;
}

/**
 * Manually save current game state to IndexedDB
 *
 * @returns Promise<void>
 *
 * Side effects:
 * - Serializes current game state
 * - Writes to IndexedDB 'saves' table
 * - Updates last save timestamp
 *
 * Validation:
 * - Game must be started
 * - IndexedDB quota not exceeded
 *
 * Example:
 * ```typescript
 * await saveGame();
 * ```
 */
export interface SaveGameAction {
  (): Promise<void>;
}

// ============================================================================
// TIME CONTROL ACTIONS
// ============================================================================

/**
 * Advance game time by one tick
 *
 * @returns void
 *
 * Side effects:
 * - Increments tick counter
 * - Sends price update request to Web Worker
 * - Receives new prices and updates companies
 * - Decays active market events (ticksRemaining--)
 * - Randomly generates new events based on difficulty
 * - Auto-saves on quarter boundary
 * - Checks for game end condition (year > 2025)
 *
 * Validation:
 * - Game must not be paused
 * - Game must not be over
 *
 * Example:
 * ```typescript
 * advanceTick();
 * ```
 */
export interface AdvanceTickAction {
  (): void;
}

/**
 * Set simulation speed multiplier
 *
 * @param speed - Speed multiplier (0.5 = half speed, 2.0 = double speed)
 * @returns void
 *
 * Side effects:
 * - Updates tick interval in tick engine
 * - Adjusts requestAnimationFrame timing
 *
 * Validation:
 * - Speed must be between 0.5 and 5.0
 *
 * Example:
 * ```typescript
 * setSpeed(2.0); // Double speed
 * ```
 */
export interface SetSpeedAction {
  (speed: number): void;
}

/**
 * Pause or resume game clock
 *
 * @param paused - True to pause, false to resume
 * @returns void
 *
 * Side effects:
 * - Stops/starts tick engine
 * - Preserves all game state (no reset)
 *
 * Validation:
 * - None
 *
 * Example:
 * ```typescript
 * pauseGame(true); // Pause
 * pauseGame(false); // Resume
 * ```
 */
export interface PauseGameAction {
  (paused: boolean): void;
}

// ============================================================================
// TRADING ACTIONS
// ============================================================================

/**
 * Buy shares of a company
 *
 * @param ticker - Company ticker symbol
 * @param shares - Number of shares to buy (must be positive integer)
 * @returns {success: boolean, error?: string}
 *
 * Side effects:
 * - Deducts cash from player (shares × current price)
 * - Adds shares to player portfolio
 * - Recalculates net worth
 *
 * Validation:
 * - Ticker must exist in companies
 * - Shares must be positive integer
 * - Player must have sufficient cash (cash >= shares × price)
 *
 * Example:
 * ```typescript
 * const result = buyStock('TECH', 10);
 * if (!result.success) {
 *   console.error(result.error);
 * }
 * ```
 */
export interface BuyStockAction {
  (ticker: string, shares: number): { success: boolean; error?: string };
}

/**
 * Sell shares of a company
 *
 * @param ticker - Company ticker symbol
 * @param shares - Number of shares to sell (must be positive integer)
 * @returns {success: boolean, error?: string}
 *
 * Side effects:
 * - Adds cash to player (shares × current price)
 * - Removes shares from player portfolio
 * - Recalculates net worth
 *
 * Validation:
 * - Ticker must exist in companies
 * - Shares must be positive integer
 * - Player must own sufficient shares (portfolio[ticker] >= shares)
 *
 * Example:
 * ```typescript
 * const result = sellStock('TECH', 5);
 * if (!result.success) {
 *   console.error(result.error);
 * }
 * ```
 */
export interface SellStockAction {
  (ticker: string, shares: number): { success: boolean; error?: string };
}

// ============================================================================
// EMPLOYEE & OFFICE ACTIONS
// ============================================================================

/**
 * Hire an employee
 *
 * @param role - Employee role (Analyst | Trader | Manager)
 * @returns {success: boolean, error?: string}
 *
 * Side effects:
 * - Deducts cash from player (one-time hiring cost)
 * - Adds employee to player.employees
 * - Reduces employee stamina by 10
 * - Generates random name for employee
 *
 * Validation:
 * - Player must have sufficient cash
 * - Employee count must be below office capacity
 * - Employee stamina must be >0
 *
 * Example:
 * ```typescript
 * const result = hireEmployee('Analyst');
 * ```
 */
export interface HireEmployeeAction {
  (role: 'Analyst' | 'Trader' | 'Manager'): { success: boolean; error?: string };
}

/**
 * Fire an employee
 *
 * @param employeeId - Unique employee ID
 * @returns {success: boolean, error?: string}
 *
 * Side effects:
 * - Removes employee from player.employees
 * - No cash refund (sunk cost)
 *
 * Validation:
 * - Employee ID must exist
 *
 * Example:
 * ```typescript
 * const result = fireEmployee(123);
 * ```
 */
export interface FireEmployeeAction {
  (employeeId: number): { success: boolean; error?: string };
}

/**
 * Upgrade office to next level
 *
 * @returns {success: boolean, error?: string}
 *
 * Side effects:
 * - Deducts cash from player (upgrade cost)
 * - Increments officeLevel (0→1, 1→2, 2→3)
 * - Resets employee stamina to 100
 * - Increases max employee capacity
 *
 * Validation:
 * - Office level must be <3 (max level)
 * - Player must have sufficient cash
 *
 * Example:
 * ```typescript
 * const result = upgradeOffice();
 * ```
 */
export interface UpgradeOfficeAction {
  (): { success: boolean; error?: string };
}

// ============================================================================
// WINDOW MANAGEMENT ACTIONS
// ============================================================================

/**
 * Open a new window
 *
 * @param type - Window type (trading | chart | portfolio | office | news | ranking | settings)
 * @param data - Optional window-specific data (e.g., {ticker: 'TECH'} for chart window)
 * @returns number - Window ID
 *
 * Side effects:
 * - Adds window to windows array
 * - Assigns unique window ID
 * - Sets z-index to nextZIndex++
 * - Cascades position based on existing windows
 *
 * Validation:
 * - Type must be valid WindowType
 * - Window count should not exceed reasonable limit (e.g., 15)
 *
 * Example:
 * ```typescript
 * const windowId = openWindow('chart', {ticker: 'TECH'});
 * ```
 */
export interface OpenWindowAction {
  (type: string, data?: Record<string, unknown>): number;
}

/**
 * Close a window by ID
 *
 * @param windowId - Unique window instance ID
 * @returns void
 *
 * Side effects:
 * - Removes window from windows array
 * - Cleans up window-specific resources
 *
 * Validation:
 * - Window ID must exist
 *
 * Example:
 * ```typescript
 * closeWindow(123);
 * ```
 */
export interface CloseWindowAction {
  (windowId: number): void;
}

/**
 * Bring window to foreground (focus)
 *
 * @param windowId - Unique window instance ID
 * @returns void
 *
 * Side effects:
 * - Sets window z-index to nextZIndex++
 * - All other windows remain at lower z-index
 *
 * Validation:
 * - Window ID must exist
 *
 * Example:
 * ```typescript
 * focusWindow(123);
 * ```
 */
export interface FocusWindowAction {
  (windowId: number): void;
}

/**
 * Minimize window (collapse to taskbar)
 *
 * @param windowId - Unique window instance ID
 * @returns void
 *
 * Side effects:
 * - Sets window.isMinimized = true
 * - Window still exists in state but not rendered
 *
 * Validation:
 * - Window ID must exist
 *
 * Example:
 * ```typescript
 * minimizeWindow(123);
 * ```
 */
export interface MinimizeWindowAction {
  (windowId: number): void;
}

/**
 * Restore minimized window
 *
 * @param windowId - Unique window instance ID
 * @returns void
 *
 * Side effects:
 * - Sets window.isMinimized = false
 * - Brings window to foreground (z-index update)
 *
 * Validation:
 * - Window ID must exist
 * - Window must be minimized
 *
 * Example:
 * ```typescript
 * restoreWindow(123);
 * ```
 */
export interface RestoreWindowAction {
  (windowId: number): void;
}

/**
 * Update window position (for dragging)
 *
 * @param windowId - Unique window instance ID
 * @param position - New position {x, y} in pixels
 * @returns void
 *
 * Side effects:
 * - Updates window.position
 * - Bounds-checks to prevent off-screen positioning
 *
 * Validation:
 * - Window ID must exist
 * - Position must keep window at least partially visible
 *
 * Example:
 * ```typescript
 * updateWindowPosition(123, {x: 300, y: 200});
 * ```
 */
export interface UpdateWindowPositionAction {
  (windowId: number, position: { x: number; y: number }): void;
}

// ============================================================================
// PRICE UPDATE ACTION (INTERNAL - CALLED BY WORKER)
// ============================================================================

/**
 * Update stock prices (called by Web Worker)
 *
 * @param prices - Array of {ticker, price} updates
 * @returns void
 *
 * Side effects:
 * - Updates company.price for each ticker
 * - Appends to company.priceHistory (limited to 500 points)
 * - Triggers net worth recalculation
 *
 * Validation:
 * - Prices must be positive
 * - Tickers must exist
 *
 * Example:
 * ```typescript
 * updateStockPrices([
 *   {ticker: 'TECH', price: 151.25},
 *   {ticker: 'FIN', price: 89.50}
 * ]);
 * ```
 */
export interface UpdateStockPricesAction {
  (prices: Array<{ ticker: string; price: number }>): void;
}

// ============================================================================
// COMPLETE STORE INTERFACE
// ============================================================================

export interface GameStoreActions {
  // Lifecycle
  startGame: StartGameAction;
  endGame: EndGameAction;
  loadGame: LoadGameAction;
  saveGame: SaveGameAction;

  // Time control
  advanceTick: AdvanceTickAction;
  setSpeed: SetSpeedAction;
  pauseGame: PauseGameAction;

  // Trading
  buyStock: BuyStockAction;
  sellStock: SellStockAction;

  // Employee & Office
  hireEmployee: HireEmployeeAction;
  fireEmployee: FireEmployeeAction;
  upgradeOffice: UpgradeOfficeAction;

  // Window management
  openWindow: OpenWindowAction;
  closeWindow: CloseWindowAction;
  focusWindow: FocusWindowAction;
  minimizeWindow: MinimizeWindowAction;
  restoreWindow: RestoreWindowAction;
  updateWindowPosition: UpdateWindowPositionAction;

  // Internal (Worker)
  updateStockPrices: UpdateStockPricesAction;
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example: Complete trading flow
 *
 * ```typescript
 * // 1. Start game
 * useGameStore.getState().startGame('Normal');
 *
 * // 2. Advance time to generate price movements
 * for (let i = 0; i < 100; i++) {
 *   useGameStore.getState().advanceTick();
 * }
 *
 * // 3. Buy stock
 * const buyResult = useGameStore.getState().buyStock('TECH', 10);
 * if (!buyResult.success) {
 *   console.error('Purchase failed:', buyResult.error);
 * }
 *
 * // 4. Advance more time
 * useGameStore.getState().setSpeed(2.0); // Speed up
 * for (let i = 0; i < 1000; i++) {
 *   useGameStore.getState().advanceTick();
 * }
 *
 * // 5. Sell stock
 * const sellResult = useGameStore.getState().sellStock('TECH', 5);
 *
 * // 6. Save progress
 * await useGameStore.getState().saveGame();
 * ```
 */
