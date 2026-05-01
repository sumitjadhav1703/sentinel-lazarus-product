const AUTH_BEARER_RE = /(Authorization:\s*Bearer\s+)([^\s"']+)/gi
const FLAG_SPACE_SECRET_RE = /(--(?:password|token|secret|api-key)\s+)([^\s]+)/gi
const FLAG_EQ_SECRET_RE = /(--(?:password|token|secret|api-key)=)([^\s]+)/gi
const ENV_EQ_SECRET_RE = /((?:password|token|secret|api_key|api-key)=)([^\s]+)/gi

export function maskCommandSecrets(command) {
  return String(command || '')
    .replace(AUTH_BEARER_RE, '$1[secret]')
    .replace(FLAG_SPACE_SECRET_RE, '$1[secret]')
    .replace(FLAG_EQ_SECRET_RE, '$1[secret]')
    .replace(ENV_EQ_SECRET_RE, '$1[secret]')
}

export function sanitizeOutputLogs(outputLogs = {}, options = {}) {
  const maxChunksPerTarget = Number.isFinite(options.maxChunksPerTarget) ? options.maxChunksPerTarget : 100
  const maxChunkLength = Number.isFinite(options.maxChunkLength) ? options.maxChunkLength : 2000
  return Object.fromEntries(Object.entries(outputLogs)
    .filter(([, chunks]) => Array.isArray(chunks))
    .map(([targetId, chunks]) => [
      targetId,
      chunks.slice(-maxChunksPerTarget).map((chunk) => {
        const masked = maskCommandSecrets(String(chunk || ''))
        return masked.length > maxChunkLength ? `${masked.slice(0, maxChunkLength)}...` : masked
      })
    ])
    .filter(([, chunks]) => chunks.length > 0))
}
