// Add Server modal — refined: paper-card on soft dim, no milky whites,
// sharper type hierarchy, proper dark-mode support, single column, no steps.

const AddServerModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = React.useState({
    id: '',
    host: '',
    port: '22',
    user: 'deploy',
    env: 'dev',
    region: 'us-east-1',
    authMethod: 'key',
    keyPath: '~/.ssh/id_ed25519',
    password: '',
    tags: '',
  });
  const [testing, setTesting] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setTesting(null);
      setForm(f => ({ ...f, id: '', host: '', tags: '' }));
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.id.trim() && form.host.trim();

  const test = () => {
    setTesting('running');
    setTimeout(() => setTesting(Math.random() > 0.15 ? 'ok' : 'fail'), 1200);
  };
  const submit = () => { if (valid) { onAdd && onAdd(form); onClose(); } };

  const envMeta = {
    dev:     { color: 'var(--dev)',     label: 'Development' },
    staging: { color: 'var(--staging)', label: 'Staging' },
    prod:    { color: 'var(--prod)',    label: 'Production' },
  }[form.env];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(30, 27, 24, 0.48)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fade 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 460,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--hair-strong)',
          borderRadius: 10,
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'pop 0.2s cubic-bezier(.2,.9,.3,1.05)',
        }}
      >
        {/* Accent rule colored by env */}
        <div style={{ height: 2, background: envMeta.color, transition: 'background 0.2s' }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ marginBottom: 4 }}>New host</div>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
              Add server
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--fg-muted)' }}>
              Sentinel will store credentials locally and never transmit them.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            height: 28, width: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', color: 'var(--fg-muted)',
            borderRadius: 6, cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 24px 8px' }}>
          {/* Environment — visual anchor, goes first */}
          <Section title="Environment">
            <EnvSegment value={form.env} onChange={v => set('env', v)} />
          </Section>

          <Divider />

          <Section title="Connection">
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Alias">
                <Input value={form.id} onChange={v => set('id', v)} placeholder="web-04" mono autoFocus />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
                <Field label="Host">
                  <Input value={form.host} onChange={v => set('host', v)} placeholder="web-04.prod.lzrs.io" mono />
                </Field>
                <Field label="Port">
                  <Input value={form.port} onChange={v => set('port', v)} mono />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="User">
                  <Input value={form.user} onChange={v => set('user', v)} mono />
                </Field>
                <Field label="Region">
                  <Select value={form.region} onChange={v => set('region', v)}
                    options={['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'local']} />
                </Field>
              </div>
            </div>
          </Section>

          <Divider />

          <Section title="Authentication">
            <AuthSegment value={form.authMethod} onChange={v => set('authMethod', v)} />
            <div style={{ marginTop: 10 }}>
              {form.authMethod === 'key' && (
                <Field label="Key file">
                  <Input value={form.keyPath} onChange={v => set('keyPath', v)} mono />
                </Field>
              )}
              {form.authMethod === 'password' && (
                <Field label="Password" hint="Stored in OS keychain">
                  <Input value={form.password} onChange={v => set('password', v)} type="password" mono />
                </Field>
              )}
              {form.authMethod === 'agent' && (
                <div className="mono" style={{
                  padding: '10px 12px', fontSize: 12, color: 'var(--fg-muted)',
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--hair)',
                  borderRadius: 6,
                }}>
                  Uses forwarded socket <span style={{ color: 'var(--fg)' }}>$SSH_AUTH_SOCK</span>
                </div>
              )}
            </div>

            {/* Test connection row */}
            <div style={{
              marginTop: 12,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'var(--bg-sunken)',
              border: '1px solid var(--hair)',
            }}>
              <TestStatus state={testing} />
              <div className="mono" style={{ flex: 1, fontSize: 11, color: 'var(--fg-muted)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ssh {form.user}@{form.host || 'host'} -p {form.port}
              </div>
              <button
                className="btn"
                onClick={test}
                disabled={testing === 'running' || !valid}
                style={{ height: 26, padding: '0 10px', fontSize: 12 }}
              >
                {testing === 'running' ? 'Probing…' : testing === 'ok' ? 'Retest' : 'Test'}
              </button>
            </div>
          </Section>

          <Divider />

          <Section title="Tags" hint="optional">
            <Input value={form.tags} onChange={v => set('tags', v)} placeholder="frontend, edge, canary" />
          </Section>

          {form.env === 'prod' && (
            <div style={{
              marginTop: 14,
              padding: '10px 12px', borderRadius: 6,
              background: 'var(--prod-tint)',
              border: '1px solid var(--prod)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <IconWarn size={14} stroke="var(--prod)" />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--fg)' }}>
                Marked <b style={{ color: 'var(--prod)' }}>production</b>. Destructive commands will require typed confirmation.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--hair)',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div className="mono" style={{ flex: 1, fontSize: 11, color: 'var(--fg-subtle)' }}>
            <span className="kbd">esc</span> to close · <span className="kbd">⏎</span> to save
          </div>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <IconCheck size={13} /> Add server
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pop {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────

const Section = ({ title, hint, children }) => (
  <div style={{ padding: '14px 0' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <span className="label">{title}</span>
      {hint && <span className="label" style={{ color: 'var(--fg-subtle)' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: 'var(--hair)', margin: '0 -24px' }} />
);

const Field = ({ label, hint, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}>{label}</span>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{hint}</span>}
    </div>
    {children}
  </label>
);

const Input = ({ value, onChange, placeholder, mono, type = 'text', autoFocus }) => {
  const ref = React.useRef(null);
  React.useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={mono ? 'mono' : ''}
      style={{
        width: '100%',
        padding: '8px 11px',
        height: 32,
        border: '1px solid var(--hair-strong)',
        background: 'var(--bg-sunken)',
        borderRadius: 5,
        fontSize: 13,
        color: 'var(--fg)',
        outline: 'none',
        transition: 'border-color 0.12s, box-shadow 0.12s, background 0.12s',
      }}
      onFocus={e => {
        e.target.style.borderColor = 'var(--coral)';
        e.target.style.background = 'var(--surface)';
        e.target.style.boxShadow = '0 0 0 3px color-mix(in oklab, var(--coral) 18%, transparent)';
      }}
      onBlur={e => {
        e.target.style.borderColor = 'var(--hair-strong)';
        e.target.style.background = 'var(--bg-sunken)';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
};

const Select = ({ value, onChange, options }) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="mono"
      style={{
        width: '100%',
        padding: '8px 30px 8px 11px',
        height: 32,
        border: '1px solid var(--hair-strong)',
        background: 'var(--bg-sunken)',
        borderRadius: 5,
        fontSize: 12,
        color: 'var(--fg)',
        outline: 'none',
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <IconChevron size={12} style={{
      position: 'absolute', right: 10, top: '50%',
      transform: 'translateY(-50%) rotate(90deg)',
      color: 'var(--fg-muted)', pointerEvents: 'none',
    }} />
  </div>
);

const EnvSegment = ({ value, onChange }) => {
  const opts = [
    { v: 'dev',     label: 'Dev',     color: 'var(--dev)' },
    { v: 'staging', label: 'Staging', color: 'var(--staging)' },
    { v: 'prod',    label: 'Prod',    color: 'var(--prod)' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
    }}>
      {opts.map(o => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              position: 'relative',
              padding: '10px 12px',
              border: `1px solid ${active ? o.color : 'var(--hair-strong)'}`,
              background: active ? 'var(--surface)' : 'var(--bg-sunken)',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.12s',
              boxShadow: active ? `0 0 0 3px color-mix(in oklab, ${o.color} 14%, transparent)` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color }} />
              <span className="mono" style={{
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: active ? o.color : 'var(--fg-muted)', fontWeight: 600,
              }}>{o.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const AuthSegment = ({ value, onChange }) => {
  const opts = [['key', 'SSH key'], ['agent', 'ssh-agent'], ['password', 'Password']];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      padding: 3, gap: 3,
      background: 'var(--bg-sunken)',
      border: '1px solid var(--hair)',
      borderRadius: 6,
    }}>
      {opts.map(([v, l]) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              borderRadius: 4,
              padding: '6px 0', fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px var(--hair)' : 'none',
              transition: 'all 0.12s',
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
};

const TestStatus = ({ state }) => {
  if (state === 'ok')   return <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />;
  if (state === 'fail') return <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fail)' }} />;
  if (state === 'running') return <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)' }} />;
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--hair-strong)' }} />;
};

Object.assign(window, { AddServerModal });
