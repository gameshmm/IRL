const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

/**
 * GET /api/keys
 * Returns list of stream keys with metadata
 */
router.get('/', (req, res) => {
  const cfg = loadConfig();
  const keys = cfg.stream.allowedKeys || [];
  const meta = cfg.stream.keysMeta || {};

  const result = keys.map(key => ({
    key,
    label: meta[key]?.label || key,
    createdAt: meta[key]?.createdAt || null
  }));

  res.json({ keys: result });
});

/**
 * POST /api/keys
 * Body: { label? }
 * Creates a new stream key
 */
router.post('/', (req, res) => {
  const cfg = loadConfig();
  const { label } = req.body;

  const newKey = uuidv4().replace(/-/g, '').substring(0, 16);

  if (!cfg.stream.allowedKeys) cfg.stream.allowedKeys = [];
  if (!cfg.stream.keysMeta) cfg.stream.keysMeta = {};

  cfg.stream.allowedKeys.push(newKey);
  cfg.stream.keysMeta[newKey] = {
    label: label || `Stream ${cfg.stream.allowedKeys.length}`,
    createdAt: new Date().toISOString()
  };

  saveConfig(cfg);

  res.status(201).json({
    key: newKey,
    label: cfg.stream.keysMeta[newKey].label,
    createdAt: cfg.stream.keysMeta[newKey].createdAt
  });
});

/**
 * DELETE /api/keys/:key
 * Removes a stream key
 */
router.delete('/:key', (req, res) => {
  const { key } = req.params;
  const cfg = loadConfig();

  const idx = (cfg.stream.allowedKeys || []).indexOf(key);
  if (idx === -1) {
    return res.status(404).json({ error: 'Chave não encontrada' });
  }

  cfg.stream.allowedKeys.splice(idx, 1);
  if (cfg.stream.keysMeta && cfg.stream.keysMeta[key]) {
    delete cfg.stream.keysMeta[key];
  }

  saveConfig(cfg);
  res.json({ message: 'Chave removida com sucesso' });
});

module.exports = router;
