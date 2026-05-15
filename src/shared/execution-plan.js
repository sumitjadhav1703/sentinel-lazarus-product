const DOCKER_COMPOSE_UP_RE = /docker compose up/i
const RM_RF_RE = /rm\s+-rf/i
const GIT_PULL_RE = /git pull/i

export function scriptFor(command, serverId) {
  const cmd = command || 'echo ok'
  const base = [{ delay: 10, line: `$ ${cmd}`, stream: 'cmd' }]

  if (DOCKER_COMPOSE_UP_RE.test(cmd)) {
    return [
      ...base,
      { delay: 20, line: '[+] Running 3/3', stream: 'out' },
      { delay: 20, line: `ok Container ${serverId}-web Started`, stream: 'ok' },
      { delay: 20, line: `ok Container ${serverId}-api Started`, stream: 'ok' },
      { delay: 20, line: 'network lazarus_default reused', stream: 'out', status: 'ok' }
    ]
  }

  if (RM_RF_RE.test(cmd)) {
    return [
      ...base,
      { delay: 20, line: 'rm: dry-run guard intercepted destructive command', stream: 'err' },
      { delay: 20, line: 'exit 126', stream: 'err', status: 'fail' }
    ]
  }

  if (GIT_PULL_RE.test(cmd)) {
    return [
      ...base,
      { delay: 20, line: 'remote: Enumerating objects: 47, done.', stream: 'out' },
      { delay: 20, line: 'Fast-forward 16 files changed', stream: 'out' },
      { delay: 20, line: 'found 0 vulnerabilities', stream: 'ok', status: 'ok' }
    ]
  }

  return [...base, { delay: 20, line: 'ok', stream: 'ok', status: 'ok' }]
}

export function finalStatusFor(script) {
  for (let i = script.length - 1; i >= 0; i--) {
    if (script[i].status) {
      return script[i].status
    }
  }
  return 'ok'
}
