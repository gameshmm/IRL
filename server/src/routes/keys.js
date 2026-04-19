const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { db }   = require('../db');

const router = express.Router();

/**
 * GET /api/keys
 * Retorna lista de chaves de stream com metadados
 */
router.get('/', (req, res) => {
  const keys = db.get('stream_keys')
    .sortBy('created_at')
    .map(k => ({ key: k.key, label: k.label, createdAt: k.created_at }))
    .value();
  res.json({ keys });
});

/**
 * POST /api/keys
 * Body: { label? }
 * Cria uma nova chave de stream
 */
router.post('/', (req, res) => {
  const { label } = req.body;
  const count = db.get('stream_keys').size().value();

  const newKey    = uuidv4().replace(/-/g, '').substring(0, 16);
  const newLabel  = (label || `Stream ${count + 1}`).trim();
  const createdAt = new Date().toISOString();

  db.get('stream_keys').push({ key: newKey, label: newLabel, created_at: createdAt }).write();

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

  const existing = db.get('stream_keys').find({ key }).value();
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  db.get('stream_keys').find({ key }).assign({ label: label.trim() }).write();
  res.json({ key, label: label.trim() });
});

/**
 * DELETE /api/keys/:key
 * Remove uma chave de stream
 */
router.delete('/:key', (req, res) => {
  const { key } = req.params;

  const existing = db.get('stream_keys').find({ key }).value();
  if (!existing) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  db.get('stream_keys').remove({ key }).write();
  res.json({ message: 'Chave removida com sucesso' });
});

module.exports = router;
