// Server dashboard — list of servers with env filters and multi-select

const Dashboard = ({ servers, selected, setSelected, onOpenTerminal, onCompose }) => {
  const [envFilter, setEnvFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const filtered = servers.filter(s => {
    if (envFilter !== 'all' && s.env !== envFilter) return false;
    if (query && !(`${s.id} ${s.host} ${s.region}`).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const counts = {
    all:     servers.length,
    prod:    servers.filter(s => s.env === 'prod').length,
    staging: servers.filter(s => s.env === 'staging').length,
    dev:     servers.filter(s => s.env === 'dev').length,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px 120px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>
          Servers
        </h1>
        <span className="mono" style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
          {filtered.length} of {servers.length}
        </span>
      </div>
      <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 24px', maxWidth: 560 }}>
        Select one or more hosts, then open a terminal or run a command across the selection. Production hosts require a second confirmation on destructive commands.
      </p>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--hair)', borderRadius: 12,
          padding: '0 10px', height: 32, minWidth: 240,
          background: 'var(--surface)',
        }}>
          <IconSearch size={14} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter hosts…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, height: 30 }}
          />
          <span className="kbd">/</span>
        </div>

        <div style={{ display: 'flex', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
          {['all', 'prod', 'staging', 'dev'].map(env => (
            <button
              key={env}
              onClick={() => setEnvFilter(env)}
              style={{
                height: 32, padding: '0 12px', border: 'none',
                borderLeft: env !== 'all' ? '1px solid var(--hair)' : 'none',
                background: envFilter === env ? 'var(--surface-2)' : 'var(--surface)',
                color: envFilter === env ? 'var(--fg)' : 'var(--fg-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: 'JetBrains Mono, monospace',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {env}
              <span style={{ opacity: 0.6, fontSize: 10 }}>{counts[env]}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {selected.length > 0 && (
          <>
            <span className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {selected.length} selected
            </span>
            <button className="btn ghost" onClick={() => setSelected([])} style={{ fontSize: 12, borderRadius: 12 }}>Clear</button>
            <button className="btn primary" onClick={onCompose} style={{ borderRadius: 12 }}>
              <IconTerminal size={14} /> Run command
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)' }}>
        <div className="label" style={{
          display: 'grid',
          gridTemplateColumns: '28px 1.4fr 100px 1fr 80px 80px 36px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--hair)',
          background: 'var(--bg)',
          gap: 12,
        }}>
          <span></span>
          <span>Host</span>
          <span>Environment</span>
          <span>Region · User</span>
          <span>Uptime</span>
          <span style={{ textAlign: 'right' }}>Load</span>
          <span></span>
        </div>
        {filtered.map((s, i) => {
          const isSel = selected.includes(s.id);
          return (
            <div
              key={s.id}
              onClick={() => toggle(s.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1.4fr 100px 1fr 80px 80px 36px',
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--hair)' : 'none',
                gap: 12,
                alignItems: 'center',
                cursor: 'pointer',
                background: isSel ? 'var(--coral-tint)' : 'transparent',
                transition: 'background 0.1s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              {isSel && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--coral)' }} />}
              <Checkbox checked={isSel} />
              <div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{s.host}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{s.id}</div>
              </div>
              <EnvChip env={s.env} />
              <div className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {s.region} · {s.user}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{s.uptime}</div>
              <LoadBar value={s.load} />
              <button
                onClick={(e) => { e.stopPropagation(); onOpenTerminal(s.id); }}
                className="btn ghost"
                style={{ height: 24, padding: '0 6px', color: 'var(--fg-muted)' }}
                title="Open terminal"
              >
                <IconArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent commands */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <h2 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Recent</h2>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>last 24 hours</span>
        </div>
        <div style={{ border: '1px solid var(--hair)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          {RECENT_COMMANDS.map((c, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 16, alignItems: 'center',
              padding: '10px 16px',
              borderBottom: i < RECENT_COMMANDS.length - 1 ? '1px solid var(--hair)' : 'none',
              fontSize: 12,
            }}>
              <span className="mono" style={{ color: 'var(--fg)' }}>{c.cmd}</span>
              <span className="mono" style={{ color: 'var(--fg-muted)' }}>{c.scope}</span>
              <StatusBadge status={c.status} />
              <span className="mono" style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{c.ts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Checkbox = ({ checked }) => (
  <span style={{
    width: 16, height: 16, borderRadius: 3,
    border: `1px solid ${checked ? 'var(--coral)' : 'var(--hair-strong)'}`,
    background: checked ? 'var(--coral)' : 'transparent',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s',
  }}>
    {checked && <IconCheck size={11} stroke="#fff" sw={2.5} />}
  </span>
);

const LoadBar = ({ value }) => {
  const pct = Math.min(1, value);
  const color = pct > 0.8 ? 'var(--prod)' : pct > 0.5 ? 'var(--staging)' : 'var(--dev)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
      <div style={{ width: 40, height: 4, background: 'var(--hair)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 28, textAlign: 'right' }}>
        {pct.toFixed(2)}
      </span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    ok:      { label: 'ok',      color: 'var(--success)' },
    fail:    { label: 'failed',  color: 'var(--fail)' },
    running: { label: 'running', color: 'var(--coral)' },
  };
  const m = map[status] || map.ok;
  return (
    <span className="mono" style={{ fontSize: 11, color: m.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} className={status === 'running' ? 'pulse' : ''} />
      {m.label}
    </span>
  );
};

Object.assign(window, { Dashboard, Checkbox, LoadBar, StatusBadge });
