import { safeStorage } from 'electron'
import { DEFAULT_SERVERS } from '../shared/defaults.js'
import { normalizeServerInput, normalizeSettings, updateSettings } from '../shared/model.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readArray(store, key, fallback) {
  const value = store.get(key)
  return Array.isArray(value) ? value : clone(fallback)
}

function readServers(store) {
  const value = store.get('servers')
  if (typeof value === 'string' && safeStorage?.isEncryptionAvailable?.()) {
    try {
      const decrypted = safeStorage.decryptString(Buffer.from(value, 'base64'))
      const parsed = JSON.parse(decrypted)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // fallback to default
    }
  }
  return Array.isArray(value) ? value : clone(DEFAULT_SERVERS)
}

function writeServers(store, servers) {
  if (safeStorage?.isEncryptionAvailable?.()) {
    try {
      const encrypted = safeStorage.encryptString(JSON.stringify(servers))
      store.set('servers', encrypted.toString('base64'))
      return
    } catch (err) {
      throw new Error('Encryption failed: ' + err.message)
    }
  }
  store.set('servers', servers)
}

export function createServerSettingsRepository(store) {
  let cachedServersRaw = null
  let cachedServersNormalized = null

  return {
    getServers() {
      const currentRaw = readServers(store)
      if (currentRaw === cachedServersRaw) {
        return cachedServersNormalized
      }
      cachedServersRaw = currentRaw
      cachedServersNormalized = currentRaw.map(normalizeServerInput)
      return cachedServersNormalized
    },

    addServer(input) {
      const nextServer = normalizeServerInput(input)
      if (!nextServer.host) return this.getServers()

      const servers = this.getServers()
      if (servers.some(s => s.id === nextServer.id)) return servers

      const nextServers = [...servers, nextServer]
      writeServers(store, nextServers)
      return nextServers
    },

    updateServer(id, patch) {
      const servers = this.getServers()
      const nextServers = servers.map((server) => {
        if (server.id !== id) return server
        return normalizeServerInput({ ...server, ...(patch || {}), id: server.id })
      })
      writeServers(store, nextServers)
      return nextServers
    },

    removeServer(id) {
      const nextServers = this.getServers().filter((server) => server.id !== id)
      writeServers(store, nextServers)
      return nextServers
    },

    getSettings() {
      return normalizeSettings(store.get('settings'))
    },

    updateSettings(patch) {
      const settings = updateSettings(this.getSettings(), patch || {})
      const normalized = normalizeSettings(settings)
      store.set('settings', normalized)
      return normalized
    }
  }
}

export async function createElectronServerSettingsRepository() {
  const { default: Store } = await import('electron-store')
  return createServerSettingsRepository(new Store({
    name: 'config',
    defaults: {
      servers: clone(DEFAULT_SERVERS),
      settings: normalizeSettings()
    }
  }))
}
