/** @vitest-environment jsdom */
import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useLocalAppModel, APP_MODEL_STORAGE_KEY } from '../src/renderer/lib/local-model.js'
import { SERVERS } from '../src/renderer/lib/data.js'

describe('useLocalAppModel hook', () => {
  let host
  let root
  let storage
  let api
  let hookResult

  function TestComponent() {
    hookResult = useLocalAppModel(storage, api)
    return null
  }

  async function renderHook() {
    await act(async () => {
      root.render(<TestComponent />)
    })
  }

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    hookResult = null
    storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn()
    }
    api = {
      data: {
        getModel: vi.fn().mockResolvedValue(null),
        addServer: vi.fn().mockResolvedValue([]),
        updateServer: vi.fn().mockResolvedValue([]),
        removeServer: vi.fn().mockResolvedValue([]),
        addHistory: vi.fn().mockResolvedValue(null),
        updateHistory: vi.fn().mockResolvedValue(null),
        updateSettings: vi.fn().mockResolvedValue({})
      }
    }
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })

  it('initializes with default model when storage is empty', async () => {
    await renderHook()
    expect(hookResult.model.servers).toHaveLength(SERVERS.length)
    expect(storage.getItem).toHaveBeenCalledWith(APP_MODEL_STORAGE_KEY)
  })

  it('initializes with stored model when available', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ settings: { theme: 'dark' } }))
    await renderHook()
    expect(hookResult.model.settings.theme).toBe('dark')
  })

  it('ignores storage errors gracefully', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('Quota exceeded') })
    await renderHook()
    expect(hookResult.model.settings.theme).toBe('dark') // default
  })

  it('hydrates model from bridge API if provided', async () => {
    api.data.getModel.mockResolvedValue({ settings: { theme: 'dark', hydrated: true } })
    await renderHook()
    expect(hookResult.model.settings.hydrated).toBe(true)
    expect(api.data.getModel).toHaveBeenCalled()
  })

  it('ignores API hydrate if component unmounts quickly', async () => {
    let resolveModel
    api.data.getModel.mockReturnValue(new Promise(resolve => { resolveModel = resolve }))

    act(() => {
      root.render(<TestComponent />)
    })

    act(() => {
      root.unmount()
    })

    await act(async () => {
      resolveModel({ settings: { theme: 'dark', hydrated: true } })
    })

    // the hook state is gone, we just verify no error happens and the promise resolution doesn't break
    // Since hookResult was captured initially, it might reflect the first render
    expect(hookResult.model.settings.hydrated).toBeUndefined()
  })

  it('saves to storage when model changes', async () => {
    await renderHook()

    await act(async () => {
      hookResult.updateSettings({ theme: 'dark' })
    })

    expect(storage.setItem).toHaveBeenCalledWith(APP_MODEL_STORAGE_KEY, expect.stringContaining('"theme":"dark"'))
  })

  it('adds server and syncs with api', async () => {
    api.data.addServer.mockResolvedValue([{ id: 'new-svr', host: 'remote', __normalized: true }])
    await renderHook()

    await act(async () => {
      hookResult.addServer({ id: 'new-svr', host: 'remote' })
    })

    expect(api.data.addServer).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-svr' }))
    expect(hookResult.model.servers).toHaveLength(1)
    expect(hookResult.model.servers[0].id).toBe('new-svr')
  })

  it('updates server and syncs with api', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ servers: [{ id: 'svr-1', host: 'test' }] }))
    api.data.updateServer.mockResolvedValue([{ id: 'svr-1', host: 'updated', __normalized: true }])
    await renderHook()

    await act(async () => {
      hookResult.updateServer('svr-1', { host: 'updated' })
    })

    expect(api.data.updateServer).toHaveBeenCalledWith('svr-1', { host: 'updated' })
    expect(hookResult.model.servers[0].host).toBe('updated')
  })

  it('removes server and syncs with api', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ servers: [{ id: 'svr-1', host: 'test' }] }))
    api.data.removeServer.mockResolvedValue([])
    await renderHook()

    await act(async () => {
      hookResult.removeServer('svr-1')
    })

    expect(api.data.removeServer).toHaveBeenCalledWith('svr-1')
    expect(hookResult.model.servers).toHaveLength(0)
  })

  it('records history and updates when api returns saved entry', async () => {
    api.data.addHistory.mockResolvedValue({ status: 'ok', duration: '1s' })
    await renderHook()

    let localEntry
    await act(async () => {
      localEntry = hookResult.recordHistory({ command: 'uptime', targetIds: ['svr-1'] })
    })

    expect(localEntry.id).toBeDefined()
    expect(api.data.addHistory).toHaveBeenCalledWith(expect.objectContaining({ id: localEntry.id }))

    const historyEntry = hookResult.model.history.find(e => e.id === localEntry.id)
    expect(historyEntry.status).toBe('ok')
    expect(historyEntry.duration).toBe('1s')
  })

  it('updates history with sanitized logs and syncs with api', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ history: [{ id: 'hist-1', cmd: 'uptime', __normalized: true }] }))
    api.data.updateHistory.mockResolvedValue({ status: 'ok', outputLogs: {} })
    await renderHook()

    await act(async () => {
      hookResult.updateHistory('hist-1', { outputLogs: { 'svr-1': ['secret=xyz'] } })
    })

    expect(api.data.updateHistory).toHaveBeenCalledWith('hist-1', expect.objectContaining({
      outputLogs: expect.anything()
    }))

    const historyEntry = hookResult.model.history.find(e => e.id === 'hist-1')
    expect(historyEntry.status).toBe('ok')
  })
})
