// App chrome: title bar, sidebar, status bar

const TitleBar = ({ theme, onToggleTheme }) => {
  return (
    <div style={{
      height: 36,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--hair)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 12px',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={dotStyle('#E88575')} />
          <span style={dotStyle('#D4B37C')} />
          <span style={dotStyle('#9DB38E')} />
        </div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.08em' }}>
        lazarus-sentinel ·  <span style={{ color: 'var(--fg)' }}>miriam@workspace</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <button className="btn ghost" onClick={onToggleTheme} style={{ height: 24, padding: '0 8px' }} title="Toggle theme">
          {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
        </button>
      </div>
    </div>
  );
};

const dotStyle = (color) => ({
  width: 11, height: 11, borderRadius: '50%',
  background: color, border: '1px solid rgba(0,0,0,0.15)',
});

const Sidebar = ({ view, setView, selectedCount, onAddServer }) => {
  // Replaced by FloatingNav — kept as a shim so nothing else breaks.
  return null;
};

const FloatingNav = ({ view, setView, selectedCount, onAddServer, theme, onToggleTheme }) => {
  const items = [
    { id: 'dashboard', label: 'Servers',  icon: IconServer,   badge: null },
    { id: 'console',   label: 'Console',  icon: IconGrid,     badge: selectedCount > 0 ? selectedCount : null },
    { id: 'history',   label: 'History',  icon: IconHistory,  badge: null },
    { id: 'settings',  label: 'Settings', icon: IconSettings, badge: null },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 36,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: 6,
      background: 'color-mix(in oklab, var(--surface) 72%, transparent)',
      backdropFilter: 'blur(18px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      border: '1px solid var(--hair-strong)',
      borderRadius: 999,
      boxShadow: '0 10px 30px -12px rgba(30,27,24,0.25), 0 0 0 1px rgba(255,255,255,0.35) inset',
    }}>
      {/* Wordmark pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 10px',
        borderRight: '1px solid var(--hair)',
        marginRight: 4,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 6,
          background: 'linear-gradient(135deg, var(--coral), rgba(217,119,87,0.55))',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
          color: '#fff', fontSize: 11, fontWeight: 700,
          fontFamily: 'Source Serif 4, serif', fontStyle: 'italic',
        }}>L</span>
        <span className="serif" style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>
          Lazarus <span style={{ fontStyle: 'italic', color: 'var(--fg-muted)' }}>Sentinel</span>
        </span>
      </div>

      {items.map(item => {
        const I = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 12px',
              height: 32,
              border: 'none',
              background: active ? 'var(--coral)' : 'transparent',
              color: active ? '#fff' : 'var(--fg-muted)',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--fg)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; } }}
          >
            <I size={14} />
            {item.label}
            {item.badge != null && (
              <span className="mono" style={{
                fontSize: 9.5, fontWeight: 700,
                background: active ? 'rgba(255,255,255,0.25)' : 'var(--coral)',
                color: '#fff',
                padding: '1px 6px', borderRadius: 8,
                marginLeft: 2,
              }}>{item.badge}</span>
            )}
          </button>
        );
      })}

      <div style={{ width: 1, height: 20, background: 'var(--hair)', margin: '0 4px' }} />

      <button onClick={onAddServer} className="btn ghost" title="Add server" style={{
        height: 32, width: 32, padding: 0, borderRadius: 999,
        color: 'var(--fg-muted)', background: 'transparent',
      }}>
        <IconPlus size={14} />
      </button>
      <button onClick={onToggleTheme} className="btn ghost" title="Toggle theme" style={{
        height: 32, width: 32, padding: 0, borderRadius: 999,
        color: 'var(--fg-muted)', background: 'transparent',
      }}>
        {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
      </button>
    </div>
  );
};

const StatusBar = ({ children }) => (
  <div className="mono" style={{
    height: 24,
    borderTop: '1px solid var(--hair)',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: 10.5,
    color: 'var(--fg-muted)',
    letterSpacing: '0.04em',
    gap: 16,
  }}>
    {children}
  </div>
);

const EnvChip = ({ env, size = 'sm' }) => {
  const label = env.toUpperCase();
  return (
    <span className={`chip chip-${env}`} style={size === 'lg' ? { fontSize: 11, padding: '3px 10px' } : null}>
      <span className="dot" />
      {label}
    </span>
  );
};

// Command palette (Cmd+K)
const CommandPalette = ({ open, onClose, onNav, onRunCommand }) => {
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;

  const actions = [
    { label: 'Go to Servers',        kind: 'nav',  nav: 'dashboard' },
    { label: 'Go to Execution Console', kind: 'nav', nav: 'console' },
    { label: 'Go to History',        kind: 'nav',  nav: 'history' },
    { label: 'Go to Settings',       kind: 'nav',  nav: 'settings' },
    { label: 'New multi-server command', kind: 'action', run: 'compose' },
    { label: 'Add server',           kind: 'action', run: 'add-server' },
    { label: 'Toggle theme',         kind: 'action', run: 'theme' },
  ];
  const filtered = actions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '14vh', zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520,
        background: 'var(--surface)',
        border: '1px solid var(--hair-strong)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--hair)' }}>
          <IconSearch size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search commands, servers, runbooks…"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: 14, color: 'var(--fg)',
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 320, overflow: 'auto', padding: 6 }}>
          {filtered.map((a, i) => (
            <div
              key={i}
              onClick={() => { a.kind === 'nav' ? onNav(a.nav) : onRunCommand(a.run); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <IconArrowRight size={13} />
              <span>{a.label}</span>
              <span style={{ flex: 1 }} />
              <span className="label">{a.kind}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No matches</div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TitleBar, Sidebar, FloatingNav, StatusBar, EnvChip, CommandPalette });
