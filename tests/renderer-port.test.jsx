/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { xtermInstances } = vi.hoisted(() => ({ xtermInstances: [] }))

vi.mock('xterm', () => ({
  Terminal: class FakeTerminal {
    constructor(options) {
      this.options = options
      this.writes = []
      xtermInstances.push(this)
    }

    loadAddon(addon) {
      this.addon = addon
      addon.activate?.(this)
    }

    open(element) {
      this.element = element
      element.dataset.xtermOpen = 'true'
    }

    write(data) {
      this.writes.push(data)
      if (this.element) {
        const span = document.createElement('span')
        span.textContent = data
        this.element.appendChild(span)
      }
    }

    dispose() {
      this.disposed = true
    }
  }
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class FakeFitAddon {
    activate(terminal) {
      this.terminal = terminal
    }

    fit() {
      this.fitted = true
      this.terminal.cols = 132
      this.terminal.rows = 36
    }
  }
}))

import App from '../src/renderer/App.jsx'
import { AddServerModal } from '../src/renderer/components/add-server-modal.jsx'
import { Composer } from '../src/renderer/components/composer.jsx'
import { Dashboard } from '../src/renderer/components/dashboard.jsx'
import { ExecutionConsole } from '../src/renderer/components/execution-console.jsx'
import { SettingsView } from '../src/renderer/components/history-settings.jsx'
import { TerminalTile } from '../src/renderer/components/terminal-tile.jsx'
import {
  SERVERS,
  assessRisk,
  getRequiredConfirmationPhrase,
  isConfirmationPhraseValid
} from '../src/renderer/lib/data.js'

const prodTargets = SERVERS.filter((server) => server.env === 'prod').slice(0, 2)
const mixedTargets = SERVERS.filter((server) => ['prod', 'staging'].includes(server.env)).slice(0, 3)

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.className = ''
  xtermInstances.length = 0
  if (typeof window.localStorage?.clear === 'function') window.localStorage.clear()
  delete window.api
})

async function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('renderer port helpers', () => {
  it('marks destructive production commands as dangerous with production context', () => {
    const risk = assessRisk('rm -rf /var/log/*', prodTargets)

    expect(risk.level).toBe('danger')
    expect(risk.reasons).toContain('Target set includes production hosts')
    expect(risk.reasons).toContain('Recursive delete (rm -rf)')
  })

  it('marks service-changing commands as caution without requiring danger confirmation', () => {
    const risk = assessRisk('systemctl restart nginx', mixedTargets)

    expect(risk.level).toBe('caution')
    expect(risk.reasons).toContain('Service state change')
    expect(getRequiredConfirmationPhrase(risk, mixedTargets)).toBeNull()
  })

  it('requires the exact production confirmation phrase for dangerous prod commands', () => {
    const risk = assessRisk('rm -rf /srv/app', prodTargets)
    const phrase = getRequiredConfirmationPhrase(risk, prodTargets)

    expect(phrase).toBe('confirm 2 prod')
    expect(isConfirmationPhraseValid('confirm 2 prod', phrase)).toBe(true)
    expect(isConfirmationPhraseValid('confirm two prod', phrase)).toBe(false)
  })

  it('honors disabled safety rules when assessing command risk', () => {
    const risk = assessRisk('rm -rf /srv/app', prodTargets, {
      safetyRules: {
        rmRfGuard: false,
        diskGuard: true,
        serviceWarnings: true,
        forcePushWarnings: true
      }
    })

    expect(risk).toEqual({ level: 'safe', reasons: [] })
  })
})

describe('ported renderer app', () => {
  it('renders the primary Lazarus Sentinel UI without the preload bridge', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    await act(async () => {
      createRoot(host).render(<App />)
    })

    expect(host.textContent).toContain('Lazarus Sentinel')
    expect(host.textContent).toContain('Servers')
    expect(host.textContent).toContain('Run command')
    expect(host.textContent).toContain('safety: enabled')
    expect(host.textContent).not.toContain('Electron bridge unavailable')
  })

  it('does not show direct console navigation as running before execution starts', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    await act(async () => {
      createRoot(host).render(
        <ExecutionConsole
          servers={SERVERS}
          selected={['web-01', 'web-02']}
          running={false}
          command="docker compose up -d"
          onBack={() => {}}
          onRerun={() => {}}
        />
      )
    })

    expect(host.textContent).toContain('running 0')
    expect(host.textContent).toContain('idle')
    expect(host.textContent).not.toContain('succeeded')
  })

  it('can render terminal output from an execution plan returned by the bridge', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    await act(async () => {
      createRoot(host).render(
        <ExecutionConsole
          servers={SERVERS}
          selected={['web-01']}
          running
          command="uptime"
          executionPlan={{
            id: 'run-1',
            targets: [{
              serverId: 'web-01',
              status: 'ok',
              script: [
                { delay: 1, line: '$ uptime', stream: 'cmd' },
                { delay: 1, line: 'ok from execution bridge', stream: 'ok', status: 'ok' }
              ]
            }]
          }}
          onBack={() => {}}
          onRerun={() => {}}
        />
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(host.textContent).toContain('ok from execution bridge')
    expect(host.textContent).toContain('succeeded')
  })

  it('reports console completion when all selected targets finish', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onComplete = vi.fn()

    await act(async () => {
      createRoot(host).render(
        <ExecutionConsole
          servers={SERVERS}
          selected={['web-01']}
          running
          command="uptime"
          executionPlan={{
            id: 'run-1',
            targets: [{
              serverId: 'web-01',
              status: 'ok',
              script: [
                { delay: 1, line: '$ uptime', stream: 'cmd' },
                { delay: 1, line: 'ok', stream: 'ok', status: 'ok' }
              ]
            }]
          }}
          onBack={() => {}}
          onRerun={() => {}}
          onComplete={onComplete}
        />
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(onComplete).toHaveBeenCalledWith({ status: 'ok', ok: 1, fail: 0 })
  })

  it('includes terminal output logs on completion only when capture is enabled', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onComplete = vi.fn()

    await act(async () => {
      createRoot(host).render(
        <ExecutionConsole
          servers={SERVERS}
          selected={['web-01']}
          running
          command="uptime"
          captureOutput
          executionPlan={{
            id: 'run-logs',
            targets: [{
              serverId: 'web-01',
              status: 'ok',
              script: [
                { delay: 1, line: '$ uptime', stream: 'cmd' },
                { delay: 1, line: 'load average: 1.20', stream: 'ok', status: 'ok' }
              ]
            }]
          }}
          onBack={() => {}}
          onRerun={() => {}}
          onComplete={onComplete}
        />
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ok',
      outputLogs: { 'web-01': ['$ uptime\r\n', 'load average: 1.20\r\n'] }
    }))
  })

  it('cancels running terminal sessions from the execution console', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onCancel = vi.fn()
    const onComplete = vi.fn()
    window.api = {
      terminal: {
        createLocal: vi.fn().mockResolvedValue({ id: 'term-cancel', type: 'local' }),
        write: vi.fn().mockResolvedValue(undefined),
        resize: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        onEvent: vi.fn(() => vi.fn())
      }
    }

    await act(async () => {
      createRoot(host).render(
        <ExecutionConsole
          servers={SERVERS}
          selected={['local']}
          running
          command="tail -f /var/log/syslog"
          executionPlan={{ id: 'run-cancel', targets: [{ serverId: 'local', mode: 'local', executionAvailable: true }] }}
          onBack={() => {}}
          onRerun={() => {}}
          onCancel={onCancel}
          onComplete={onComplete}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      host.querySelector('[aria-label="Stop execution"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(window.api.terminal.close).toHaveBeenCalledWith('term-cancel')
    expect(host.textContent).toContain('cancelled')
    expect(onCancel).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith({ status: 'cancelled', ok: 0, fail: 0, cancelled: 1 })
  })

  it('exposes editable safety and data settings controls', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onToggleTheme = vi.fn()
    const onUpdateSettings = vi.fn()
    const settings = {
      safetyRules: {
        rmRfGuard: true,
        diskGuard: true,
        serviceWarnings: false,
        forcePushWarnings: true
      },
      keys: [{ path: '~/.ssh/id_ed25519', scope: 'prod' }],
      data: {
        commandHistory: 'local-only',
        outputLogs: 'off'
      },
      historyRetentionDays: 30,
      maskSecrets: true
    }

    await act(async () => {
      createRoot(host).render(
        <SettingsView
          settings={settings}
          theme="light"
          onToggleTheme={onToggleTheme}
          onUpdateSettings={onUpdateSettings}
        />
      )
    })

    await act(async () => {
      host.querySelector('[aria-label="Toggle rm -rf guard"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      host.querySelector('[aria-label="Toggle output logs"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await setInputValue(host.querySelector('[aria-label="Retention days"]'), '14')
    })

    expect(onUpdateSettings).toHaveBeenCalledWith({ safetyRules: { rmRfGuard: false } })
    expect(onUpdateSettings).toHaveBeenCalledWith({ data: { outputLogs: 'on' } })
    expect(onUpdateSettings).toHaveBeenCalledWith({ historyRetentionDays: 14 })
    expect(host.textContent).toContain('~/.ssh/id_ed25519')
  })

  it('opens a server detail panel and submits edit or delete actions', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onUpdateServer = vi.fn()
    const onRemoveServer = vi.fn()

    await act(async () => {
      createRoot(host).render(
        <Dashboard
          servers={SERVERS}
          recentCommands={[]}
          selected={[]}
          setSelected={() => {}}
          onOpenTerminal={() => {}}
          onCompose={() => {}}
          onUpdateServer={onUpdateServer}
          onRemoveServer={onRemoveServer}
        />
      )
    })

    await act(async () => {
      host.querySelector('[aria-label="Details for web-01"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await setInputValue(host.querySelector('[aria-label="Server host"]'), 'web-01.internal')
    await act(async () => {
      host.querySelector('[aria-label="Save server"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      host.querySelector('[aria-label="Remove server"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onUpdateServer).toHaveBeenCalledWith('web-01', expect.objectContaining({ host: 'web-01.internal' }))
    expect(onRemoveServer).toHaveBeenCalledWith('web-01')
  })

  it('uses the local terminal bridge for local execution targets', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let emitTerminalEvent
    const onStatus = vi.fn()
    window.api = {
      terminal: {
        createLocal: vi.fn().mockResolvedValue({ id: 'term-1', type: 'local' }),
        write: vi.fn().mockResolvedValue(undefined),
        resize: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        onEvent: vi.fn((callback) => {
          emitTerminalEvent = callback
          return vi.fn()
        })
      }
    }

    await act(async () => {
      createRoot(host).render(
        <TerminalTile
          server={{ id: 'local', host: 'localhost', env: 'dev', user: 'miriam' }}
          command="pwd"
          running
          executionTarget={{ serverId: 'local', mode: 'local', executionAvailable: true }}
          onStatus={onStatus}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      emitTerminalEvent({ sessionId: 'term-1', type: 'data', data: '/Users/sumitjadhav/Proj\r\n' })
      emitTerminalEvent({ sessionId: 'term-1', type: 'exit', exitCode: 0 })
    })

    expect(window.api.terminal.createLocal).toHaveBeenCalledWith({ cols: 100, rows: 28 })
    expect(window.api.terminal.write).toHaveBeenCalledWith('term-1', 'pwd\nexit\n')
    expect(host.textContent).toContain('/Users/sumitjadhav/Proj')
    expect(host.textContent).toContain('succeeded')
    expect(onStatus).toHaveBeenCalledWith('local', 'ok')
  })

  it('renders backend terminal streams through an xterm surface', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let emitTerminalEvent
    window.api = {
      terminal: {
        createLocal: vi.fn().mockResolvedValue({ id: 'term-xterm', type: 'local' }),
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        onEvent: vi.fn((callback) => {
          emitTerminalEvent = callback
          return vi.fn()
        })
      }
    }

    await act(async () => {
      createRoot(host).render(
        <TerminalTile
          server={{ id: 'local', host: 'localhost', env: 'dev', user: 'miriam' }}
          command="whoami"
          running
          executionTarget={{ serverId: 'local', mode: 'local', executionAvailable: true }}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      emitTerminalEvent({ sessionId: 'term-xterm', type: 'data', data: 'miriam\r\n' })
    })

    expect(host.querySelector('[data-xterm-open="true"]')).toBeTruthy()
    expect(xtermInstances[0].writes).toContain('$ whoami\r\n')
    expect(xtermInstances[0].writes).toContain('miriam\r\n')
  })

  it('forwards fitted xterm dimensions to the terminal backend on resize', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    window.api = {
      terminal: {
        createLocal: vi.fn().mockResolvedValue({ id: 'term-resize', type: 'local' }),
        write: vi.fn().mockResolvedValue(undefined),
        resize: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        onEvent: vi.fn(() => vi.fn())
      }
    }

    await act(async () => {
      createRoot(host).render(
        <TerminalTile
          server={{ id: 'local', host: 'localhost', env: 'dev', user: 'miriam' }}
          command="top"
          running
          executionTarget={{ serverId: 'local', mode: 'local', executionAvailable: true }}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(window.api.terminal.resize).toHaveBeenCalledWith('term-resize', 132, 36)
  })

  it('uses the SSH terminal bridge for ssh execution targets', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let emitTerminalEvent
    const onStatus = vi.fn()
    window.api = {
      terminal: {
        createSsh: vi.fn().mockResolvedValue({ id: 'ssh-term-1', type: 'ssh', host: 'web-01.prod.lzrs.io' }),
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        onEvent: vi.fn((callback) => {
          emitTerminalEvent = callback
          return vi.fn()
        })
      }
    }

    await act(async () => {
      createRoot(host).render(
        <TerminalTile
          server={{ id: 'web-01', host: 'web-01.prod.lzrs.io', port: 2222, env: 'prod', user: 'deploy', authMethod: 'agent' }}
          command="uptime"
          running
          executionTarget={{ serverId: 'web-01', mode: 'ssh', executionAvailable: true }}
          onStatus={onStatus}
        />
      )
      await Promise.resolve()
    })

    await act(async () => {
      emitTerminalEvent({ sessionId: 'ssh-term-1', type: 'data', data: 'load average: 1.20\r\n' })
      emitTerminalEvent({ sessionId: 'ssh-term-1', type: 'exit', exitCode: 0 })
    })

    expect(window.api.terminal.createSsh).toHaveBeenCalledWith(expect.objectContaining({
      host: 'web-01.prod.lzrs.io',
      port: 2222,
      user: 'deploy',
      authMethod: 'agent',
      cols: 100,
      rows: 28
    }))
    expect(window.api.terminal.write).toHaveBeenCalledWith('ssh-term-1', 'uptime\nexit\n')
    expect(host.textContent).toContain('load average: 1.20')
    expect(host.textContent).toContain('succeeded')
    expect(onStatus).toHaveBeenCalledWith('web-01', 'ok')
  })

  it('does not allow execution when compose has no targets', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let executed = false

    await act(async () => {
      createRoot(host).render(
        <Composer
          servers={SERVERS}
          selected={[]}
          onCancel={() => {}}
          onExecute={() => {
            executed = true
          }}
        />
      )
    })

    const runButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run on 0'))
    expect(runButton.disabled).toBe(true)

    await act(async () => {
      host.querySelector('.command-input input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(executed).toBe(false)
  })

  it('uses settings to decide whether destructive compose commands need confirmation', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onExecute = vi.fn()

    await act(async () => {
      createRoot(host).render(
        <Composer
          servers={SERVERS}
          selected={['web-01']}
          settings={{
            safetyRules: {
              rmRfGuard: false,
              diskGuard: true,
              serviceWarnings: true,
              forcePushWarnings: true
            }
          }}
          onCancel={() => {}}
          onExecute={onExecute}
        />
      )
    })

    await setInputValue(host.querySelector('.command-input input'), 'rm -rf /srv/app')

    expect(host.textContent).not.toContain('Production confirmation required')
    const runButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run on 1'))
    expect(runButton.disabled).toBe(false)
  })

  it('renders dashboard recent commands from model props', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    await act(async () => {
      createRoot(host).render(
        <Dashboard
          servers={SERVERS}
          recentCommands={[{ id: 'hist-custom', cmd: 'uptime', ts: 'just now', scope: '1 server', status: 'queued', duration: 'simulated' }]}
          selected={[]}
          setSelected={() => {}}
          onOpenTerminal={() => {}}
          onCompose={() => {}}
        />
      )
    })

    expect(host.textContent).toContain('uptime')
    expect(host.textContent).not.toContain('docker compose up -d')
  })

  it('adds a local server through the app model and updates the dashboard count', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    await act(async () => {
      createRoot(host).render(<App />)
    })

    expect(host.textContent).toContain('connected · 8 hosts')

    await act(async () => {
      host.querySelector('button[title="Add server"]').click()
    })

    await setInputValue(host.querySelector('input[placeholder="web-04"]'), 'ops-01')
    await setInputValue(host.querySelector('input[placeholder="web-04.prod.lzrs.io"]'), 'ops-01.dev.lzrs.io')

    const addButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Add server'))
    expect(addButton.disabled).toBe(false)
    await act(async () => {
      addButton.click()
    })

    expect(host.textContent).toContain('connected · 9 hosts')
    expect(host.textContent).toContain('ops-01.dev.lzrs.io')
  })

  it('hydrates renderer model through the optional Electron data bridge', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    window.api = {
      health: vi.fn().mockResolvedValue({ ok: true, app: 'lazarus-sentinel' }),
      data: {
        getModel: vi.fn().mockResolvedValue({
          servers: [{ id: 'remote-01', host: 'remote-01.dev.lzrs.io', env: 'dev', region: 'local', user: 'miriam' }],
          history: [{ id: 'hist-remote', cmd: 'uptime', targetIds: ['remote-01'], scope: '1 server', status: 'ok', duration: '0.1s', ts: 'just now' }],
          settings: { theme: 'light' }
        }),
        addServer: vi.fn(),
        updateSettings: vi.fn(),
        addHistory: vi.fn()
      }
    }

    await act(async () => {
      createRoot(host).render(<App />)
      await Promise.resolve()
    })

    expect(window.api.data.getModel).toHaveBeenCalled()
    expect(host.textContent).toContain('connected · 1 hosts')
    expect(host.textContent).toContain('remote-01.dev.lzrs.io')
  })

  it('persists added servers through the optional Electron data bridge', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    window.api = {
      health: vi.fn().mockResolvedValue({ ok: true, app: 'lazarus-sentinel' }),
      data: {
        getModel: vi.fn().mockResolvedValue({
          servers: SERVERS,
          history: [],
          settings: { theme: 'dark' }
        }),
        addServer: vi.fn().mockResolvedValue([...SERVERS, { id: 'ops-01', host: 'ops-01.dev.lzrs.io', env: 'dev', region: 'local', user: 'miriam' }]),
        updateSettings: vi.fn(),
        addHistory: vi.fn()
      }
    }

    await act(async () => {
      createRoot(host).render(<App />)
      await Promise.resolve()
    })

    await act(async () => {
      host.querySelector('button[title="Add server"]').click()
    })

    await setInputValue(host.querySelector('input[placeholder="web-04"]'), 'ops-01')
    await setInputValue(host.querySelector('input[placeholder="web-04.prod.lzrs.io"]'), 'ops-01.dev.lzrs.io')

    const addButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Add server'))
    await act(async () => {
      addButton.click()
      await Promise.resolve()
    })

    expect(window.api.data.addServer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'ops-01',
      host: 'ops-01.dev.lzrs.io'
    }))
  })

  it('uses the optional SSH probe bridge from the add server modal', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    window.api = {
      ssh: {
        testConnection: vi.fn().mockResolvedValue({ ok: true, msg: 'Connection ready' })
      }
    }

    await act(async () => {
      createRoot(host).render(<AddServerModal open onClose={() => {}} onAdd={() => {}} />)
    })

    await setInputValue(host.querySelector('input[placeholder="web-04"]'), 'web-04')
    await setInputValue(host.querySelector('input[placeholder="web-04.prod.lzrs.io"]'), 'web-04.prod.lzrs.io')

    const testButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Test'))
    await act(async () => {
      testButton.click()
      await Promise.resolve()
    })

    expect(window.api.ssh.testConnection).toHaveBeenCalledWith(expect.objectContaining({
      id: 'web-04',
      host: 'web-04.prod.lzrs.io',
      user: 'deploy'
    }))
    expect(host.textContent).toContain('Retest')
  })

  it('requests a simulated execution plan through the optional Electron execution bridge', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    window.api = {
      health: vi.fn().mockResolvedValue({ ok: true, app: 'lazarus-sentinel' }),
      data: {
        getModel: vi.fn().mockResolvedValue({
          servers: SERVERS,
          history: [],
          settings: { theme: 'dark' }
        }),
        addServer: vi.fn(),
        updateSettings: vi.fn(),
        addHistory: vi.fn().mockResolvedValue({ id: 1 })
      },
      execution: {
        runCommand: vi.fn().mockResolvedValue({
          id: 'run-bridge',
          command: 'docker compose up -d',
          targetIds: ['web-01', 'web-02', 'web-03', 'stg-web'],
          status: 'queued',
          startedAt: '2026-04-26T10:00:00.000Z',
          targets: []
        })
      }
    }

    await act(async () => {
      createRoot(host).render(<App />)
      await Promise.resolve()
    })

    const runButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run command'))
    await act(async () => {
      runButton.click()
    })

    const executeButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run on 4'))
    await act(async () => {
      executeButton.click()
      await Promise.resolve()
    })

    expect(window.api.execution.runCommand).toHaveBeenCalledWith({
      command: 'docker compose up -d',
      targetIds: ['web-01', 'web-02', 'web-03', 'stg-web']
    })
  })

  it('persists terminal output logs only when the setting is enabled', async () => {
    const runApp = async (outputLogs) => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const updateHistory = vi.fn().mockResolvedValue(null)
      window.api = {
        health: vi.fn().mockResolvedValue({ ok: true, app: 'lazarus-sentinel' }),
        data: {
          getModel: vi.fn().mockResolvedValue({
            servers: SERVERS,
            history: [],
            settings: { theme: 'dark', data: { outputLogs } }
          }),
          addServer: vi.fn(),
          updateSettings: vi.fn(),
          addHistory: vi.fn().mockResolvedValue({ id: 'hist-1' }),
          updateHistory
        },
        execution: {
          runCommand: vi.fn().mockResolvedValue({
            id: `run-${outputLogs}`,
            targets: ['web-01', 'web-02', 'web-03', 'stg-web'].map((serverId) => ({
              serverId,
              status: 'ok',
              script: [
                { delay: 1, line: '$ docker compose up -d', stream: 'cmd' },
                { delay: 1, line: `${serverId} deployed token=abcd`, stream: 'ok', status: 'ok' }
              ]
            }))
          })
        }
      }

      await act(async () => {
        createRoot(host).render(<App />)
        await Promise.resolve()
      })

      await act(async () => {
        [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run command')).click()
      })
      await act(async () => {
        [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Run on 4')).click()
        await Promise.resolve()
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })

      document.body.innerHTML = ''
      return updateHistory
    }

    const offUpdate = await runApp('off')
    expect(offUpdate).toHaveBeenCalledWith(expect.any(String), expect.not.objectContaining({ outputLogs: expect.anything() }))

    const onUpdate = await runApp('on')
    expect(onUpdate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      outputLogs: expect.objectContaining({
        'web-01': expect.arrayContaining(['$ docker compose up -d\r\n', 'web-01 deployed token=[secret]\r\n'])
      })
    }))
  })
})
