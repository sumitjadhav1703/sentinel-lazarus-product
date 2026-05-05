import { describe, expect, it } from 'vitest'
import { scriptFor, finalStatusFor } from '../src/shared/execution-plan.js'

describe('execution-plan', () => {
  describe('scriptFor', () => {
    it('returns a default script for an empty command', () => {
      const script = scriptFor('', 'srv-123')
      expect(script).toHaveLength(2)
      expect(script[0]).toEqual({ delay: 10, line: '$ echo ok', stream: 'cmd' })
      expect(script[1]).toEqual({ delay: 20, line: 'ok', stream: 'ok', status: 'ok' })
    })

    it('handles an unknown arbitrary command', () => {
      const script = scriptFor('ls -la', 'srv-123')
      expect(script).toHaveLength(2)
      expect(script[0]).toEqual({ delay: 10, line: '$ ls -la', stream: 'cmd' })
      expect(script[1]).toEqual({ delay: 20, line: 'ok', stream: 'ok', status: 'ok' })
    })

    it('generates a specialized script for docker compose up', () => {
      const script = scriptFor('docker compose up -d', 'prod-db')
      expect(script).toHaveLength(5)
      expect(script[0]).toEqual({ delay: 10, line: '$ docker compose up -d', stream: 'cmd' })
      expect(script[1]).toEqual({ delay: 20, line: '[+] Running 3/3', stream: 'out' })
      expect(script[2]).toEqual({ delay: 20, line: 'ok Container prod-db-web Started', stream: 'ok' })
      expect(script[3]).toEqual({ delay: 20, line: 'ok Container prod-db-api Started', stream: 'ok' })
      expect(script[4]).toEqual({ delay: 20, line: 'network lazarus_default reused', stream: 'out', status: 'ok' })
    })

    it('intercepts destructive rm -rf commands', () => {
      const script = scriptFor('rm -rf /var/log', 'srv-123')
      expect(script).toHaveLength(3)
      expect(script[0]).toEqual({ delay: 10, line: '$ rm -rf /var/log', stream: 'cmd' })
      expect(script[1]).toEqual({ delay: 20, line: 'rm: dry-run guard intercepted destructive command', stream: 'err' })
      expect(script[2]).toEqual({ delay: 20, line: 'exit 126', stream: 'err', status: 'fail' })
    })

    it('generates a script for git pull', () => {
      const script = scriptFor('git pull origin main', 'srv-123')
      expect(script).toHaveLength(4)
      expect(script[0]).toEqual({ delay: 10, line: '$ git pull origin main', stream: 'cmd' })
      expect(script[1]).toEqual({ delay: 20, line: 'remote: Enumerating objects: 47, done.', stream: 'out' })
      expect(script[2]).toEqual({ delay: 20, line: 'Fast-forward 16 files changed', stream: 'out' })
      expect(script[3]).toEqual({ delay: 20, line: 'found 0 vulnerabilities', stream: 'ok', status: 'ok' })
    })

    it('matches commands case-insensitively', () => {
      const scriptDocker = scriptFor('DOCKER COMPOSE UP', 'srv-123')
      expect(scriptDocker).toHaveLength(5)

      const scriptRm = scriptFor('RM -RF /', 'srv-123')
      expect(scriptRm).toHaveLength(3)

      const scriptGit = scriptFor('GIT PULL', 'srv-123')
      expect(scriptGit).toHaveLength(4)
    })
  })

  describe('finalStatusFor', () => {
    it('returns the status of the last step with a status property', () => {
      const script = [
        { delay: 10, line: 'step 1', stream: 'cmd' },
        { delay: 20, line: 'step 2', stream: 'out', status: 'ok' },
        { delay: 20, line: 'step 3', stream: 'err', status: 'fail' },
        { delay: 20, line: 'step 4', stream: 'out' } // no status
      ]
      expect(finalStatusFor(script)).toBe('fail')
    })

    it('returns ok if no step has a status property', () => {
      const script = [
        { delay: 10, line: 'step 1', stream: 'cmd' },
        { delay: 20, line: 'step 2', stream: 'out' }
      ]
      expect(finalStatusFor(script)).toBe('ok')
    })

    it('returns ok for an empty script', () => {
      expect(finalStatusFor([])).toBe('ok')
    })

    it('works with the generated scripts', () => {
      expect(finalStatusFor(scriptFor('docker compose up', 'srv'))).toBe('ok')
      expect(finalStatusFor(scriptFor('rm -rf /', 'srv'))).toBe('fail')
      expect(finalStatusFor(scriptFor('git pull', 'srv'))).toBe('ok')
      expect(finalStatusFor(scriptFor('ls', 'srv'))).toBe('ok')
    })
  })
})
