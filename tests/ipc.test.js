import { describe, expect, it } from 'vitest'
import { IPC_CHANNELS, registerTerminalIpcHandlers } from '../src/main/ipc.js'

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

describe('registerTerminalIpcHandlers', () => {
  it('does not throw an error if no terminal backend is provided', () => {
    const ipcMain = new FakeIpcMain()
    const dispose = registerTerminalIpcHandlers(ipcMain, { onTerminalEvent: () => {} })
    dispose()
  })

  it('isolates errors in IPC handlers to prevent main process crashes', async () => {
    const ipcMain = new FakeIpcMain()
    const erroringBackend = {
      createSession: () => { throw new Error('create error') },
      write: () => { throw new Error('write error') },
      resize: () => { throw new Error('resize error') },
      close: () => { throw new Error('close error') }
    }

    const dispose = registerTerminalIpcHandlers(ipcMain, {
      terminalBackend: erroringBackend,
      onTerminalEvent: () => {}
    })

    await expect(ipcMain.invoke(IPC_CHANNELS.createLocalTerminal, {})).rejects.toThrow('create error')
    await expect(ipcMain.invoke(IPC_CHANNELS.createSshTerminal, {})).rejects.toThrow('create error')
    await expect(ipcMain.invoke(IPC_CHANNELS.writeTerminal, { id: 'test', data: 'data' })).rejects.toThrow('write error')
    await expect(ipcMain.invoke(IPC_CHANNELS.resizeTerminal, { id: 'test', cols: 10, rows: 10 })).rejects.toThrow('resize error')
    await expect(ipcMain.invoke(IPC_CHANNELS.closeTerminal, { id: 'test' })).rejects.toThrow('close error')

    dispose()
  })
})
