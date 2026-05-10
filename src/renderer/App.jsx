import { useEffect, useRef, useState } from 'react'
import { AddServerModal } from './components/add-server-modal.jsx'
import { CommandPalette, FloatingNav, StatusBar, TitleBar } from './components/chrome.jsx'
import { Composer } from './components/composer.jsx'
import { Dashboard } from './components/dashboard.jsx'
import { ExecutionConsole } from './components/execution-console.jsx'
import { HistoryView, SettingsView } from './components/history-settings.jsx'
import { useLocalAppModel } from './lib/local-model.js'

export default function App() {
  const { model, addServer, updateServer, removeServer, recordHistory, updateHistory, updateSettings } = useLocalAppModel()
  const { servers, history, settings } = model
  const [theme, setTheme] = useState(settings.theme)
  const [view, setView] = useState('dashboard')
  const [selected, setSelected] = useState(['web-01', 'web-02', 'web-03', 'stg-web'])
  const [command, setCommand] = useState('docker compose up -d')
  const [running, setRunning] = useState(false)
  const [executionPlan, setExecutionPlan] = useState(null)
  const [activeHistoryId, setActiveHistoryId] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [addServerOpen, setAddServerOpen] = useState(false)
  const [bridgeLabel, setBridgeLabel] = useState('browser preview')
  const rerunTimerRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (settings.theme !== theme) updateSettings({ theme })
  }, [theme])

  useEffect(() => {
    setTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    let cancelled = false

    async function checkBridge() {
      try {
        const result = await window.api?.health?.()
        if (!cancelled && result?.ok) setBridgeLabel(`${result.app} bridge ready`)
      } catch {
        if (!cancelled) setBridgeLabel('browser preview')
      }
    }

    checkBridge()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    return () => clearTimeout(rerunTimerRef.current)
  }, [])

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')
  async function requestExecutionPlan(nextCommand) {
    try {
      const plan = await window.api?.execution?.runCommand?.({ command: nextCommand, targetIds: selected })
      if (plan) setExecutionPlan(plan)
    } catch {
      setExecutionPlan(null)
    }
  }

  const executeCommand = (nextCommand) => {
    if (!selected.length) return
    setCommand(nextCommand)
    setExecutionPlan(null)
    setRunning(true)
    setView('console')
    const historyEntry = recordHistory({
      command: nextCommand,
      targetIds: selected,
      status: 'queued',
      duration: 'simulated'
    })
    setActiveHistoryId(historyEntry.id)
    requestExecutionPlan(nextCommand)
  }

  return (
    <div className="sentinel-shell">
      <TitleBar theme={theme} onToggleTheme={toggleTheme} />
      <div className="workspace">
        <FloatingNav
          view={view}
          setView={setView}
          selectedCount={selected.length}
          onAddServer={() => setAddServerOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="renderer-stage">
          {view === 'dashboard' ? <Dashboard servers={servers} recentCommands={history} selected={selected} setSelected={setSelected} onOpenTerminal={(id) => { setSelected([id]); setView('compose') }} onCompose={() => setView('compose')} onUpdateServer={updateServer} onRemoveServer={(id) => {
            removeServer(id)
            setSelected((current) => current.filter((item) => item !== id))
          }} /> : null}
          {view === 'compose' ? <Composer servers={servers} selected={selected} settings={settings} onCancel={() => setView('dashboard')} onExecute={executeCommand} /> : null}
          {view === 'console' ? <ExecutionConsole servers={servers} selected={selected} running={running} command={command} executionPlan={executionPlan} captureOutput={settings.data.outputLogs === 'on'} onCancel={() => setRunning(false)} onComplete={({ status, outputLogs }) => {
            if (activeHistoryId) updateHistory(activeHistoryId, { status, duration: status === 'cancelled' ? 'cancelled' : 'completed', ...(settings.data.outputLogs === 'on' && outputLogs ? { outputLogs } : {}) })
          }} onBack={() => setView('compose')} onRerun={() => {
            clearTimeout(rerunTimerRef.current)
            setExecutionPlan(null)
            setRunning(false)
            rerunTimerRef.current = setTimeout(() => {
              setRunning(true)
              requestExecutionPlan(command)
            }, 30)
          }} /> : null}
          {view === 'history' ? <HistoryView history={history} /> : null}
          {view === 'settings' ? <SettingsView settings={settings} theme={theme} onToggleTheme={toggleTheme} onUpdateSettings={updateSettings} /> : null}
        </main>
      </div>
      <StatusBar showPalette hostCount={servers.length} />
      <span className="bridge-label mono">{bridgeLabel}</span>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNav={setView}
        onRunCommand={(action) => {
          if (action === 'compose') setView('compose')
          if (action === 'theme') toggleTheme()
          if (action === 'add-server') setAddServerOpen(true)
        }}
      />
      <AddServerModal open={addServerOpen} onClose={() => setAddServerOpen(false)} onAdd={addServer} />
    </div>
  )
}
