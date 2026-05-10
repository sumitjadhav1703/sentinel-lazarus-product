import { StatusBadge } from './chrome.jsx'

export function HistoryView({ history }) {
  return (
    <section className="view-scroll">
      <div className="page-heading"><h1 className="serif">History</h1></div>
      <p className="lede">Local command history for simulated runs. Backend execution and durable storage are planned for later steps.</p>
      <div className="history-table">
        <div className="history-head"><span>Command</span><span>Scope</span><span>Status</span><span>Duration</span><span>When</span></div>
        {history.map((row) => (
          <div key={row.id}>
            <span className="mono">{row.cmd}</span>
            <span className="mono muted">{row.scope}</span>
            <StatusBadge status={row.status} />
            <span className="mono muted">{row.duration}</span>
            <span className="mono subtle">{row.ts}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SettingsView({ settings, theme, onToggleTheme, onUpdateSettings }) {
  const safetyRules = [
    ['rm -rf guard', 'rmRfGuard'],
    ['mkfs / dd guard', 'diskGuard'],
    ['Systemctl warnings', 'serviceWarnings'],
    ['Force-push warnings', 'forcePushWarnings']
  ]
  const toggleSafetyRule = (key) => {
    onUpdateSettings({ safetyRules: { [key]: !settings.safetyRules[key] } })
  }
  const toggleOutputLogs = () => {
    onUpdateSettings({ data: { outputLogs: settings.data.outputLogs === 'on' ? 'off' : 'on' } })
  }
  const updateRetention = (event) => {
    const value = Number.parseInt(event.target.value, 10)
    if (Number.isFinite(value)) onUpdateSettings({ historyRetentionDays: value })
  }

  return (
    <section className="view-scroll settings-view">
      <div className="page-heading"><h1 className="serif">Settings</h1></div>
      <p className="lede">Safety rules, key management, and local retention settings backed by the renderer data model.</p>
      <button className="btn primary" onClick={onToggleTheme}>Theme: {theme}</button>
      <button className="btn" onClick={() => onUpdateSettings({ maskSecrets: !settings.maskSecrets })}>Mask secrets: {settings.maskSecrets ? 'on' : 'off'}</button>

      <section className="settings-section">
        <h2 className="serif">Safety rules</h2>
        <p>Detect destructive patterns before execution.</p>
        <div>
          {safetyRules.map(([label, key]) => (
            <div key={key}>
              <span className="mono">{label}</span>
              <button
                aria-label={`Toggle ${label}`}
                className="settings-toggle mono"
                onClick={() => toggleSafetyRule(key)}
                type="button"
              >
                {settings.safetyRules[key] ? 'on' : 'off'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="serif">Keys</h2>
        <p>Configured identities used for connection attempts.</p>
        <div>
          {settings.keys.map((key) => (
            <div key={key.path}><span className="mono">{key.path}</span><b className="mono">{key.scope}</b></div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="serif">Data</h2>
        <p>Local storage controls for command records and terminal output.</p>
        <div>
          <div><span className="mono">Command history</span><b className="mono">{settings.data.commandHistory}</b></div>
          <div>
            <span className="mono">Retention</span>
            <label className="settings-number">
              <input
                aria-label="Retention days"
                min="1"
                max="365"
                onChange={updateRetention}
                type="number"
                value={settings.historyRetentionDays}
              />
              <span className="mono">days</span>
            </label>
          </div>
          <div>
            <span className="mono">Output logs</span>
            <button
              aria-label="Toggle output logs"
              className="settings-toggle mono"
              onClick={toggleOutputLogs}
              type="button"
            >
              {settings.data.outputLogs}
            </button>
          </div>
          <div>
            <span className="mono">Mask secrets</span>
            <button
              aria-label="Toggle mask secrets"
              className="settings-toggle mono"
              onClick={() => onUpdateSettings({ maskSecrets: !settings.maskSecrets })}
              type="button"
            >
              {settings.maskSecrets ? 'on' : 'off'}
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}
