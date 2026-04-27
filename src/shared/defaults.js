export const DEFAULT_SERVERS = [
  { id: 'web-01', host: 'web-01.prod.lzrs.io', env: 'prod', region: 'us-east-1', user: 'deploy', status: 'online', uptime: '42d 3h', load: 0.68 },
  { id: 'web-02', host: 'web-02.prod.lzrs.io', env: 'prod', region: 'us-east-1', user: 'deploy', status: 'online', uptime: '42d 3h', load: 0.71 },
  { id: 'web-03', host: 'web-03.prod.lzrs.io', env: 'prod', region: 'eu-west-1', user: 'deploy', status: 'online', uptime: '18d 9h', load: 0.54 },
  { id: 'api-01', host: 'api-01.prod.lzrs.io', env: 'prod', region: 'us-east-1', user: 'deploy', status: 'online', uptime: '9d 14h', load: 0.82 },
  { id: 'stg-web', host: 'stg-web.staging.lzrs.io', env: 'staging', region: 'us-east-1', user: 'deploy', status: 'online', uptime: '2d 1h', load: 0.21 },
  { id: 'stg-api', host: 'stg-api.staging.lzrs.io', env: 'staging', region: 'us-east-1', user: 'deploy', status: 'online', uptime: '2d 1h', load: 0.18 },
  { id: 'dev-box', host: 'dev-box.dev.lzrs.io', env: 'dev', region: 'local', user: 'miriam', status: 'online', uptime: '4h 12m', load: 0.09 },
  { id: 'local', host: 'localhost', env: 'dev', region: 'local', user: 'miriam', status: 'online', uptime: 'local', load: 0.04 }
]

export const DEFAULT_RECENT_COMMANDS = [
  { cmd: 'docker compose up -d', ts: '2m ago', scope: '4 servers', status: 'ok', duration: '1.4s' },
  { cmd: 'git pull && npm ci', ts: '18m ago', scope: '2 servers', status: 'ok', duration: '2.8s' },
  { cmd: 'systemctl status nginx', ts: '1h ago', scope: '3 servers', status: 'ok', duration: '0.5s' },
  { cmd: 'df -h', ts: '3h ago', scope: '7 servers', status: 'ok', duration: '0.7s' },
  { cmd: 'tail -n 50 /var/log/syslog', ts: '1d ago', scope: '1 server', status: 'ok', duration: '0.9s' }
]

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  historyRetentionDays: 30,
  maskSecrets: true,
  safetyRules: {
    rmRfGuard: true,
    diskGuard: true,
    serviceWarnings: true,
    forcePushWarnings: true
  },
  keys: [
    { path: '~/.ssh/id_ed25519', scope: 'default' },
    { path: '~/.ssh/lazarus_prod', scope: 'prod-only' }
  ],
  data: {
    commandHistory: 'local',
    outputLogs: 'off'
  }
}
