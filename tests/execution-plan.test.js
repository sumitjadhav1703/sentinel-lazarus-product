import { describe, it, expect } from 'vitest'
import { finalStatusFor } from '../src/shared/execution-plan.js'

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
