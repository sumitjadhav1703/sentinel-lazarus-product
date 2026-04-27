// Command composer: picks up selected servers, risk-checks as user types, preview → confirm

const Composer = ({ servers, selected, onCancel, onExecute, riskStyle }) => {
  const [cmd, setCmd] = React.useState('docker compose up -d');
  const [typed, setTyped] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const targets = servers.filter(s => selected.includes(s.id));
  const risk = assessRisk(cmd, targets);
  const prodCount = targets.filter(t => t.env === 'prod').length;

  const needsTypedConfirm = risk.level === 'danger' && prodCount > 0;
  const requiredPhrase = needsTypedConfirm ? `confirm ${prodCount} prod` : null;
  const confirmReady = !needsTypedConfirm || typed.trim() === requiredPhrase;

  const run = () => {
    if (risk.level === 'danger' && riskStyle !== 'inline') {
      setConfirmOpen(true);
      return;
    }
    onExecute(cmd);
  };

  const suggestions = [
    'docker compose up -d',
    'git pull && npm ci',
    'systemctl status nginx',
    'df -h',
    'rm -rf /var/log/*',
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px 120px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
        <button onClick={onCancel} className="btn ghost" style={{ height: 24, padding: '0 6px', color: 'var(--fg-muted)' }}>
          ← Servers
        </button>
      </div>
      <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: '6px 0 4px', letterSpacing: '-0.015em' }}>
        Compose command
      </h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 24px', maxWidth: 620 }}>
        Preview on {targets.length} {targets.length === 1 ? 'host' : 'hosts'} before execution. Sentinel inspects the command for destructive patterns.
      </p>

      {/* Targets */}
      <div style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 8 }}>Targets · {targets.length}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {targets.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 10px 4px 4px',
              border: '1px solid var(--hair)',
              borderRadius: 4,
              background: 'var(--surface)',
            }}>
              <EnvChip env={t.env} />
              <span className="mono" style={{ fontSize: 12 }}>{t.host}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Command input */}
      <div style={{ marginBottom: 4 }}>
        <div className="label" style={{ marginBottom: 8 }}>Command</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1px solid ${risk.level === 'danger' ? 'var(--prod)' : risk.level === 'caution' ? 'var(--staging)' : 'var(--hair-strong)'}`,
          borderRadius: 'var(--radius)',
          background: 'var(--bg-sunken)',
          padding: '14px 16px',
          transition: 'border-color 0.2s',
        }}>
          <span className="mono" style={{ color: risk.level === 'danger' ? 'var(--prod)' : 'var(--coral)', fontSize: 14 }}>$</span>
          <input
            ref={inputRef}
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) run(); }}
            placeholder="Enter command…"
            className="mono"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--fg)',
            }}
          />
          <span className="kbd">↵</span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setCmd(s)}
              className="mono"
              style={{
                fontSize: 11, padding: '4px 8px',
                border: '1px solid var(--hair)', background: 'var(--surface)',
                borderRadius: 3, cursor: 'pointer', color: 'var(--fg-muted)',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Risk banner (inline mode) */}
      {riskStyle === 'inline' && risk.level !== 'safe' && (
        <RiskBanner risk={risk} prodCount={prodCount} style={{ marginTop: 20 }} />
      )}

      {/* Preview */}
      <div style={{ marginTop: 28 }}>
        <div className="label" style={{ marginBottom: 8 }}>Preview</div>
        <div className="terminal" style={{ padding: '14px 16px', maxHeight: 220, overflow: 'auto' }}>
          {targets.slice(0, 4).map(t => (
            <div key={t.id} style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--fg-muted)' }}>{t.user}@{t.host} </span>
              <span style={{ color: 'var(--coral)' }}>$ </span>
              <span>{cmd || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</span>
            </div>
          ))}
          {targets.length > 4 && (
            <div style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>… and {targets.length - 4} more host{targets.length - 4 === 1 ? '' : 's'}</div>
          )}
        </div>
      </div>

      {/* Typed confirmation (when prod danger) */}
      {needsTypedConfirm && (
        <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--prod)', borderRadius: 'var(--radius)', background: 'var(--prod-tint)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconWarn size={15} stroke="var(--prod)" />
            <span style={{ color: 'var(--prod)', fontSize: 13, fontWeight: 600 }}>Production confirmation required</span>
          </div>
          <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--fg)' }}>
            Type <span className="mono" style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--hair)' }}>{requiredPhrase}</span> to proceed.
          </div>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={requiredPhrase}
            className="mono"
            style={{
              width: '100%', padding: '8px 12px',
              border: '1px solid var(--hair-strong)',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13, outline: 'none',
            }}
          />
        </div>
      )}

      {/* Footer actions */}
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span className="mono">↵</span> execute · <span className="mono">esc</span> cancel
        </div>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button
          className={risk.level === 'danger' ? 'btn danger' : 'btn primary'}
          disabled={!cmd.trim() || !confirmReady}
          onClick={run}
        >
          <IconPlay size={12} />
          {risk.level === 'danger' ? 'Execute anyway' : `Run on ${targets.length}`}
          <IconArrowRight size={14} />
        </button>
      </div>

      {/* Modal style confirmation */}
      {confirmOpen && (
        <ConfirmModal
          risk={risk}
          cmd={cmd}
          prodCount={prodCount}
          style={riskStyle}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); onExecute(cmd); }}
        />
      )}
    </div>
  );
};

const RiskBanner = ({ risk, prodCount, style: extra }) => {
  const danger = risk.level === 'danger';
  return (
    <div style={{
      display: 'flex', gap: 12,
      padding: '12px 14px',
      borderRadius: 'var(--radius)',
      border: `1px solid ${danger ? 'var(--prod)' : 'var(--staging)'}`,
      background: danger ? 'var(--prod-tint)' : 'var(--staging-tint)',
      ...extra,
    }}>
      <IconWarn size={16} stroke={danger ? 'var(--prod)' : 'var(--staging)'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: danger ? 'var(--prod)' : 'var(--staging)', marginBottom: 2 }}>
          {danger ? 'Destructive command detected' : 'Caution advised'}
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.6 }}>
          {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
};

const ConfirmModal = ({ risk, cmd, prodCount, style, onClose, onConfirm }) => {
  const [count, setCount] = React.useState(5);
  React.useEffect(() => {
    if (style !== 'countdown') return;
    const t = setInterval(() => setCount(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [style]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(30,27,24,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 460, background: 'var(--surface)',
        border: '1px solid var(--hair-strong)',
        borderRadius: 8, padding: 24,
      }}>
        <IconWarn size={22} stroke="var(--prod)" />
        <h3 className="serif" style={{ fontSize: 20, margin: '10px 0 4px' }}>Confirm destructive action</h3>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
          You are about to run the following on {prodCount} production host{prodCount === 1 ? '' : 's'}:
        </p>
        <div className="mono" style={{ padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 4, fontSize: 12, marginBottom: 14 }}>
          {cmd}
        </div>
        <ul style={{ margin: '0 0 16px', paddingLeft: 16, fontSize: 12.5, color: 'var(--fg)' }}>
          {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn danger" disabled={style === 'countdown' && count > 0} onClick={onConfirm}>
            {style === 'countdown' && count > 0 ? `Hold · ${count}` : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Composer, RiskBanner, ConfirmModal });
