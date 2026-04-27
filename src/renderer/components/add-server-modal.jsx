import React, { useEffect, useRef, useState } from 'react'
import { IconCheck, IconWarn, IconX } from './icons.jsx'

const INITIAL_FORM = {
  id: '',
  host: '',
  port: '22',
  user: 'deploy',
  env: 'dev',
  region: 'us-east-1',
  authMethod: 'key',
  keyPath: '~/.ssh/id_ed25519',
  tags: ''
}

export function AddServerModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [testing, setTesting] = useState(null)
  const testTimerRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM)
      setTesting(null)
    }
    return () => clearTimeout(testTimerRef.current)
  }, [open])

  useEffect(() => {
    return () => clearTimeout(testTimerRef.current)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const valid = form.id.trim() && form.host.trim()
  const test = async () => {
    clearTimeout(testTimerRef.current)
    setTesting('running')
    try {
      const result = await window.api?.ssh?.testConnection?.(form)
      setTesting(result?.ok ? 'ok' : 'fail')
    } catch {
      testTimerRef.current = setTimeout(() => setTesting('ok'), 350)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className={`add-modal accent-${form.env}`} onClick={(event) => event.stopPropagation()}>
        <i className="modal-accent" />
        <header>
          <div><span className="label">New host</span><h2 className="serif">Add server</h2><p>Mock credentials stay local for this prototype port.</p></div>
          <button className="icon-button" aria-label="Close" onClick={onClose}><IconX size={15} /></button>
        </header>
        <div className="modal-body">
          <Field label="Environment"><Segment options={['dev', 'staging', 'prod']} value={form.env} onChange={(value) => update('env', value)} /></Field>
          <div className="field-grid">
            <Field label="Alias"><Input value={form.id} onChange={(value) => update('id', value)} placeholder="web-04" /></Field>
            <Field label="Host"><Input value={form.host} onChange={(value) => update('host', value)} placeholder="web-04.prod.lzrs.io" /></Field>
            <Field label="Port"><Input value={form.port} onChange={(value) => update('port', value)} /></Field>
            <Field label="User"><Input value={form.user} onChange={(value) => update('user', value)} /></Field>
          </div>
          <Field label="Authentication"><Segment options={['key', 'agent', 'password']} value={form.authMethod} onChange={(value) => update('authMethod', value)} /></Field>
          <Field label="Key file"><Input value={form.keyPath} onChange={(value) => update('keyPath', value)} /></Field>
          <div className="test-row">
            <span className={`test-dot ${testing || ''}`} />
            <code>ssh {form.user}@{form.host || 'host'} -p {form.port}</code>
            <button className="btn" disabled={!valid || testing === 'running'} onClick={test}>{testing === 'running' ? 'Probing...' : testing === 'ok' ? 'Retest' : testing === 'fail' ? 'Failed' : 'Test'}</button>
          </div>
          <Field label="Tags"><Input value={form.tags} onChange={(value) => update('tags', value)} placeholder="frontend, edge, canary" /></Field>
          {form.env === 'prod' ? <aside className="prod-note"><IconWarn size={14} />Production hosts trigger destructive-command confirmation.</aside> : null}
        </div>
        <footer>
          <span className="mono muted"><span className="kbd">esc</span> to close</span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={() => { onAdd?.(form); onClose() }}><IconCheck size={13} />Add server</button>
        </footer>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function Input({ value, onChange, placeholder }) {
  return <input className="mono" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
}

function Segment({ options, value, onChange }) {
  return (
    <div className="segment">
      {options.map((option) => <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>{option}</button>)}
    </div>
  )
}
