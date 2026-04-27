// TerminalTile — one server's live-streaming output

const TerminalTile = ({ server, command, running, onStatus }) => {
  const [lines, setLines] = React.useState([]);
  const [status, setStatus] = React.useState('running');
  const tickRef = React.useRef([]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    // reset and play script
    setLines([]);
    setStatus('running');
    tickRef.current.forEach(clearTimeout);
    tickRef.current = [];

    if (!running || !command) return;

    const script = scriptFor(command, server.id);
    let acc = 0;
    script.forEach((step, idx) => {
      acc += step.delay + Math.random() * 120;
      const t = setTimeout(() => {
        setLines(prev => [...prev, { line: step.line, stream: step.stream }]);
        if (step.status) {
          setStatus(step.status);
          onStatus && onStatus(step.status);
        }
      }, acc);
      tickRef.current.push(t);
    });

    return () => tickRef.current.forEach(clearTimeout);
  }, [running, command, server.id]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const envAccent = server.env === 'prod' ? 'var(--prod)'
                  : server.env === 'staging' ? 'var(--staging)'
                  : 'var(--dev)';

  const statusColor = status === 'ok' ? 'var(--success)'
                    : status === 'fail' ? 'var(--fail)'
                    : 'var(--coral)';
  const statusLabel = status === 'ok' ? 'succeeded'
                    : status === 'fail' ? 'failed'
                    : 'running';

  return (
    <div className="fade-in" style={{
      background: 'var(--surface)',
      border: '1px solid var(--hair)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 200,
      position: 'relative',
    }}>
      {/* env accent strip */}
      <div style={{ height: 2, background: envAccent }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid var(--hair)',
        background: 'var(--bg)',
      }}>
        <EnvChip env={server.env} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {server.host}
          </div>
        </div>
        <span className="mono" style={{ fontSize: 10, color: statusColor, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} className={status === 'running' ? 'pulse' : ''} />
          {statusLabel}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="terminal"
        style={{
          flex: 1, padding: 12, border: 'none', borderRadius: 0,
          overflow: 'auto', minHeight: 130,
        }}
      >
        {lines.map((l, i) => {
          const color = l.stream === 'err'  ? 'var(--fail)'
                      : l.stream === 'ok'   ? 'var(--success)'
                      : l.stream === 'cmd'  ? 'var(--coral)'
                      : 'var(--fg)';
          return (
            <div key={i} className="fade-in" style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {l.line || '\u00a0'}
            </div>
          );
        })}
        {status === 'running' && <span className="blink">▊</span>}
      </div>
    </div>
  );
};

Object.assign(window, { TerminalTile });
