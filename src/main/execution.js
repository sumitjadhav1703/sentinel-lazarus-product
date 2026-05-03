import { finalStatusFor, scriptFor } from '../shared/execution-plan.js'

function createRunId() {
  return `run-${Date.now()}-${globalThis.crypto.randomUUID()}`
}

export function createExecutionService({ configRepo, localBackend = null, sshBackend = null, idFactory = createRunId, now = () => new Date().toISOString() }) {
  return {
    runCommand(request = {}) {
      const command = String(request.command || '').trim()
      const targetIds = Array.isArray(request.targetIds) ? request.targetIds : []

      if (!command) throw new Error('Command is required')
      if (!targetIds.length) throw new Error('At least one target is required')

      const servers = configRepo.getServers()
      const targetIdSet = new Set(targetIds)
      const targets = []

      for (let i = 0; i < servers.length; i++) {
        const server = servers[i]
        if (targetIdSet.has(server.id)) {
          const script = scriptFor(command, server.id)
          const localCapable = Boolean(localBackend?.canRun?.(server))
          const sshCapable = !localCapable && Boolean(sshBackend?.canRun?.(server))
          targets.push({
            serverId: server.id,
            host: server.host,
            env: server.env,
            user: server.user,
            mode: localCapable ? 'local' : sshCapable ? 'ssh' : 'simulated',
            executionAvailable: localCapable || sshCapable,
            status: finalStatusFor(script),
            script
          })
        }
      }

      if (!targets.length) throw new Error('No matching targets found')

      return {
        id: idFactory(),
        command,
        targetIds,
        status: 'queued',
        startedAt: now(),
        targets
      }
    }
  }
}
