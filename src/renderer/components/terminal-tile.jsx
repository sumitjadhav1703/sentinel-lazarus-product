import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { EnvChip } from './chrome.jsx'

export function TerminalTile({ server, command, running, cancelToken = 0, executionTarget, onStatus, onOutput }) {
  const [lines, setLines] = useState([])
  const [status, setStatus] = useState('idle')
  const timers = useRef([])
  const localSessionRef = useRef(null)
  const terminalMountRef = useRef(null)
  const terminalRef = useRef(null)
  const fitRef = useRef(null)
  const resizeBackendRef = useRef(() => {})
  const lastCancelTokenRef = useRef(cancelToken)

  useEffect(() => {
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 12,
      rows: 12,
      theme: {
        background: '#00000000',
        foreground: '#f4eee8',
        cursor: '#d97757'
      }
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalMountRef.current)
    fitAddon.fit()
    terminalRef.current = terminal
    fitRef.current = fitAddon

    const onResize = () => resizeBackendRef.current()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      terminal.dispose()
      terminalRef.current = null
      fitRef.current = null
    }
  }, [server.id])

  const writeTerminal = (data, stream = 'out') => {
    setLines((current) => [...current, { line: data, stream }])
    terminalRef.current?.write(data)
    onOutput?.(server.id, data)
  }

  const fitAndResizeBackend = () => {
    fitRef.current?.fit()
    const sessionId = localSessionRef.current
    const terminal = terminalRef.current
    if (!sessionId || !terminal?.cols || !terminal?.rows) return
    Promise.resolve(window.api?.terminal?.resize?.(sessionId, terminal.cols, terminal.rows)).catch(() => {})
  }
  resizeBackendRef.current = fitAndResizeBackend

  const startTerminalSession = async (sessionState) => {
    try {
      const sessionOptions = { ...server, cols: 100, rows: 28 }
      const session = executionTarget?.mode === 'ssh'
        ? await window.api.terminal.createSsh(sessionOptions)
        : await window.api.terminal.createLocal({ cols: 100, rows: 28 })
      if (sessionState.cancelled) {
        await window.api.terminal.close(session.id)
        return
      }

      localSessionRef.current = session.id
      fitAndResizeBackend()
      sessionState.unsubscribe = window.api.terminal.onEvent((event) => {
        if (event.sessionId !== session.id) return
        if (event.type === 'data') {
          writeTerminal(event.data, 'out')
        }
        if (event.type === 'exit') {
          const nextStatus = event.exitCode === 0 ? 'ok' : 'fail'
          setStatus(nextStatus)
          onStatus?.(server.id, nextStatus)
        }
      })
      writeTerminal(`$ ${command}\r\n`, 'cmd')
      await window.api.terminal.write(session.id, `${command}\nexit\n`)
    } catch {
      setStatus('fail')
      onStatus?.(server.id, 'fail')
    }
  }

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setLines([])
    terminalRef.current?.write('\x1bc')
    localSessionRef.current = null

    if (!running || !command) {
      setStatus('idle')
      return undefined
    }

    setStatus('running')

    if (['local', 'ssh'].includes(executionTarget?.mode) && executionTarget?.executionAvailable && window.api?.terminal) {
      const sessionState = { cancelled: false, unsubscribe: null }
      startTerminalSession(sessionState)

      return () => {
        sessionState.cancelled = true
        sessionState.unsubscribe?.()
        if (localSessionRef.current) window.api?.terminal?.close?.(localSessionRef.current).catch(() => {})
      }
    }

    let delay = 0
    const steps = executionTarget?.script || []
    for (const step of steps) {
      delay += step.delay
      const timer = setTimeout(() => {
        writeTerminal(`${step.line || ' '}\r\n`, step.stream)
        if (step.status) {
          setStatus(step.status)
          onStatus?.(server.id, step.status)
        }
      }, delay)
      timers.current.push(timer)
    }

    return () => timers.current.forEach(clearTimeout)
  }, [command, running, server.id, executionTarget, onStatus, onOutput])

  useEffect(() => {
    if (cancelToken === lastCancelTokenRef.current) return
    lastCancelTokenRef.current = cancelToken
    if (!cancelToken || status !== 'running') return

    timers.current.forEach(clearTimeout)
    timers.current = []
    const sessionId = localSessionRef.current
    if (sessionId) {
      window.api?.terminal?.close?.(sessionId).catch(() => {})
      localSessionRef.current = null
    }
    writeTerminal('^C\r\ncancelled\r\n', 'err')
    setStatus('cancelled')
    onStatus?.(server.id, 'cancelled')
  }, [cancelToken, status, server.id, onStatus])

  return (
    <article className={`terminal-tile ${server.env}`}>
      <header>
        <EnvChip env={server.env} />
        <b className="mono">{server.host}</b>
        <span className={`tile-status ${status}`}><i />{status === 'ok' ? 'succeeded' : status === 'fail' ? 'failed' : status}</span>
      </header>
      <div className="terminal tile-output">
        <div ref={terminalMountRef} className="xterm-mount" />
        <div className="terminal-transcript" aria-live="polite">
          {lines.map((line, index) => <div key={`${line.line}-${index}`} className={line.stream}>{line.line || ' '}</div>)}
          {status === 'running' ? <span className="blink">▊</span> : null}
        </div>
      </div>
    </article>
  )
}
