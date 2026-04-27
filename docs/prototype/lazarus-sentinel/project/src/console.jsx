// Execution Console — grid of simulated terminals streaming output

const ExecutionConsole = ({ servers, selected, running, command, onBack, onRerun, gridLayout }) => {
  const targets = servers.filter(s => selected.includes(s.id));
  const [statuses, setStatuses] = React.useState({});

  const onStatus = React.useCallback((id, status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  }, []);

  React.useEffect(() => { setStatuses({}); }, [running, command]);

  const counts = {
    running: targets.filter(t => !statuses[t.id]).length,
    ok:      Object.values(statuses).filter(s => s === 'ok').length,
    fail:    Object.values(statuses).filter(s => s === 'fail').length,
  };

  // Grid template
  const gridCols = ({
    '3x3': 'repeat(3, 1fr)',
    '2x3': 'repeat(2, 1fr)',
    '1x6': 'repeat(1, 1fr)',
  })[gridLayout] || 'repeat(3, 1fr)';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px 120px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <button onClick={onBack} className="btn ghost" style={{ height: 24, padding: '0 6px', color: 'var(--fg-muted)' }}>
          ← Compose
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 20, flexWrap: 'wrap', rowGap: 16 }}>
        <div style={{ minWidth: 0, flex: '1 1 340px' }}>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: '6px 0 6px', letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>
            Execution Console
          </h1>
          <div className="mono" style={{ fontSize: 13, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: 'var(--coral)', flexShrink: 0 }}>$</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {command || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <CounterPill label="running" value={counts.running} color="var(--coral)" pulse />
          <CounterPill label="ok"      value={counts.ok}      color="var(--success)" />
          <CounterPill label="failed"  value={counts.fail}    color="var(--fail)" />
          <button className="btn" onClick={onRerun}>
            <IconPlay size={12} /> Rerun
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 12,
        alignContent: 'start',
      }}>
        {targets.map(t => (
          <TerminalTile
            key={t.id + (running ? '-r' : '-s')}
            server={t}
            command={command}
            running={running}
            onStatus={(s) => onStatus(t.id, s)}
          />
        ))}
      </div>
    </div>
  );
};

const CounterPill = ({ label, value, color, pulse }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span className={pulse && value > 0 ? 'pulse' : ''} style={{
      width: 8, height: 8, borderRadius: '50%', background: color,
    }} />
    <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)' }}>{value}</span>
    <span className="label">{label}</span>
  </div>
);

Object.assign(window, { ExecutionConsole, CounterPill });
