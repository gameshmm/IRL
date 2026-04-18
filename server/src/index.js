require('dotenv').config();
const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ─── Load Configuration ────────────────────────────────────────────────────────
const CONFIG_PATH   = path.join(__dirname, '..', 'config.json');
const EXAMPLE_PATH  = path.join(__dirname, '..', 'config.example.json');

// Gera config.json automaticamente na primeira execução
if (!fs.existsSync(CONFIG_PATH)) {
  if (!fs.existsSync(EXAMPLE_PATH)) {
    console.error('[CONFIG] ERRO: config.example.json não encontrado! Reinstale o projeto.');
    process.exit(1);
  }
  fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
  console.log('[CONFIG] config.json criado automaticamente com valores padrão.');
  console.log('[CONFIG] Login padrão: admin / admin123');
  console.log('[CONFIG] Acesse o painel e altere a senha nas Configurações!');
}

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

let config = loadConfig();

// ─── Signal State Manager ──────────────────────────────────────────────────────
// Shared signal state broadcast via SSE to the overlay
const signalState = {
  status: 'offline',       // 'offline' | 'connecting' | 'live' | 'weak' | 'lost'
  bitrate: 0,
  streamPath: null,
  lostAt: null,
  listeners: new Set()     // SSE response objects
};

function broadcastSignal(update) {
  Object.assign(signalState, update);
  const data = JSON.stringify({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt,
    ts: Date.now()
  });
  for (const res of signalState.listeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
  console.log(`[SIGNAL] status=${signalState.status} bitrate=${signalState.bitrate}`);
}

// ─── Node Media Server ─────────────────────────────────────────────────────────
const nmsConfig = {
  rtmp: {
    port: config.rtmp.port,
    chunk_size: config.rtmp.chunk_size,
    gop_cache: config.rtmp.gop_cache,
    ping: config.rtmp.ping,
    ping_timeout: config.rtmp.ping_timeout
  },
  http: {
    port: config.http.port,
    allow_origin: config.http.allow_origin,
    mediaroot: path.join(__dirname, '..', config.http.mediaroot)
  },
  auth: { play: false, publish: false }
};

const nms = new NodeMediaServer(nmsConfig);

// ─── Session tracker (populated via NMS events) ───────────────────────────────
const activeSessions = new Map();
const WEAK_THRESHOLD_KBPS = 400;

// ─── Auth Hook + Signal Hooks ─────────────────────────────────────────────────
nms.on('prePublish', (id, StreamPath, args) => {
  const cfg = loadConfig();
  const allowedKeys = cfg.stream.allowedKeys || [];
  const streamKey = StreamPath.split('/').pop();

  if (!allowedKeys.includes(streamKey)) {
    console.log(`[AUTH] Rejected stream key: "${streamKey}"`);
    const session = nms.getSession(id);
    if (session) session.reject();
  } else {
    console.log(`[AUTH] Accepted stream key: "${streamKey}"`);
    broadcastSignal({ status: 'connecting', streamPath: StreamPath });
  }
});

nms.on('postPublish', (id, StreamPath) => {
  console.log(`[NMS] Stream started: ${StreamPath}`);
  activeSessions.set(id, { id, StreamPath, startedAt: Date.now() });
  broadcastSignal({ status: 'live', streamPath: StreamPath, lostAt: null });
});

nms.on('donePublish', (id, StreamPath) => {
  console.log(`[NMS] Stream ended: ${StreamPath}`);
  activeSessions.delete(id);
  broadcastSignal({ status: 'lost', streamPath: StreamPath, lostAt: new Date().toISOString(), bitrate: 0 });

  // Auto-recover to 'offline' after 60s if no reconnect
  setTimeout(() => {
    if (signalState.status === 'lost') {
      broadcastSignal({ status: 'offline', streamPath: null });
    }
  }, 60_000);
});

// ─── Weak-signal detection: poll bitrate every 3s ───────────────────────────

setInterval(() => {
  if (signalState.status !== 'live' && signalState.status !== 'weak') return;
  if (activeSessions.size === 0) return;

  activeSessions.forEach((info, id) => {
    // getSession(id) is a valid NMS v2 method
    const session = nms.getSession(id);
    if (!session) { activeSessions.delete(id); return; }

    // node-media-server exposes bitrate in kbps on RTMPSession after stream starts
    const bitrateKbps = typeof session.bitrate === 'number' ? session.bitrate : 0;

    if (bitrateKbps > 0 && bitrateKbps < WEAK_THRESHOLD_KBPS && signalState.status === 'live') {
      broadcastSignal({ status: 'weak', bitrate: bitrateKbps });
    } else if (bitrateKbps >= WEAK_THRESHOLD_KBPS && signalState.status === 'weak') {
      broadcastSignal({ status: 'live', bitrate: bitrateKbps });
    } else if (bitrateKbps > 0) {
      signalState.bitrate = bitrateKbps; // silent update
    }
  });
}, 3000);

nms.run();
console.log(`[NMS] RTMP server running on port ${config.rtmp.port}`);
console.log(`[NMS] HTTP server running on port ${config.http.port}`);

// ─── REST API (Express) ────────────────────────────────────────────────────────
const { router: authRouter } = require('./routes/auth');
const keysRouter = require('./routes/keys');
const configRouter = require('./routes/config');
const statusRouter = require('./routes/status');
const obsRouter = require('./routes/obs');

const app = express();
const API_PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Serve overlay HTML (public, no auth) ─────────────────────────────────────
const OVERLAY_DIR = path.join(__dirname, '..', 'overlay');
app.use('/overlay', express.static(OVERLAY_DIR));

// ─── SSE: Signal events for overlay ───────────────────────────────────────────
// GET /signal/events  (no auth — the overlay in OBS has no token)
app.get('/signal/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send current state immediately on connect
  const current = JSON.stringify({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt,
    ts: Date.now()
  });
  res.write(`data: ${current}\n\n`);

  signalState.listeners.add(res);

  req.on('close', () => {
    signalState.listeners.delete(res);
  });
});

// GET /signal/status  (protected — dashboard polls this)
app.get('/signal/status', (req, res) => {
  res.json({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt
  });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes (JWT required)
const { verifyToken } = require('./middleware/auth');
app.use('/api/keys', verifyToken, keysRouter);
app.use('/api/config', verifyToken, configRouter);
app.use('/api/status', verifyToken, statusRouter);
app.use('/api/obs', verifyToken, obsRouter);

app.listen(API_PORT, () => {
  console.log(`[API] Management API running on port ${API_PORT}`);
  console.log(`[OVERLAY] Overlay available at http://localhost:${API_PORT}/overlay/`);
  console.log(`[SSE] Signal events at http://localhost:${API_PORT}/signal/events`);
});

module.exports = { nms, app, loadConfig, saveConfig, signalState, broadcastSignal };
