const express = require('express');
const { db } = require('../db');

const router = express.Router();

const stmtInsert = db.prepare(`
  INSERT INTO sessions (stream_path, started_at, ended_at, duration_seconds)
  VALUES (@streamPath, @startedAt, @endedAt, @durationSeconds)
`);

const stmtList  = db.prepare(`
  SELECT
    id,
    stream_path      AS streamPath,
    started_at       AS startedAt,
    ended_at         AS endedAt,
    duration_seconds AS durationSeconds
  FROM sessions
  ORDER BY ended_at DESC
  LIMIT ?
`);

const stmtCount  = db.prepare('SELECT COUNT(*) AS n FROM sessions');
const stmtDelete = db.prepare('DELETE FROM sessions');

// Statisticas
const stmtStats = db.prepare(`
  SELECT
    COUNT(*)                        AS totalSessions,
    SUM(duration_seconds)           AS totalSeconds,
    AVG(duration_seconds)           AS avgSeconds,
    MAX(duration_seconds)           AS maxSeconds
  FROM sessions
  WHERE duration_seconds IS NOT NULL
`);

/**
 * Adiciona uma entrada ao histórico (chamado internamente pelo index.js)
 */
function recordSession(entry) {
  stmtInsert.run({
    streamPath:      entry.streamPath,
    startedAt:       entry.startedAt       || null,
    endedAt:         entry.endedAt         || new Date().toISOString(),
    durationSeconds: entry.durationSeconds || null
  });
}

/**
 * GET /api/history
 * Retorna histórico de sessões de stream com estatísticas
 */
router.get('/', (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit) || 50, 500);
  const sessions = stmtList.all(limit);
  const total    = stmtCount.get().n;
  const stats    = stmtStats.get();

  res.json({
    sessions,
    total,
    stats: {
      totalSessions: stats.totalSessions,
      totalSeconds:  stats.totalSeconds  || 0,
      avgSeconds:    stats.avgSeconds    ? Math.round(stats.avgSeconds) : 0,
      maxSeconds:    stats.maxSeconds    || 0
    }
  });
});

/**
 * DELETE /api/history
 * Limpa todo o histórico
 */
router.delete('/', (req, res) => {
  stmtDelete.run();
  res.json({ message: 'Histórico limpo com sucesso' });
});

module.exports = { router, recordSession };
