import { readFile as fsReadFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'

export function resolveKeyPath(keyPath, homeDir = homedir()) {
  const value = String(keyPath || '').trim()
  if (!value) return ''

  let resolvedPath
  if (value === '~') {
    resolvedPath = homeDir
  } else if (value.startsWith('~/')) {
    resolvedPath = join(homeDir, value.slice(2))
  } else {
    resolvedPath = value
  }

  const absolutePath = resolve(resolvedPath)
  const absoluteHome = resolve(homeDir)

  if (absolutePath !== absoluteHome && !absolutePath.startsWith(absoluteHome + sep)) {
    throw new Error('Invalid key path: SSH keys must be located within the home directory')
  }

  return absolutePath
}

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
    try {
      return { ...config, privateKey: await readFile(keyPath, 'utf8') }
    } catch {
      throw new Error('Unable to read SSH key')
    }
  }

  return config
}
