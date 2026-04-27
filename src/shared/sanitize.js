export function maskCommandSecrets(command) {
  return String(command || '')
    .replace(/(Authorization:\s*Bearer\s+)([^\s"']+)/gi, '$1[secret]')
    .replace(/(--(?:password|token|secret|api-key)\s+)([^\s]+)/gi, '$1[secret]')
    .replace(/(--(?:password|token|secret|api-key)=)([^\s]+)/gi, '$1[secret]')
    .replace(/((?:password|token|secret|api_key|api-key)=)([^\s]+)/gi, '$1[secret]')
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
