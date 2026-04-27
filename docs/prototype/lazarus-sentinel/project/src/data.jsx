// Shared data: servers, commands, sample output

const SERVERS = [
  { id: 'web-01',  host: 'web-01.prod.lzrs.io',     env: 'prod',    region: 'us-east-1', user: 'deploy', status: 'online',  uptime: '42d 3h',  load: 0.68 },
  { id: 'web-02',  host: 'web-02.prod.lzrs.io',     env: 'prod',    region: 'us-east-1', user: 'deploy', status: 'online',  uptime: '42d 3h',  load: 0.71 },
  { id: 'web-03',  host: 'web-03.prod.lzrs.io',     env: 'prod',    region: 'eu-west-1', user: 'deploy', status: 'online',  uptime: '18d 9h',  load: 0.54 },
  { id: 'api-01',  host: 'api-01.prod.lzrs.io',     env: 'prod',    region: 'us-east-1', user: 'deploy', status: 'online',  uptime: '9d 14h',  load: 0.82 },
  { id: 'stg-web', host: 'stg-web.staging.lzrs.io', env: 'staging', region: 'us-east-1', user: 'deploy', status: 'online',  uptime: '2d 1h',   load: 0.21 },
  { id: 'stg-api', host: 'stg-api.staging.lzrs.io', env: 'staging', region: 'us-east-1', user: 'deploy', status: 'online',  uptime: '2d 1h',   load: 0.18 },
  { id: 'dev-box', host: 'dev-box.dev.lzrs.io',     env: 'dev',     region: 'local',     user: 'miriam', status: 'online',  uptime: '4h 12m',  load: 0.09 },
  { id: 'local',   host: 'localhost',                env: 'dev',     region: 'local',     user: 'miriam', status: 'online',  uptime: '—',       load: 0.04 },
];

const RECENT_COMMANDS = [
  { cmd: 'docker compose up -d',         ts: '2m ago',  scope: '4 servers', status: 'ok' },
  { cmd: 'git pull && npm ci',           ts: '18m ago', scope: '2 servers', status: 'ok' },
  { cmd: 'systemctl status nginx',       ts: '1h ago',  scope: '3 servers', status: 'ok' },
  { cmd: 'df -h',                         ts: '3h ago',  scope: '7 servers', status: 'ok' },
  { cmd: 'tail -n 50 /var/log/syslog',   ts: '1d ago',  scope: '1 server',  status: 'ok' },
];

// Risk detection: returns { level, reasons } — level one of 'safe' | 'caution' | 'danger'
function assessRisk(cmd, servers) {
  const c = (cmd || '').trim();
  const reasons = [];
  let level = 'safe';

  const hasProd = servers.some(s => s.env === 'prod');
  if (!c) return { level: 'safe', reasons: [] };

  const patterns = [
    { re: /\brm\s+-rf?\b/, msg: 'Recursive delete (rm -rf)', severity: 'danger' },
    { re: /\b(mkfs|dd\s+if=)/, msg: 'Destructive disk operation', severity: 'danger' },
    { re: /\bdrop\s+(table|database)\b/i, msg: 'Destructive SQL', severity: 'danger' },
    { re: /:\(\)\{/, msg: 'Fork bomb pattern', severity: 'danger' },
    { re: /\b(shutdown|reboot|halt|poweroff)\b/, msg: 'Shuts the host down', severity: 'danger' },
    { re: /\b(systemctl|service)\s+(stop|restart|disable)\b/, msg: 'Service state change', severity: 'caution' },
    { re: /\bchmod\s+(-R\s+)?777\b/, msg: 'chmod 777 weakens permissions', severity: 'caution' },
    { re: /\bkill(all)?\s+-9\b/, msg: 'Forceful kill', severity: 'caution' },
    { re: /\btruncate\b/, msg: 'Truncate', severity: 'caution' },
    { re: /\bgit\s+push\s+.*--force\b/, msg: 'Force-push', severity: 'caution' },
  ];

  for (const p of patterns) {
    if (p.re.test(c)) {
      reasons.push(p.msg);
      if (p.severity === 'danger') level = 'danger';
      else if (level !== 'danger') level = 'caution';
    }
  }

  if (hasProd && level === 'danger') {
    reasons.unshift('Target set includes production hosts');
  }
  return { level, reasons };
}

// Scripted "streaming" output per command — returns array of {delay, line, stream, status?}
function scriptFor(cmd, serverId) {
  const base = [
    { delay: 80,  line: `$ ${cmd}`, stream: 'cmd' },
  ];
  if (/docker compose up/.test(cmd)) {
    return [
      ...base,
      { delay: 120, line: `[+] Running 3/3`, stream: 'out' },
      { delay: 90,  line: ` ✓ Container ${serverId}-web    Started`, stream: 'ok' },
      { delay: 110, line: ` ✓ Container ${serverId}-api    Started`, stream: 'ok' },
      { delay: 140, line: ` ✓ Container ${serverId}-redis  Started`, stream: 'ok' },
      { delay: 80,  line: `network lazarus_default  reused`, stream: 'out' },
      { delay: 60,  line: ``, stream: 'out', status: 'ok' },
    ];
  }
  if (/rm\s+-rf/.test(cmd)) {
    const fail = Math.random() < 0.35;
    return [
      ...base,
      { delay: 200, line: `rm: cannot remove '/var/log/syslog': Operation not permitted`, stream: fail ? 'err' : 'out' },
      { delay: 90,  line: fail ? `exit 1` : `removed 412 files, 18.3 MB freed`, stream: fail ? 'err' : 'ok', status: fail ? 'fail' : 'ok' },
    ];
  }
  if (/git pull/.test(cmd)) {
    return [
      ...base,
      { delay: 120, line: `remote: Enumerating objects: 47, done.`, stream: 'out' },
      { delay: 90,  line: `remote: Counting objects: 100% (47/47), done.`, stream: 'out' },
      { delay: 80,  line: `Unpacking objects: 100% (32/32), 4.12 KiB | done.`, stream: 'out' },
      { delay: 140, line: `Fast-forward  ${12 + Math.floor(Math.random()*8)} files changed`, stream: 'out' },
      { delay: 300, line: `added 14 packages, removed 3, audited 892 in 2.1s`, stream: 'out' },
      { delay: 60,  line: `found 0 vulnerabilities`, stream: 'ok', status: 'ok' },
    ];
  }
  // default echo-ish
  return [
    ...base,
    { delay: 160, line: `ok`, stream: 'ok', status: 'ok' },
  ];
}

Object.assign(window, { SERVERS, RECENT_COMMANDS, assessRisk, scriptFor });
