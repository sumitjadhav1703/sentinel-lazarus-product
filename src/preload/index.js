import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  health: () => ipcRenderer.invoke('app:health'),
  data: {
    getModel: () => ipcRenderer.invoke('data:get-model'),
    addServer: (server) => ipcRenderer.invoke('data:add-server', server),
    updateServer: (id, patch) => ipcRenderer.invoke('data:update-server', { id, patch }),
    removeServer: (id) => ipcRenderer.invoke('data:remove-server', { id }),
    updateSettings: (patch) => ipcRenderer.invoke('data:update-settings', patch),
    addHistory: (entry) => ipcRenderer.invoke('data:add-history', entry),
    updateHistory: (id, patch) => ipcRenderer.invoke('data:update-history', { id, patch }),
    getHistory: () => ipcRenderer.invoke('data:get-history')
  },
  execution: {
    runCommand: (request) => ipcRenderer.invoke('execution:run-command', request)
  },
  terminal: {
    createLocal: (options) => ipcRenderer.invoke('terminal:create-local', options),
    createSsh: (options) => ipcRenderer.invoke('terminal:create-ssh', options),
    write: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
    close: (id) => ipcRenderer.invoke('terminal:close', { id }),
    onEvent: (callback) => {
      const listener = (_event, terminalEvent) => callback(terminalEvent)
      ipcRenderer.on('terminal:event', listener)
      return () => ipcRenderer.removeListener('terminal:event', listener)
    }
  },
  ssh: {
    testConnection: (config) => ipcRenderer.invoke('ssh:test-connection', config)
  }
})
