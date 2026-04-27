// Tweaks panel — visible when user enables Tweaks mode from the host toolbar

const TweaksPanel = ({ tweaks, setTweak }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 36,
      right: 20,
      width: 260,
      background: 'var(--surface)',
      border: '1px solid var(--hair-strong)',
      borderRadius: 8,
      padding: 14,
      zIndex: 60,
      boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div className="serif" style={{ fontSize: 14, fontWeight: 600 }}>Tweaks</div>
        <div className="label">live</div>
      </div>

      <Row label="Theme">
        <Seg value={tweaks.theme} options={[['light','Light'], ['dark','Dark']]} onChange={v => setTweak('theme', v)} />
      </Row>

      <Row label="Grid density">
        <Seg value={tweaks.gridLayout} options={[['3x3','3×3'], ['2x3','2×3'], ['1x6','1×6']]} onChange={v => setTweak('gridLayout', v)} />
      </Row>

      <Row label="Risk warning">
        <Seg value={tweaks.riskStyle} options={[['inline','Inline'], ['modal','Modal'], ['countdown','Hold']]} onChange={v => setTweak('riskStyle', v)} />
      </Row>

      <Row label="Command palette">
        <Seg value={tweaks.showPalette ? 'on' : 'off'} options={[['on','On'], ['off','Off']]} onChange={v => setTweak('showPalette', v === 'on')} />
      </Row>

      <div className="mono" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hair)', color: 'var(--fg-subtle)', fontSize: 10 }}>
        ⌘K command palette{tweaks.showPalette ? '' : ' · disabled'}
      </div>
    </div>
  );
};

const Row = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <div className="label" style={{ marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

const Seg = ({ value, options, onChange }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${options.length}, 1fr)`,
    border: '1px solid var(--hair)',
    borderRadius: 4,
    overflow: 'hidden',
  }}>
    {options.map(([v, l], i) => (
      <button key={v} onClick={() => onChange(v)} style={{
        border: 'none',
        borderLeft: i > 0 ? '1px solid var(--hair)' : 'none',
        background: value === v ? 'var(--coral)' : 'var(--surface)',
        color: value === v ? '#fff' : 'var(--fg-muted)',
        padding: '6px 0',
        fontSize: 11, fontWeight: 500,
        cursor: 'pointer',
      }}>{l}</button>
    ))}
  </div>
);

Object.assign(window, { TweaksPanel });
