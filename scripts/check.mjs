import { spawnSync } from 'node:child_process'

const commands = [
  { label: 'npm test', command: 'npm', args: ['test'] },
  { label: 'npm run build', command: 'npm', args: ['run', 'build'] },
  { label: 'npm audit --audit-level=high', command: 'npm', args: ['audit', '--audit-level=high'] }
]

for (const { label, command, args } of commands) {
  console.log(`\n> ${label}`)
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(`\nReadiness check failed: ${label}`)
    process.exit(result.status || 1)
  }
}

console.log('\nReadiness check passed.')
