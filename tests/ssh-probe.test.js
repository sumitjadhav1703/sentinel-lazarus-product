import { describe, expect, it } from 'vitest'
import { createSshProbeService } from '../src/main/ssh-probe.js'
import { IPC_CHANNELS, registerSshProbeIpcHandlers } from '../src/main/ipc.js'

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

  invoke(channel, payload) {
    return this.handlers.get(channel)?.({}, payload)
  }
}

function createFakeClient({ fail = false, serverFingerprint = Buffer.from('valid-fingerprint').toString('base64') } = {}) {
  const instances = []
  class FakeClient {
    constructor() {
      this.handlers = {}
      this.config = null
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
        if (fail) {
          this.handlers.error?.(new Error('auth failed'))
          return
        }

        if (config.hostVerifier && !config.hostVerifier(Buffer.from(serverFingerprint, 'base64'))) {
          this.handlers.error?.(new Error('Host key verification failed'))
          return
        }

        this.handlers.ready?.()
      }, 0)
    }

    end() {
      this.ended = true
    }
  }

  return { Client: FakeClient, instances }
}

describe('ssh probe service', () => {
  it('tests a connection with an injectable ssh2 client and sanitized config', async () => {
    const fake = createFakeClient()
    const service = createSshProbeService({ Client: fake.Client })

    const result = await service.testConnection({
      host: ' web-01.prod.lzrs.io ',
      port: '2222',
      user: ' deploy ',
      authMethod: 'agent',
      keyPath: '~/.ssh/id_ed25519',
      password: 'secret'
    })

    expect(result).toEqual({ ok: true, msg: 'Connection ready' })
    expect(fake.instances[0].config).toMatchObject({
      host: 'web-01.prod.lzrs.io',
      port: 2222,
      username: 'deploy',
      readyTimeout: 5000
    })
    expect(fake.instances[0].config.password).toBeUndefined()
    expect(fake.instances[0].ended).toBe(true)
  })

  it('returns a safe failure response on connection errors', async () => {
    const fake = createFakeClient({ fail: true })
    const service = createSshProbeService({ Client: fake.Client })

    await expect(service.testConnection({ host: 'bad-host', user: 'deploy' })).resolves.toEqual({
      ok: false,
      msg: 'auth failed'
    })
  })

  it('loads private keys in main for key-based probes without returning key material', async () => {
    const fake = createFakeClient()
    const readFile = async (path, encoding) => {
      expect(path).toContain('/.ssh/id_ed25519')
      expect(encoding).toBe('utf8')
      return 'PRIVATE KEY'
    }
    const service = createSshProbeService({ Client: fake.Client, readFile, homeDir: '/Users/sumitjadhav' })

    const result = await service.testConnection({
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      authMethod: 'key',
      keyPath: '~/.ssh/id_ed25519'
    })

    expect(result).toEqual({ ok: true, msg: 'Connection ready' })
    expect(fake.instances[0].config.privateKey).toBe('PRIVATE KEY')
    expect(result.privateKey).toBeUndefined()
  })

  it('returns a safe failure response when a requested key file cannot be read', async () => {
    const fake = createFakeClient()
    const service = createSshProbeService({
      Client: fake.Client,
      readFile: async () => {
        throw new Error('ENOENT')
      },
      homeDir: '/Users/sumitjadhav'
    })

    await expect(service.testConnection({
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      authMethod: 'key',
      keyPath: '~/.ssh/missing'
    })).resolves.toEqual({ ok: false, msg: 'Unable to read SSH key' })
    expect(fake.instances).toHaveLength(0)
  })

  it('registers only an SSH probe IPC handler, not SSH shell execution', async () => {
    const ipcMain = new FakeIpcMain()
    const service = { testConnection: async () => ({ ok: true, msg: 'Connection ready' }) }

    const dispose = registerSshProbeIpcHandlers(ipcMain, { sshProbeService: service })
    const result = await ipcMain.invoke(IPC_CHANNELS.testSshConnection, { host: 'web-01', user: 'deploy' })

    expect(result.ok).toBe(true)
    expect([...ipcMain.handlers.keys()]).toEqual(['ssh:test-connection'])
    expect(Object.values(IPC_CHANNELS)).not.toContain('ssh:create-session')

    dispose()
    expect(ipcMain.handlers.size).toBe(0)
  })

  it('rejects connection if host fingerprint does not match', async () => {
    const fake = createFakeClient({ serverFingerprint: Buffer.from('actual-server-key').toString('base64') })
    const service = createSshProbeService({ Client: fake.Client })

    const result = await service.testConnection({
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      hostFingerprint: 'SHA256:different-key'
    })

    expect(result).toEqual({ ok: false, msg: 'Host key verification failed' })
    expect(fake.instances[0].ended).toBe(true)
  })

  it('accepts connection if host fingerprint matches', async () => {
    const keyBase64 = Buffer.from('correct-fingerprint').toString('base64')
    const fake = createFakeClient({ serverFingerprint: keyBase64 })
    const service = createSshProbeService({ Client: fake.Client })

    const result = await service.testConnection({
      host: 'web-01.prod.lzrs.io',
      user: 'deploy',
      hostFingerprint: 'SHA256:' + keyBase64
    })

    expect(result).toEqual({ ok: true, msg: 'Connection ready' })
    expect(fake.instances[0].ended).toBe(true)
  })
})
