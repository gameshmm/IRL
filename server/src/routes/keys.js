const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../db');

const router = express.Router();

/**
 * GET /api/keys
 * Retorna lista de chaves de stream com metadados
 */
router.get('/', (req, res) => {
  const keys = dbAll('SELECT key, label, created_at AS createdAt FROM stream_keys ORDER BY created_at ASC');
  res.json({ keys });
});

/**
 * POST /api/keys
 * Body: { label? }
 * Cria uma nova chave de stream
 */
router.post('/', (req, res) => {
  const { label } = req.body;
  const countRow  = dbGet('SELECT COUNT(*) AS n FROM stream_keys');
  const count     = countRow ? Number(countRow.n) : 0;

  const newKey    = uuidv4().replace(/-/g, '').substring(0, 16);
  const newLabel  = (label || `Stream ${count + 1}`).trim();
  const createdAt = new Date().toISOString();

  dbRun(
    'INSERT INTO stream_keys (key, label, created_at) VALUES (?, ?, ?)',
    [newKey, newLabel, createdAt]
  );

  res.status(201).json({ key: newKey, label: newLabel, createdAt });
});

/**
 * PUT /api/keys/:key
 * Body: { label }
 * Renomeia o label de uma chave de stream
 */
router.put('/:key', (req, res) => {
  const { key }   = req.params;
  const { label } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'label é obrigatório' });
  }

  const existing = dbGet('SELECT key FROM stream_keys WHERE key = ?', [key]);
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  dbRun('UPDATE stream_keys SET label = ? WHERE key = ?', [label.trim(), key]);
  res.json({ key, label: label.trim() });
});

/**
 * DELETE /api/keys/:key
 * Remove uma chave de stream
 */
router.delete('/:key', (req, res) => {
  const { key } = req.params;

  const existing = dbGet('SELECT key FROM stream_keys WHERE key = ?', [key]);
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  dbRun('DELETE FROM stream_keys WHERE key = ?', [key]);
  res.json({ message: 'Chave removida com sucesso' });
});

module.exports = router;
