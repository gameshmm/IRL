const express = require('express');
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
 * GET /api/config
 * Returns safe (non-sensitive) configuration
 */
router.get('/', (req, res) => {
  const cfg = loadConfig();
  const safe = {
    rtmp: cfg.rtmp,
    http: cfg.http,
    trans: cfg.trans,
    stream: {
      app: cfg.stream.app
    }
  };
  res.json(safe);
});

/**
 * PUT /api/config
 * Body: { rtmp?, http?, trans? }
 * Partially updates configuration
 */
router.put('/', (req, res) => {
  const cfg = loadConfig();
  const { rtmp, http, trans } = req.body;

  if (rtmp) {
    cfg.rtmp = { ...cfg.rtmp, ...rtmp };
  }
  if (http) {
    // Don't allow changing mediaroot from UI
    const { mediaroot, ...httpSafe } = http;
    cfg.http = { ...cfg.http, ...httpSafe };
  }
  if (trans) {
    cfg.trans = { ...cfg.trans, ...trans };
  }

  saveConfig(cfg);
  res.json({ message: 'Configurações salvas. Reinicie o servidor para aplicar.' });
});

module.exports = router;
