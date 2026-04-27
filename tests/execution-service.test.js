import { describe, expect, it } from 'vitest'
import { createExecutionService } from '../src/main/execution.js'
import { IPC_CHANNELS, registerExecutionIpcHandlers } from '../src/main/ipc.js'

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

const servers = [
  { id: 'web-01', host: 'web-01.prod.lzrs.io', env: 'prod', user: 'deploy' },
  { id: 'stg-web', host: 'stg-web.staging.lzrs.io', env: 'staging', user: 'deploy' }
]

describe('main-process execution service', () => {
  it('builds a simulated execution plan for selected targets without using SSH or PTY', () => {
    const service = createExecutionService({
      configRepo: { getServers: () => servers },
      idFactory: () => 'run-1',
      now: () => '2026-04-26T10:00:00.000Z'
    })

    const run = service.runCommand({ command: 'docker compose up -d', targetIds: ['web-01', 'stg-web'] })

    expect(run).toMatchObject({
      id: 'run-1',
      command: 'docker compose up -d',
      status: 'queued',
      startedAt: '2026-04-26T10:00:00.000Z'
    })
    expect(run.targets).toHaveLength(2)
    expect(run.targets[0]).toMatchObject({
      serverId: 'web-01',
      host: 'web-01.prod.lzrs.io',
      status: 'ok'
    })
    expect(run.targets[0].script.at(-1).status).toBe('ok')
  })

  it('rejects empty commands and empty target sets before planning execution', () => {
    const service = createExecutionService({ configRepo: { getServers: () => servers } })

    expect(() => service.runCommand({ command: '', targetIds: ['web-01'] })).toThrow('Command is required')
    expect(() => service.runCommand({ command: 'uptime', targetIds: [] })).toThrow('At least one target is required')
  })

  it('marks remote targets as simulated until SSH execution is implemented', () => {
    const service = createExecutionService({
      configRepo: { getServers: () => servers },
      localBackend: { canRun: (server) => server.host === 'localhost' }
    })

    const run = service.runCommand({ command: 'uptime', targetIds: ['web-01'] })

    expect(run.targets[0]).toMatchObject({
      serverId: 'web-01',
      mode: 'simulated',
      executionAvailable: false
    })
  })

  it('marks localhost targets as local-capable when a local backend is present', () => {
    const service = createExecutionService({
      configRepo: { getServers: () => [{ id: 'local', host: 'localhost', env: 'dev', user: 'miriam' }] },
      localBackend: { canRun: (server) => server.host === 'localhost' }
    })

    const run = service.runCommand({ command: 'uptime', targetIds: ['local'] })

    expect(run.targets[0]).toMatchObject({
      serverId: 'local',
      mode: 'local',
      executionAvailable: true
    })
  })

  it('marks remote targets as ssh-capable when an ssh backend is present', () => {
    const service = createExecutionService({
      configRepo: { getServers: () => servers },
      localBackend: { canRun: (server) => server.host === 'localhost' },
      sshBackend: { canRun: (server) => server.host !== 'localhost' }
    })

    const run = service.runCommand({ command: 'uptime', targetIds: ['web-01'] })

    expect(run.targets[0]).toMatchObject({
      serverId: 'web-01',
      mode: 'ssh',
      executionAvailable: true
    })
  })

  it('registers only execution planning IPC, not terminal write or ssh channels', async () => {
    const ipcMain = new FakeIpcMain()
    const service = createExecutionService({
      configRepo: { getServers: () => servers },
      idFactory: () => 'run-ipc',
      now: () => '2026-04-26T10:00:00.000Z'
    })

    const dispose = registerExecutionIpcHandlers(ipcMain, { executionService: service })
    const run = await ipcMain.invoke(IPC_CHANNELS.runCommand, { command: 'uptime', targetIds: ['web-01'] })

    expect(run).toMatchObject({ id: 'run-ipc', command: 'uptime' })
    expect([...ipcMain.handlers.keys()]).toEqual(['execution:run-command'])

    dispose()
    expect(ipcMain.handlers.size).toBe(0)
  })
})
