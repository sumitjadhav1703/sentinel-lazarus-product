import { DEFAULT_RECENT_COMMANDS, DEFAULT_SERVERS } from '../../shared/defaults.js'

export const SERVERS = DEFAULT_SERVERS
export const RECENT_COMMANDS = DEFAULT_RECENT_COMMANDS

const RISK_PATTERNS = [
  { re: /\brm\s+-rf?\b/i, msg: 'Recursive delete (rm -rf)', severity: 'danger', rule: 'rmRfGuard' },
  { re: /\b(mkfs|dd\s+if=)/i, msg: 'Destructive disk operation', severity: 'danger', rule: 'diskGuard' },
  { re: /\bdrop\s+(table|database)\b/i, msg: 'Destructive SQL', severity: 'danger' },
  { re: /:\(\)\{/, msg: 'Fork bomb pattern', severity: 'danger' },
  { re: /\b(shutdown|reboot|halt|poweroff)\b/i, msg: 'Shuts the host down', severity: 'danger' },
  { re: /\b(systemctl|service)\s+(stop|restart|disable)\b/i, msg: 'Service state change', severity: 'caution', rule: 'serviceWarnings' },
  { re: /\bchmod\s+(-R\s+)?777\b/i, msg: 'chmod 777 weakens permissions', severity: 'caution' },
  { re: /\bkill(all)?\s+-9\b/i, msg: 'Forceful kill', severity: 'caution' },
  { re: /\btruncate\b/i, msg: 'Truncate', severity: 'caution' },
  { re: /\bgit\s+push\s+.*--force\b/i, msg: 'Force-push', severity: 'caution', rule: 'forcePushWarnings' }
]

export function assessRisk(command, servers = [], settings = {}) {
  const cmd = (command || '').trim()
  const reasons = []
  let level = 'safe'
  const safetyRules = settings.safetyRules || {}

  if (!cmd) return { level, reasons }

  for (const pattern of RISK_PATTERNS) {
    if (pattern.rule && safetyRules[pattern.rule] === false) continue
    if (pattern.re.test(cmd)) {
      reasons.push(pattern.msg)
      if (pattern.severity === 'danger') level = 'danger'
      if (pattern.severity === 'caution' && level !== 'danger') level = 'caution'
    }
  }

  if (level === 'danger' && servers.some((server) => server.env === 'prod')) {
    reasons.unshift('Target set includes production hosts')
  }

  return { level, reasons }
}

export function getRequiredConfirmationPhrase(risk, servers = []) {
  const prodCount = servers.filter((server) => server.env === 'prod').length
  if (risk?.level !== 'danger' || prodCount === 0) return null
  return `confirm ${prodCount} prod`
}

export function isConfirmationPhraseValid(value, requiredPhrase) {
  if (!requiredPhrase) return true
  return (value || '').trim() === requiredPhrase
}
