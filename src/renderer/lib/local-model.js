import { useEffect, useMemo, useReducer } from 'react'
import { RECENT_COMMANDS, SERVERS } from './data.js'
import { DEFAULT_SETTINGS } from '../../shared/defaults.js'
import { normalizeServerInput, normalizeSettings, pruneHistoryByRetention, sanitizeOutputLogs, serializeCommandHistoryEntry, updateSettings } from '../../shared/model.js'
import { maskCommandSecrets } from '../../shared/sanitize.js'

export const APP_MODEL_STORAGE_KEY = 'lazarus-sentinel.local-model.v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function seededHistory() {
  return clone(RECENT_COMMANDS).map((entry, index) => ({
    id: `seed-${index}`,
    targetIds: [],
    ...entry
  }))
}

export { maskCommandSecrets }
export { normalizeServerInput, pruneHistoryByRetention, sanitizeOutputLogs, serializeCommandHistoryEntry, updateSettings }

function checkArrayNormalized(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false
  return Boolean(arr[0] && typeof arr[0] === 'object' && arr[0].__normalized)
}

export function createInitialAppModel(overrides = {}) {
  const settings = normalizeSettings(overrides.settings)

  const serversReady = checkArrayNormalized(overrides.servers)
  const historyReady = checkArrayNormalized(overrides.history)

  return {
    ...overrides,
    servers: Array.isArray(overrides.servers) ? (serversReady ? overrides.servers : overrides.servers.map(normalizeServerInput)) : clone(SERVERS),
    history: Array.isArray(overrides.history) ? (historyReady ? overrides.history : overrides.history.map(serializeCommandHistoryEntry)) : seededHistory(),
    settings
  }
}

export function appModelReducer(state, action) {
  switch (action.type) {
    case 'servers/add': {
      const nextServer = normalizeServerInput(action.payload)
      if (!nextServer.host) return state

      const servers = state.servers
      const id = nextServer.id
      for (let i = 0; i < servers.length; i++) {
        if (servers[i].id === id) return state
      }

      return { ...state, servers: [...servers, nextServer] }
    }
    case 'servers/update':
      return {
        ...state,
        servers: state.servers.map((server) => {
          if (server.id !== action.payload?.id) return server
          return normalizeServerInput({ ...server, ...(action.payload.patch || {}), id: server.id })
        })
      }
    case 'servers/remove':
      return {
        ...state,
        servers: state.servers.filter((server) => server.id !== action.payload?.id)
      }
    case 'history/record': {
      const entry = serializeCommandHistoryEntry(action.payload)
      if (!entry.cmd) return state
      return { ...state, history: [entry, ...state.history] }
    }
    case 'history/update':
      return {
        ...state,
        history: state.history.map((entry) => entry.id === action.payload?.id ? { ...entry, ...(action.payload.patch || {}) } : entry)
      }
    case 'settings/update': {
      const settings = updateSettings(state.settings, action.payload || {})
      return {
        ...state,
        settings,
        history: Object.prototype.hasOwnProperty.call(action.payload || {}, 'historyRetentionDays')
          ? pruneHistoryByRetention(state.history, settings.historyRetentionDays)
          : state.history
      }
    }
    case 'model/replace':
      return createInitialAppModel(action.payload || {})
    case 'servers/replace':
      return { ...state, servers: Array.isArray(action.payload) ? action.payload.map(normalizeServerInput) : state.servers }
    case 'settings/replace':
      return { ...state, settings: updateSettings(clone(DEFAULT_SETTINGS), action.payload || {}) }
    case 'history/replace':
      return { ...state, history: Array.isArray(action.payload) ? action.payload.map(serializeCommandHistoryEntry) : state.history }
    default:
      return state
  }
}

function readStoredModel(storage) {
  if (!storage) return null
  try {
    const raw = storage.getItem(APP_MODEL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredModel(storage, model) {
  if (!storage) return
  try {
    storage.setItem(APP_MODEL_STORAGE_KEY, JSON.stringify(model))
  } catch {
    // Ignore persistence failures (e.g. storage quota exceeded)
  }
}

function getBridgeApi() {
  return globalThis.window?.api || globalThis.api || null
}

export function useLocalAppModel(storage = globalThis.localStorage, api = getBridgeApi()) {
  const initialModel = useMemo(() => createInitialAppModel(readStoredModel(storage) || {}), [storage])
  const [model, dispatch] = useReducer(appModelReducer, initialModel)

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const remoteModel = await api?.data?.getModel?.()
        if (!cancelled && remoteModel) dispatch({ type: 'model/replace', payload: remoteModel })
      } catch {
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    writeStoredModel(storage, model)
  }, [model, storage])

  return {
    model,
    addServer: (server) => {
      dispatch({ type: 'servers/add', payload: server })
      api?.data?.addServer?.(server).then((servers) => dispatch({ type: 'servers/replace', payload: servers })).catch(() => {})
    },
    updateServer: (id, patch) => {
      dispatch({ type: 'servers/update', payload: { id, patch } })
      api?.data?.updateServer?.(id, patch).then((servers) => dispatch({ type: 'servers/replace', payload: servers })).catch(() => {})
    },
    removeServer: (id) => {
      dispatch({ type: 'servers/remove', payload: { id } })
      api?.data?.removeServer?.(id).then((servers) => dispatch({ type: 'servers/replace', payload: servers })).catch(() => {})
    },
    recordHistory: (entry) => {
      const localEntry = serializeCommandHistoryEntry(entry)
      dispatch({ type: 'history/record', payload: localEntry })
      api?.data?.addHistory?.(localEntry).then((savedEntry) => {
        if (savedEntry) dispatch({ type: 'history/update', payload: { id: localEntry.id, patch: savedEntry } })
      }).catch(() => {})
      return localEntry
    },
    updateHistory: (id, patch) => {
      const safePatch = patch?.outputLogs
        ? { ...patch, outputLogs: sanitizeOutputLogs(patch.outputLogs) }
        : patch
      dispatch({ type: 'history/update', payload: { id, patch: safePatch } })
      api?.data?.updateHistory?.(id, safePatch).then((savedEntry) => {
        if (savedEntry) dispatch({ type: 'history/update', payload: { id, patch: savedEntry } })
      }).catch(() => {})
    },
    updateSettings: (patch) => {
      dispatch({ type: 'settings/update', payload: patch })
      api?.data?.updateSettings?.(patch).then((settings) => dispatch({ type: 'settings/replace', payload: settings })).catch(() => {})
    }
  }
}
