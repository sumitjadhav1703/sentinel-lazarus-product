import { useMemo, useState } from 'react'
import { IconArrowRight, IconCheck, IconSearch, IconSettings, IconTerminal, IconX } from './icons.jsx'
import { EnvChip, StatusBadge } from './chrome.jsx'

export function Dashboard({ servers, recentCommands, selected, setSelected, onOpenTerminal, onCompose, onUpdateServer, onRemoveServer }) {
  const [envFilter, setEnvFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState(null)

  const filtered = useMemo(() => {
    const lowerQuery = query.toLowerCase()
    return servers.filter((server) => {
      if (envFilter !== 'all' && server.env !== envFilter) return false
      return `${server.id} ${server.host} ${server.region}`.toLowerCase().includes(lowerQuery)
    })
  }, [servers, envFilter, query])

  const counts = useMemo(() => servers.reduce((acc, server) => {
    if (server.env === 'prod') acc.prod++
    else if (server.env === 'staging') acc.staging++
    else if (server.env === 'dev') acc.dev++
    return acc
  }, { all: servers.length, prod: 0, staging: 0, dev: 0 }), [servers])

  const detailServer = servers.find((server) => server.id === detailId)
  const toggle = (id) => setSelected((current) => {
    const index = current.indexOf(id)
    if (index !== -1) {
      const next = [...current]
      next.splice(index, 1)
      return next
    }
    return [...current, id]
  })

  return (
    <section className="view-scroll">
      <div className="page-heading">
        <h1 className="serif">Servers</h1>
        <span className="mono">{filtered.length} of {servers.length}</span>
      </div>
      <p className="lede">Select one or more hosts, then open a terminal or run a command across the selection. Production hosts require confirmation on destructive commands.</p>

      <div className="toolbar">
        <label className="search-box">
          <IconSearch size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter hosts..." />
          <span className="kbd">/</span>
        </label>
        <div className="segmented">
          {['all', 'prod', 'staging', 'dev'].map((env) => (
            <button key={env} className={envFilter === env ? 'active' : ''} onClick={() => setEnvFilter(env)}>
              {env}<span>{counts[env]}</span>
            </button>
          ))}
        </div>
        <span className="toolbar-spacer" />
        {selected.length ? (
          <>
            <span className="mono muted">{selected.length} selected</span>
            <button className="btn ghost" onClick={() => setSelected([])}>Clear</button>
            <button className="btn primary" onClick={onCompose}><IconTerminal size={14} />Run command</button>
          </>
        ) : null}
      </div>

      <div className="server-table">
        <div className="table-head">
          <span /><span>Host</span><span>Environment</span><span>Region / User</span><span>Uptime</span><span>Load</span><span />
        </div>
        {filtered.map((server) => {
          const isSelected = selected.includes(server.id)
          return (
            <div key={server.id} className={`server-row ${isSelected ? 'selected' : ''}`} onClick={() => toggle(server.id)}>
              <span className="checkbox">{isSelected ? <IconCheck size={11} sw={2.5} /> : null}</span>
              <span><b className="mono">{server.host}</b><small className="mono">{server.id}</small></span>
              <EnvChip env={server.env} />
              <span className="mono muted">{server.region} / {server.user}</span>
              <span className="mono muted">{server.uptime}</span>
              <LoadBar value={server.load} />
              <span className="row-actions">
                <button className="row-action" aria-label={`Details for ${server.id}`} onClick={(event) => { event.stopPropagation(); setDetailId(server.id) }} title="Server details"><IconSettings size={14} /></button>
                <button className="row-action" onClick={(event) => { event.stopPropagation(); onOpenTerminal(server.id) }} title="Open terminal"><IconArrowRight size={14} /></button>
              </span>
            </div>
          )
        })}
      </div>

      {detailServer ? (
        <ServerDetailsPanel
          server={detailServer}
          onClose={() => setDetailId(null)}
          onRemove={() => {
            onRemoveServer?.(detailServer.id)
            setDetailId(null)
          }}
          onSave={(patch) => onUpdateServer?.(detailServer.id, patch)}
        />
      ) : null}

      <section className="recent-block">
        <div className="section-heading"><h2 className="serif">Recent</h2><span className="mono">last 24 hours</span></div>
        <div className="recent-list">
          {recentCommands.slice(0, 5).map((command) => (
            <div key={command.id}>
              <span className="mono">{command.cmd}</span>
              <span className="mono muted">{command.scope}</span>
              <StatusBadge status={command.status} />
              <span className="mono subtle">{command.ts}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

function ServerDetailsPanel({ server, onClose, onSave, onRemove }) {
  const [form, setForm] = useState(() => toServerForm(server))
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = () => onSave?.(form)

  return (
    <section className={`server-details accent-${form.env}`}>
      <header>
        <div>
          <span className="label">Server details</span>
          <h2 className="serif">{server.id}</h2>
        </div>
        <button className="icon-button" aria-label="Close server details" onClick={onClose}><IconX size={14} /></button>
      </header>
      <div className="field-grid">
        <Field label="Host"><Input ariaLabel="Server host" value={form.host} onChange={(value) => update('host', value)} /></Field>
        <Field label="Port"><Input ariaLabel="Server port" value={form.port} onChange={(value) => update('port', value)} /></Field>
        <Field label="User"><Input ariaLabel="Server user" value={form.user} onChange={(value) => update('user', value)} /></Field>
        <Field label="Region"><Input ariaLabel="Server region" value={form.region} onChange={(value) => update('region', value)} /></Field>
      </div>
      <Field label="Environment"><Segment options={['dev', 'staging', 'prod']} value={form.env} onChange={(value) => update('env', value)} /></Field>
      <Field label="Authentication"><Segment options={['key', 'agent', 'password']} value={form.authMethod} onChange={(value) => update('authMethod', value)} /></Field>
      <Field label="Key file"><Input ariaLabel="Server key file" value={form.keyPath} onChange={(value) => update('keyPath', value)} /></Field>
      <Field label="Tags"><Input ariaLabel="Server tags" value={form.tags} onChange={(value) => update('tags', value)} /></Field>
      <footer>
        <button className="btn danger" aria-label="Remove server" onClick={onRemove}>Remove</button>
        <span className="toolbar-spacer" />
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" aria-label="Save server" disabled={!form.host.trim()} onClick={save}>Save server</button>
      </footer>
    </section>
  )
}

function toServerForm(server) {
  return {
    host: server.host || '',
    port: String(server.port || 22),
    user: server.user || 'deploy',
    region: server.region || 'local',
    env: server.env || 'dev',
    authMethod: server.authMethod || 'key',
    keyPath: server.keyPath || '',
    tags: Array.isArray(server.tags) ? server.tags.join(', ') : ''
  }
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function Input({ ariaLabel, value, onChange }) {
  return <input aria-label={ariaLabel} className="mono" value={value} onChange={(event) => onChange(event.target.value)} />
}

function Segment({ options, value, onChange }) {
  return (
    <div className="segment">
      {options.map((option) => <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>{option}</button>)}
    </div>
  )
}

function LoadBar({ value }) {
  const pct = Math.min(1, value)
  return (
    <span className="load-cell">
      <i><b style={{ width: `${pct * 100}%` }} /></i>
      <em className="mono">{pct.toFixed(2)}</em>
    </span>
  )
}
