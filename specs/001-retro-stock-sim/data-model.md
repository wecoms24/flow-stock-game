# Data Model: Retro Stock Simulator Core Engine

**Feature**: 001-retro-stock-sim
**Date**: 2026-02-14
**Phase**: Phase 1 - Data Model Design

## Overview

This document defines all data entities, their relationships, validation rules, and state transitions for the stock simulation engine and window manager.

---

## Entity 1: Company

Represents a tradable stock company with price simulation parameters.

### Fields

| Field | Type | Description | Constraints | Default |
|-------|------|-------------|-------------|---------|
| `id` | number | Unique company identifier | Required, >0, unique | Auto-increment |
| `ticker` | string | Stock ticker symbol (e.g., "AAPL") | Required, 2-5 chars, uppercase, unique | - |
| `name` | string | Full company name | Required, 3-50 chars | - |
| `sector` | Sector | Industry sector | Required, enum: Tech \| Finance \| Energy \| Consumer \| Healthcare | - |
| `price` | number | Current stock price (USD) | Required, >0, max 2 decimals | - |
| `basePrice` | number | Initial/reference price | Required, >0 | - |
| `drift` | number | GBM drift parameter (μ) | Required, -1.0 to 1.0 | 0.0 |
| `volatility` | number | GBM volatility parameter (σ) | Required, 0.0 to 2.0 | 0.2 |
| `priceHistory` | Array<PricePoint> | Historical price data | Max 500 items | [] |

### Relationships

- **Sector → Company**: 1-to-many (each sector contains multiple companies)
- **Company → MarketEvent**: Many-to-many (events can affect multiple companies)
- **Company → Player.portfolio**: Many-to-many (player owns shares of multiple companies)

### Validation Rules

```typescript
// Price validation
if (price <= 0) throw new Error('Price must be positive');
if (price > 1000000) throw new Error('Price exceeds maximum');

// Drift validation
if (drift < -1.0 || drift > 1.0) throw new Error('Drift must be between -1.0 and 1.0');

// Volatility validation
if (volatility < 0 || volatility > 2.0) throw new Error('Volatility must be between 0.0 and 2.0');

// Price history limit
if (priceHistory.length > 500) {
  priceHistory = priceHistory.slice(-500); // Keep latest 500 points
}
```

### State Transitions

```
[Initial State]
  ↓ (Game Start)
price = basePrice
drift = sector default
volatility = sector default
  ↓ (Each Tick)
price = GBM(price, drift, volatility, dt)
priceHistory.push({tick, price})
  ↓ (Market Event Applied)
drift += event.driftModifier
volatility += event.volatilityModifier
  ↓ (Event Expires)
drift = original value
volatility = original value
```

### Example

```typescript
const company: Company = {
  id: 1,
  ticker: 'TECH',
  name: 'TechCorp Inc.',
  sector: 'Tech',
  price: 150.00,
  basePrice: 100.00,
  drift: 0.05,
  volatility: 0.25,
  priceHistory: [
    { tick: 0, price: 100.00 },
    { tick: 1, price: 101.25 },
    { tick: 2, price: 99.75 }
  ]
};
```

---

## Entity 2: Player

Represents the game player with financial state and resources.

### Fields

| Field | Type | Description | Constraints | Default |
|-------|------|-------------|-------------|---------|
| `cash` | number | Available cash (USD) | Required, ≥0, max 2 decimals | difficulty.startingCash |
| `portfolio` | Map<ticker, shares> | Stock holdings | Required, shares ≥0, integer | {} |
| `netWorth` | number | Total assets (cash + portfolio value) | Computed, ≥0 | cash |
| `employees` | Array<Employee> | Hired employees | Required, max based on office level | [] |
| `officeLevel` | number | Office upgrade level (0-3) | Required, 0-3, integer | 0 |
| `employeeStamina` | number | Remaining stamina for hiring | Required, 0-100, integer | 100 |

### Relationships

- **Player → Company**: Many-to-many via `portfolio` (owns shares)
- **Player → Employee**: 1-to-many (player hires employees)

### Validation Rules

```typescript
// Cash validation
if (cash < 0) throw new Error('Cash cannot be negative');

// Portfolio validation
for (const [ticker, shares] of Object.entries(portfolio)) {
  if (shares < 0) throw new Error('Shares cannot be negative');
  if (!Number.isInteger(shares)) throw new Error('Shares must be integer');
}

// Office level validation
if (officeLevel < 0 || officeLevel > 3) throw new Error('Office level must be 0-3');

// Employee capacity
const maxEmployees = [0, 5, 10, 20][officeLevel];
if (employees.length > maxEmployees) throw new Error('Exceeds employee capacity');

// Stamina validation
if (employeeStamina < 0 || employeeStamina > 100) throw new Error('Stamina must be 0-100');
```

### Computed Fields

```typescript
// Net worth calculation
netWorth = cash + portfolio.reduce((total, [ticker, shares]) => {
  const company = companies.find(c => c.ticker === ticker);
  return total + (shares * company.price);
}, 0);
```

### State Transitions

```
[Game Start]
  ↓
cash = difficulty.startingCash
portfolio = {}
netWorth = cash
employees = []
officeLevel = 0
employeeStamina = 100
  ↓ (Buy Stock)
cash -= (shares × price)
portfolio[ticker] += shares
netWorth = recalculate()
  ↓ (Sell Stock)
cash += (shares × price)
portfolio[ticker] -= shares
netWorth = recalculate()
  ↓ (Hire Employee)
cash -= employee.salary
employees.push(employee)
employeeStamina -= 10
  ↓ (Monthly Tick)
cash -= employees.sum(e => e.salary)
employeeStamina = max(0, employeeStamina - 5)
  ↓ (Upgrade Office)
cash -= officeCost
officeLevel += 1
employeeStamina = 100
```

---

## Entity 3: GameTime

Represents simulation time progression.

### Fields

| Field | Type | Description | Constraints | Default |
|-------|------|-------------|-------------|---------|
| `year` | number | Current game year | Required, 1995-2025, integer | 1995 |
| `quarter` | number | Current quarter (1-4) | Required, 1-4, integer | 1 |
| `day` | number | Day within quarter (0-89) | Required, 0-89, integer | 0 |
| `tick` | number | Tick within day (0-3599) | Required, 0-3599, integer | 0 |
| `speed` | number | Simulation speed multiplier | Required, 0.5-5.0 | 1.0 |
| `isPaused` | boolean | Pause state | Required | false |

### Relationships

- **GameTime**: Singleton (only one instance in game state)
- Referenced by all time-based events and calculations

### Validation Rules

```typescript
// Year validation
if (year < 1995 || year > 2025) throw new Error('Year must be 1995-2025');

// Quarter validation
if (quarter < 1 || quarter > 4) throw new Error('Quarter must be 1-4');

// Day validation
if (day < 0 || day > 89) throw new Error('Day must be 0-89');

// Tick validation
if (tick < 0 || tick > 3599) throw new Error('Tick must be 0-3599');

// Speed validation
if (speed < 0.5 || speed > 5.0) throw new Error('Speed must be 0.5-5.0');
```

### State Transitions

```
[Each Tick]
  ↓
tick += 1
if (tick >= 3600) {
  tick = 0
  day += 1
  if (day >= 90) {
    day = 0
    quarter += 1
    [Trigger Auto-Save]
    if (quarter > 4) {
      quarter = 1
      year += 1
      if (year > 2025) {
        [Trigger Game End]
      }
    }
  }
}
```

### Constants

```typescript
const TICKS_PER_DAY = 3600;
const DAYS_PER_QUARTER = 90;
const QUARTERS_PER_YEAR = 4;
const BASE_TICK_MS = 200; // 200ms per tick at speed 1.0
```

---

## Entity 4: MarketEvent

Represents market events that affect stock prices.

### Fields

| Field | Type | Description | Constraints | Default |
|-------|------|-------------|-------------|---------|
| `id` | number | Unique event identifier | Required, >0, unique | Auto-increment |
| `type` | EventType | Event category | Required, enum: Economic \| Political \| Natural \| Tech \| Social | - |
| `severity` | number | Impact magnitude | Required, 1-10, integer | 5 |
| `title` | string | Event headline | Required, 10-100 chars | - |
| `description` | string | Event details | Optional, max 500 chars | '' |
| `driftModifier` | number | Drift adjustment | Required, -1.0 to 1.0 | 0.0 |
| `volatilityModifier` | number | Volatility adjustment | Required, -1.0 to 1.0 | 0.0 |
| `duration` | number | Event duration (ticks) | Required, >0, max 3600 | 1800 |
| `ticksRemaining` | number | Countdown to expiry | Required, ≥0 | duration |
| `affectedSectors` | Array<Sector> | Sectors impacted | Optional, subset of Sector enum | [] |
| `affectedCompanies` | Array<ticker> | Specific companies | Optional | [] |

### Relationships

- **MarketEvent → Company**: Many-to-many via `affectedCompanies` and `affectedSectors`

### Validation Rules

```typescript
// Severity validation
if (severity < 1 || severity > 10) throw new Error('Severity must be 1-10');

// Modifier validation
if (driftModifier < -1.0 || driftModifier > 1.0) throw new Error('Drift modifier out of range');
if (volatilityModifier < -1.0 || volatilityModifier > 1.0) throw new Error('Volatility modifier out of range');

// Duration validation
if (duration <= 0) throw new Error('Duration must be positive');
if (ticksRemaining < 0) throw new Error('Ticks remaining cannot be negative');

// Mutual exclusivity (either sectors OR companies, not both)
if (affectedSectors.length > 0 && affectedCompanies.length > 0) {
  throw new Error('Event cannot affect both sectors and specific companies');
}
```

### State Transitions

```
[Event Spawned]
  ↓
ticksRemaining = duration
Apply modifiers to affected companies
  ↓ (Each Tick)
ticksRemaining -= 1
if (ticksRemaining <= 0) {
  Remove modifiers from companies
  Mark event as expired
  Remove from active events
}
```

---

## Entity 5: WindowState

Represents an open window in the window manager.

### Fields

| Field | Type | Description | Constraints | Default |
|-------|------|-------------|-------------|---------|
| `id` | number | Unique window instance ID | Required, >0, unique | Auto-increment |
| `type` | WindowType | Window category | Required, enum: trading \| chart \| portfolio \| office \| news \| ranking \| settings \| ending | - |
| `position` | {x, y} | Window position (pixels) | Required, x/y ≥0, integers | {x: 100, y: 100} |
| `size` | {width, height} | Window dimensions (pixels) | Required, width/height >0, integers | type.defaultSize |
| `zIndex` | number | Stacking order | Required, >0, integer | 1 |
| `isMinimized` | boolean | Minimized state | Required | false |
| `data` | any | Window-specific data | Optional, type-dependent | null |

### Relationships

- **WindowState**: Many instances per `WindowType` (can open multiple chart windows)
- **WindowManager → WindowState**: 1-to-many (manager owns all windows)

### Validation Rules

```typescript
// Position validation
if (position.x < 0 || position.y < 0) throw new Error('Position must be non-negative');
if (position.x > window.innerWidth - 50) throw new Error('Window off-screen horizontally');
if (position.y > window.innerHeight - 50) throw new Error('Window off-screen vertically');

// Size validation
const minSize = { width: 200, height: 150 };
const maxSize = { width: 1200, height: 900 };
if (size.width < minSize.width || size.height < minSize.height) throw new Error('Window too small');
if (size.width > maxSize.width || size.height > maxSize.height) throw new Error('Window too large');

// Z-index validation
if (zIndex < 1) throw new Error('Z-index must be positive');
```

### State Transitions

```
[Open Window]
  ↓
id = windowIdCounter++
zIndex = nextZIndex++
isMinimized = false
position = cascade(existing windows)
  ↓ (Focus Window)
zIndex = nextZIndex++
  ↓ (Minimize)
isMinimized = true
  ↓ (Restore)
isMinimized = false
zIndex = nextZIndex++
  ↓ (Close Window)
Remove from windows array
```

---

## Type Definitions

### Enums

```typescript
enum Sector {
  Tech = 'Tech',
  Finance = 'Finance',
  Energy = 'Energy',
  Consumer = 'Consumer',
  Healthcare = 'Healthcare'
}

enum WindowType {
  Trading = 'trading',
  Chart = 'chart',
  Portfolio = 'portfolio',
  Office = 'office',
  News = 'news',
  Ranking = 'ranking',
  Settings = 'settings',
  Ending = 'ending'
}

enum EventType {
  Economic = 'Economic',
  Political = 'Political',
  Natural = 'Natural',
  Tech = 'Tech',
  Social = 'Social'
}
```

### Supporting Types

```typescript
interface PricePoint {
  tick: number;
  price: number;
}

interface Employee {
  id: number;
  name: string;
  role: 'Analyst' | 'Trader' | 'Manager';
  salary: number;
  hiredTick: number;
}

interface Difficulty {
  name: 'Easy' | 'Normal' | 'Hard';
  startingCash: number;
  volatilityMultiplier: number;
  eventChance: number;
  salaryMultiplier: number;
}
```

---

## Entity Relationships Diagram

```
┌─────────────┐
│   GameTime  │ (Singleton)
└─────────────┘
       │
       ├─── drives tick progression
       │
       ▼
┌─────────────┐        ┌─────────────┐
│  Company    │◄──────►│ MarketEvent │
│             │        │             │
│ - ticker    │        │ - affects   │
│ - price     │        │   companies │
│ - drift     │        │   or sectors│
│ - volatility│        └─────────────┘
└─────────────┘
       ▲
       │ owns shares
       │
┌─────────────┐        ┌─────────────┐
│   Player    │        │ WindowState │
│             │        │             │
│ - cash      │        │ - position  │
│ - portfolio │        │ - zIndex    │
│ - employees │        │ - type      │
└─────────────┘        └─────────────┘
                              │
                              └─── managed by WindowManager
```

---

## Data Persistence Schema

### IndexedDB Table: `saves`

```typescript
interface SaveData {
  id?: number; // Auto-increment primary key
  timestamp: number; // Unix timestamp
  gameTime: GameTime;
  player: Player;
  companies: Company[];
  events: MarketEvent[];
  windows: WindowState[];
  version: string; // Schema version for migration
}
```

### Migration Strategy

```typescript
// Version 1 → Version 2 example
if (saveData.version === '1.0.0') {
  // Add new fields with defaults
  saveData.player.employeeStamina = 100;
  saveData.version = '2.0.0';
}
```

---

## Summary

**5 core entities** defined with complete schemas:
1. Company (20 instances)
2. Player (1 instance)
3. GameTime (1 instance)
4. MarketEvent (0-10 active instances)
5. WindowState (0-15 active instances)

**All entities validated** with business rules and state machines.

**Ready for Phase 1 contracts** (Zustand store actions).
