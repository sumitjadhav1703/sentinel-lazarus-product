import { describe, expect, it } from 'vitest'
import { createLocalTerminalBackend } from '../src/main/local-terminal.js'
import { IPC_CHANNELS, registerTerminalIpcHandlers } from '../src/main/ipc.js'

function createFakePty() {
  const spawns = []
  return {
    spawns,
    spawn(shell, args, options) {
      const listeners = { data: [], exit: [] }
      const process = {
        shell,
        args,
        options,
        writes: [],
        killed: false,
        onData(callback) {
          listeners.data.push(callback)
          return { dispose: () => {} }
        },
        onExit(callback) {
          listeners.exit.push(callback)
          return { dispose: () => {} }
        },
        write(data) {
          this.writes.push(data)
        },
        resize(cols, rows) {
          this.size = { cols, rows }
        },
        kill() {
          this.killed = true
        },
        emitData(data) {
          listeners.data.forEach((callback) => callback(data))
        },
        emitExit(exitCode = 0) {
          listeners.exit.forEach((callback) => callback({ exitCode }))
        }
      }
      spawns.push(process)
      return process
    }
  }
}

class FakeIpcMain {
  constructor() {
    this.handlers = new Map()
  }

  handle(channel, handler) {
    this.handlers.set(channel, handler)
  }

  removeHandler(channel) {
    this.handlers.delete(channel)
  }

  invoke(channel, payload, webContents = { send: () => {} }) {
    return this.handlers.get(channel)?.({ sender: webContents }, payload)
  }
}

describe('local terminal backend', () => {
  it('creates an interactive local session through an injectable pty implementation', () => {
    const fakePty = createFakePty()
    const events = []
    const backend = createLocalTerminalBackend({
      pty: fakePty,
      shell: '/bin/zsh',
      cwd: '/tmp/workspace',
      idFactory: () => 'term-1',
      emit: (event) => events.push(event)
    })

    const session = backend.createSession({ cols: 100, rows: 32 })
    backend.write(session.id, 'echo ok\n')
    fakePty.spawns[0].emitData('ok\r\n')
    fakePty.spawns[0].emitExit(0)

    expect(session).toMatchObject({ id: 'term-1', type: 'local', shell: '/bin/zsh' })
    expect(fakePty.spawns[0].writes).toEqual(['echo ok\n'])
    expect(fakePty.spawns[0].options).toMatchObject({ cols: 100, rows: 32, cwd: '/tmp/workspace' })
    expect(events).toEqual([
      { sessionId: 'term-1', type: 'data', data: 'ok\r\n' },
      { sessionId: 'term-1', type: 'exit', exitCode: 0 }
    ])
    expect(backend.listSessions()).toEqual([])
  })

  it('resizes and closes tracked sessions safely', () => {
    const fakePty = createFakePty()
    const backend = createLocalTerminalBackend({ pty: fakePty, idFactory: () => 'term-1' })

    const session = backend.createSession({ cols: 80, rows: 24 })
    backend.resize(session.id, 120, 40)
    backend.close(session.id)

    expect(fakePty.spawns[0].size).toEqual({ cols: 120, rows: 40 })
    expect(fakePty.spawns[0].killed).toBe(true)
    expect(backend.listSessions()).toEqual([])
  })

  it('rejects remote session requests until SSH support is implemented', () => {
    const fakePty = createFakePty()
    const backend = createLocalTerminalBackend({ pty: fakePty })

    expect(() => backend.createSession({ type: 'ssh', host: 'web-01.prod.lzrs.io' })).toThrow('Only local terminal sessions are supported')
    expect(fakePty.spawns).toHaveLength(0)
  })

  it('registers local terminal IPC handlers and forwards terminal events to the sender', async () => {
    const fakePty = createFakePty()
    const ipcMain = new FakeIpcMain()
    const sent = []
    const webContents = { send: (channel, event) => sent.push({ channel, event }) }
    let forwardEvent
    const backend = createLocalTerminalBackend({
      pty: fakePty,
      idFactory: () => 'term-1',
      emit: (event) => forwardEvent?.(event)
    })

    const dispose = registerTerminalIpcHandlers(ipcMain, {
      terminalBackend: backend,
      onTerminalEvent: (callback) => {
        forwardEvent = callback
        return () => {
          forwardEvent = null
        }
      }
    })

    const session = await ipcMain.invoke(IPC_CHANNELS.createLocalTerminal, { cols: 90, rows: 30 }, webContents)
    await ipcMain.invoke(IPC_CHANNELS.writeTerminal, { id: session.id, data: 'pwd\n' }, webContents)
    await ipcMain.invoke(IPC_CHANNELS.resizeTerminal, { id: session.id, cols: 120, rows: 40 }, webContents)
    fakePty.spawns[0].emitData('/tmp\r\n')
    await ipcMain.invoke(IPC_CHANNELS.closeTerminal, { id: session.id }, webContents)

    expect(session).toMatchObject({ id: 'term-1', type: 'local' })
    expect(fakePty.spawns[0].writes).toEqual(['pwd\n'])
    expect(fakePty.spawns[0].size).toEqual({ cols: 120, rows: 40 })
    expect(sent).toEqual([{ channel: 'terminal:event', event: { sessionId: 'term-1', type: 'data', data: '/tmp\r\n' } }])

    dispose()
    expect(ipcMain.handlers.size).toBe(0)
  })

  it('does not expose SSH terminal IPC channels yet', () => {
    const channels = Object.values(IPC_CHANNELS)

    expect(channels).toEqual(expect.arrayContaining([
      'terminal:create-local',
      'terminal:write',
      'terminal:resize',
      'terminal:close',
      'terminal:event'
    ]))
    expect(channels.filter((channel) => channel.startsWith('ssh:'))).toEqual(['ssh:test-connection'])
    expect(channels).toContain('terminal:create-ssh')
    expect(channels).not.toContain('ssh:create-session')
  })
})
