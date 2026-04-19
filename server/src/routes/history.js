const express = require('express');
const { db }  = require('../db');

const router = express.Router();

/**
 * Adiciona uma entrada ao histórico (chamado internamente pelo index.js)
 */
function recordSession(entry) {
  const sessions = db.get('sessions');
  // Gera ID incremental simples
  const all = sessions.value();
  const nextId = all.length > 0 ? Math.max(...all.map(s => s.id)) + 1 : 1;

  sessions.push({
    id:               nextId,
    stream_path:      entry.streamPath,
    started_at:       entry.startedAt       || null,
    ended_at:         entry.endedAt         || new Date().toISOString(),
    duration_seconds: entry.durationSeconds || null
  }).write();
}

/**
 * GET /api/history
 * Retorna histórico de sessões de stream com estatísticas
 */
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  const all = db.get('sessions')
    .orderBy(['ended_at'], ['desc'])
    .take(limit)
    .map(s => ({
      id:              s.id,
      streamPath:      s.stream_path,
      startedAt:       s.started_at,
      endedAt:         s.ended_at,
      durationSeconds: s.duration_seconds
    }))
    .value();

  const total = db.get('sessions').size().value();

  // Calcula estatísticas manualmente (equivalente ao SQL agregado)
  const withDuration = db.get('sessions')
    .filter(s => s.duration_seconds != null)
    .value();

  const totalSeconds = withDuration.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const avgSeconds   = withDuration.length > 0 ? Math.round(totalSeconds / withDuration.length) : 0;
  const maxSeconds   = withDuration.length > 0 ? Math.max(...withDuration.map(s => s.duration_seconds)) : 0;

  res.json({
    sessions: all,
    total,
    stats: {
      totalSessions: total,
      totalSeconds:  totalSeconds || 0,
      avgSeconds,
      maxSeconds:    maxSeconds   || 0
    }
  });
});

/**
 * DELETE /api/history
 * Limpa todo o histórico
 */
router.delete('/', (req, res) => {
  db.set('sessions', []).write();
  res.json({ message: 'Histórico limpo com sucesso' });
});

module.exports = { router, recordSession };
