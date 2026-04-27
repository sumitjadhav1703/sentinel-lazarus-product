import Database from 'better-sqlite3'
import { maskCommandSecrets, sanitizeOutputLogs } from '../shared/sanitize.js'

function scopeFor(targetIds) {
  const count = targetIds.length
  return `${count} ${count === 1 ? 'server' : 'servers'}`
}

function toHistoryRow(row) {
  const outputLogs = row.output_logs ? JSON.parse(row.output_logs) : null
  return {
    id: row.id,
    cmd: row.cmd,
    targetIds: JSON.parse(row.target_ids || '[]'),
    scope: row.scope,
    status: row.status,
    duration: row.duration,
    ts: row.ts,
    createdAt: row.created_at,
    ...(outputLogs ? { outputLogs } : {})
  }
}

export function createHistoryDatabase(databasePath) {
  const db = new Database(databasePath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS command_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cmd TEXT NOT NULL,
      target_ids TEXT NOT NULL DEFAULT '[]',
      scope TEXT NOT NULL,
      status TEXT NOT NULL,
      duration TEXT NOT NULL,
      ts TEXT NOT NULL,
      created_at TEXT NOT NULL,
      output_logs TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_command_history_created_at
      ON command_history(created_at DESC, id DESC);
  `)
  const columns = db.prepare('PRAGMA table_info(command_history)').all().map((column) => column.name)
  if (!columns.includes('output_logs')) {
    db.exec('ALTER TABLE command_history ADD COLUMN output_logs TEXT')
  }

  const insert = db.prepare(`
    INSERT INTO command_history (cmd, target_ids, scope, status, duration, ts, created_at, output_logs)
    VALUES (@cmd, @targetIds, @scope, @status, @duration, @ts, @createdAt, @outputLogs)
  `)
  const selectById = db.prepare('SELECT * FROM command_history WHERE id = ?')
  const selectAll = db.prepare('SELECT * FROM command_history ORDER BY created_at DESC, id DESC LIMIT ?')
  const deleteOlderThan = db.prepare('DELETE FROM command_history WHERE created_at < ?')
  const updateById = db.prepare(`
    UPDATE command_history
    SET status = COALESCE(@status, status),
        duration = COALESCE(@duration, duration),
        output_logs = COALESCE(@outputLogs, output_logs)
    WHERE id = @id
  `)

  return {
    addHistory(entry) {
      const targetIds = Array.isArray(entry?.targetIds) ? entry.targetIds : []
      const createdAt = entry?.createdAt || new Date().toISOString()
      const cmd = maskCommandSecrets(String(entry?.command || entry?.cmd || '').trim())
      if (!cmd) return null

      const result = insert.run({
        cmd,
        targetIds: JSON.stringify(targetIds),
        scope: entry?.scope || scopeFor(targetIds),
        status: entry?.status || 'queued',
        duration: entry?.duration || 'simulated',
        ts: entry?.ts || 'just now',
        createdAt,
        outputLogs: entry?.outputLogs ? JSON.stringify(sanitizeOutputLogs(entry.outputLogs)) : null
      })

      return toHistoryRow(selectById.get(result.lastInsertRowid))
    },

    listHistory(limit = 100) {
      return selectAll.all(limit).map(toHistoryRow)
    },

    pruneHistory(retentionDays = 30, now = new Date()) {
      const days = Number.parseInt(retentionDays, 10)
      if (!Number.isFinite(days) || days <= 0) return this.listHistory()
      const cutoff = new Date(new Date(now).getTime() - (days * 24 * 60 * 60 * 1000)).toISOString()
      deleteOlderThan.run(cutoff)
      return this.listHistory()
    },

    updateHistory(id, patch = {}) {
      updateById.run({
        id,
        status: patch.status || null,
        duration: patch.duration || null,
        outputLogs: patch.outputLogs ? JSON.stringify(sanitizeOutputLogs(patch.outputLogs)) : null
      })
      const row = selectById.get(id)
      return row ? toHistoryRow(row) : null
    },

    close() {
      db.close()
    }
  }
}
