// Lazarus Sentinel — main app

const { useState, useEffect, useCallback } = React;

function App() {
  // Tweaks state
  const [tweaks, setTweaks] = useState(() => ({ ...window.__TWEAKS__ }));
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const setTweak = (k, v) => {
    setTweaks(prev => {
      const next = { ...prev, [k]: v };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  // Edit-mode wiring — register listener FIRST, then announce
  useEffect(() => {
    const onMessage = (e) => {
      const d = e.data || {};
      if (d.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tweaks.theme === 'dark');
  }, [tweaks.theme]);

  // View state
  const [view, setView] = useState('dashboard'); // dashboard | compose | console | history | settings
  const [selected, setSelected] = useState(['web-01', 'web-02', 'web-03', 'stg-web']);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addServerOpen, setAddServerOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (cmdK && tweaks.showPalette) { e.preventDefault(); setPaletteOpen(o => !o); }
      if (e.key === 'Escape') { setPaletteOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tweaks.showPalette]);

  const toggleTheme = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');

  const onCompose = () => { setView('compose'); setRunning(false); };
  const onExecute = (cmd) => {
    setCommand(cmd);
    setRunning(true);
    setView('console');
  };
  const onRerun = () => { setRunning(false); setTimeout(() => setRunning(true), 50); };

  const openSingleTerminal = (id) => {
    setSelected([id]);
    setView('compose');
  };

  const paletteAction = (a) => {
    if (a === 'compose')    onCompose();
    if (a === 'theme')      toggleTheme();
    if (a === 'add-server') setAddServerOpen(true);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--fg)',
    }}>
      <TitleBar theme={tweaks.theme} onToggleTheme={toggleTheme} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', borderStyle: 'solid', borderColor: 'rgb(0, 0, 0)' }}>
        <FloatingNav
          view={view}
          setView={setView}
          selectedCount={selected.length}
          onAddServer={() => setAddServerOpen(true)}
          theme={tweaks.theme}
          onToggleTheme={toggleTheme}
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {view === 'dashboard' && (
            <Dashboard
              servers={SERVERS}
              selected={selected}
              setSelected={setSelected}
              onOpenTerminal={openSingleTerminal}
              onCompose={onCompose}
            />
          )}
          {view === 'compose' && (
            <Composer
              servers={SERVERS}
              selected={selected}
              onCancel={() => setView('dashboard')}
              onExecute={onExecute}
              riskStyle={tweaks.riskStyle}
            />
          )}
          {view === 'console' && (
            <ExecutionConsole
              servers={SERVERS}
              selected={selected}
              running={running}
              command={command}
              onBack={() => setView('compose')}
              onRerun={onRerun}
              gridLayout={tweaks.gridLayout}
            />
          )}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && <SettingsView tweaks={tweaks} setTweak={setTweak} />}
        </main>
      </div>

      <StatusBar>
        <span>● connected · 8 hosts</span>
        <span style={{ color: 'var(--coral)' }}>safety: enabled</span>
        <span>session: miriam@lazarus</span>
        <span style={{ flex: 1 }} />
        {tweaks.showPalette && <span>⌘K palette</span>}
        <span>v0.4.2</span>
      </StatusBar>

      {tweaks.showPalette && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNav={setView}
          onRunCommand={paletteAction}
        />
      )}

      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} />}

      <AddServerModal
        open={addServerOpen}
        onClose={() => setAddServerOpen(false)}
        onAdd={(srv) => console.log('add server', srv)}
      />
    </div>
  );
}

// Minimal History + Settings screens

const HistoryView = () => (
  <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px 120px' }}>
    <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.015em' }}>History</h1>
    <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 24px', maxWidth: 560 }}>
      Every command you run, with outputs and privacy controls. Stored locally in SQLite.
    </p>
    <div style={{ border: '1px solid var(--hair)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
      <div className="label" style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 80px',
        gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--hair)', background: 'var(--bg)'
      }}>
        <span>Command</span><span>Scope</span><span>Status</span><span>Duration</span><span>When</span>
      </div>
      {[
        ...RECENT_COMMANDS,
        { cmd: 'docker ps', ts: '2d ago', scope: '5 servers', status: 'ok' },
        { cmd: 'tail -f /var/log/app.log', ts: '3d ago', scope: '1 server', status: 'ok' },
        { cmd: 'rm -rf /tmp/old-builds', ts: '3d ago', scope: '2 servers', status: 'fail' },
        { cmd: 'apt update && apt upgrade', ts: '5d ago', scope: '3 servers', status: 'ok' },
      ].map((c, i, arr) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 80px',
          gap: 12, alignItems: 'center',
          padding: '12px 16px',
          borderBottom: i < arr.length - 1 ? '1px solid var(--hair)' : 'none',
          fontSize: 12,
        }}>
          <span className="mono">{c.cmd}</span>
          <span className="mono" style={{ color: 'var(--fg-muted)' }}>{c.scope}</span>
          <StatusBadge status={c.status} />
          <span className="mono" style={{ color: 'var(--fg-muted)' }}>{(0.3 + Math.random() * 3).toFixed(1)}s</span>
          <span className="mono" style={{ color: 'var(--fg-subtle)' }}>{c.ts}</span>
        </div>
      ))}
    </div>
  </div>
);

const SettingsView = ({ tweaks, setTweak }) => (
  <div style={{ flex: 1, overflow: 'auto' }}>
    <div style={{ padding: '28px 32px 120px', maxWidth: 720, margin: '0 auto' }}>
    <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.015em' }}>Settings</h1>
    <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 28px' }}>
      Safety rules, key management, and data retention.
    </p>
    {[
      { title: 'Safety rules', desc: 'Detect destructive patterns before execution.', items: [
        ['rm -rf guard', 'on'], ['mkfs / dd guard', 'on'], ['Systemctl warnings', 'on'], ['Force-push warnings', 'on'],
      ] },
      { title: 'Keys', desc: 'SSH identities used to authenticate.', items: [
        ['~/.ssh/id_ed25519', 'default'], ['~/.ssh/lazarus_prod', 'prod-only'],
      ] },
      { title: 'Data', desc: 'What Sentinel stores locally.', items: [
        ['Command history', 'on'], ['Output logs', 'off'], ['Mask secrets', 'on'],
      ] },
    ].map(sec => (
      <div key={sec.title} style={{ marginBottom: 24 }}>
        <h3 className="serif" style={{ fontSize: 17, fontWeight: 500, margin: '0 0 2px' }}>{sec.title}</h3>
        <p style={{ color: 'var(--fg-muted)', fontSize: 12, margin: '0 0 10px' }}>{sec.desc}</p>
        <div style={{ border: '1px solid var(--hair)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          {sec.items.map(([k, v], i) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              borderBottom: i < sec.items.length - 1 ? '1px solid var(--hair)' : 'none',
              fontSize: 13,
            }}>
              <span className="mono" style={{ flex: 1 }}>{k}</span>
              <span className="mono label">{v}</span>
            </div>
          ))}
        </div>
      </div>
    ))}
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
