import { applySshAuth } from './ssh-auth.js'

function createSessionId() {
  return `ssh-term-${Date.now()}-${globalThis.crypto.randomUUID()}`
}

function normalizeSshConfig(input = {}) {
  return {
    host: String(input.host || '').trim(),
    port: Number.parseInt(input.port || '22', 10) || 22,
    username: String(input.user || input.username || '').trim(),
    readyTimeout: 8000
  }
}

function publicSession(session) {
  return {
    id: session.id,
    type: 'ssh',
    host: session.host,
    shell: 'ssh'
  }
}

export function createSshTerminalBackend({ Client, idFactory = createSessionId, emit = () => {}, readFile, homeDir }) {
  const sessions = new Map()

  function getSession(id) {
    const session = sessions.get(id)
    if (!session) throw new Error(`Unknown SSH terminal session: ${id}`)
    return session
  }

  return {
    canRun(server) {
      return Boolean(server?.host) && server.host !== 'localhost' && server.id !== 'local'
    },

    async createSession(options = {}) {
      if (options.type && options.type !== 'ssh') {
        throw new Error('Only SSH terminal sessions are supported')
      }

      let config = normalizeSshConfig(options)
      if (!config.host) throw new Error('Host is required')
      if (!config.username) throw new Error('User is required')
      config = await applySshAuth(config, options, { readFile, homeDir })

      return new Promise((resolve, reject) => {
        const id = idFactory()
        const client = new Client()
        let settled = false

        function fail(error) {
          if (settled) return
          settled = true
          client.end()
          reject(error)
        }

        client
          .on('ready', () => {
            client.shell({
              term: 'xterm-256color',
              cols: options.cols || 80,
              rows: options.rows || 24
            }, (error, stream) => {
              if (error) {
                fail(error)
                return
              }

              const session = { id, host: config.host, client, stream }
              sessions.set(id, session)
              stream.on('data', (data) => emit({ sessionId: id, type: 'data', data: String(data) }))
              stream.on('close', (exitCode = 0) => {
                sessions.delete(id)
                client.end()
                emit({ sessionId: id, type: 'exit', exitCode })
              })
              settled = true
              resolve(publicSession(session))
            })
          })
          .on('error', fail)
          .connect(config)
      })
    },

    write(id, data) {
      getSession(id).stream.write(data)
    },

    resize(id, cols, rows) {
      getSession(id).stream.setWindow(rows, cols)
    },

    close(id) {
      const session = getSession(id)
      session.stream.end()
      session.client.end()
      sessions.delete(id)
    },

    listSessions() {
      return [...sessions.values()].map(publicSession)
    }
  }
}

export async function createSsh2TerminalBackend(options = {}) {
  const { Client } = await import('ssh2')
  return createSshTerminalBackend({ Client, ...options })
}
