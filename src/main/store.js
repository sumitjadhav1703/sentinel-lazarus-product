import { DEFAULT_SERVERS } from '../shared/defaults.js'
import { normalizeServerInput, normalizeSettings, updateSettings } from '../shared/model.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readArray(store, key, fallback) {
  const value = store.get(key)
  return Array.isArray(value) ? value : clone(fallback)
}

export function createServerSettingsRepository(store) {
  return {
    getServers() {
      return readArray(store, 'servers', DEFAULT_SERVERS).map(normalizeServerInput)
    },

    addServer(input) {
      const nextServer = normalizeServerInput(input)
      if (!nextServer.host) return this.getServers()

      const servers = this.getServers()
      if (servers.some((server) => server.id === nextServer.id)) return servers

      const nextServers = [...servers, nextServer]
      store.set('servers', nextServers)
      return nextServers
    },

    updateServer(id, patch) {
      const servers = this.getServers()
      const nextServers = servers.map((server) => {
        if (server.id !== id) return server
        return normalizeServerInput({ ...server, ...(patch || {}), id: server.id })
      })
      store.set('servers', nextServers)
      return nextServers
    },

    removeServer(id) {
      const nextServers = this.getServers().filter((server) => server.id !== id)
      store.set('servers', nextServers)
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
