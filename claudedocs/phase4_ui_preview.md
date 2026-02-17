# Phase 4: Settings UI Visual Preview

## Settings Window Layout

```
┌──────────────────────────────────────┐
│        ⚙ 설정                        │
├──────────────────────────────────────┤
│                                      │
│ [게임 속도]                          │
│ [게임 정보]                          │
│ [사운드]                             │
│ [📈 자동 매도 (익절)]                │
│ [🎯 개인화 시스템]                   │
│                                      │
│ ╔══════════════════════════════════╗ │
│ ║  🗄️ 저장 시스템  (NEW)          ║ │
│ ╠══════════════════════════════════╣ │
│ ║                                  ║ │
│ ║  SQLite 사용:              [ON] ║ │  ← RetroButton (win-pressed when ON)
│ ║  더 빠른 저장/로드를 위한      ║ │
│ ║  새로운 시스템 (베타)           ║ │
│ ║  ──────────────────────────      ║ │
│ ║  현재 백엔드:         SQLite    ║ │  ← Real-time detection
│ ║  마이그레이션:        ✅ 완료   ║ │  ← Migration status
│ ║                                  ║ │
│ ║  ┌────────────────────────────┐ ║ │
│ ║  │ ⚠️ 새로고침 필요           │ ║ │  ← Yellow warning banner
│ ║  │ 변경사항을 적용하려면      │ ║ │     (only when needsReload)
│ ║  │ 페이지를 새로고침하세요.   │ ║ │
│ ║  │                            │ ║ │
│ ║  │  [🔄 새로고침]            │ ║ │  ← Auto-reload button
│ ║  └────────────────────────────┘ ║ │
│ ║                                  ║ │
│ ║  ──────────────────────────      ║ │  ← Dev tools separator
│ ║  개발자 도구                    ║ │     (import.meta.env.DEV only)
│ ║  [🔧 마이그레이션 초기화]      ║ │  ← Danger button (red)
│ ║                                  ║ │
│ ╚══════════════════════════════════╝ │
│                                      │
│ [새 게임]                            │
│                                      │
│ Retro Stock-OS 95 v0.1.0            │
│ (c) 2026 Wecoms.co.ltd              │
└──────────────────────────────────────┘
```

## UI States

### State 1: SQLite OFF (Default)
```
┌─ 🗄️ 저장 시스템 ────────────┐
│ SQLite 사용:         [OFF] │  ← Not win-pressed
│ 더 빠른 저장/로드를 위한   │
│ 새로운 시스템 (베타)        │
│ ─────────────────────────── │
│ 현재 백엔드:    IndexedDB  │
│                             │
└─────────────────────────────┘
```

### State 2: SQLite ON + Migration Pending
```
┌─ 🗄️ 저장 시스템 ────────────┐
│ SQLite 사용:          [ON] │  ← win-pressed
│ 더 빠른 저장/로드를 위한   │
│ 새로운 시스템 (베타)        │
│ ─────────────────────────── │
│ 현재 백엔드:       SQLite  │
│ 마이그레이션:    ⏳ 대기 중│
│                             │
└─────────────────────────────┘
```

### State 3: SQLite ON + Migration Complete
```
┌─ 🗄️ 저장 시스템 ────────────┐
│ SQLite 사용:          [ON] │  ← win-pressed
│ 더 빠른 저장/로드를 위한   │
│ 새로운 시스템 (베타)        │
│ ─────────────────────────── │
│ 현재 백엔드:       SQLite  │
│ 마이그레이션:      ✅ 완료 │
│                             │
└─────────────────────────────┘
```

### State 4: Toggle Changed (Reload Needed)
```
┌─ 🗄️ 저장 시스템 ────────────┐
│ SQLite 사용:         [OFF] │
│ 더 빠른 저장/로드를 위한   │
│ 새로운 시스템 (베타)        │
│ ─────────────────────────── │
│ 현재 백엔드:       SQLite  │  ← Backend hasn't changed yet
│                             │
│ ┌───────────────────────┐   │
│ │ ⚠️ 새로고침 필요      │   │  ← Yellow warning
│ │ 변경사항을 적용하려면 │   │
│ │ 페이지를 새로고침하세요│   │
│ │                       │   │
│ │  [🔄 새로고침]       │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

### State 5: Development Mode (Dev Tools Visible)
```
┌─ 🗄️ 저장 시스템 ────────────┐
│ SQLite 사용:          [ON] │
│ 더 빠른 저장/로드를 위한   │
│ 새로운 시스템 (베타)        │
│ ─────────────────────────── │
│ 현재 백엔드:       SQLite  │
│ 마이그레이션:      ✅ 완료 │
│ ─────────────────────────── │
│ 개발자 도구                 │
│ [🔧 마이그레이션 초기화]   │  ← Red danger button
└─────────────────────────────┘
```

## CSS Classes Used

### Container
```tsx
<div className="space-y-1">          // Outer container
  <div className="font-bold">        // Section header
  <div className="win-inset bg-white p-2 space-y-1">  // Retro inset panel
```

### Toggle Section
```tsx
<div className="flex items-center justify-between">  // Toggle row
  <span className="text-retro-gray">                 // Label
  <RetroButton 
    size="sm" 
    className={sqliteEnabled ? 'win-pressed' : ''}   // Pressed state
  >
```

### Status Display
```tsx
<div className="text-[10px] space-y-0.5 mt-1 border-t border-retro-gray/30 pt-1">
  <div className="flex justify-between">           // Status row
```

### Warning Banner
```tsx
<div className="text-[10px] bg-yellow-100 border border-yellow-400 p-1 mt-1 space-y-1">
  <div className="font-bold">                      // Warning title
  <div className="text-retro-gray">                // Warning message
  <RetroButton size="sm" className="w-full">       // Full-width button
```

### Developer Tools
```tsx
<div className="text-[10px] border-t border-retro-gray/30 pt-1 mt-1">
  <div className="text-retro-gray mb-0.5">         // Dev tools label
  <RetroButton size="sm" variant="danger" className="w-full">  // Danger button
```

## Color Palette
- **Inset Background**: `bg-white`
- **Labels**: `text-retro-gray` (#808080-ish)
- **Borders**: `border-retro-gray/30` (30% opacity)
- **Warning Background**: `bg-yellow-100` (#FEF3C7)
- **Warning Border**: `border-yellow-400` (#FACC15)
- **Button Accent**: `#000080` (Windows 95 blue)

## Interactive Elements

### SQLite Toggle Button
- **Default**: Gray background
- **Pressed**: `win-pressed` class (darker/inset appearance)
- **Sound**: `soundManager.playClick()` on click

### Reload Button
- **Trigger**: Appears when `needsReload === true`
- **Action**: `window.location.reload()`
- **Style**: Full-width, standard RetroButton

### Reset Migration Button
- **Visibility**: `import.meta.env.DEV` only
- **Variant**: `danger` (red/warning style)
- **Confirmation**: `confirm()` dialog before execution
- **Alert**: Success message after reset

## Responsive Behavior

All elements follow existing SettingsWindow patterns:
- Text size: `text-xs` (12px) for container, `text-[10px]` for details
- Spacing: Consistent `space-y-1` and `space-y-3`
- Button size: `size="sm"` for all RetroButtons
- Width: Buttons adapt with `w-full` for warnings, auto-width for toggles

## Accessibility Considerations

- Clear labels with descriptive text
- Visual status indicators (✅, ⏳)
- Warning colors match standard conventions
- Button states clearly visible
- Confirmation dialogs for destructive actions
- Sound feedback on interactions

---

**Design Language**: Windows 95 retro aesthetic
**Component Library**: Custom RetroButton + TailwindCSS
**Responsive**: Follows existing Settings window patterns
