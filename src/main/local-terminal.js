
const SENSITIVE_ENV_RE = /SECRET|KEY|TOKEN|PASSWORD|PASS(?:WD)?|AUTH|CREDENTIAL|APPLE_|ELECTRON_|CSC_/i
const EXPLICITLY_ALLOWED_ENV = ['SSH_AUTH_SOCK']

function createSafeEnv(env = {}) {
  const safeEnv = {}
  for (const [key, value] of Object.entries(env)) {
    if (EXPLICITLY_ALLOWED_ENV.includes(key) || !SENSITIVE_ENV_RE.test(key)) {
      safeEnv[key] = value
    }
  }
  return safeEnv
}

function defaultShell() {
  return process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh')
}

function createSessionId() {
  return `term-${globalThis.crypto.randomUUID()}`
}

export function createLocalTerminalBackend({
  pty,
  shell = defaultShell(),
  cwd = process.cwd(),
  idFactory = createSessionId,
  emit = () => {}
}) {
  const sessions = new Map()

  function getSession(id) {
    const session = sessions.get(id)
    if (!session) throw new Error(`Unknown terminal session: ${id}`)
    return session
  }

  return {
    canRun(server) {
      return server?.host === 'localhost' || server?.id === 'local'
    },

    createSession(options = {}) {
      if (options.type && options.type !== 'local') {
        throw new Error('Only local terminal sessions are supported')
      }

      const id = idFactory()
      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd,
        env: createSafeEnv(process.env)
      })
      const session = { id, type: 'local', shell, process: proc }
      sessions.set(id, session)

      proc.onData((data) => emit({ sessionId: id, type: 'data', data }))
      proc.onExit(({ exitCode }) => {
        sessions.delete(id)
        emit({ sessionId: id, type: 'exit', exitCode })
      })

      return { id, type: 'local', shell }
    },

    write(id, data) {
      getSession(id).process.write(data)
    },

    resize(id, cols, rows) {
      getSession(id).process.resize(cols, rows)
    },

    close(id) {
      const session = getSession(id)
      session.process.kill()
      sessions.delete(id)
    },

    listSessions() {
      return [...sessions.values()].map((session) => ({ id: session.id, type: session.type, shell: session.shell }))
    }
  }
}

export async function createNodePtyLocalTerminalBackend(options = {}) {
  const pty = await import('node-pty')
  return createLocalTerminalBackend({ pty, ...options })
}
