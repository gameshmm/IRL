const express = require('express');
const { dbRun, dbGet, dbAll } = require('../db');

const router = express.Router();

/**
 * Adiciona uma entrada ao histórico (chamado internamente pelo index.js)
 */
function recordSession(entry) {
  dbRun(
    'INSERT INTO sessions (stream_path, started_at, ended_at, duration_seconds) VALUES (?, ?, ?, ?)',
    [
      entry.streamPath,
      entry.startedAt       || null,
      entry.endedAt         || new Date().toISOString(),
      entry.durationSeconds || null
    ]
  );
}

/**
 * GET /api/history
 * Retorna histórico de sessões de stream com estatísticas
 */
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  const sessions = dbAll(
    `SELECT
       id,
       stream_path      AS streamPath,
       started_at       AS startedAt,
       ended_at         AS endedAt,
       duration_seconds AS durationSeconds
     FROM sessions
     ORDER BY ended_at DESC
     LIMIT ?`,
    [limit]
  );

  const totalRow = dbGet('SELECT COUNT(*) AS n FROM sessions');
  const total    = totalRow ? Number(totalRow.n) : 0;

  const stats = dbGet(`
    SELECT
      COUNT(*)              AS totalSessions,
      SUM(duration_seconds) AS totalSeconds,
      AVG(duration_seconds) AS avgSeconds,
      MAX(duration_seconds) AS maxSeconds
    FROM sessions
    WHERE duration_seconds IS NOT NULL
  `);

  res.json({
    sessions,
    total,
    stats: {
      totalSessions: stats ? Number(stats.totalSessions) : 0,
      totalSeconds:  stats ? Number(stats.totalSeconds)  || 0 : 0,
      avgSeconds:    stats ? Math.round(Number(stats.avgSeconds) || 0) : 0,
      maxSeconds:    stats ? Number(stats.maxSeconds)    || 0 : 0
    }
  });
});

/**
 * DELETE /api/history
 * Limpa todo o histórico
 */
router.delete('/', (req, res) => {
  dbRun('DELETE FROM sessions');
  res.json({ message: 'Histórico limpo com sucesso' });
});

module.exports = { router, recordSession };
