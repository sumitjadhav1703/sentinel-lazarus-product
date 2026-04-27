import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHistoryDatabase } from './db.js'
import { createExecutionService } from './execution.js'
import { registerDataIpcHandlers, registerExecutionIpcHandlers, registerSshProbeIpcHandlers, registerTerminalIpcHandlers } from './ipc.js'
import { createNodePtyLocalTerminalBackend } from './local-terminal.js'
import { createSsh2ProbeService } from './ssh-probe.js'
import { createSsh2TerminalBackend } from './ssh-terminal.js'
import { createElectronServerSettingsRepository } from './store.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)
const preloadPath = join(__dirname, isDev ? '../preload/index.js' : '../preload/index.mjs')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#1A1815',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createCompositeTerminalBackend({ localBackend, sshBackend }) {
  const routes = new Map()
  const remember = (session, backend) => {
    routes.set(session.id, backend)
    return session
  }
  const route = (id) => {
    const backend = routes.get(id)
    if (!backend) throw new Error(`Unknown terminal session: ${id}`)
    return backend
  }

  return {
    async createSession(options = {}) {
      if (options.type === 'ssh') return remember(await sshBackend.createSession(options), sshBackend)
      return remember(await localBackend.createSession(options), localBackend)
    },
    write(id, data) {
      route(id).write(id, data)
    },
    resize(id, cols, rows) {
      route(id).resize(id, cols, rows)
    },
    close(id) {
      route(id).close(id)
      routes.delete(id)
    },
    listSessions() {
      return [...localBackend.listSessions(), ...sshBackend.listSessions()]
    },
    canRun(server) {
      return localBackend.canRun(server)
    }
  }
}

app.whenReady().then(async () => {
  const configRepo = await createElectronServerSettingsRepository()
  const historyRepo = createHistoryDatabase(join(app.getPath('userData'), 'history.db'))
  const terminalListeners = new Set()
  const localBackend = await createNodePtyLocalTerminalBackend({
    emit: (event) => {
      for (const listener of terminalListeners) listener(event)
    }
  })
  const sshBackend = await createSsh2TerminalBackend({
    emit: (event) => {
      for (const listener of terminalListeners) listener(event)
    }
  })
  const terminalBackend = createCompositeTerminalBackend({ localBackend, sshBackend })
  const sshProbeService = await createSsh2ProbeService()
  const executionService = createExecutionService({ configRepo, localBackend, sshBackend })
  registerDataIpcHandlers(ipcMain, { configRepo, historyRepo })
  registerExecutionIpcHandlers(ipcMain, { executionService })
  registerSshProbeIpcHandlers(ipcMain, { sshProbeService })
  registerTerminalIpcHandlers(ipcMain, {
    terminalBackend,
    onTerminalEvent: (callback) => {
      terminalListeners.add(callback)
      return () => terminalListeners.delete(callback)
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
