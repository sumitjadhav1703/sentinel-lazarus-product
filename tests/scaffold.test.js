import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('project scaffold', () => {
  it('defines the expected npm scripts', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.scripts).toMatchObject({
      dev: 'electron-vite dev',
      build: 'electron-vite build',
      check: 'node scripts/check.mjs',
      icons: 'python3 scripts/generate-icons.py',
      pack: 'npm run icons && npm run build && electron-builder --dir && npm rebuild better-sqlite3 node-pty',
      dist: 'npm run icons && npm run build && electron-builder && npm rebuild better-sqlite3 node-pty',
      preview: 'electron-vite preview',
      test: 'vitest run'
    })
  })

  it('defines electron-builder packaging metadata', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.productName).toBe('Lazarus Sentinel')
    expect(pkg.build).toMatchObject({
      appId: 'io.lazarus.sentinel',
      icon: 'assets/build/icon',
      directories: { output: 'release', buildResources: 'assets/build' },
      files: expect.arrayContaining(['out/**', 'package.json'])
    })
    expect(pkg.build.mac).toMatchObject({
      hardenedRuntime: true,
      entitlements: 'assets/build/entitlements.mac.plist',
      entitlementsInherit: 'assets/build/entitlements.mac.plist'
    })
    expect(pkg.devDependencies).toHaveProperty('electron-builder')
  })

  it('includes packaging assets and signing/notarization guidance', async () => {
    const iconSource = await readFile(new URL('../assets/build/icon.svg', import.meta.url), 'utf8')
    const entitlements = await readFile(new URL('../assets/build/entitlements.mac.plist', import.meta.url), 'utf8')
    const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')

    expect(iconSource).toContain('Lazarus Sentinel')
    expect(entitlements).toContain('com.apple.security.cs.allow-jit')
    expect(envExample).toContain('APPLE_TEAM_ID')
    expect(envExample).toContain('CSC_LINK')
    expect(envExample).toContain('APPLE_APP_SPECIFIC_PASSWORD')
  })

  it('documents launch and readiness commands for local operators', async () => {
    const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')

    expect(readme).toContain('npm run dev')
    expect(readme).toContain('npm run check')
    expect(readme).toContain('npm run pack')
    expect(readme).toContain('npm run dist')
    expect(readme).toContain('npm run icons')
    expect(readme).toContain('APPLE_TEAM_ID')
    expect(readme).toContain('npm test')
    expect(readme).toContain('npm run build')
    expect(readme).toContain('Output logs are off by default')
    expect(readme).not.toContain('does not port the full prototype yet')
  })

  it('provides a local readiness check script', async () => {
    const check = await readFile(new URL('../scripts/check.mjs', import.meta.url), 'utf8')

    expect(check).toContain('npm test')
    expect(check).toContain('npm run build')
    expect(check).toContain('npm audit --audit-level=high')
    expect(check).toContain('spawnSync')
  })

  it('keeps the renderer behind a narrow preload bridge', async () => {
    const main = await readFile(new URL('../src/main/index.js', import.meta.url), 'utf8')
    const preload = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')

    expect(main).toContain('contextIsolation: true')
    expect(main).toContain('nodeIntegration: false')
    expect(main).not.toContain('sandbox: false')
    expect(main).toContain('registerDataIpcHandlers')
    expect(preload).toContain('contextBridge.exposeInMainWorld')
    expect(preload).toContain('getModel')
    expect(preload).toContain('addServer')
    expect(preload).toContain('runCommand')
    expect(preload).toContain('createLocal')
    expect(preload).toContain('createSsh')
    expect(preload).toContain('onEvent')
    expect(preload).not.toContain('ssh2')
    expect(preload).not.toContain('node-pty')
  })

  it('loads the .mjs preload artifact in production builds', async () => {
    const main = await readFile(new URL('../src/main/index.js', import.meta.url), 'utf8')

    expect(main).toContain("isDev ? '../preload/index.js' : '../preload/index.mjs'")

    if (existsSync(new URL('../out/preload/index.mjs', import.meta.url))) {
      const builtMain = await readFile(new URL('../out/main/index.js', import.meta.url), 'utf8')

      expect(builtMain).toContain('isDev ? "../preload/index.js" : "../preload/index.mjs"')
      expect(builtMain).toContain('preload: preloadPath')
    }
  })
})
