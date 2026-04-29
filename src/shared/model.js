import { DEFAULT_SETTINGS } from './defaults.js'
import { maskCommandSecrets, sanitizeOutputLogs } from './sanitize.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toUniqueTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))]
  return [...new Set(String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean))]
}

function toPort(value) {
  const parsed = Number.parseInt(value || '22', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22
}

function toId(value, fallbackHost = '') {
  const id = String(value || '').trim().toLowerCase().replace(/\s+/g, '-')
  if (id) return id
  return String(fallbackHost || '').trim().toLowerCase().split('.')[0] || `server-${Date.now()}`
}

export function normalizeServerInput(input) {
  const host = String(input?.host || '').trim()
  const id = toId(input?.id, host)

  return {
    id,
    host,
    port: toPort(input?.port),
    env: ['prod', 'staging', 'dev'].includes(input?.env) ? input.env : 'dev',
    region: String(input?.region || 'local').trim(),
    user: String(input?.user || 'deploy').trim(),
    status: input?.status || 'online',
    uptime: input?.uptime || 'new',
    load: typeof input?.load === 'number' ? input.load : 0,
    authMethod: input?.authMethod || 'key',
    keyPath: input?.keyPath || '',
    tags: toUniqueTags(input?.tags)
  }
}

export function serializeCommandHistoryEntry(entry) {
  const targetIds = Array.isArray(entry?.targetIds) ? entry.targetIds : []
  const count = targetIds.length
  const createdAt = entry?.createdAt || new Date().toISOString()
  const outputLogs = isPlainObject(entry?.outputLogs) ? sanitizeOutputLogs(entry.outputLogs) : null
  return {
    id: entry?.id || `hist-${createdAt}-${globalThis.crypto.randomUUID()}`,
    cmd: maskCommandSecrets(String(entry?.command || entry?.cmd || '').trim()),
    targetIds,
    scope: entry?.scope || `${count} ${count === 1 ? 'server' : 'servers'}`,
    status: entry?.status || 'queued',
    duration: entry?.duration || 'simulated',
    ts: entry?.ts || 'just now',
    createdAt,
    ...(outputLogs ? { outputLogs } : {})
  }
}

export function pruneHistoryByRetention(history = [], retentionDays = 30, now = new Date()) {
  const days = Number.parseInt(retentionDays, 10)
  if (!Number.isFinite(days) || days <= 0) return Array.isArray(history) ? history : []
  const cutoff = new Date(now).getTime() - (days * 24 * 60 * 60 * 1000)
  return (Array.isArray(history) ? history : []).filter((entry) => {
    const createdAt = new Date(entry?.createdAt || entry?.created_at || 0).getTime()
    return Number.isFinite(createdAt) && createdAt >= cutoff
  })
}

export { sanitizeOutputLogs }

export function updateSettings(current, patch) {
  const normalizedCurrent = isPlainObject(current) ? current : {}
  const normalizedPatch = isPlainObject(patch) ? patch : {}
  const next = {
    ...normalizedCurrent,
    ...normalizedPatch
  }

  if (normalizedCurrent.safetyRules || normalizedPatch.safetyRules) {
    next.safetyRules = {
      ...(isPlainObject(normalizedCurrent.safetyRules) ? normalizedCurrent.safetyRules : {}),
      ...(isPlainObject(normalizedPatch.safetyRules) ? normalizedPatch.safetyRules : {})
    }
  }

  if (normalizedCurrent.data || normalizedPatch.data) {
    next.data = {
      ...(isPlainObject(normalizedCurrent.data) ? normalizedCurrent.data : {}),
      ...(isPlainObject(normalizedPatch.data) ? normalizedPatch.data : {})
    }
  }

  if (normalizedCurrent.keys || normalizedPatch.keys) {
    next.keys = Array.isArray(normalizedPatch.keys)
      ? normalizedPatch.keys
      : Array.isArray(normalizedCurrent.keys)
        ? normalizedCurrent.keys
        : []
  }

  return next
}

export function normalizeSettings(input = {}) {
  const settings = updateSettings(clone(DEFAULT_SETTINGS), isPlainObject(input) ? input : {})
  if (!Array.isArray(settings.keys)) settings.keys = clone(DEFAULT_SETTINGS.keys)
  if (!isPlainObject(settings.safetyRules)) settings.safetyRules = clone(DEFAULT_SETTINGS.safetyRules)
  if (!isPlainObject(settings.data)) settings.data = clone(DEFAULT_SETTINGS.data)
  return settings
}
