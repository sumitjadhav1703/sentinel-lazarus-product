export const IPC_CHANNELS = {
  health: 'app:health',
  getModel: 'data:get-model',
  addServer: 'data:add-server',
  updateServer: 'data:update-server',
  removeServer: 'data:remove-server',
  updateSettings: 'data:update-settings',
  addHistory: 'data:add-history',
  updateHistory: 'data:update-history',
  getHistory: 'data:get-history',
  runCommand: 'execution:run-command',
  createLocalTerminal: 'terminal:create-local',
  createSshTerminal: 'terminal:create-ssh',
  writeTerminal: 'terminal:write',
  resizeTerminal: 'terminal:resize',
  closeTerminal: 'terminal:close',
  terminalEvent: 'terminal:event',
  testSshConnection: 'ssh:test-connection'
}

export function registerDataIpcHandlers(ipcMain, { configRepo, historyRepo }) {
  const handlers = {
    [IPC_CHANNELS.health]: () => ({
      ok: true,
      app: 'lazarus-sentinel'
    }),
    [IPC_CHANNELS.getModel]: () => ({
      servers: configRepo.getServers(),
      settings: configRepo.getSettings(),
      history: historyRepo.listHistory()
    }),
    [IPC_CHANNELS.addServer]: (_event, server) => configRepo.addServer(server),
    [IPC_CHANNELS.updateServer]: (_event, { id, patch }) => configRepo.updateServer(id, patch),
    [IPC_CHANNELS.removeServer]: (_event, { id }) => configRepo.removeServer(id),
    [IPC_CHANNELS.updateSettings]: (_event, patch = {}) => {
      const settings = configRepo.updateSettings(patch)
      if (Object.prototype.hasOwnProperty.call(patch, 'historyRetentionDays')) {
        historyRepo.pruneHistory?.(settings.historyRetentionDays)
      }
      return settings
    },
    [IPC_CHANNELS.addHistory]: (_event, entry) => historyRepo.addHistory(entry),
    [IPC_CHANNELS.updateHistory]: (_event, { id, patch }) => historyRepo.updateHistory(id, patch),
    [IPC_CHANNELS.getHistory]: () => historyRepo.listHistory()
  }

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler)
  }

  return () => {
    for (const channel of Object.keys(handlers)) {
      ipcMain.removeHandler(channel)
    }
  }
}

export function registerExecutionIpcHandlers(ipcMain, { executionService }) {
  ipcMain.handle(IPC_CHANNELS.runCommand, (_event, request) => executionService.runCommand(request))

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.runCommand)
  }
}

export function registerTerminalIpcHandlers(ipcMain, { terminalBackend, onTerminalEvent }) {
  const senders = new Set()
  const disposeEvents = onTerminalEvent((event) => {
    for (const sender of senders) {
      sender.send(IPC_CHANNELS.terminalEvent, event)
    }
  })

  const handlers = {
    [IPC_CHANNELS.createLocalTerminal]: async (event, options = {}) => {
      try {
        senders.add(event.sender)
        return await terminalBackend.createSession({ ...options, type: 'local' })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    [IPC_CHANNELS.createSshTerminal]: async (event, options = {}) => {
      try {
        senders.add(event.sender)
        return await terminalBackend.createSession({ ...options, type: 'ssh' })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    [IPC_CHANNELS.writeTerminal]: async (_event, { id, data }) => {
      try {
        return await terminalBackend.write(id, data)
      } catch (error) {
        throw new Error(error.message)
      }
    },
    [IPC_CHANNELS.resizeTerminal]: async (_event, { id, cols, rows }) => {
      try {
        return await terminalBackend.resize(id, cols, rows)
      } catch (error) {
        throw new Error(error.message)
      }
    },
    [IPC_CHANNELS.closeTerminal]: async (_event, { id }) => {
      try {
        return await terminalBackend.close(id)
      } catch (error) {
        throw new Error(error.message)
      }
    }
  }

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler)
  }

  return () => {
    disposeEvents?.()
    senders.clear()
    for (const channel of Object.keys(handlers)) {
      ipcMain.removeHandler(channel)
    }
  }
}

export function registerSshProbeIpcHandlers(ipcMain, { sshProbeService }) {
  ipcMain.handle(IPC_CHANNELS.testSshConnection, (_event, config) => sshProbeService.testConnection(config))

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.testSshConnection)
  }
}
