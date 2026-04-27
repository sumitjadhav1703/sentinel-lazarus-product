import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { createHistoryDatabase } from '../src/main/db.js'
import { IPC_CHANNELS, registerDataIpcHandlers } from '../src/main/ipc.js'
import { createServerSettingsRepository } from '../src/main/store.js'

let tmpRoot

afterEach(async () => {
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
  tmpRoot = undefined
})

class MemoryStore {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed))
  }

  get(key) {
    return this.values.get(key)
  }

  set(key, value) {
    this.values.set(key, value)
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

  invoke(channel, payload) {
    return this.handlers.get(channel)?.({}, payload)
  }
}

describe('main-process persistence repositories', () => {
  it('stores server config through an injectable electron-store compatible adapter', () => {
    const repo = createServerSettingsRepository(new MemoryStore())

    const servers = repo.addServer({
      id: 'ops-01',
      host: 'ops-01.dev.lzrs.io',
      port: '2222',
      env: 'dev',
      region: 'local',
      user: 'miriam',
      tags: 'ops, canary'
    })
    const duplicate = repo.addServer({ id: 'ops-01', host: 'duplicate.dev.lzrs.io' })

    expect(servers.at(-1)).toMatchObject({
      id: 'ops-01',
      host: 'ops-01.dev.lzrs.io',
      port: 2222,
      tags: ['ops', 'canary']
    })
    expect(duplicate).toHaveLength(servers.length)
    expect(repo.getServers().at(-1).host).toBe('ops-01.dev.lzrs.io')
  })

  it('updates and removes persisted server config records', () => {
    const repo = createServerSettingsRepository(new MemoryStore())
    repo.addServer({ id: 'ops-01', host: 'ops-01.dev.lzrs.io', user: 'miriam' })

    const updated = repo.updateServer('ops-01', { host: 'ops-01.internal', port: '2223' })
    const removed = repo.removeServer('ops-01')

    expect(updated).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ops-01', host: 'ops-01.internal', port: 2223 })
    ]))
    expect(removed.some((server) => server.id === 'ops-01')).toBe(false)
  })

  it('merges settings and preserves durable local defaults', () => {
    const repo = createServerSettingsRepository(new MemoryStore())

    const settings = repo.updateSettings({ theme: 'light', historyRetentionDays: 14 })

    expect(settings).toMatchObject({
      theme: 'light',
      historyRetentionDays: 14,
      maskSecrets: true
    })
    expect(settings.safetyRules.rmRfGuard).toBe(true)
    expect(repo.getSettings().theme).toBe('light')
  })

  it('writes masked command history to sqlite and reads newest entries first', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'lazarus-history-'))
    const repo = createHistoryDatabase(join(tmpRoot, 'history.db'))

    const first = repo.addHistory({ command: 'deploy --password hunter2', targetIds: ['web-01'], status: 'ok', duration: '1.0s' })
    const second = repo.addHistory({ command: 'df -h', targetIds: ['web-01', 'web-02'], status: 'queued', duration: 'simulated' })
    const rows = repo.listHistory()

    expect(first.cmd).toBe('deploy --password [secret]')
    expect(second.scope).toBe('2 servers')
    expect(rows.map((row) => row.id)).toEqual([second.id, first.id])
    expect(rows[0].targetIds).toEqual(['web-01', 'web-02'])

    repo.close()
  })

  it('updates persisted command history status and duration', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'lazarus-history-'))
    const repo = createHistoryDatabase(join(tmpRoot, 'history.db'))
    const entry = repo.addHistory({ command: 'uptime', targetIds: ['local'], status: 'queued', duration: 'simulated' })

    const updated = repo.updateHistory(entry.id, { status: 'ok', duration: '1.2s', outputLogs: { local: ['Authorization: Bearer abc123\r\n', 'ok\r\n'] } })

    expect(updated).toMatchObject({ id: entry.id, status: 'ok', duration: '1.2s', outputLogs: { local: ['Authorization: Bearer [secret]\r\n', 'ok\r\n'] } })
    expect(repo.listHistory()[0]).toMatchObject({ id: entry.id, status: 'ok', duration: '1.2s', outputLogs: { local: ['Authorization: Bearer [secret]\r\n', 'ok\r\n'] } })

    repo.close()
  })

  it('prunes persisted command history outside retention days', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'lazarus-history-'))
    const repo = createHistoryDatabase(join(tmpRoot, 'history.db'))
    repo.addHistory({ command: 'old', targetIds: ['local'], createdAt: '2026-04-01T10:00:00.000Z' })
    repo.addHistory({ command: 'fresh', targetIds: ['local'], createdAt: '2026-04-26T10:00:00.000Z' })

    const rows = repo.pruneHistory(14, new Date('2026-04-27T10:00:00.000Z'))

    expect(rows.map((row) => row.cmd)).toEqual(['fresh'])
    expect(repo.listHistory().map((row) => row.cmd)).toEqual(['fresh'])

    repo.close()
  })
})

describe('data IPC handlers', () => {
  it('exposes model load, server write, settings update, and history add handlers', async () => {
    const ipcMain = new FakeIpcMain()
    const configRepo = createServerSettingsRepository(new MemoryStore())
    const historyRepo = {
      listHistory: () => [{ id: 1, cmd: 'uptime', targetIds: ['local'], scope: '1 server', status: 'ok', duration: '0.1s', ts: 'just now' }],
      addHistory: (entry) => ({ id: 2, cmd: entry.command, targetIds: entry.targetIds, scope: '1 server', status: entry.status, duration: entry.duration, ts: 'just now' }),
      updateHistory: (id, patch) => ({ id, cmd: 'uptime', targetIds: ['local'], scope: '1 server', status: patch.status, duration: patch.duration, ts: 'just now' }),
      pruneHistory: (days) => {
        historyRepo.prunedDays = days
        return []
      }
    }

    const dispose = registerDataIpcHandlers(ipcMain, { configRepo, historyRepo })

    expect(await ipcMain.invoke(IPC_CHANNELS.getModel)).toMatchObject({
      servers: expect.any(Array),
      history: expect.any(Array),
      settings: expect.objectContaining({ theme: 'dark' })
    })
    expect(await ipcMain.invoke(IPC_CHANNELS.addServer, { id: 'ops-01', host: 'ops-01.dev.lzrs.io' })).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ops-01' })
    ]))
    expect(await ipcMain.invoke(IPC_CHANNELS.updateServer, { id: 'ops-01', patch: { host: 'ops-01.internal' } })).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ops-01', host: 'ops-01.internal' })
    ]))
    expect(await ipcMain.invoke(IPC_CHANNELS.removeServer, { id: 'ops-01' })).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ops-01' })
    ]))
    expect(await ipcMain.invoke(IPC_CHANNELS.updateSettings, { theme: 'light' })).toMatchObject({ theme: 'light' })
    expect(await ipcMain.invoke(IPC_CHANNELS.updateSettings, { historyRetentionDays: 14 })).toMatchObject({ historyRetentionDays: 14 })
    expect(historyRepo.prunedDays).toBe(14)
    expect(await ipcMain.invoke(IPC_CHANNELS.addHistory, { command: 'uptime', targetIds: ['local'], status: 'ok', duration: '0.1s' })).toMatchObject({ id: 2 })
    expect(await ipcMain.invoke(IPC_CHANNELS.updateHistory, { id: 2, patch: { status: 'ok', duration: '0.1s' } })).toMatchObject({ id: 2, status: 'ok' })

    dispose()
    expect(ipcMain.handlers.size).toBe(0)
  })

  it('does not register SSH or PTY remote execution channels', () => {
    const channelNames = Object.values(IPC_CHANNELS)

    expect(channelNames).toEqual(expect.arrayContaining([
      'data:get-model',
      'data:add-server',
      'data:update-server',
      'data:remove-server',
      'data:update-settings',
      'data:add-history',
      'data:update-history'
    ]))
    expect(channelNames.filter((channel) => channel.startsWith('ssh:'))).toEqual(['ssh:test-connection'])
    expect(channelNames.some((channel) => channel.startsWith('pty:'))).toBe(false)
    expect(channelNames).toContain('terminal:create-ssh')
    expect(channelNames).not.toContain('ssh:create-session')
    expect(channelNames).not.toContain('ssh:exec')
  })
})
