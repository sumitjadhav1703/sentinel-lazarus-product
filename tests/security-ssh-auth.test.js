import { describe, expect, it } from 'vitest'
import { resolveKeyPath } from '../src/main/ssh-auth.js'
import { join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'

describe('resolveKeyPath security', () => {
  const mockHome = resolve('/home/user')

  it('should not allow path traversal out of home directory using ~/', () => {
    const maliciousPath = '~/../etc/passwd'
    expect(() => resolveKeyPath(maliciousPath, mockHome)).toThrow('Invalid key path')
  })

  it('should handle normal home paths correctly', () => {
    const validPath = '~/.ssh/id_rsa'
    const expected = resolve(join(mockHome, '.ssh/id_rsa'))
    expect(resolveKeyPath(validPath, mockHome)).toBe(expected)
  })

  it('should block absolute paths outside home directory', () => {
    const absoluteMalicious = '/etc/passwd'
    expect(() => resolveKeyPath(absoluteMalicious, mockHome)).toThrow('Invalid key path')
  })

  it('should allow absolute paths inside home directory', () => {
    const absoluteValid = join(mockHome, '.ssh/id_rsa')
    expect(resolveKeyPath(absoluteValid, mockHome)).toBe(resolve(absoluteValid))
  })

  it('should allow the home directory itself', () => {
    expect(resolveKeyPath('~', mockHome)).toBe(mockHome)
  })

  it('should block traversal using absolute paths with ..', () => {
    const traversal = join(mockHome, '../outside.txt')
    expect(() => resolveKeyPath(traversal, mockHome)).toThrow('Invalid key path')
  })
})
