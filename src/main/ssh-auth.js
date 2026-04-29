import { readFile as fsReadFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveKeyPath(keyPath, homeDir = homedir()) {
  const value = String(keyPath || '').trim()
  if (!value) return ''
  if (value === '~') return homeDir
  if (value.startsWith('~/')) return join(homeDir, value.slice(2))
  return value
}

const keyCache = new Map()

export async function applySshAuth(config, input = {}, { readFile = fsReadFile, homeDir = homedir() } = {}) {
  if (input.authMethod === 'agent') {
    return { ...config, agent: process.env.SSH_AUTH_SOCK }
  }

  if (input.authMethod === 'password') {
    return { ...config, password: input.password }
  }

  if (input.authMethod === 'key') {
    const keyPath = resolveKeyPath(input.keyPath, homeDir)
    if (!keyPath) throw new Error('Unable to read SSH key')

    if (!keyCache.has(keyPath)) {
      const readPromise = Promise.resolve(readFile(keyPath, 'utf8')).catch(err => {
        keyCache.delete(keyPath)
        throw err
      })
      keyCache.set(keyPath, readPromise)
    }

    try {
      return { ...config, privateKey: await keyCache.get(keyPath) }
    } catch {
      throw new Error('Unable to read SSH key')
    }
  }

  return config
}
