# 📈 Retro Stock OS

> A nostalgic Windows 95-style stock market trading game simulating 30 years of investment journey (1995-2025)

**Retro Stock OS** is a browser-based stock market simulation game that combines retro aesthetics with realistic
market dynamics. Built with modern web technologies, it delivers an authentic 90s computing experience while
simulating complex stock price movements using Geometric Brownian Motion (GBM).

## ✨ Features

### 🎮 Gameplay
- **30-Year Simulation**: Trade stocks from 1995 to 2025 across multiple market cycles
- **Real-Time Market**: Dynamic stock prices updated every tick with realistic volatility
- **Market Events**: Random events affect sectors and individual companies
- **Multiple Endings**: Achieve different endings based on your investment performance
- **Employee Management**: Hire employees with unique skills to boost your trading capabilities
- **Office System**: Upgrade your office to unlock advanced features and increase productivity

### 📊 Market Dynamics
- **20 Companies**: Diversified across 5 sectors (Tech, Finance, Energy, Consumer, Healthcare)
- **GBM Price Engine**: Realistic stock price movements using mathematical models
- **Market Events**: 50+ event templates with weighted probabilities
- **News System**: Breaking news alerts for major market events
- **Portfolio Tracking**: Real-time portfolio valuation and performance metrics

### 🎨 Retro Experience
- **Windows 95 UI**: Authentic retro window system with drag-and-drop support
- **CRT Effects**: Optional CRT scanline overlay for vintage feel
- **Stock Ticker**: Classic scrolling ticker tape display
- **Taskbar**: Familiar bottom taskbar with time and game controls
- **Multiple Windows**: Trading, charts, portfolio, office, news, and more

### 🎯 Difficulty Modes
- **Easy**: Higher starting capital, lower volatility, fewer events
- **Normal**: Balanced challenge for typical players
- **Hard**: Limited capital, high volatility, frequent market events

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/wecoms24/retro-stock-os.git
cd retro-stock-os

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Build for Production

```bash
# Type-check and build
npm run build

# Preview production build
npm run preview
```

## 🎲 How to Play

### Starting the Game

1. Launch the game and select your difficulty level
2. Choose to start a new game or load a saved game
3. Your initial capital and game parameters depend on difficulty

### Trading Basics

1. **Open Trading Window**: Click the Trading icon in the taskbar
2. **Select a Company**: Browse available stocks with current prices
3. **Buy/Sell**: Enter quantity and execute trades
4. **Monitor Portfolio**: Track your holdings in the Portfolio window

### Game Mechanics

- **Time System**: 3600 ticks = 1 game day, 30 days = 1 month
- **Speed Control**: Adjust game speed (1x, 2x, 4x) or pause
- **Auto-Save**: Game auto-saves every 300 ticks (~2.5 minutes at 1x speed)
- **Market Events**: Random events modify stock drift and volatility
- **Employee Stamina**: Drains monthly; manage carefully or upgrade office

### Winning Conditions

Achieve one of several endings based on your performance:

- **💰 Billionaire**: Reach total assets of 1 billion won
- **🏆 Legend**: Achieve 100x return on initial capital
- **😊 Happy Retirement**: Complete 30 years with positive assets
- **💪 Survivor**: Survive 30 years (even without profits)
- **💸 Bankrupt**: Run out of cash with no portfolio

## 🛠 Tech Stack

### Frontend
- **React 19**: Modern component-based UI
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool with HMR
- **TailwindCSS v4**: Utility-first styling

### State Management
- **Zustand**: Lightweight state management with minimal boilerplate

### Visualization
- **Chart.js**: Interactive stock price charts
- **react-chartjs-2**: React wrapper for Chart.js

### Game Engine
- **Web Worker**: Offloaded price calculations for smooth performance
- **GBM Algorithm**: Geometric Brownian Motion for realistic price simulation
- **Tick Engine**: 200ms base tick rate with speed multipliers

## 📁 Project Structure

```
src/
├── components/
│   ├── desktop/        # Desktop shell (StartScreen, StockTicker, Taskbar)
│   ├── windows/        # Window system (11 different window types)
│   ├── effects/        # Visual effects (CRT overlay, particles)
│   └── ui/             # Reusable UI components
├── stores/
│   └── gameStore.ts    # Central Zustand store for all game state
├── engines/
│   └── tickEngine.ts   # Game loop and time progression
├── workers/
│   └── priceEngine.worker.ts  # GBM price calculation worker
├── data/
│   ├── companies.ts    # Stock definitions
│   ├── events.ts       # Market event templates
│   ├── employees.ts    # Employee data
│   └── difficulty.ts   # Difficulty configurations
├── systems/
│   └── saveSystem.ts   # IndexedDB save/load system
└── types/
    └── index.ts        # TypeScript type definitions
```

## 🔧 Development

### Available Commands

```bash
# Start dev server with hot reload
npm run dev

# Type-check and build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, 100-char lines
- **ESLint**: Configured for React + TypeScript
- **File Naming**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)

### Architecture Patterns

- **Centralized State**: All state in single Zustand store
- **Performance-First**: Web Worker for CPU-intensive calculations
- **Type Safety**: Strict TypeScript with no `any` types
- **Component Organization**: Functional separation (desktop/windows/effects/ui)

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

## 🎨 Game Windows

The game features 11 different window types:

1. **Trading Window**: Buy and sell stocks
2. **Chart Window**: View price history with interactive charts
3. **Portfolio Window**: Monitor your holdings and performance
4. **Office Window**: Manage employees and office upgrades
5. **News Window**: Read breaking market news
6. **Ranking Window**: Compare your performance
7. **Settings Window**: Adjust game speed and preferences
8. **Isometric Office**: 3D visualization of your office
9. **Window Manager**: Handles all window rendering and z-index
10. **Ending Screen**: Game over summary and achievements
11. **Window Frame**: Reusable window chrome with drag/resize

## 🏗 Constitution & Principles

This project follows strict architectural principles defined in `.specify/memory/constitution.md`:

1. **Centralized State Management**: All state through Zustand (non-negotiable)
2. **Performance-First Architecture**: Worker offloading, memoization
3. **Type Safety**: Strict TypeScript, no `any` types
4. **Component Organization**: Clear functional separation
5. **Code Style Consistency**: Automated enforcement via Prettier/ESLint

## 🤝 Contributing

Contributions are welcome! Please ensure your changes:

1. Pass `npm run lint` without errors
2. Follow the project's TypeScript and code style guidelines
3. Align with constitutional principles in `.specify/memory/constitution.md`
4. Include appropriate type definitions
5. Update documentation for new features

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Wecoms.co.ltd

## 🙏 Acknowledgments

- Inspired by classic Windows 95 UI/UX
- GBM algorithm for realistic stock price simulation
- Chart.js for beautiful visualizations
- Zustand for elegant state management
- The retro computing community

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ and nostalgia for the 90s computing era**
