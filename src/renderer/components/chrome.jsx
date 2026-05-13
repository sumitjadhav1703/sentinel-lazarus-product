import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { IconArrowRight, IconGrid, IconHistory, IconMoon, IconPlus, IconSearch, IconServer, IconSettings, IconSun } from './icons.jsx'

export function TitleBar({ theme, onToggleTheme }) {
  return (
    <header className="title-bar">
      <div className="window-dots"><span /><span /><span /></div>
      <div className="mono title-copy">lazarus-sentinel · <b>miriam@workspace</b></div>
      <button className="icon-button" onClick={onToggleTheme} title="Toggle theme">{theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}</button>
    </header>
  )
}

export function FloatingNav({ view, setView, selectedCount, onAddServer, theme, onToggleTheme }) {
  const items = [
    { id: 'dashboard', label: 'Servers', icon: IconServer },
    { id: 'console', label: 'Console', icon: IconGrid, badge: selectedCount || null },
    { id: 'history', label: 'History', icon: IconHistory },
    { id: 'settings', label: 'Settings', icon: IconSettings }
  ]

  return (
    <nav className="floating-nav" aria-label="Primary">
      <div className="nav-wordmark"><span>L</span><b>Lazarus Sentinel</b></div>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
            <Icon size={14} /> {item.label}
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </button>
        )
      })}
      <i />
      <button className="round" onClick={onAddServer} title="Add server"><IconPlus size={14} /></button>
      <button className="round" onClick={onToggleTheme} title="Toggle theme">{theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}</button>
    </nav>
  )
}

export function StatusBar({ showPalette, hostCount = 0 }) {
  return (
    <footer className="status-bar mono">
      <span>connected · {hostCount} hosts</span>
      <span className="accent">safety: enabled</span>
      <span>session: miriam@lazarus</span>
      <span className="status-spacer" />
      {showPalette ? <span>Cmd+K palette</span> : null}
      <span>v0.4.2</span>
    </footer>
  )
}

export function EnvChip({ env }) {
  return <span className={`chip chip-${env}`}><span className="dot" />{env}</span>
}

export function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}><span />{status === 'fail' ? 'failed' : status}</span>
}

const COMMAND_ACTIONS = [
  { label: 'Go to Servers', kind: 'nav', nav: 'dashboard', lowerLabel: 'go to servers' },
  { label: 'Go to Execution Console', kind: 'nav', nav: 'console', lowerLabel: 'go to execution console' },
  { label: 'Go to History', kind: 'nav', nav: 'history', lowerLabel: 'go to history' },
  { label: 'Go to Settings', kind: 'nav', nav: 'settings', lowerLabel: 'go to settings' },
  { label: 'New multi-server command', kind: 'action', run: 'compose', lowerLabel: 'new multi-server command' },
  { label: 'Add server', kind: 'action', run: 'add-server', lowerLabel: 'add server' },
  { label: 'Toggle theme', kind: 'action', run: 'theme', lowerLabel: 'toggle theme' }
]

export function CommandPalette({ open, onClose, onNav, onRunCommand }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const id = setTimeout(() => inputRef.current?.focus(), 20)
    return () => clearTimeout(id)
  }, [open])

  if (!open) return null

  const lowerQuery = query.toLowerCase()
  const actions = COMMAND_ACTIONS.filter((action) => action.lowerLabel.includes(lowerQuery))

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <section className="palette" onClick={(event) => event.stopPropagation()}>
        <label className="palette-search">
          <IconSearch size={16} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands, servers, runbooks..." />
          <span className="kbd">esc</span>
        </label>
        <div className="palette-list">
          {actions.map((action) => (
            <button key={action.label} onClick={() => {
              action.kind === 'nav' ? onNav(action.nav) : onRunCommand(action.run)
              onClose()
            }}>
              <IconArrowRight size={13} />
              <span>{action.label}</span>
              <b>{action.kind}</b>
            </button>
          ))}
          {actions.length === 0 ? <p>No matches</p> : null}
        </div>
      </section>
    </div>
  )
}
