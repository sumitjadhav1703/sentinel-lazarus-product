import { describe, expect, it } from 'vitest'
import { resolveKeyPath, applySshAuth } from '../src/main/ssh-auth.js'
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

describe('applySshAuth', () => {
  const mockHome = resolve('/home/user')
  const baseConfig = { host: 'example.com' }

  it('handles agent auth method', async () => {
    const origAuthSock = process.env.SSH_AUTH_SOCK
    process.env.SSH_AUTH_SOCK = '/tmp/ssh-agent.sock'
    try {
      const result = await applySshAuth(baseConfig, { authMethod: 'agent' })
      expect(result).toEqual({ ...baseConfig, agent: '/tmp/ssh-agent.sock' })
    } finally {
      process.env.SSH_AUTH_SOCK = origAuthSock
    }
  })

  it('handles password auth method', async () => {
    const result = await applySshAuth(baseConfig, { authMethod: 'password', password: 'secretpassword' })
    expect(result).toEqual({ ...baseConfig, password: 'secretpassword' })
  })

  it('handles key auth method successfully', async () => {
    const mockReadFile = async () => 'mock-private-key-content'
    const result = await applySshAuth(
      baseConfig,
      { authMethod: 'key', keyPath: '~/valid_key' },
      { readFile: mockReadFile, homeDir: mockHome }
    )
    expect(result).toEqual({ ...baseConfig, privateKey: 'mock-private-key-content' })
  })

  it('throws error when key file cannot be read', async () => {
    const mockReadFile = async () => { throw new Error('File not found') }
    await expect(applySshAuth(
      baseConfig,
      { authMethod: 'key', keyPath: '~/missing_key' },
      { readFile: mockReadFile, homeDir: mockHome }
    )).rejects.toThrow('Unable to read SSH key')
  })

  it('throws error when key path is invalid or empty', async () => {
    await expect(applySshAuth(
      baseConfig,
      { authMethod: 'key', keyPath: '' },
      { homeDir: mockHome }
    )).rejects.toThrow('Unable to read SSH key')
  })

  it('returns unchanged config for unknown auth method', async () => {
    const result = await applySshAuth(baseConfig, { authMethod: 'unknown' })
    expect(result).toBe(baseConfig)
  })
})
