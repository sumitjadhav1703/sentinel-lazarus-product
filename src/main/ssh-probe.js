import { applySshAuth } from './ssh-auth.js'

function normalizeProbeConfig(input = {}) {
  return {
    host: String(input.host || '').trim(),
    port: Number.parseInt(input.port || '22', 10) || 22,
    username: String(input.user || input.username || '').trim(),
    readyTimeout: 5000
  }
}

export function createSshProbeService({ Client, readFile, homeDir } = {}) {
  return {
    async testConnection(input) {
      let config = normalizeProbeConfig(input)
      if (!config.host) return Promise.resolve({ ok: false, msg: 'Host is required' })
      if (!config.username) return Promise.resolve({ ok: false, msg: 'User is required' })

      try {
        config = await applySshAuth(config, input, { readFile, homeDir })
      } catch (error) {
        return { ok: false, msg: error.message }
      }

      return new Promise((resolve) => {
        const client = new Client()
        let settled = false
        const settle = (result) => {
          if (settled) return
          settled = true
          client.end()
          resolve(result)
        }

        client
          .on('ready', () => settle({ ok: true, msg: 'Connection ready' }))
          .on('error', (error) => settle({ ok: false, msg: error?.message || 'Connection failed' }))
          .connect(config)
      })
    }
  }
}

export async function createSsh2ProbeService() {
  const { Client } = await import('ssh2')
  return createSshProbeService({ Client })
}
