import { describe, it, expect } from 'vitest'
import { finalStatusFor, scriptFor } from '../src/shared/execution-plan.js'

describe('scriptFor', () => {
  it('defaults to echo ok if no command is provided', () => {
    const script = scriptFor(null, 'srv-1')
    expect(script[0].line).toBe('$ echo ok')
  })

  it('handles simple commands', () => {
    const script = scriptFor('ls -la', 'srv-1')
    expect(script).toHaveLength(2)
    expect(script[0].line).toBe('$ ls -la')
    expect(script[1].line).toBe('ok')
    expect(script[1].status).toBe('ok')
  })

  it('handles docker compose up with serverId', () => {
    const script = scriptFor('docker compose up -d', 'srv-1')
    expect(script.some(s => s.line.includes('srv-1-web Started'))).toBe(true)
    expect(script.some(s => s.line.includes('srv-1-api Started'))).toBe(true)
  })

  it('intercepts rm -rf', () => {
    const script = scriptFor('rm -rf /', 'srv-1')
    expect(script.some(s => s.line.includes('dry-run guard intercepted'))).toBe(true)
    expect(finalStatusFor(script)).toBe('fail')
  })

  it('handles git pull', () => {
    const script = scriptFor('git pull origin main', 'srv-1')
    expect(script.some(s => s.line.includes('Fast-forward'))).toBe(true)
    expect(finalStatusFor(script)).toBe('ok')
  })

  it('is case insensitive for matches', () => {
    const script = scriptFor('GIT PULL', 'srv-1')
    expect(script.some(s => s.line.includes('Fast-forward'))).toBe(true)
  })
})

describe('finalStatusFor', () => {
  it('returns the status of the last step that has a status', () => {
    const script = [
      { status: 'ok' },
      { status: 'fail' },
      { delay: 10 }
    ]
    expect(finalStatusFor(script)).toBe('fail')
  })

  it('defaults to ok if no step has a status', () => {
    const script = [
      { delay: 10 },
      { line: 'echo ok' }
    ]
    expect(finalStatusFor(script)).toBe('ok')
  })

  it('defaults to ok if the script is empty', () => {
    expect(finalStatusFor([])).toBe('ok')
  })

  it('does not mutate the input array', () => {
    const script = [
      { status: 'ok' },
      { status: 'fail' }
    ]
    const scriptCopy = [...script]
    finalStatusFor(script)
    expect(script).toEqual(scriptCopy)
  })
})
