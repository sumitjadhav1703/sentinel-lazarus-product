import { describe, expect, it } from 'vitest'
import { resolveKeyPath } from '../src/main/ssh-auth.js'
import { resolve, join, sep } from 'node:path'
import { homedir } from 'node:os'

describe('resolveKeyPath', () => {
  const mockHome = resolve('/home/user')

  it('handles empty or null input', () => {
    expect(resolveKeyPath('')).toBe('')
    expect(resolveKeyPath(null)).toBe('')
    expect(resolveKeyPath(undefined)).toBe('')
  })

  it('trims whitespace from input', () => {
    const expected = resolve(join(mockHome, 'key'))
    expect(resolveKeyPath('  ~/key  ', mockHome)).toBe(expected)
  })

  it('resolves ~ to home directory', () => {
    expect(resolveKeyPath('~', mockHome)).toBe(mockHome)
  })

  it('resolves ~/ to paths relative to home directory', () => {
    const expected = resolve(join(mockHome, '.ssh/id_ed25519'))
    expect(resolveKeyPath('~/.ssh/id_ed25519', mockHome)).toBe(expected)
  })

  it('handles absolute paths within home directory', () => {
    const absolutePath = join(mockHome, 'custom/path/key')
    expect(resolveKeyPath(absolutePath, mockHome)).toBe(resolve(absolutePath))
  })

  it('throws error for paths outside home directory', () => {
    expect(() => resolveKeyPath('/etc/ssh/ssh_host_rsa_key', mockHome)).toThrow('Invalid key path')
    expect(() => resolveKeyPath('~/../outside.key', mockHome)).toThrow('Invalid key path')
  })

  it('uses system homedir by default', () => {
    const result = resolveKeyPath('~')
    expect(result).toBe(resolve(homedir()))
  })

  it('handles deeply nested paths within home', () => {
    const nested = '~/a/b/c/d/key'
    const expected = resolve(join(mockHome, 'a/b/c/d/key'))
    expect(resolveKeyPath(nested, mockHome)).toBe(expected)
  })
})
