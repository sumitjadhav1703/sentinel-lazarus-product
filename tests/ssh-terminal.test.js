import { describe, expect, it } from 'vitest'
import { createSshTerminalBackend } from '../src/main/ssh-terminal.js'
import { IPC_CHANNELS, registerTerminalIpcHandlers } from '../src/main/ipc.js'

class FakeStream {
  constructor() {
    this.handlers = {}
    this.writes = []
    this.window = null
    this.ended = false
  }

  on(event, handler) {
    this.handlers[event] = handler
    return this
  }

  write(data) {
    this.writes.push(data)
  }

  setWindow(rows, cols) {
    this.window = { rows, cols }
  }

  end() {
    this.ended = true
  }

  emitData(data) {
    this.handlers.data?.(data)
  }

  emitClose(code = 0) {
    this.handlers.close?.(code)
  }
}

function createFakeSshClient({ serverFingerprint = Buffer.from('valid-fingerprint').toString('base64') } = {}) {
  const instances = []
  class FakeClient {
    constructor() {
      this.handlers = {}
      this.config = null
      this.stream = new FakeStream()
      this.ended = false
      instances.push(this)
    }

    on(event, handler) {
      this.handlers[event] = handler
      return this
    }

    connect(config) {
      this.config = config
      setTimeout(() => {
        if (config.hostVerifier && !config.hostVerifier(Buffer.from(serverFingerprint, 'base64'))) {
          this.handlers.error?.(new Error('Host key verification failed'))
          return
        }
        this.handlers.ready?.()
      }, 0)
    }

    shell(options, callback) {
      this.shellOptions = options
      callback(null, this.stream)
    }

    end() {
      this.ended = true
    }
  }

  return { Client: FakeClient, instances }
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

describe('ssh terminal backend', () => {
  it('creates an interactive SSH shell session through an injectable ssh2 client', async () => {
    const fake = createFakeSshClient()
    const events = []
    const backend = createSshTerminalBackend({
      Client: fake.Client,
      idFactory: () => 'ssh-term-1',
      emit: (event) => events.push(event)
    })

    const session = await backend.createSession({
      type: 'ssh',
      host: ' web-01.prod.lzrs.io ',
      port: '2222',
      user: ' deploy ',
      authMethod: 'agent',
      cols: 100,
      rows: 30
    })
    backend.write(session.id, 'uptime\n')
    fake.instances[0].stream.emitData('load average: 1.20\r\n')
    backend.resize(session.id, 120, 40)
    fake.instances[0].stream.emitClose(0)

    expect(session).toMatchObject({ id: 'ssh-term-1', type: 'ssh', host: 'web-01.prod.lzrs.io' })
    expect(fake.instances[0].config).toMatchObject({
      host: 'web-01.prod.lzrs.io',
      port: 2222,
      username: 'deploy',
      readyTimeout: 8000
    })
    expect(fake.instances[0].shellOptions).toMatchObject({ term: 'xterm-256color', cols: 100, rows: 30 })
    expect(fake.instances[0].stream.writes).toEqual(['uptime\n'])
    expect(fake.instances[0].stream.window).toEqual({ rows: 40, cols: 120 })
    expect(events).toEqual([
      { sessionId: 'ssh-term-1', type: 'data', data: 'load average: 1.20\r\n' },
      { sessionId: 'ssh-term-1', type: 'exit', exitCode: 0 }
    ])
    expect(backend.listSessions()).toEqual([])
  })

  it('loads private keys in main for key-based SSH shell sessions', async () => {
    const fake = createFakeSshClient()
    const backend = createSshTerminalBackend({
      Client: fake.Client,
      idFactory: () => 'ssh-term-1',
      readFile: async (path, encoding) => {
        expect(path).toContain('/.ssh/id_ed25519')
        expect(encoding).toBe('utf8')
        return 'PRIVATE KEY'
      },
      homeDir: '/Users/sumitjadhav'
    })

    await backend.createSession({
      type: 'ssh',
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      authMethod: 'key',
      keyPath: '~/.ssh/id_ed25519'
    })

    expect(fake.instances[0].config.privateKey).toBe('PRIVATE KEY')
    expect(backend.listSessions()[0]).not.toHaveProperty('privateKey')
  })

  it('exposes SSH terminal creation through terminal IPC without raw ssh channels', async () => {
    const fake = createFakeSshClient()
    const ipcMain = new FakeIpcMain()
    const sent = []
    const webContents = { send: (channel, event) => sent.push({ channel, event }) }
    let forwardEvent
    const backend = createSshTerminalBackend({
      Client: fake.Client,
      idFactory: () => 'ssh-term-1',
      emit: (event) => forwardEvent?.(event)
    })

    const dispose = registerTerminalIpcHandlers(ipcMain, {
      terminalBackend: {
        createSession: (options) => backend.createSession(options),
        write: (id, data) => backend.write(id, data),
        resize: (id, cols, rows) => backend.resize(id, cols, rows),
        close: (id) => backend.close(id)
      },
      onTerminalEvent: (callback) => {
        forwardEvent = callback
        return () => {
          forwardEvent = null
        }
      }
    })

    const session = await ipcMain.invoke(IPC_CHANNELS.createSshTerminal, { host: 'web-01', user: 'deploy' }, webContents)
    fake.instances[0].stream.emitData('hello\r\n')

    expect(session).toMatchObject({ id: 'ssh-term-1', type: 'ssh', host: 'web-01' })
    expect(sent).toEqual([{ channel: 'terminal:event', event: { sessionId: 'ssh-term-1', type: 'data', data: 'hello\r\n' } }])
    expect(Object.values(IPC_CHANNELS)).toContain('terminal:create-ssh')
    expect(Object.values(IPC_CHANNELS)).not.toContain('ssh:create-session')

    dispose()
    expect(ipcMain.handlers.size).toBe(0)
  })

  it('rejects terminal session if host fingerprint does not match', async () => {
    const fake = createFakeSshClient({ serverFingerprint: Buffer.from('actual-server-key').toString('base64') })
    const backend = createSshTerminalBackend({
      Client: fake.Client,
      idFactory: () => 'ssh-term-1'
    })

    await expect(backend.createSession({
      type: 'ssh',
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      hostFingerprint: 'SHA256:different-key'
    })).rejects.toThrow('Host key verification failed')
    expect(fake.instances[0].ended).toBe(true)
  })

  it('accepts terminal session if host fingerprint matches', async () => {
    const keyBase64 = Buffer.from('correct-fingerprint').toString('base64')
    const fake = createFakeSshClient({ serverFingerprint: keyBase64 })
    const backend = createSshTerminalBackend({
      Client: fake.Client,
      idFactory: () => 'ssh-term-1'
    })

    const session = await backend.createSession({
      type: 'ssh',
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      hostFingerprint: 'SHA256:' + keyBase64
    })

    expect(session.id).toBe('ssh-term-1')
    expect(fake.instances[0].ended).toBe(false)
  })
})
