const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

const router = express.Router();

// Statements preparados (compilados uma vez, executados N vezes — melhor performance)
const stmtAll    = db.prepare('SELECT key, label, created_at AS createdAt FROM stream_keys ORDER BY created_at ASC');
const stmtGet    = db.prepare('SELECT key, label, created_at AS createdAt FROM stream_keys WHERE key = ?');
const stmtInsert = db.prepare('INSERT INTO stream_keys (key, label, created_at) VALUES (@key, @label, @createdAt)');
const stmtUpdate = db.prepare('UPDATE stream_keys SET label = @label WHERE key = @key');
const stmtDelete = db.prepare('DELETE FROM stream_keys WHERE key = ?');

/**
 * GET /api/keys
 * Retorna lista de chaves de stream com metadados
 */
router.get('/', (req, res) => {
  const keys = stmtAll.all();
  res.json({ keys });
});

/**
 * POST /api/keys
 * Body: { label? }
 * Cria uma nova chave de stream
 */
router.post('/', (req, res) => {
  const { label } = req.body;
  const count = db.prepare('SELECT COUNT(*) AS n FROM stream_keys').get().n;

  const newKey   = uuidv4().replace(/-/g, '').substring(0, 16);
  const newLabel = (label || `Stream ${count + 1}`).trim();
  const createdAt = new Date().toISOString();

  stmtInsert.run({ key: newKey, label: newLabel, createdAt });

  res.status(201).json({ key: newKey, label: newLabel, createdAt });
});

/**
 * PUT /api/keys/:key
 * Body: { label }
 * Renomeia o label de uma chave de stream
 */
router.put('/:key', (req, res) => {
  const { key } = req.params;
  const { label } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'label é obrigatório' });
  }

  const existing = stmtGet.get(key);
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  stmtUpdate.run({ label: label.trim(), key });
  res.json({ key, label: label.trim() });
});

/**
 * DELETE /api/keys/:key
 * Remove uma chave de stream
 */
router.delete('/:key', (req, res) => {
  const { key } = req.params;

  const existing = stmtGet.get(key);
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  stmtDelete.run(key);
  res.json({ message: 'Chave removida com sucesso' });
});

module.exports = router;
