import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconPlay, IconX } from './icons.jsx'
import { TerminalTile } from './terminal-tile.jsx'

export function ExecutionConsole({ servers, selected, running, command, executionPlan, captureOutput = false, onBack, onRerun, onCancel, onComplete }) {
  const [statuses, setStatuses] = useState({})
  const [completionKey, setCompletionKey] = useState(null)
  const [cancelToken, setCancelToken] = useState(0)
  const outputLogsRef = useRef({})
  const targets = useMemo(() => {
    const selectedSet = new Set(selected)
    return servers.filter((server) => selectedSet.has(server.id))
  }, [servers, selected])
  const plansByServer = useMemo(() => new Map((executionPlan?.targets || []).map((target) => [target.serverId, target])), [executionPlan])

  const onStatus = useCallback((id, status) => {
    setStatuses((current) => ({ ...current, [id]: status }))
  }, [])
  const onOutput = useCallback((id, chunk) => {
    if (!captureOutput) return
    outputLogsRef.current = {
      ...outputLogsRef.current,
      [id]: [...(outputLogsRef.current[id] || []), chunk]
    }
  }, [captureOutput])

  useEffect(() => {
    setStatuses({})
    setCompletionKey(null)
    outputLogsRef.current = {}
  }, [command, running, selected])

  const ok = Object.values(statuses).filter((status) => status === 'ok').length
  const fail = Object.values(statuses).filter((status) => status === 'fail').length
  const cancelled = Object.values(statuses).filter((status) => status === 'cancelled').length
  const active = running && command ? Math.max(0, targets.length - ok - fail - cancelled) : 0

  const cancelExecution = () => {
    setCancelToken((current) => current + 1)
    onCancel?.()
  }

  useEffect(() => {
    if (!running || !command || targets.length === 0) return
    if (ok + fail + cancelled !== targets.length) return
    const key = `${command}-${selected.join(',')}-${ok}-${fail}-${cancelled}`
    if (completionKey === key) return
    setCompletionKey(key)
    const outputLogs = captureOutput ? outputLogsRef.current : null
    onComplete?.({
      status: cancelled > 0 ? 'cancelled' : fail > 0 ? 'fail' : 'ok',
      ok,
      fail,
      ...(cancelled > 0 ? { cancelled } : {}),
      ...(outputLogs && Object.keys(outputLogs).length ? { outputLogs } : {})
    })
  }, [running, command, targets.length, selected, ok, fail, cancelled, completionKey, captureOutput, onComplete])

  return (
    <section className="view-scroll console-view">
      <button className="btn ghost back-button" onClick={onBack}>← Compose</button>
      <div className="console-heading">
        <div>
          <h1 className="serif">Execution Console</h1>
          <p className="mono"><span>$</span>{command || 'No command queued'}</p>
        </div>
        <div className="counters">
          <Counter label="running" value={active} tone="running" />
          <Counter label="ok" value={ok} tone="ok" />
          <Counter label="failed" value={fail} tone="fail" />
          {active > 0 ? <button className="btn danger" aria-label="Stop execution" onClick={cancelExecution}><IconX size={12} />Stop</button> : null}
          <button className="btn" onClick={() => { setStatuses({}); onRerun() }}><IconPlay size={12} />Rerun</button>
        </div>
      </div>
      <div className="terminal-grid">
        {targets.map((target) => (
          <TerminalTile key={`${target.id}-${command}-${executionPlan?.id || 'local'}`} server={target} command={command} running={running} cancelToken={cancelToken} executionTarget={plansByServer.get(target.id)} onStatus={onStatus} onOutput={onOutput} />
        ))}
      </div>
    </section>
  )
}

function Counter({ label, value, tone }) {
  return <span className={`counter ${tone}`}><i /> <b className="mono">{value}</b> <em>{label}</em></span>
}
