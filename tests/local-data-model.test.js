import { describe, expect, it } from 'vitest'
import {
  appModelReducer,
  createInitialAppModel,
  maskCommandSecrets,
  normalizeServerInput,
  pruneHistoryByRetention,
  sanitizeOutputLogs,
  serializeCommandHistoryEntry,
  updateSettings
} from '../src/renderer/lib/local-model.js'

describe('local app data model', () => {
  it('normalizes user-entered server records into renderer-safe local records', () => {
    const server = normalizeServerInput({
      id: ' Web-04 ',
      host: ' web-04.prod.lzrs.io ',
      port: '2222',
      user: ' deploy ',
      env: 'prod',
      region: ' eu-west-1 ',
      authMethod: 'key',
      keyPath: '~/.ssh/lazarus_prod',
      tags: 'edge, canary, edge'
    })

    expect(server).toMatchObject({
      id: 'web-04',
      host: 'web-04.prod.lzrs.io',
      port: 2222,
      user: 'deploy',
      env: 'prod',
      region: 'eu-west-1',
      authMethod: 'key',
      keyPath: '~/.ssh/lazarus_prod',
      status: 'online',
      uptime: 'new',
      load: 0,
      tags: ['edge', 'canary']
    })
  })

  it('adds servers immutably and rejects duplicate aliases', () => {
    const initial = createInitialAppModel()
    const added = appModelReducer(initial, {
      type: 'servers/add',
      payload: { id: 'ops-01', host: 'ops-01.dev.lzrs.io', user: 'miriam', env: 'dev', region: 'local' }
    })
    const duplicate = appModelReducer(added, {
      type: 'servers/add',
      payload: { id: 'ops-01', host: 'duplicate.dev.lzrs.io', user: 'miriam', env: 'dev', region: 'local' }
    })

    expect(initial.servers.some((server) => server.id === 'ops-01')).toBe(false)
    expect(added.servers.at(-1)).toMatchObject({ id: 'ops-01', host: 'ops-01.dev.lzrs.io' })
    expect(duplicate.servers).toHaveLength(added.servers.length)
  })

  it('updates and removes servers immutably by alias', () => {
    const initial = createInitialAppModel({
      servers: [{ id: 'ops-01', host: 'ops-01.dev.lzrs.io', user: 'miriam', env: 'dev', region: 'local' }]
    })
    const updated = appModelReducer(initial, {
      type: 'servers/update',
      payload: { id: 'ops-01', patch: { host: 'ops-01.internal', port: '2223', tags: 'ops,internal' } }
    })
    const removed = appModelReducer(updated, {
      type: 'servers/remove',
      payload: { id: 'ops-01' }
    })

    expect(initial.servers[0].host).toBe('ops-01.dev.lzrs.io')
    expect(updated.servers[0]).toMatchObject({ id: 'ops-01', host: 'ops-01.internal', port: 2223, tags: ['ops', 'internal'] })
    expect(removed.servers).toHaveLength(0)
  })

  it('records simulated command history with target ids and display metadata', () => {
    const initial = createInitialAppModel()
    const next = appModelReducer(initial, {
      type: 'history/record',
      payload: {
        command: 'docker compose up -d',
        targetIds: ['web-01', 'web-02'],
        status: 'queued',
        duration: 'simulated'
      }
    })

    expect(next.history).toHaveLength(initial.history.length + 1)
    expect(next.history[0]).toMatchObject({
      cmd: 'docker compose up -d',
      targetIds: ['web-01', 'web-02'],
      scope: '2 servers',
      status: 'queued',
      duration: 'simulated',
      ts: 'just now'
    })
  })

  it('merges settings without losing unknown future keys', () => {
    const settings = updateSettings(
      { theme: 'dark', historyRetentionDays: 30, maskSecrets: true, futureFlag: 'keep' },
      { theme: 'light', historyRetentionDays: 14 }
    )

    expect(settings).toEqual({
      theme: 'light',
      historyRetentionDays: 14,
      maskSecrets: true,
      futureFlag: 'keep'
    })
  })

  it('serializes history entries for existing recent-command UI rows', () => {
    expect(serializeCommandHistoryEntry({
      command: 'df -h',
      targetIds: ['local'],
      status: 'ok',
      duration: '0.7s',
      createdAt: '2026-04-26T10:00:00.000Z',
      outputLogs: { local: ['Filesystem OK\r\n'] }
    })).toMatchObject({
      cmd: 'df -h',
      scope: '1 server',
      status: 'ok',
      duration: '0.7s',
      ts: 'just now',
      outputLogs: { local: ['Filesystem OK\r\n'] }
    })
  })

  it('masks and bounds saved terminal output logs', () => {
    const logs = sanitizeOutputLogs({
      local: [
        'Authorization: Bearer abc123\r\n',
        'deploy token=abcd\r\n',
        'line-1\r\n',
        'line-2\r\n'
      ]
    }, { maxChunksPerTarget: 3, maxChunkLength: 24 })

    expect(logs).toEqual({
      local: [
        'deploy token=[secret]\r\n',
        'line-1\r\n',
        'line-2\r\n'
      ]
    })
    expect(sanitizeOutputLogs({ local: ['x'.repeat(40)] }, { maxChunkLength: 12 }).local[0]).toBe('xxxxxxxxxxxx...')
  })

  it('falls back to seeded arrays when stored model data has an old or malformed shape', () => {
    const model = createInitialAppModel({
      servers: 'not-an-array',
      history: null,
      settings: {
        theme: 'light',
        keys: 'not-an-array',
        safetyRules: null,
        data: null
      }
    })

    expect(Array.isArray(model.servers)).toBe(true)
    expect(model.servers.length).toBeGreaterThan(0)
    expect(Array.isArray(model.history)).toBe(true)
    expect(model.history.length).toBeGreaterThan(0)
    expect(Array.isArray(model.settings.keys)).toBe(true)
    expect(model.settings.safetyRules.rmRfGuard).toBe(true)
    expect(model.settings.data.commandHistory).toBe('local')
  })

  it('masks common inline secrets before command history is stored', () => {
    expect(maskCommandSecrets('curl -H "Authorization: Bearer abc123" https://api.example.com')).toContain('Bearer [secret]')
    expect(maskCommandSecrets('deploy --password hunter2 --token=abcd')).toBe('deploy --password [secret] --token=[secret]')
  })

  it('stores masked history commands by default', () => {
    const next = appModelReducer(createInitialAppModel(), {
      type: 'history/record',
      payload: {
        command: 'deploy --password hunter2',
        targetIds: ['web-01'],
        status: 'queued'
      }
    })

    expect(next.history[0].cmd).toBe('deploy --password [secret]')
  })

  it('updates command history entries by id', () => {
    const initial = createInitialAppModel()
    const recorded = appModelReducer(initial, {
      type: 'history/record',
      payload: {
        id: 'hist-run-1',
        command: 'uptime',
        targetIds: ['local'],
        status: 'queued',
        duration: 'simulated'
      }
    })
    const updated = appModelReducer(recorded, {
      type: 'history/update',
      payload: { id: 'hist-run-1', patch: { status: 'ok', duration: '1.2s' } }
    })

    expect(updated.history[0]).toMatchObject({ id: 'hist-run-1', status: 'ok', duration: '1.2s' })
  })

  it('prunes command history outside the retention window', () => {
    const rows = [
      serializeCommandHistoryEntry({ id: 'fresh', command: 'uptime', createdAt: '2026-04-26T10:00:00.000Z' }),
      serializeCommandHistoryEntry({ id: 'old', command: 'df -h', createdAt: '2026-04-01T10:00:00.000Z' })
    ]

    expect(pruneHistoryByRetention(rows, 14, new Date('2026-04-27T10:00:00.000Z')).map((row) => row.id)).toEqual(['fresh'])
  })
})
