import React from 'react'
import { useMemo, useRef, useState, useEffect } from 'react'
import { assessRisk, getRequiredConfirmationPhrase, isConfirmationPhraseValid } from '../lib/data.js'
import { EnvChip } from './chrome.jsx'
import { IconArrowRight, IconPlay, IconWarn } from './icons.jsx'

const SUGGESTIONS = ['docker compose up -d', 'git pull && npm ci', 'systemctl status nginx', 'df -h', 'rm -rf /var/log/*']

export function Composer({ servers, selected, settings, onCancel, onExecute }) {
  const [command, setCommand] = useState('docker compose up -d')
  const [typed, setTyped] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const targets = useMemo(() => {
    const selectedSet = new Set(selected)
    return servers.filter((server) => selectedSet.has(server.id))
  }, [servers, selected])
  const risk = assessRisk(command, targets, settings)
  const requiredPhrase = getRequiredConfirmationPhrase(risk, targets)
  const confirmReady = isConfirmationPhraseValid(typed, requiredPhrase)
  const canExecute = targets.length > 0 && command.trim() && confirmReady

  return (
    <section className="view-scroll composer-view">
      <button className="btn ghost back-button" onClick={onCancel}>← Servers</button>
      <div className="page-heading"><h1 className="serif">Compose command</h1></div>
      <p className="lede">Preview on {targets.length} {targets.length === 1 ? 'host' : 'hosts'} before execution. Sentinel inspects the command for destructive patterns.</p>

      <div className="form-block">
        <div className="label">Targets / {targets.length}</div>
        <div className="target-chips">
          {targets.map((target) => <span key={target.id}><EnvChip env={target.env} /><b className="mono">{target.host}</b></span>)}
        </div>
      </div>

      <div className="form-block">
        <div className="label">Command</div>
        <label className={`command-input risk-${risk.level}`}>
          <span className="mono">$</span>
          <input ref={inputRef} className="mono" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && canExecute) onExecute(command)
          }} placeholder="Enter command..." />
          <span className="kbd">enter</span>
        </label>
        <div className="suggestions">
          {SUGGESTIONS.map((item) => <button key={item} className="mono" onClick={() => setCommand(item)}>{item}</button>)}
        </div>
      </div>

      {risk.level !== 'safe' ? <RiskBanner risk={risk} /> : null}

      <div className="form-block">
        <div className="label">Preview</div>
        <div className="terminal preview-terminal">
          {targets.slice(0, 4).map((target) => (
            <div key={target.id}><span>{target.user}@{target.host}</span> <b>$</b> {command || '...'}</div>
          ))}
          {targets.length > 4 ? <small>... and {targets.length - 4} more hosts</small> : null}
        </div>
      </div>

      {requiredPhrase ? (
        <div className="prod-confirm">
          <h3><IconWarn size={15} />Production confirmation required</h3>
          <p>Type <code>{requiredPhrase}</code> to proceed.</p>
          <input className="mono" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={requiredPhrase} />
        </div>
      ) : null}

      <div className="composer-actions">
        <span className="muted"><span className="mono">enter</span> execute / <span className="mono">esc</span> cancel</span>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className={risk.level === 'danger' ? 'btn danger' : 'btn primary'} disabled={!canExecute} onClick={() => onExecute(command)}>
          <IconPlay size={12} />{risk.level === 'danger' ? 'Execute anyway' : `Run on ${targets.length}`}<IconArrowRight size={14} />
        </button>
      </div>
    </section>
  )
}

function RiskBanner({ risk }) {
  return (
    <aside className={`risk-banner ${risk.level}`}>
      <IconWarn size={16} />
      <div>
        <h3>{risk.level === 'danger' ? 'Destructive command detected' : 'Caution advised'}</h3>
        <ul>{risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </div>
    </aside>
  )
}
