# Lazarus Sentinel — Development Document

## Overview

Lazarus Sentinel is a desktop-first multi-server safety terminal. It lets DevOps engineers select groups of servers, compose commands, preview them, detect destructive patterns, and stream execution output across a grid of live terminals — all in a single app.

---

## Problem

- Multiple SSH sessions are hard to track
- Easy to run commands on the wrong environment (prod vs staging)
- No unified view of outputs across servers
- No safety layer before destructive commands execute

---

## Solution

Safety-first terminal with:
- Environment-aware server management (color-coded PROD / STAGING / DEV)
- Multi-server command execution with preview
- Real-time execution console (grid of live terminals)
- Risk detection before execution
- Local-first: credentials never leave the machine

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 41 |
| Build system | electron-vite |
| UI framework | React 18 |
| Terminal emulator | xterm.js 5 + FitAddon |
| Local terminal | node-pty |
| Remote terminal | ssh2 |
| History storage | better-sqlite3 |
| Server config | electron-store |
| Fonts | Inter · Source Serif 4 · JetBrains Mono |

---

## Design System

**Palette (Claude-inspired warm)**

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | `#F5F1EB` | `#1A1815` | App background |
| `--surface` | `#FBF8F3` | `#211E1A` | Cards, panels |
| `--coral` | `#D97757` | `#E88A6E` | Primary accent, active states |
| `--prod` | `#C65D3F` | `#E88A6E` | Production environment |
| `--staging` | `#B89357` | `#D4B37C` | Staging environment |
| `--dev` | `#6F8463` | `#9DB38E` | Dev environment |
| `--fg` | `#1E1B18` | `#EDE6DA` | Primary text |
| `--fg-muted` | `#6B655D` | `#9E978A` | Secondary text |

**Typography**
- Display / headings: `Source Serif 4` (`.serif`)
- Terminal / data: `JetBrains Mono` (`.mono`)
- UI chrome: `Inter`

---

## Architecture

```
C:\Lazarus sentinel\
├── src/
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.js            # Window creation, IPC registration
│   │   ├── ipc.js              # All IPC handler registration
│   │   ├── pty.js              # node-pty local terminal sessions
│   │   ├── ssh.js              # ssh2 remote terminal sessions
│   │   ├── db.js               # better-sqlite3: history schema + queries
│   │   └── store.js            # electron-store: server config
│   ├── preload/
│   │   └── index.js            # contextBridge → window.api
│   └── renderer/               # React app (browser context)
│       ├── index.html
│       └── src/
│           ├── main.jsx         # ReactDOM entry
│           ├── App.jsx          # Root: state, routing, shortcuts
│           ├── styles.css       # Design tokens + utilities
│           ├── data.js          # assessRisk(), scriptFor(), default servers
│           └── components/
│               ├── icons.jsx    # SVG icon set
│               ├── chrome.jsx   # TitleBar, FloatingNav, StatusBar, CommandPalette
│               ├── dashboard.jsx
│               ├── composer.jsx
│               ├── console.jsx
│               ├── terminal.jsx
│               ├── add_server.jsx
│               ├── tweaks.jsx
│               ├── history.jsx
│               └── settings.jsx
├── electron.vite.config.js
└── package.json
```

### IPC Surface (`window.api`)

```js
// Servers
getServers()                    → Server[]
addServer(srv)                  → Server[]
removeServer(id)                → Server[]

// Terminals
createTerminal({ type, id, host, port, user, ... })  → id
termWrite(id, data)
termResize(id, cols, rows)
termClose(id)
onTermData(cb)                  → unsubscribe fn

// History
getHistory()                    → HistoryEntry[]
addHistory({ cmd, scope, status, duration })

// SSH
testConnection(cfg)             → { ok, msg? }
```

---

## Features

### 1. Dashboard (Servers View)
- Filterable table: search + env filter (ALL / PROD / STAGING / DEV)
- Multi-select with coral left-bar accent + tint highlight
- Per-server: host, env chip, region, user, uptime, load bar
- Quick terminal launch per row
- "Run command" CTA appears when ≥1 server selected

### 2. Composer
- Command input with live risk inspector
- Border color: grey (safe) → sand (caution) → coral-red (danger)
- Inline risk banner lists specific pattern matches
- `rm -rf` on prod servers → typed confirmation (`confirm N prod`)
- Risk style variants: inline / modal / countdown-hold (configurable via Tweaks)
- Command suggestions strip
- Preview pane shows `user@host $` for each target

### 3. Execution Console
- Grid of TerminalTile: 3×3 / 2×3 / 1×6 (configurable)
- Each tile: env-colored top strip, env chip, hostname, live status dot
- Streaming output: command (coral) / stdout / stderr (red) / success (sage)
- Running / ok / failed counters with pulse animation
- Rerun button

### 4. Add Server Modal
- Overlay: `rgba` dim + backdrop-blur
- Env segment: Dev / Staging / Prod (colored accent rule at modal top)
- Connection: alias, host, port, user, region
- Auth: SSH key / ssh-agent / password
- Inline SSH test probe
- Tags (optional)
- Production warning banner

### 5. History
- SQLite-backed command log
- Columns: command, scope, status, duration, timestamp
- Privacy: output logging off by default

### 6. Settings
- Safety rules toggle (rm -rf guard, mkfs/dd guard, etc.)
- SSH key management
- Data retention controls

### 7. Tweaks Panel
- Theme: light / dark
- Grid density: 3×3 / 2×3 / 1×6
- Risk warning style: inline / modal / countdown-hold
- Command palette: on / off

### 8. Command Palette (⌘K)
- Fuzzy search over nav actions + server commands
- Navigate to any view
- Trigger Add Server, toggle theme

### 9. Floating Navbar
- Bottom-center pill, glass blur
- Wordmark left, nav items center, Add + theme toggle right
- Active item: coral pill
- Badge on Console item showing selected server count

---

## Views & Navigation

```
Dashboard (default)
    ↓ select servers → Run command
Composer
    ↓ execute
ExecutionConsole
    ↓ back
Composer

Floating navbar → Dashboard | Console | History | Settings
⌘K → any view | add server | toggle theme
+ button → AddServerModal
```

---

## Data Models

```ts
interface Server {
  id:         string   // alias, e.g. "web-01"
  host:       string   // "web-01.prod.lzrs.io"
  port:       string   // "22"
  user:       string   // "deploy"
  env:        "prod" | "staging" | "dev"
  region:     string
  authMethod: "key" | "agent" | "password"
  keyPath?:   string
  password?:  string
  tags?:      string
  uptime?:    string
  load?:      number
}

interface HistoryEntry {
  id:        number
  cmd:       string
  scope:     string   // "4 servers"
  status:    "ok" | "fail"
  duration:  number   // seconds
  ts:        string   // ISO or relative
}

interface Tweaks {
  theme:       "light" | "dark"
  gridLayout:  "3x3" | "2x3" | "1x6"
  riskStyle:   "inline" | "modal" | "countdown"
  showPalette: boolean
}

interface RiskResult {
  level:   "safe" | "caution" | "danger"
  reasons: string[]
}
```

---

## Risk Detection Patterns

| Pattern | Severity |
|---------|---------|
| `rm -rf` | danger |
| `mkfs`, `dd if=` | danger |
| `DROP TABLE/DATABASE` | danger |
| Fork bomb `:(){ ... }` | danger |
| `shutdown`, `reboot`, `halt`, `poweroff` | danger |
| `systemctl stop/restart/disable` | caution |
| `chmod 777` | caution |
| `kill -9`, `killall -9` | caution |
| `truncate` | caution |
| `git push --force` | caution |

Danger + prod targets → typed confirmation required: `confirm N prod`

---

## Implementation Plan (12 Tasks)

| # | Task | Status |
|---|------|--------|
| 1 | Project scaffold (package.json, electron-vite, entry files) | pending |
| 2 | Design system CSS (tokens, utilities, animations) | pending |
| 3 | Data layer (data.js, db.js, store.js) | pending |
| 4 | IPC handlers (ipc.js, pty.js, ssh.js) | pending |
| 5 | Icons & chrome (icons.jsx, chrome.jsx) | pending |
| 6 | Dashboard view | pending |
| 7 | Composer view | pending |
| 8 | TerminalTile & ExecutionConsole | pending |
| 9 | AddServer modal | pending |
| 10 | History, Settings & Tweaks views | pending |
| 11 | App root wiring (App.jsx) | pending |
| 12 | Verification & end-to-end test | pending |

Full step-by-step plan: `.claude/plans/fetch-this-design-file-immutable-stearns.md`

---

## Development Setup

```bash
# Install dependencies
npm install

# Dev mode (Electron + Vite HMR)
npm run dev

# Production build
npm run build
```

**Requirements:** Node.js 20+, npm 10+

**Windows note:** node-pty requires `windows-build-tools` or Visual Studio Build Tools for native compilation.

---

## Security Principles

- Credentials stored locally via electron-store (never transmitted)
- SSH keys read from filesystem, never stored in plaintext in DB
- Command history stored in SQLite at `%APPDATA%/lazarus-sentinel/history.db`
- Output logging off by default
- Secrets masked in history display
- Production hosts require second confirmation for destructive commands

---

## Future Roadmap

- [ ] xterm.js full interactive terminal (replace simulated tiles)
- [ ] Runbook library (saved command sequences)
- [ ] Server groups / tags filtering
- [ ] Jump host / bastion support
- [ ] Output search & grep
- [ ] Notifications on command completion
- [ ] Export history as CSV / JSON
- [ ] Plugin system for custom risk rules
